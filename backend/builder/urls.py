from django.urls import path
from . import views

urlpatterns = [
    path("generate/", views.generate),
    path("swap/", views.swap_build),
    path("fill/", views.fill_build),
    path("parts/", views.list_parts),
    path("parts/<int:part_id>/", views.part_detail),
    path("parts/<int:part_id>/price-history/", views.price_history),
    path("validate/", views.validate_build),
    path("compat-check/", views.compat_check),
    path("ai-review/", views.ai_review),
    path("chat/", views.chat_api, name="chat_api"),
]
