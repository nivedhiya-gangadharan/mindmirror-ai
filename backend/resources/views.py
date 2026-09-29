from rest_framework import viewsets, permissions
from .models import Resource
from .serializers import ResourceSerializer


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow any authenticated user to read (GET, HEAD, OPTIONS).
    Require is_staff (admin) for write operations (POST, PUT, PATCH, DELETE).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class ResourceViewSet(viewsets.ModelViewSet):
    """
    Resource library endpoints:
    - GET /api/resources/?category=&type= (Published resources for logged in users; all for staff)
    - POST /api/resources/ (Create - Admin only)
    - GET /api/resources/<id>/ (Retrieve - Logged in users)
    - PATCH /api/resources/<id>/ (Edit - Admin only)
    - DELETE /api/resources/<id>/ (Delete - Admin only)
    """
    serializer_class = ResourceSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = Resource.objects.all().select_related("created_by").order_by("-created_at")

        # Non-staff users only see published resources.
        # Staff users have full visibility over published and draft resources.
        if not (user and user.is_authenticated and user.is_staff):
            queryset = queryset.filter(is_published=True)

        category = self.request.query_params.get("category")
        if category and category.lower() not in ["all", "all categories"]:
            queryset = queryset.filter(category__iexact=category.strip())

        resource_type = self.request.query_params.get("type")
        if resource_type and resource_type.lower() not in ["all", "all types"]:
            queryset = queryset.filter(resource_type__iexact=resource_type.strip())

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
