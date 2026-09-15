from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AppointmentViewSet,
    ProviderAvailabilityView,
    MyAvailabilityViewSet,
    AvailableSlotsView,
)

router = DefaultRouter()
router.register(r"my-availability", MyAvailabilityViewSet, basename="my-availability")
router.register(r"", AppointmentViewSet, basename="appointments")

urlpatterns = [
    path("available-slots/", AvailableSlotsView.as_view(), name="available_slots"),
    path("book/", AppointmentViewSet.as_view({"post": "create"}), name="appointment_book"),
    path("providers/<int:provider_id>/availability/", ProviderAvailabilityView.as_view(), name="provider_availability"),
    path("", include(router.urls)),
]
