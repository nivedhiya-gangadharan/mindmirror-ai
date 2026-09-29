from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Profile


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = "Profile"


class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)
    list_display = ("username", "email", "first_name", "last_name", "get_role", "get_status", "is_staff")

    def get_role(self, obj):
        return getattr(obj.profile, "role", "patient") if hasattr(obj, "profile") else "patient"
    get_role.short_description = "Role"

    def get_status(self, obj):
        return getattr(obj.profile, "verification_status", "-") if hasattr(obj, "profile") else "-"
    get_status.short_description = "Status"


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "title", "specialization", "verification_status", "created_at")
    list_filter = ("role", "verification_status", "specialization")
    search_fields = ("user__username", "user__email", "title", "bio", "license_or_credential_info")
