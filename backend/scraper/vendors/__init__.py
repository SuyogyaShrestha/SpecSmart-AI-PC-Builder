"""vendors/__init__.py — Registry of vendor scraper classes."""
from .hukut import HukutScraper
from .bigbyte import BigByteScraper
from .pcmodnepal import PCModNepalScraper


def get_all_scrapers():
    """Return list of all registered scraper classes."""
    return [HukutScraper, BigByteScraper, PCModNepalScraper]
