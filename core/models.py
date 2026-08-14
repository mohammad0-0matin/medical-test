from django.db import models
from django.contrib.auth.models import User


# 1. Patients Table
class Patient(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_patients')
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    birth_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


# 2. UserPatientAccess Table
class UserPatientAccess(models.Model):
    ACCESS_LEVEL_CHOICES = [
        ('owner', 'Owner'),
        ('read_only', 'Read Only'),
        ('read_write', 'Read Write'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_accesses')
    patient = models.ForeignKey(Patient, on_delete=models.RESTRICT, related_name='user_accesses')
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVEL_CHOICES)
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_accesses')

    class Meta:
        # ساخت یکتایی دوتایی کاربر و بیمار با متد جدید جنگو
        constraints = [
            models.UniqueConstraint(fields=['user', 'patient'], name='unique_user_patient_access')
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.patient} ({self.access_level})"


# 3. TestCategories Table
class TestCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Test Categories"

    def __str__(self):
        return self.name


# 4. TestTypes Table
class TestType(models.Model):
    category = models.ForeignKey(TestCategory, on_delete=models.RESTRICT, related_name='test_types')
    name = models.CharField(max_length=150)
    unit = models.CharField(max_length=20, null=True, blank=True)
    min_normal = models.FloatField(null=True, blank=True)
    max_normal = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name


# 5. TestResults Table
class TestResult(models.Model):
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

    class Meta:
        # ایندکس ترکیبی برای افزایش سرعت رسم نمودارها بر اساس تاریخ و بیمار
        indexes = [
            models.Index(fields=['patient', 'test_date']),
        ]

    def __str__(self):
        return f"{self.patient} - {self.test_type.name} ({self.test_date})"


# 6. Attachments Table
class Attachment(models.Model):
    test_result = models.ForeignKey(TestResult, on_delete=models.CASCADE, related_name='attachments')
    file_path = models.FileField(upload_to='attachments/')
    file_name = models.CharField(max_length=200)
    mime_type = models.CharField(max_length=50, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name


# 7. AuditLogs Table
class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)
    target_id = models.BigIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.action} at {self.created_at}"