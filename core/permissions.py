"""Custom DRF permission classes enforcing record-level access rules."""
from rest_framework import permissions
from .models import UserPatientAccess, Patient  # The user/patient access through-table.


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
        """Authorize the request against the resolved target object.

        Grants access to:
            1. Staff / administrative users.
            2. The direct author/creator of the record (e.g. submitter of ``TestResult``).
            3. The actual owner of the underlying ``Patient`` record.
            4. Users holding an ``approved`` grant in :class:`~core.models.UserPatientAccess`.

        :param request: Incoming HTTP request carrying the authenticated caller.
        :param view: The API view handling the current dispatch cycle.
        :param obj: A :class:`~core.models.Patient` instance or a child model
            exposing a ``patient`` reference (e.g. :class:`~core.models.TestResult`).
        :returns: ``True`` if authorization criteria are satisfied; ``False`` otherwise.
        """
        user = request.user

        # 1. Staff and administrators bypass object-level restrictions.
        if user and user.is_staff:
            return True

        # 2. Record author/submitter retains modification rights over authored entries.
        if hasattr(obj, 'created_by') and obj.created_by == user:
            return True

        # 3. Resolve the underlying Patient instance regardless of object type.
        patient = obj if isinstance(obj, Patient) else getattr(obj, 'patient', None)

        if patient is not None:
            # 3a. Direct profile owner holds complete authority over their clinical file.
            if patient.user_id == user.id:
                return True

            # 3b. Delegated users must possess an explicitly approved access grant.
            return UserPatientAccess.objects.filter(
                user=user,
                patient=patient,
                status='approved'
            ).exists()

        return False