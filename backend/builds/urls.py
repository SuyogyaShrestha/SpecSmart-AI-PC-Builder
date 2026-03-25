from django.urls import path
from .views import build_list, build_detail

urlpatterns = [
    path("", build_list),
    path("<int:pk>/", build_detail),
]
