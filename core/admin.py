from django.contrib import admin
from .models import (
    Patient,
    UserPatientAccess,
    TestCategory,
    TestType,
    TestResult,
    Attachment,
    AuditLog,
    ChatSession,
    ChatMessage,
    Prescription,
    PrescriptionItem
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


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('role', 'content', 'created_at')
    can_delete = False

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at', 'updated_at')
    search_fields = ('title', 'user__username', 'user__first_name', 'user__last_name')
    list_filter = ('created_at', 'updated_at')
    inlines = [ChatMessageInline]

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('session', 'role', 'short_content', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('content', 'session__user__username')

    def short_content(self, obj):
        return obj.content[:50]
    short_content.short_description = "خلاصه پیام"


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 1
    fields = ('drug_name', 'strength_dose', 'form', 'frequency', 'duration', 'quantity', 'order', 'is_deleted')
    readonly_fields = ('is_deleted',)


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'patient', 'get_doctor_display', 'prescribed_date', 'source', 'is_deleted', 'created_at')
    list_filter = ('is_deleted', 'source', 'prescribed_date')
    search_fields = ('uuid', 'patient__first_name', 'patient__last_name', 'external_doctor_name', 'registered_doctor__username')
    readonly_fields = ('uuid', 'created_at', 'updated_at', 'deleted_at', 'deleted_by')
    inlines = [PrescriptionItemInline]
    actions = ['soft_delete_selected']

    def get_queryset(self, request):
        # ادمین تمام نسخه‌ها از جمله رکوردهای حذف نرم‌شده را مشاهده کند
        return Prescription.all_objects.all().select_related('patient', 'registered_doctor')

    def get_doctor_display(self, obj):
        if obj.registered_doctor:
            name = f"{obj.registered_doctor.first_name} {obj.registered_doctor.last_name}".strip()
            return f"عضو سامانه: {name or obj.registered_doctor.username}"
        return f"خارج از سامانه: {obj.external_doctor_name or '-'}"
    get_doctor_display.short_description = "پزشک صادرکننده"

    def delete_model(self, request, obj):
        # اجرای حذف نرم به جای حذف سخت
        obj.soft_delete(user=request.user)

    def delete_queryset(self, request, queryset):
        # اجرای حذف نرم گروهی
        for obj in queryset:
            obj.soft_delete(user=request.user)

    def get_actions(self, request):
        actions = super().get_actions(request)
        # غیرفعال کردن حذف سخت پیش‌فرض جنگو
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

    @admin.action(description="حذف نرم رکوردهای انتخاب‌شده (انتقال به سطل بازیافت)")
    def soft_delete_selected(self, request, queryset):
        for obj in queryset:
            obj.soft_delete(user=request.user)
        self.message_user(request, f"{queryset.count()} نسخه با موفقیت حذف نرم شدند.")


@admin.register(PrescriptionItem)
class PrescriptionItemAdmin(admin.ModelAdmin):
    list_display = ('drug_name', 'prescription', 'strength_dose', 'form', 'frequency', 'order', 'is_deleted')
    list_filter = ('is_deleted', 'form')
    search_fields = ('drug_name', 'prescription__uuid')
    readonly_fields = ('created_at', 'updated_at', 'deleted_at', 'deleted_by')

    def get_queryset(self, request):
        return PrescriptionItem.all_objects.all().select_related('prescription')

    def delete_model(self, request, obj):
        obj.soft_delete(user=request.user)

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.soft_delete(user=request.user)