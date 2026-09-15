from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User

from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    ProviderPublicSerializer,
    ProviderVerifyActionSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProviderListView(generics.ListAPIView):
    """
    List mental health providers, with optional filtering by specialization.
    Endpoint: GET /api/accounts/providers/?specialization=
    Only returns providers who are approved.
    """
    serializer_class = ProviderPublicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = User.objects.filter(
            profile__role="provider",
            profile__verification_status="approved"
        ).select_related("profile").order_by("first_name", "username")

        specialization = self.request.query_params.get("specialization")
        if specialization and specialization.lower() not in ["all", "all specialists"]:
            queryset = queryset.filter(profile__specialization__iexact=specialization.strip())

        return queryset


class PendingProviderListView(generics.ListAPIView):
    """
    List applications awaiting review.
    Endpoint: GET /api/accounts/providers/pending/
    Admin only (is_staff).
    """
    serializer_class = ProviderPublicSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.filter(
            profile__role="provider",
            profile__verification_status="pending"
        ).select_related("profile").order_by("-date_joined")


class VerifyProviderView(generics.GenericAPIView):
    """
    Approve or reject a provider application.
    Endpoint: PATCH /api/accounts/providers/<id>/verify/
    Body: { "action": "approve" | "reject", "reason": "" }
    Admin only (is_staff).
    """
    serializer_class = ProviderVerifyActionSerializer
    permission_classes = [IsAdminUser]

    def patch(self, request, pk=None):
        user = generics.get_object_or_404(User, pk=pk, profile__role="provider")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        reason = serializer.validated_data.get("reason", "").strip()

        profile = user.profile
        if action == "approve":
            profile.verification_status = "approved"
            profile.rejection_reason = ""
        elif action == "reject":
            profile.verification_status = "rejected"
            profile.rejection_reason = reason
        profile.save()

        return Response(ProviderPublicSerializer(user).data, status=status.HTTP_200_OK)


class AllProvidersAdminListView(generics.ListAPIView):
    """
    List all providers (approved, pending, rejected) for admin visibility.
    Endpoint: GET /api/accounts/providers/all/
    Admin only (is_staff).
    """
    serializer_class = ProviderPublicSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.filter(
            profile__role="provider"
        ).select_related("profile").order_by("-date_joined")


class AdminStatsView(generics.GenericAPIView):
    """
    Quick-glance stat strip numbers for admin dashboard.
    Endpoint: GET /api/accounts/admin/stats/
    Admin only (is_staff).
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending_count = User.objects.filter(
            profile__role="provider",
            profile__verification_status="pending"
        ).count()
        approved_count = User.objects.filter(
            profile__role="provider",
            profile__verification_status="approved"
        ).count()
        total_patients = User.objects.filter(
            profile__role="patient"
        ).count()

        published_resources = 0
        try:
            from resources.models import Resource
            published_resources = Resource.objects.filter(is_published=True).count()
        except Exception:
            pass

        return Response({
            "pending_applications": pending_count,
            "approved_providers": approved_count,
            "published_resources": published_resources,
            "total_patients": total_patients,
        })
