from django.urls import path
from .views import mood_summary, alert_list, alert_update, my_alerts, insights

urlpatterns = [
    path("mood-summary/", mood_summary, name="mood-summary"),
    path("insights/", insights, name="insights"),
    path("alerts/", alert_list, name="alert-list"),
    path("my-alerts/", my_alerts, name="my-alerts"),
    path("alerts/<int:pk>/", alert_update, name="alert-update"),
]
