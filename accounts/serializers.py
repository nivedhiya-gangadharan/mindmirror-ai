from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Profile
from .constants import SPECIALIZATIONS, SPECIALIZATION_CHOICES


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "role",
            "title",
            "specialization",
            "bio",
            "verification_status",
            "license_or_credential_info",
            "rejection_reason",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=6
    )
    role = serializers.ChoiceField(
        choices=["patient", "provider"],
        default="patient",
        required=False
    )
    title = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default=""
    )
    specialization = serializers.ChoiceField(
        choices=SPECIALIZATION_CHOICES,
        required=False,
        allow_blank=True,
        default=""
    )
    license_or_credential_info = serializers.CharField(
        required=False,
        allow_blank=True,
        default=""
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "role",
            "title",
            "specialization",
            "license_or_credential_info",
        ]

    def create(self, validated_data):
        role = validated_data.pop("role", "patient")
        title = validated_data.pop("title", "")
        specialization = validated_data.pop("specialization", "")
        license_or_credential_info = validated_data.pop("license_or_credential_info", "")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"]
        )

        profile, _ = Profile.objects.get_or_create(user=user)
        if role == "provider":
            profile.role = "provider"
            profile.title = title
            profile.specialization = specialization
            profile.license_or_credential_info = license_or_credential_info
            profile.verification_status = "pending"
            profile.save()
        else:
            profile.role = "patient"
            profile.verification_status = "approved"
            profile.save()

        return user


class UserProfileSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "date_joined",
            "profile",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "date_joined",
            "profile",
        ]


class ProviderPublicSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "profile",
        ]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username


class ProviderVerifyActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    reason = serializers.CharField(required=False, allow_blank=True, default="")
