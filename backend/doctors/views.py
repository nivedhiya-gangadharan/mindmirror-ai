from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Availability, Doctor
from .serializers import AvailabilitySerializer


class AvailabilityViewSet(viewsets.ModelViewSet):
    """
    CRUD for a doctor's availability entries:
    - Lists own availability entries filtered by request.user.doctor_profile.
    - Creates a new entry (from_date, to_date, start_time, end_time).
    - Deletes an availability entry.
    - Prevents duplicate identical entries.
    """
    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_doctor_profile(self, user):
        doctor = getattr(user, "doctor_profile", None)
        if not doctor:
            doctor, _ = Doctor.objects.get_or_create(user=user)
        return doctor

    def get_queryset(self):
        doctor = self._get_doctor_profile(self.request.user)
        return Availability.objects.filter(doctor=doctor)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor = self._get_doctor_profile(request.user)

        from_date = serializer.validated_data["from_date"]
        to_date = serializer.validated_data["to_date"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]

        # Prevent duplicate entries
        existing = Availability.objects.filter(
            doctor=doctor,
            from_date=from_date,
            to_date=to_date,
            start_time=start_time,
            end_time=end_time,
        ).first()

        if existing:
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)

        instance = serializer.save(doctor=doctor)
        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        doctor = self._get_doctor_profile(self.request.user)
        serializer.save(doctor=doctor)
