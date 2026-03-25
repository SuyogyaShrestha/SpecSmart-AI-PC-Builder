from django.apps import AppConfig


class ScraperConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "scraper"

    def ready(self):
        """Start the APScheduler when Django is fully loaded."""
        import os
        # In dev server, RUN_MAIN=true in the reloader child (actual process).
        # In production (gunicorn/uwsgi), RUN_MAIN is unset.
        # Start scheduler only in the actual running process.
        if os.environ.get("RUN_MAIN") == "true" or "gunicorn" in os.environ.get("SERVER_SOFTWARE", ""):
            try:
                from scraper.scheduler import start_scheduler
                start_scheduler()
            except Exception as exc:
                import logging
                logging.getLogger("scraper").error("Failed to start scheduler: %s", exc)
