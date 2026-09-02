"""Custom DRF permission classes enforcing record-level access rules."""
from rest_framework import permissions
from .models import UserPatientAccess  # The user/patient access through-table.


class IsAdminOrStaffUser(permissions.BasePermission):
    """Allow only authenticated staff accounts through to staff-only routes."""

    def has_permission(self, request, view):
        """Grant entry exclusively to users flagged as staff."""
        return bool(request.user and request.user.is_staff)

class IsPatientOwnerOrStaff(permissions.BasePermission):
    """Object-level gate allowing staff or authorized record viewers.

    Membership in :class:`~core.models.UserPatientAccess` counts as
    authorization regardless of the pending/approved workflow status of
    the grant.
    """

    def has_object_permission(self, request, view, obj):
        """Authorize the request against whichever model type arrives.

        :param obj: A ``Patient`` itself, or a related object exposing a
            ``patient`` attribute (e.g. ``TestResult``).
        :returns: ``True`` for staff, or when an access row exists for this
            user/patient pair; ``False`` otherwise.
        """
        if request.user.is_staff:
            return True

        # Object itself is a Patient (reverse accessor comes from the model).
        if hasattr(obj, 'userpatientaccess_set'):
            return UserPatientAccess.objects.filter(user=request.user, patient=obj).exists()

        # Object is something linked to a patient, e.g. TestResult.
        if hasattr(obj, 'patient'):
            return UserPatientAccess.objects.filter(user=request.user, patient=obj.patient).exists()

        return False