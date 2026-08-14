from rest_framework import permissions
from django.db import models
from .models import PatientAccess, PatientProfile


class IsAdminOrStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsPatientOwnerOrStaff(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True

        # Direct ownership of PatientProfile
        if hasattr(obj, 'user') and hasattr(obj.user, 'patient_profile'):
            return obj.user == request.user

        # If the object is a TestResult
        if hasattr(obj, 'patient'):
            # Owner, prescribing doctor, or recorded_by (lab staff) can access
            if (
                obj.patient.user == request.user or
                obj.prescribing_doctor == request.user or
                obj.recorded_by == request.user
            ):
                return True
            # Guardian access via PatientAccess
            return PatientAccess.objects.filter(
                patient=obj.patient,
                guardian=request.user,
                is_active=True,
            ).exists()

        # If the object is a PatientProfile (e.g., accessed directly)
        if isinstance(obj, PatientProfile):
            return (
                obj.user == request.user or
                PatientAccess.objects.filter(
                    patient=obj,
                    guardian=request.user,
                    is_active=True,
                ).exists()
            )

        return False


class IsLabStaff(permissions.BasePermission):
    """Allows access only to users with LAB_STAFF role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_lab_staff)


class LabStaffCanCreateTestResult(permissions.BasePermission):
    """
    LAB_STAFF can create TestResult records for any patient.
    Other users (patients, doctors) follow standard ownership rules.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Lab staff can always create
        if request.user.is_lab_staff and view.action == 'create':
            return True

        # For other actions, defer to IsPatientOwnerOrStaff
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if request.user.is_lab_staff:
            # Lab staff can view / update results they recorded
            if hasattr(obj, 'recorded_by'):
                return obj.recorded_by == request.user
            return True
        return True