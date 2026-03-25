"""
scraper/scheduler.py — APScheduler integration.

Import and call `start_scheduler()` from apps.py ready() to start
the background scheduler when Django boots.

The scheduler runs run_all_scrapers() every 6 hours automatically.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger("scraper")

_scheduler: BackgroundScheduler | None = None


def _scheduled_scrape():
    """Wrapper called by APScheduler — must not crash."""
    try:
        from scraper.runner import run_all_scrapers
        results = run_all_scrapers()
        total = sum(r.get("refreshed", 0) for r in results)
        logger.info("Scheduled scrape complete: %d listings updated", total)
    except Exception as exc:
        logger.error("Scheduled scrape failed: %s", exc, exc_info=True)


def start_scheduler():
    """Start the APScheduler if not already running."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="Asia/Kathmandu")
    _scheduler.add_job(
        _scheduled_scrape,
        trigger=IntervalTrigger(hours=6),
        id="price_scraper",
        name="Auto Price Scraper",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("APScheduler started — price scraper runs every 6 hours")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
