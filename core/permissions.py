from rest_framework import permissions
from .models import UserPatientAccess  # ایمپورت جدول واسط

class IsAdminOrStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)

class IsPatientOwnerOrStaff(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True

        # اگر آبجکت Patient باشد
        if hasattr(obj, 'userpatientaccess_set'):  # بستگی به related_name در مدل دارد
            return UserPatientAccess.objects.filter(user=request.user, patient=obj).exists()

        # اگر آبجکت TestResult باشد
        if hasattr(obj, 'patient'):
            return UserPatientAccess.objects.filter(user=request.user, patient=obj.patient).exists()

        return False