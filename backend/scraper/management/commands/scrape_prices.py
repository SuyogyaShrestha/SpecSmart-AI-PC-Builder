"""management/commands/scrape_prices.py

Usage:
  python manage.py scrape_prices                  # all vendors
  python manage.py scrape_prices --vendor itpower  # one vendor
  python manage.py scrape_prices --dry-run         # no DB writes
"""
from django.core.management.base import BaseCommand
from scraper.runner import run_all_scrapers
from scraper.vendors import get_all_scrapers
import logging

logger = logging.getLogger("scraper")


class Command(BaseCommand):
    help = "Scrape vendor websites for latest PC part prices"

    def add_arguments(self, parser):
        parser.add_argument(
            "--vendor",
            type=str,
            default=None,
            help="Slug of a specific vendor to scrape (e.g. itpower, hukut, oliz)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Print matches without writing to the database",
        )

    def handle(self, *args, **options):
        vendor_slug = options.get("vendor")
        dry_run = options.get("dry_run", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no database changes"))

        if vendor_slug:
            self.stdout.write(self.style.WARNING("Targeted vendor scrapes have been deprecated in favor of single-listing or global syncs."))
            return
        results = run_all_scrapers(dry_run=dry_run)

        for r in results:
            self.stdout.write(f"  Status: {r.get('status', 'unknown')}  Refreshed: {r.get('refreshed', 0)}")
        self.stdout.write(self.style.SUCCESS("Scrape complete."))
