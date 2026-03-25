from django.contrib import admin
from django.urls import path, include
from users.admin_views import (
    admin_stats,
    admin_users_list, admin_user_detail,
    admin_parts_list, admin_part_detail,
    admin_vendors_list, admin_vendor_detail,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/parts/", include("parts.urls")),
    path("api/build/", include("builder.urls")),
    path("api/builds/", include("builds.urls")),
    # ── Admin API ─────────────────────────────────────────────────
    path("api/admin/stats/", admin_stats),
    path("api/admin/users/", admin_users_list),
    path("api/admin/users/<int:pk>/", admin_user_detail),
    path("api/admin/parts/", admin_parts_list),
    path("api/admin/parts/<int:pk>/", admin_part_detail),
    path("api/admin/vendors/", admin_vendors_list),
    path("api/admin/vendors/<int:pk>/", admin_vendor_detail),
    # ── Scraper Admin ──────────────────────────────────────────────
    path("api/admin/scraper/", include("scraper.urls")),
]
