from django.urls import path

from .views import HealthView, SnapshotView


urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("snapshot/", SnapshotView.as_view(), name="snapshot"),
]

