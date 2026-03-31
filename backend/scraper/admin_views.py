"""
scraper/admin_views.py — Admin-only API endpoints for price scraper management.

Endpoints:
  POST /api/admin/scraper/run/         → trigger a full scrape (background thread)
  GET  /api/admin/scraper/status/      → scrape job status + last run summary
"""
import threading
import logging
from datetime import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.admin_views import IsAdminRole

logger = logging.getLogger("scraper")

# Simple in-process job state (resets on server restart — good enough for admin use)
_scrape_state = {
    "running": False,
    "started_at": None,
    "finished_at": None,
    "last_results": None,
    "error": None,
}


def _run_in_background(dry_run: bool = False):
    """Thread target: run all scrapers and update _scrape_state."""
    from scraper.runner import run_all_scrapers
    global _scrape_state
    _scrape_state["running"] = True
    _scrape_state["started_at"] = datetime.now().isoformat()
    _scrape_state["error"] = None
    try:
        results = run_all_scrapers(dry_run=dry_run)
        _scrape_state["last_results"] = results
    except Exception as exc:
        logger.error("Admin-triggered scrape failed: %s", exc, exc_info=True)
        _scrape_state["error"] = str(exc)
    finally:
        _scrape_state["running"] = False
        _scrape_state["finished_at"] = datetime.now().isoformat()


@api_view(["POST"])
@permission_classes([IsAdminRole])
def scraper_run(request):
    """
    POST /api/admin/scraper/run/
    Body: { "dry_run": false, "part_id": Optional[int] }
    """
    global _scrape_state
    
    part_id = request.data.get("part_id")
    dry_run = bool(request.data.get("dry_run", False))
    
    if part_id is not None:
        # Synchronous scrape for a single part (usually 1-3 vendors, perfectly fine for an immediate request)
        from scraper.runner import run_single_part_scrape
        try:
            results = run_single_part_scrape(part_id, dry_run=dry_run)
            return Response({"detail": "Scrape completed for part.", "results": results}, status=200)
        except Exception as exc:
            logger.error("Admin-triggered single scrape failed for part %s: %s", part_id, exc, exc_info=True)
            return Response({"detail": str(exc)}, status=500)
    
    # Otherwise, it's a global scrape (background thread)
    if _scrape_state["running"]:
        return Response({"detail": "A global scrape is already running."}, status=409)

    thread = threading.Thread(target=_run_in_background, args=(dry_run,), daemon=True)
    thread.start()
    return Response({"detail": "Global scrape started.", "dry_run": dry_run}, status=202)


@api_view(["GET"])
@permission_classes([IsAdminRole])
def scraper_status(request):
    """GET /api/admin/scraper/status/"""
    state = dict(_scrape_state)
    # Compute totals from last_results
    if state["last_results"]:
        state["totals"] = {
            "refreshed": sum(r.get("refreshed", 0) for r in state["last_results"]),
        }
    return Response(state)
