"""
scraper/base.py — BaseScraper: common httpx + BeautifulSoup4 scraper.

All vendor scrapers extend this class and implement `scrape()` which
returns a list of ScrapedProduct dicts.
"""
from __future__ import annotations
import time
import random
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("scraper")

# Polite delay range between requests (seconds)
MIN_DELAY = 1.5
MAX_DELAY = 3.5


@dataclass
class ScrapedProduct:
    name: str
    price: float          # in NPR
    url: str
    vendor_slug: str
    part_type: str = ""   # CPU, GPU, MOBO, RAM, SSD, PSU, CASE, COOLER
    image_url: str = ""
    in_stock: bool = True
    currency: str = "NPR"
    extra: dict = field(default_factory=dict)


class BaseScraper:
    """
    Base class for all vendor scrapers.
    Provides throttled HTTP requests with a real browser User-Agent.
    """
    VENDOR_SLUG: str = ""  # must be set by subclass

    DEFAULT_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    def __init__(self, timeout: float = 15.0):
        self.client = httpx.Client(
            headers=self.DEFAULT_HEADERS,
            timeout=timeout,
            follow_redirects=True,
        )

    def get(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch URL and return parsed BeautifulSoup, or None on failure."""
        try:
            resp = self.client.get(url)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            logger.warning("GET %s failed: %s", url, exc)
            return None

    def polite_sleep(self):
        """Sleep a random polite interval between page requests."""
        time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))

    def scrape(self) -> list[ScrapedProduct]:
        """Override in subclass. Returns list of ScrapedProduct."""
        raise NotImplementedError

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
