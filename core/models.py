"""Database models for the SalamatYar medical-test management domain.

Covers patient records, family/dependent access grants (with a message-inbox
style approval workflow), the lab-test taxonomy (categories and types), and
individual test results with file attachments. Runtime-facing labels
(verbose names and choice labels) are intentionally Persian for the admin UI.
"""
from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
User = get_user_model()

class UserRole(models.Model):
    """Clinical authorization role and credentials bound to an auth user."""

    ROLE_STANDARD = 'standard'
    ROLE_DOCTOR = 'doctor'
    ROLE_STAFF = 'staff'

    ROLE_CHOICES = [
        (ROLE_STANDARD, 'بیمار / کاربر عادی'),
        (ROLE_DOCTOR, 'پزشک'),
        (ROLE_STAFF, 'کادر درمان / پرستار'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='user_role'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_STANDARD
    )
    medical_id = models.CharField(
        max_length=50,
        blank=True,
        default=''
    )

    def __str__(self):
        """Return user and human-readable role."""
        return f"{self.user.username} - {self.get_role_display()}"
    
# 1. Patients Table
class Patient(models.Model):
    """Personal health record owned by exactly one registered user.

    Serves as the identity anchor for all medical data: test results,
    attachments and access grants reference it either directly or through
    :class:`UserPatientAccess`.
    """
    INSURANCE_NONE = 'none'
    INSURANCE_TAMIN = 'tamin'
    INSURANCE_SALAMAT = 'salamat'
    INSURANCE_MOSAHLAR = 'mosahlar'
    INSURANCE_OTHER = 'other'

    INSURANCE_CHOICES = [
        (INSURANCE_NONE, 'فاقد بیمه پایه'),
        (INSURANCE_TAMIN, 'تأمین اجتماعی'),
        (INSURANCE_SALAMAT, 'بیمه سلامت ایرانیان'),
        (INSURANCE_MOSAHLAR, 'خدمات درمانی نیروهای مسلح'),
        (INSURANCE_OTHER, 'سایر'),
    ]
    insurance_provider = models.CharField(
        max_length=30,
        choices=INSURANCE_CHOICES,
        default=INSURANCE_NONE
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    birth_date = models.DateField(null=True, blank=True)
    national_code = models.CharField(max_length=10, unique=True, null=True, blank=True, verbose_name="کد ملی")
    phone_number = models.CharField(
    max_length=11,
    blank=True,
    null=True,
    verbose_name="شماره تماس")
    has_seen_tour = models.BooleanField(default=False)

    def __str__(self):
        """Return the patient's display name for admin listings."""
        return f"{self.first_name} {self.last_name}"


# 2. UserPatientAccess Table
class UserPatientAccess(models.Model):
    """Grant of one user's access to another user's health record.

    Doubles as the access-request inbox: rows start as ``pending`` when
    someone requests access by national code and become ``approved`` or
    ``rejected`` once the record owner responds. Uniqueness of (user,
    patient) pairs is enforced at the database level.
    """

    ACCESS_LEVEL_CHOICES = [
        ('owner', 'Owner'),
        ('read_only', 'Read Only'),
        ('read_write', 'Read Write'),
    ]
    
    # Inbox workflow status; drives pending/approved filtering everywhere.
    STATUS_CHOICES = (
        ('pending', 'در انتظار تایید'),
        ('approved', 'تایید شده'),
        ('rejected', 'رد شده'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_accesses')
    patient = models.ForeignKey(Patient, on_delete=models.RESTRICT, related_name='user_accesses')
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVEL_CHOICES, default='read_only')
    
    # Approval status of the underlying access grant.
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_accesses')

    class Meta:
        """A user may hold at most one access record per patient."""

        constraints = [
            models.UniqueConstraint(fields=['user', 'patient'], name='unique_user_patient_access')
        ]

    def __str__(self):
        """Summarize grant direction and current status."""
        return f"{self.user.username} -> {self.patient} ({self.get_status_display()})"

# 3. TestCategories Table
class TestCategory(models.Model):
    """Grouping bucket for lab tests (e.g. biochemistry, hematology)."""

    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500, null=True, blank=True)

    class Meta:
        """Natural plural name for the Django admin index."""

        verbose_name_plural = "Test Categories"

    def __str__(self):
        """Return the category name."""
        return self.name


# 4. TestTypes Table
class TestType(models.Model):
    """Catalog definition of a lab test with its default reference range.

    Each instance represents a specific analyte (e.g. FBS, CBC) together
    with its unit of measurement and the normal min/max values used to flag
    out-of-range results.
    """

    category = models.ForeignKey(TestCategory, on_delete=models.RESTRICT, related_name='test_types')
    name = models.CharField(max_length=150)
    unit = models.CharField(max_length=20, null=True, blank=True)
    min_normal = models.FloatField(null=True, blank=True)
    max_normal = models.FloatField(null=True, blank=True)

    def __str__(self):
        """Return the test type name."""
        return self.name


# 5. TestResults Table
class TestResult(models.Model):
    """One measured result for a patient/test-type pair on a given date.

    Supports both numeric values and qualitative text results; the
    per-record ``lab_min_range``/``lab_max_range`` columns override the
    catalog defaults when the reporting lab uses different ranges.
    """

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='test_results')
    test_type = models.ForeignKey(TestType, on_delete=models.RESTRICT, related_name='results')
    result_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    result_text = models.CharField(max_length=50, null=True, blank=True)
    lab_min_range = models.FloatField(null=True, blank=True)
    lab_max_range = models.FloatField(null=True, blank=True)
    test_date = models.DateField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(max_length=500, null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    STATUS_CHOICES = (
        ('pending', 'در انتظار تایید'),
        ('approved', 'تایید شده'),
        ('rejected', 'رد شده'),
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='approved')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_tests')
    class Meta:
        """Composite index accelerating trend charts filtered by patient/date."""

        indexes = [
            models.Index(fields=['patient', 'test_date']),
        ]

    def __str__(self):
        """Label used across the admin and API error surfaces."""
        return f"{self.patient} - {self.test_type.name} ({self.test_date})"


# 6. Attachments Table
class Attachment(models.Model):
    """File (PDF or image) attached to a single test result.

    Stores the uploaded file with its original name, MIME type and upload
    timestamp; deletion cascades with the parent test result.
    """

    test_result = models.ForeignKey(TestResult, on_delete=models.CASCADE, related_name='attachments')
    file_path = models.FileField(upload_to='attachments/')
    file_name = models.CharField(max_length=200)
    mime_type = models.CharField(max_length=50, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Return the original file name."""
        return self.file_name


# 7. AuditLogs Table
class AuditLog(models.Model):
    """Security audit-trail entry describing who performed which action.

    Captures the acting user, action type, target object id, client IP,
    user-agent string and timestamp. Rows are append-only in practice.
    """

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)
    target_id = models.BigIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """One-line summary of the audit entry."""
        return f"{self.user} - {self.action} at {self.created_at}"
class HealthSummary(models.Model):
    patient = models.OneToOneField(
        'Patient',
        on_delete=models.CASCADE,
        related_name='health_summary'
    )
    allergies = models.JSONField(default=list, blank=True)         # حساسیت‌ها و آلرژی‌ها
    conditions = models.JSONField(default=list, blank=True)        # بیماری‌ها و شرایط فعال
    medications = models.JSONField(default=list, blank=True)       # داروهای مصرفی جاری
    care_plans = models.JSONField(default=list, blank=True)        # برنامه مراقبت و اهداف سلامت
    immunizations = models.JSONField(default=list, blank=True)     # واکسیناسیون و ایمن‌سازی
    screenings = models.JSONField(default=list, blank=True)        # مراقبت‌های پیشگیرانه و غربالگری
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"خلاصه پرونده سلامت - {self.patient}"


class TestReminder(models.Model):
    FREQUENCY_CHOICES = [
        ('once', 'یک‌بار'),
        ('monthly', 'ماهانه'),
        ('every_3_months', 'هر ۳ ماه'),
        ('every_6_months', 'هر ۶ ماه'),
        ('yearly', 'سالانه'),
    ]

    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        related_name='reminders'
    )
    title = models.CharField(max_length=255)
    due_date = models.DateField()
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='once')
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.patient})"

class ChatSession(models.Model):
    """
    نماینده یک نشست کامل گفتگوی کاربر با دستیار هوش مصنوعی.
    هر کاربر می‌تواند چندین گفتگوی مجزا با موضوعات مختلف داشته باشد.
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='ai_chat_sessions',
        verbose_name="کاربر"
    )
    title = models.CharField(
        max_length=200, 
        default="گفتگوی جدید", 
        verbose_name="عنوان گفتگو"
    )
    created_at = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="زمان ایجاد"
    )
    updated_at = models.DateTimeField(
        auto_now=True, 
        verbose_name="آخرین به‌روزرسانی"
    )

    class Meta:
        verbose_name = "نشست گفتگو"
        verbose_name_plural = "نشست‌های گفتگو"
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class ChatMessage(models.Model):
    """
    پیام‌های ردوبدل‌شده در هر نشست، شامل متن فرستنده و نقش آن (کاربر یا مدل هوش مصنوعی).
    """
    ROLE_USER = 'user'
    ROLE_ASSISTANT = 'assistant'
    
    ROLE_CHOICES = [
        (ROLE_USER, 'کاربر'),
        (ROLE_ASSISTANT, 'دستیار سلامت'),
    ]

    session = models.ForeignKey(
        ChatSession, 
        on_delete=models.CASCADE, 
        related_name='messages',
        verbose_name="نشست گفتگو"
    )
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        verbose_name="نقش ارسال‌کننده"
    )
    content = models.TextField(
        verbose_name="متن پیام"
    )
    created_at = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="زمان ارسال"
    )

    class Meta:
        verbose_name = "پیام گفتگو"
        verbose_name_plural = "پیام‌های گفتگو"
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.get_role_display()}] {self.content[:40]}..."