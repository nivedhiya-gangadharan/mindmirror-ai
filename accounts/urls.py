from django.urls import path
from .views import (
    RegisterView,
    CurrentUserView,
    ProviderListView,
    PendingProviderListView,
    VerifyProviderView,
    AllProvidersAdminListView,
    AdminStatsView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("providers/", ProviderListView.as_view(), name="provider_list"),
    path("providers/pending/", PendingProviderListView.as_view(), name="pending_providers"),
    path("providers/<int:pk>/verify/", VerifyProviderView.as_view(), name="verify_provider"),
    path("providers/all/", AllProvidersAdminListView.as_view(), name="all_providers"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin_stats"),
]
