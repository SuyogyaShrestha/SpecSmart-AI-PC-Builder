"""
scraper/runner.py — Orchestrates price updating for Vendor Listings.

1. Finds all VendorListings with manually set URLs
2. Fetches the page and extracts exact price, stock status, and image
3. Updates last_price on VendorListing and syncs to Part
4. Inserts a PriceHistory row
"""
import logging
from datetime import date

from django.db import transaction

from parts.models import Part, VendorListing, PriceHistory, Vendor

logger = logging.getLogger("scraper")

def _get_or_create_listing(part: Part, vendor: Vendor, url: str) -> VendorListing:
    # Stable SKU derived from slug + part id — avoids unique constraint on empty string
    sku = f"{vendor.vendor_slug}-{part.id}"
    listing, created = VendorListing.objects.get_or_create(
        part=part,
        vendor=vendor,
        defaults={"product_url": url, "is_active": True, "vendor_sku": sku},
    )
    if not created and not listing.product_url:
        listing.product_url = url
        listing.save(update_fields=["product_url"])
    return listing


def _record_price(listing: VendorListing, price: float, in_stock: bool = True):
    """Update listing.last_price, sync the parent Part global price, and insert today's PriceHistory."""
    from django.db.models import Min
    today = date.today()

    with transaction.atomic():
        # Update the listing's last known price and stock status
        listing.last_price = price
        listing.in_stock = in_stock
        listing.save(update_fields=["last_price", "in_stock", "last_checked_at"])

        # Sync lowest IN-STOCK price to Part so the frontend Builder table shows it
        part = listing.part
        lowest_price = part.vendor_listings.filter(in_stock=True).exclude(last_price__isnull=True).aggregate(Min('last_price'))['last_price__min']
        if lowest_price is not None:
            part.price = lowest_price
        else:
            part.price = 0  # 0 indicates universally out of stock to the frontend
        part.save(update_fields=["price"])

        # Insert a history row only once per day per listing
        PriceHistory.objects.update_or_create(
            listing=listing,
            date=today,
            defaults={
                "price": price,
                "currency": "NPR",
                "in_stock": in_stock,
            },
        )


def run_all_scrapers(dry_run: bool = False) -> list[dict]:
    """
    Cron entrypoint: Loops through all targeted Admin-validated URLs
    and fetches the latest exact price/stock for them, entirely bypassing fuzzy matching.
    """
    from parts.models import VendorListing
    listings = VendorListing.objects.exclude(product_url="").filter(is_active=True)
    logger.info(f"Starting targeted refresh of {listings.count()} validated vendor listings...")
    success: int = 0
    for lis in listings:
        try:
            scrape_single_listing(lis)
            success += 1
        except Exception as e:
            logger.error(f"Failed targeted refresh for '{lis}': {e}")
    logger.info(f"Targeted refresh complete. {success}/{listings.count()} successful.")
    return [{"status": "ok", "refreshed": success}]


def run_single_part_scrape(part_id: int, dry_run: bool = False) -> list[dict]:
    """
    Admin on-demand entrypoint: Refreshes pricing for a single component ID.
    Intended to be run synchronously from the UI.
    """
    from parts.models import VendorListing
    listings = VendorListing.objects.filter(part_id=part_id, is_active=True).exclude(product_url="")
    logger.info(f"Starting single refresh for part {part_id} ({listings.count()} validated vendor listings)...")
    success: int = 0
    for lis in listings:
        try:
            # Note: scrape_single_listing handles the actual URL fetch, parsing, and database save.
            # We don't implement dry_run directly here because targeted scraper overrides DB.
            scrape_single_listing(lis)
            success += 1
        except Exception as e:
            logger.error(f"Failed single refresh for '{lis}': {e}")
    logger.info(f"Single refresh complete. {success}/{listings.count()} successful.")
    return [{"status": "ok", "refreshed": success}]



def scrape_single_listing(listing: VendorListing):
    """
    Targeted scrape for a single Product URL. Extracts price and image directly 
    using OpenGraph tags and WooCommerce fallback selectors.
    """
    if not listing.product_url:
        return

    from scraper.base import BaseScraper
    import re

    def _parse_raw_price(text: str) -> float | None:
        if not text:
            return None
        cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
        try:
            v = float(cleaned)
            return v if v > 10 else None
        except ValueError:
            return None

    try:
        with BaseScraper(timeout=20.0) as scraper:
            soup = scraper.get(listing.product_url)
            if not soup:
                logger.error(f"[SingleScrape] Failed to load {listing.product_url}. Forcing out of stock due to connection/404 error.")
                # We retain last_price but mark it out of stock since the page is dead/404.
                _record_price(listing, listing.last_price, in_stock=False)
                return

            # 1. Extract Price & Stock
            price = None
            in_stock = True  # default
            
            if "hukut.com" in listing.product_url:
                # Hukut uses React Server Components — price is NOT in visible HTML.
                # It lives in <script> tags as JSON-LD or variant data.
                import json as _json
                
                hukut_price = None
                hukut_stock = None
                
                for script in soup.find_all("script"):
                    stxt = script.string or ""
                    
                    # Strategy 1: JSON-LD embedded in RSC flight data
                    # Pattern: "offers":{"@type":"Offer",...,"price":33999,"availability":"...InStock"}
                    ld_match = re.search(
                        r'"offers"\s*:\s*\{[^}]*"price"\s*:\s*(\d+)[^}]*"availability"\s*:\s*"([^"]*)"',
                        stxt
                    )
                    if ld_match:
                        hukut_price = float(ld_match.group(1))
                        hukut_stock = "InStock" in ld_match.group(2)
                        break
                    
                    # Strategy 2: Variant data in RSC flight data
                    # Pattern: "sellingPrice":33999,...,"marketStatus":"inStock"
                    var_match = re.search(
                        r'"sellingPrice"\s*:\s*(\d+).*?"marketStatus"\s*:\s*"(\w+)"',
                        stxt, re.DOTALL
                    )
                    if var_match:
                        hukut_price = float(var_match.group(1))
                        hukut_stock = var_match.group(2).lower() == "instock"
                        break
                
                if hukut_price and hukut_price > 10:
                    price = hukut_price
                if hukut_stock is not None:
                    in_stock = hukut_stock
                    
            else:
                # ── WooCommerce / generic extraction ──
                # Use sequential priority: try each selector in order, stop at first match
                # This prevents nav/related product prices from being matched before the main product
                _woo_selectors = [
                    # Tier 0: Elementor single-product price (PCModNepal uses this)
                    ".wd-single-price .price ins .woocommerce-Price-amount bdi",
                    ".wd-single-price .price .woocommerce-Price-amount bdi",
                    ".wd-single-price .price .amount",
                    # Tier 1: WooCommerce .summary container (standard themes)
                    ".summary .price ins .woocommerce-Price-amount bdi",
                    ".summary .price ins .woocommerce-Price-amount",
                    ".summary .price > .woocommerce-Price-amount bdi",
                    ".summary .price > .woocommerce-Price-amount",
                    # Tier 2: Sale price inside <ins> scoped to entry-summary
                    ".entry-summary .price ins .amount",
                    ".entry-summary .price .amount",
                    # Tier 3: Standalone product price selectors
                    ".product-price",
                    ".current-price",
                ]
                for sel in _woo_selectors:
                    el = soup.select_one(sel)
                    if el:
                        p = _parse_raw_price(el.get_text(strip=True))
                        if p:
                            price = p
                            break

                # Priority 2: Standard Schema metadata as a fallback
                if not price:
                    price_meta = soup.select_one('meta[property="product:sale_price:amount"], meta[property="product:price:amount"], meta[property="og:price:amount"]')
                    if price_meta and price_meta.get("content"):
                        price = _parse_raw_price(price_meta["content"])

                # Fallback 3: Regex search across full text
                if not price:
                    text_content = soup.get_text(separator=" ")
                    matches = re.findall(r"(?:Rs\.?|NPR|रू)\s*([\d,]+\.?\d*)", text_content, flags=re.IGNORECASE)
                    for m in matches:
                        p = _parse_raw_price(m)
                        if p:
                            price = p
                            break

                # Stock check for WooCommerce vendors
                # 1. Check for WooCommerce standard classes on the main product container
                main_product = soup.select_one(".single-product-page, #product, .product.type-product")
                if main_product:
                    classes = main_product.get("class", [])
                    if "outofstock" in classes:
                        in_stock = False
                    
                    # 2. Scope text checks only to the main product's summary area if possible
                    summary_area = main_product.select_one(".summary, .wd-single-price, .entry-summary")
                    if summary_area:
                        text = summary_area.get_text().lower()
                        if "out of stock" in text or "sold out" in text or summary_area.select_one(".out-of-stock"):
                            in_stock = False
                else:
                    # Generic fallback if no clean product wrapper is found
                    if soup.select_one(".summary .out-of-stock, .wd-single-price .out-of-stock"):
                        in_stock = False

            # 2. Extract Image
            img_url = ""
            img_meta = soup.select_one('meta[property="og:image"]')
            if img_meta and img_meta.get("content"):
                img_url = img_meta["content"]
            else:
                img_el = soup.select_one(".woocommerce-product-gallery__image img, .product-image img, .wd-product-img img")
                if img_el:
                    img_url = img_el.get("src") or img_el.get("data-src") or ""

            # Update database
            if price:
                _record_price(listing, price, in_stock=in_stock)
                logger.info(f"[SingleScrape] Found exact price {price} for {listing.part.name}")
            else:
                logger.warning(f"[SingleScrape] Price not found at {listing.product_url}. Forcing out of stock.")
                # If price is completely removed from the page, it's out of stock.
                # We retain last_price but mark it out of stock, which triggers global price recalculation.
                _record_price(listing, listing.last_price, in_stock=False)

            if img_url and not listing.part.image_url:
                listing.part.image_url = img_url
                listing.part.save(update_fields=["image_url"])
                logger.info(f"[SingleScrape] Saved exact image {img_url} for {listing.part.name}")

    except Exception as e:
        logger.error(f"[SingleScrape] Crash on {listing.product_url}: {e}", exc_info=True)
