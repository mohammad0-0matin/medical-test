"""Custom DRF permission classes enforcing record-level access rules."""
from rest_framework import permissions
from .models import UserPatientAccess, Patient  # The user/patient access through-table.


class IsAdminOrStaffUser(permissions.BasePermission):
    """Allow only authenticated staff accounts through to staff-only routes."""

    def has_permission(self, request, view):
        """Grant entry exclusively to users flagged as staff."""
        return bool(request.user and request.user.is_staff)

class IsPatientOwnerOrStaff(permissions.BasePermission):
    """Object-level gate allowing staff, patient owners, or authorized record viewers.

    Read methods (GET, HEAD, OPTIONS) require either profile ownership or an approved
    grant in UserPatientAccess.
    Unsafe methods (PUT, PATCH, DELETE) require staff rights, direct patient profile
    ownership, or an approved grant with 'read_write' or 'owner' access level.
    Read-only access grants (including doctors with read-only access) cannot modify records.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # 1. Staff and administrators bypass object-level restrictions.
        if user.is_staff:
            return True

        # 2. Resolve the underlying Patient instance regardless of object type.
        patient = obj if isinstance(obj, Patient) else getattr(obj, 'patient', None)

        if patient is not None:
            # 2a. Direct profile owner holds complete authority over their clinical records.
            if patient.user_id == user.id:
                return True

            # 2b. Check approved delegation grants in UserPatientAccess
            access_grant = UserPatientAccess.objects.filter(
                user=user,
                patient=patient,
                status='approved'
            ).first()

            if not access_grant:
                return False

            # SAFE methods (GET, HEAD, OPTIONS) are allowed for any approved access grant.
            if request.method in permissions.SAFE_METHODS:
                return True

            # Unsafe methods (PUT, PATCH, DELETE) require write access ('owner' or 'read_write').
            # Read-only grants (including doctors with read-only access) are strictly rejected.
            return access_grant.access_level in ['owner', 'read_write']

        # 3. Fallback for objects without patient FK: author retaining rights
        if hasattr(obj, 'created_by') and obj.created_by == user:
            return True

        return False