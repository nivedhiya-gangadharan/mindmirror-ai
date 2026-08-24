from django.urls import path
from .views import mood_summary

urlpatterns = [
    path("mood-summary/", mood_summary, name="mood-summary"),
]