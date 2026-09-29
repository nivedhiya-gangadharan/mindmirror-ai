from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User

from .models import Profile
from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    ProviderPublicSerializer,
    ProviderVerifyActionSerializer,
    PhotoUploadSerializer,
    ChangePasswordSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfilePhotoView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = PhotoUploadSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile, _ = Profile.objects.get_or_create(user=request.user)

        if profile.photo:
            try:
                profile.photo.delete(save=False)
            except Exception:
                pass

        profile.photo = serializer.validated_data["photo"]
        profile.save()

        photo_url = request.build_absolute_uri(profile.photo.url)
        return Response({
            "detail": "Profile photo updated successfully.",
            "photo": photo_url,
            "user": UserProfileSerializer(request.user, context={"request": request}).data,
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if profile.photo:
            try:
                profile.photo.delete(save=True)
            except Exception:
                profile.photo = None
                profile.save()

        return Response({
            "detail": "Profile photo removed successfully.",
            "photo": None,
            "user": UserProfileSerializer(request.user, context={"request": request}).data,
        }, status=status.HTTP_200_OK)


class ChangePasswordView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_password = serializer.validated_data["new_password"]
        request.user.set_password(new_password)
        request.user.save()
        return Response({
            "detail": "Password changed successfully."
        }, status=status.HTTP_200_OK)


class ProviderListView(generics.ListAPIView):
    """
    List mental health providers, with optional filtering by specialization.
    Endpoint: GET /api/accounts/providers/?specialization=

    Only returns providers who are approved.

    When the requesting patient has a non-blank ``place`` on their profile the
    response becomes a grouped object::

        {
          "nearby":  [...],   # providers whose place overlaps the patient's city
          "others":  [...],   # everyone else
          "patient_place": "Kochi"
        }

    When the patient has no place (or the user is not a patient) the response
    is a plain JSON array – identical to the old behaviour so existing callers
    that expect an array continue to work unchanged.
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

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Determine the patient's own city, if set.
        patient_place = ""
        try:
            patient_place = (request.user.profile.place or "").strip()
        except Exception:
            pass

        if not patient_place:
            # No location on file – return the plain flat list unchanged.
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # Split into two groups using case-insensitive substring matching.
        # A match occurs when either string is contained within the other so
        # that "Kochi" matches "Kochi, Kerala" and vice-versa.
        patient_place_lower = patient_place.lower()
        nearby, others = [], []
        for provider in queryset:
            provider_place = (getattr(provider.profile, "place", "") or "").strip().lower()
            if provider_place and (
                patient_place_lower in provider_place
                or provider_place in patient_place_lower
            ):
                nearby.append(provider)
            else:
                others.append(provider)

        serializer_nearby = self.get_serializer(nearby, many=True)
        serializer_others = self.get_serializer(others, many=True)
        return Response({
            "nearby": serializer_nearby.data,
            "others": serializer_others.data,
            "patient_place": patient_place,
        })


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
