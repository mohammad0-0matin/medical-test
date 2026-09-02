from django.contrib import admin
from .models import (
    Patient,
    UserPatientAccess,
    TestCategory,
    TestType,
    TestResult,
    Attachment,
    AuditLog,
)


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    """Admin listing/search options for patient records."""

    list_display = ('first_name', 'last_name', 'user', 'birth_date')
    search_fields = ('first_name', 'last_name', 'user__username')


@admin.register(UserPatientAccess)
class UserPatientAccessAdmin(admin.ModelAdmin):
    """Admin listing/filter options for access grants."""

    list_display = ('user', 'patient', 'access_level', 'granted_at', 'granted_by')
    list_filter = ('access_level',)


@admin.register(TestCategory)
class TestCategoryAdmin(admin.ModelAdmin):
    """Admin options for lab-test categories."""

    list_display = ('name', 'description')


@admin.register(TestType)
class TestTypeAdmin(admin.ModelAdmin):
    """Admin options for the lab-test catalog."""

    list_display = ('name', 'category', 'unit', 'min_normal', 'max_normal')
    list_filter = ('category',)
    search_fields = ('name',)


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    """Admin options for test-result records."""

    list_display = ('patient', 'test_type', 'result_value', 'test_date', 'is_archived')
    list_filter = ('is_archived', 'test_type__category', 'test_date')
    search_fields = ('patient__first_name', 'patient__last_name', 'test_type__name')


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    """Admin options for uploaded report attachments."""

    list_display = ('file_name', 'test_result', 'uploaded_at')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-oriented admin options for audit-trail entries."""

    list_display = ('user', 'action', 'ip_address', 'created_at')
    readonly_fields = ('created_at',)