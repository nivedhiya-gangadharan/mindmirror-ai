from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AvailabilityViewSet

router = DefaultRouter()
router.register(r"availability", AvailabilityViewSet, basename="doctor-availability")

urlpatterns = [
    path("", include(router.urls)),
]
