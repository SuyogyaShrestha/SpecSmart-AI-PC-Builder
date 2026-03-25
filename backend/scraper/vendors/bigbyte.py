"""
scraper/vendors/bigbyte.py — Scraper for BigByte Nepal (bigbyte.com.np)

BigByte uses WooCommerce with the WoodMart theme.
Category URLs: /cpu/, /graphic-cards/, /motherboards/, etc.
Product selectors: .product-grid-item, .wd-entities-title a
"""
from __future__ import annotations
import logging
import re

from scraper.base import BaseScraper, ScrapedProduct

logger = logging.getLogger("scraper")

BASE_URL = "https://bigbyte.com.np"

CATEGORY_PATHS = [
    "/cpu/",
    "/graphic-cards/",
    "/motherboards/",
    "/memory/",
    "/storage/",
    "/power-supplies/",
    "/computer-case/",
    "/pc-cooling-fans/",
]

PATH_TO_TYPE = {
    "/cpu/": "CPU",
    "/graphic-cards/": "GPU",
    "/motherboards/": "MOBO",
    "/memory/": "RAM",
    "/storage/": "SSD",
    "/power-supplies/": "PSU",
    "/computer-case/": "CASE",
    "/pc-cooling-fans/": "COOLER",
}


def _parse_price(text: str) -> float | None:
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        v = float(cleaned)
        return v if v > 100 else None
    except ValueError:
        return None


class BigByteScraper(BaseScraper):
    VENDOR_SLUG = "bigbyte"

    def scrape(self) -> list[ScrapedProduct]:
        products = []

        for path in CATEGORY_PATHS:
            page = 1
            while True:
                url = f"{BASE_URL}{path}page/{page}/" if page > 1 else f"{BASE_URL}{path}"
                soup = self.get(url)
                if soup is None:
                    break

                # WoodMart theme primary selectors
                items = soup.select(".product-grid-item")
                if not items:
                    # Fallback WooCommerce selectors
                    items = soup.select("li.product, article.product")
                if not items:
                    break

                found = 0
                for item in items:
                    try:
                        # WoodMart title
                        name_el = (
                            item.select_one(".wd-entities-title a") or
                            item.select_one(".product-title a") or
                            item.select_one("h2 a") or
                            item.select_one("h3 a")
                        )
                        # Price: prefer sale price (ins)
                        price_el = (
                            item.select_one(".price ins .woocommerce-Price-amount bdi") or
                            item.select_one(".price ins .woocommerce-Price-amount") or
                            item.select_one(".price .woocommerce-Price-amount bdi") or
                            item.select_one(".price .woocommerce-Price-amount")
                        )
                        link_el = item.select_one("a[href]")

                        if not name_el or not price_el:
                            continue

                        name  = name_el.get_text(strip=True)
                        price = _parse_price(price_el.get_text(strip=True))
                        url_p = link_el["href"] if link_el else f"{BASE_URL}{path}"
                        in_stock = item.select_one(".out-of-stock") is None and \
                                   "out of stock" not in item.get_text().lower()

                        img_el = item.select_one(".product-image img, .product-element-top img, img")
                        img_url = ""
                        if img_el:
                            img_url = img_el.get("data-src") or img_el.get("src", "")

                        if price and name:
                            products.append(ScrapedProduct(
                                name=name,
                                price=price,
                                url=url_p,
                                image_url=img_url,
                                vendor_slug=self.VENDOR_SLUG,
                                part_type=PATH_TO_TYPE.get(path, ""),
                                in_stock=in_stock,
                            ))
                            found += 1
                    except Exception as exc:
                        logger.debug("BigByte item error: %s", exc)

                if found == 0:
                    break

                # WoodMart pagination
                next_btn = soup.select_one("a.next.page-numbers, .wp-pagenavi a.nextpostslink, a[rel='next']")
                if not next_btn:
                    break
                page += 1
                self.polite_sleep()

        logger.info("BigByte: scraped %d products", len(products))
        return products
