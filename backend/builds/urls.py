from django.urls import path
from .views import build_list, build_detail, compare_builds

urlpatterns = [
    path("", build_list),
    path("compare/", compare_builds),
    path("<int:pk>/", build_detail),
]
