from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User,
    PatientProfile,
    DoctorProfile,
    LabStaffProfile,
    PatientAccess,
    TestCategory,
    TestType,
    TestResult,
    Attachment,
    AuditLog,
)


# Custom User Admin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'national_code', 'mobile', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active', 'date_joined')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('national_code', 'mobile', 'role')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('national_code', 'mobile', 'role')}),
    )


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'blood_type', 'insurance_number')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'insurance_number')


@admin.register(PatientAccess)
class PatientAccessAdmin(admin.ModelAdmin):
    list_display = ('patient', 'guardian', 'relationship', 'access_level', 'is_active')
    list_filter = ('relationship', 'access_level', 'is_active')
    search_fields = ('patient__user__username', 'guardian__username')


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'medical_council_code', 'specialty')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'medical_council_code')
    list_filter = ('specialty',)


@admin.register(LabStaffProfile)
class LabStaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'lab_name', 'personnel_code')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'lab_name', 'personnel_code')
    list_filter = ('lab_name',)


@admin.register(TestCategory)
class TestCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')


@admin.register(TestType)
class TestTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'unit', 'min_normal', 'max_normal')
    list_filter = ('category',)
    search_fields = ('name',)


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ('title', 'patient', 'prescribing_doctor', 'recorded_by', 'test_type', 'test_date', 'is_archived')
    list_filter = ('is_archived', 'test_type__category', 'test_date')
    search_fields = ('title', 'patient__user__first_name', 'patient__user__last_name',
                     'prescribing_doctor__username', 'recorded_by__username', 'test_type__name')


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'test_result', 'uploaded_at')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'ip_address', 'created_at')
    readonly_fields = ('created_at',)