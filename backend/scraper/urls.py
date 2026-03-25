from django.urls import path
from . import admin_views

urlpatterns = [
    path("run/",    admin_views.scraper_run,    name="scraper_run"),
    path("status/", admin_views.scraper_status, name="scraper_status"),
]
