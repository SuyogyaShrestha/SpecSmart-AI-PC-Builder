"""
scraper/vendors/hukut.py — Scraper for Hukut (hukut.com)

Hukut is NOT WooCommerce. It's a custom React/Next.js site with Tailwind CSS.
Category pages: /pc-components/{category}
Pagination: ?page=N
Products found via anchor tags with price text containing "Rs."
"""
from __future__ import annotations
import logging
import re

from scraper.base import BaseScraper, ScrapedProduct

logger = logging.getLogger("scraper")

BASE_URL = "https://hukut.com"

CATEGORY_PATHS = [
    "/pc-components/processors",
    "/pc-components/graphics-card",
    "/pc-components/Motherboard",
    "/pc-components/ram",
    "/pc-components/storage",
    "/pc-components/psu",
    "/pc-components/casing",
    "/pc-components/cpu-cooler",
]

PATH_TO_TYPE = {
    "/pc-components/processors": "CPU",
    "/pc-components/graphics-card": "GPU",
    "/pc-components/Motherboard": "MOBO",
    "/pc-components/ram": "RAM",
    "/pc-components/storage": "SSD",
    "/pc-components/psu": "PSU",
    "/pc-components/casing": "CASE",
    "/pc-components/cpu-cooler": "COOLER",
}


def _parse_price(text: str) -> float | None:
    # Handles "Rs. 17,999" or "Rs 22,999.00"
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        v = float(cleaned)
        return v if v > 100 else None
    except ValueError:
        return None


class HukutScraper(BaseScraper):
    VENDOR_SLUG = "hukut"

    def scrape(self) -> list[ScrapedProduct]:
        products = []

        for path in CATEGORY_PATHS:
            page = 1
            empty_pages = 0

            while True:
                url = f"{BASE_URL}{path}?page={page}" if page > 1 else f"{BASE_URL}{path}"
                soup = self.get(url)
                if soup is None:
                    break

                found_on_page = 0

                # Hukut uses anchor tags with product info — find all links
                # that contain "Rs." price text
                all_links = soup.find_all("a", href=True)
                for link in all_links:
                    text = link.get_text(separator=" ", strip=True)
                    # Use regex to find Rs with or without dot, followed by space and numbers
                    if not re.search(r'(?i)rs\.?\s*\d+', text):
                        continue

                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    if len(lines) < 2:
                        # Try splitting by Rs. marker
                        parts_split = re.split(r"Rs\.?\s*", text, maxsplit=1)
                        if len(parts_split) < 2:
                            continue
                        name = parts_split[0].strip()
                        price_text = "Rs. " + parts_split[1]
                    else:
                        name = lines[0]
                        price_text = text

                    price = None
                    for seg in re.findall(r"[\d,]+\.?\d*", price_text):
                        v = _parse_price(seg)
                        if v and v > 1000:
                            price = v
                            break

                    href = link.get("href", "")
                    if href.startswith("/"):
                        href = BASE_URL + href
                    elif not href.startswith("http"):
                        href = BASE_URL + "/" + href

                    # Skip nav/category links (no real product price)
                    if not price or len(name) < 5:
                        continue

                    text_lower = text.lower()
                    in_stock = all(phrase not in text_lower for phrase in ["out of stock", "out-of-stock", "unavailable", "notify me"])

                    img_el = link.find("img")
                    img_url = ""
                    if img_el:
                        raw = img_el.get("src") or img_el.get("data-src") or ""
                        # Next.js /_next/image?url=<encoded>&w=...&q=... → decode to real URL
                        if "_next/image" in raw and "url=" in raw:
                            from urllib.parse import urlparse, parse_qs, unquote
                            qs = parse_qs(urlparse(raw).query)
                            real = qs.get("url", [""])[0]
                            img_url = unquote(real) if real else ""
                        elif raw and not raw.startswith("http"):
                            img_url = BASE_URL + raw
                        else:
                            img_url = raw

                    products.append(ScrapedProduct(
                        name=name,
                        price=price,
                        url=href,
                        image_url=img_url,
                        vendor_slug=self.VENDOR_SLUG,
                        part_type=PATH_TO_TYPE.get(path, ""),
                        in_stock=in_stock,
                    ))
                    found_on_page += 1

                if found_on_page == 0:
                    empty_pages += 1
                    if empty_pages >= 2:
                        break
                else:
                    empty_pages = 0

                # Check for next page link
                next_btn = soup.find("a", string=re.compile(r"Next|›|→", re.IGNORECASE))
                if not next_btn:
                    # Check if a page N+1 link exists
                    next_page_link = soup.find("a", href=re.compile(rf"page={page+1}"))
                    if not next_page_link:
                        break

                page += 1
                self.polite_sleep()

        # Deduplicate by URL
        seen = set()
        unique = []
        for p in products:
            if p.url not in seen:
                seen.add(p.url)
                unique.append(p)

        logger.info("Hukut: scraped %d unique products", len(unique))
        return unique
