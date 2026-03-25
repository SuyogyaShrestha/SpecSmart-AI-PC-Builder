"""
scraper/vendors/pcmodnepal.py — Scraper for PC Mod Nepal (pcmodnepal.com)

PC Mod Nepal uses WooCommerce with the WoodMart theme.
Category URLs: /product-category/processor/, /product-category/graphics-card/
Product selectors: .product-grid-item, .wd-entities-title a (WoodMart)
Pagination: /product-category/{slug}/page/{N}/
"""
from __future__ import annotations
import logging
import re

from scraper.base import BaseScraper, ScrapedProduct

logger = logging.getLogger("scraper")

BASE_URL = "https://pcmodnepal.com"

# Real category paths verified by browser inspection
CATEGORY_PATHS = [
    "/product-category/processor/",
    "/product-category/graphics-card/",
    "/product-category/motherboard/",
    "/product-category/ram/",
    "/product-category/ssd/",
    "/product-category/power-supply/",
    "/product-category/case/",
]

PATH_TO_TYPE = {
    "/product-category/processor/": "CPU",
    "/product-category/graphics-card/": "GPU",
    "/product-category/motherboard/": "MOBO",
    "/product-category/ram/": "RAM",
    "/product-category/ssd/": "SSD",
    "/product-category/power-supply/": "PSU",
    "/product-category/case/": "CASE",
}


def _parse_price(text: str) -> float | None:
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        v = float(cleaned)
        return v if v > 100 else None
    except ValueError:
        return None


class PCModNepalScraper(BaseScraper):
    VENDOR_SLUG = "pcmodnepal"

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
                    items = soup.select("li.product, article.product")
                if not items:
                    break

                found = 0
                for item in items:
                    try:
                        name_el = (
                            item.select_one(".wd-entities-title a") or
                            item.select_one(".product-title a") or
                            item.select_one("h2 a") or
                            item.select_one("h3 a")
                        )
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
                        in_stock_el = item.select_one(".out-of-stock, .outofstock, .stock.out-of-stock")
                        in_stock = (in_stock_el is None) and ("out of stock" not in item.get_text().lower())

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
                        logger.debug("PCModNepal item error: %s", exc)

                if found == 0:
                    break

                next_btn = soup.select_one(".wd-pagination a.next, a.next.page-numbers, a[rel='next']")
                if not next_btn:
                    break
                page += 1
                self.polite_sleep()

        logger.info("PCModNepal: scraped %d products", len(products))
        return products
