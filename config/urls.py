from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/doctors/", include("doctors.urls")),
    path("api/journals/", include("journals.urls")),
    path("api/analysis/", include("analysis.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/resources/", include("resources.urls")),
]
