from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone

# 1. Custom User Model
class User(AbstractUser):
    national_code = models.CharField(max_length=10, unique=True, verbose_name="National Code")
    mobile = models.CharField(max_length=11, unique=True, verbose_name="Mobile Number")

    class Role(models.TextChoices):
        PATIENT = ('PATIENT', 'Patient')
        DOCTOR = ('DOCTOR', 'Doctor')
        LAB_STAFF = ('LAB_STAFF', 'Lab Staff')
        NURSE = ('NURSE', 'Nurse')

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)

    @property
    def is_doctor(self):
        return self.role == self.Role.DOCTOR

    @property
    def is_lab_staff(self):
        return self.role == self.Role.LAB_STAFF

    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT

    def __str__(self):
        return f"{self.username} ({self.get_full_name()})"

# 2. PatientProfile Model
class PatientProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_profile')
    blood_type = models.CharField(max_length=5, blank=True, null=True)
    insurance_number = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"Patient Profile: {self.user.get_full_name() or self.user.username}"

# 3. DoctorProfile Model
class DoctorProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_profile')
    medical_council_code = models.CharField(max_length=20, unique=True)
    specialty = models.CharField(max_length=100)

    def __str__(self):
        return f"Doctor Profile: {self.user.get_full_name() or self.user.username}"

class LabStaffProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lab_staff_profile')
    lab_name = models.CharField(max_length=150, verbose_name="Laboratory Name")
    personnel_code = models.CharField(max_length=50, unique=True, verbose_name="Personnel Code")

    def __str__(self):
        return f"Lab Staff: {self.user.get_full_name() or self.user.username} ({self.lab_name})"

# 4. Supporting Medical Models (Preserved and Integrated)
class TestCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Test Categories"

    def __str__(self):
        return self.name

class TestType(models.Model):
    category = models.ForeignKey(TestCategory, on_delete=models.RESTRICT, related_name='test_types')
    name = models.CharField(max_length=150)
    unit = models.CharField(max_length=20, null=True, blank=True)
    min_normal = models.FloatField(null=True, blank=True)
    max_normal = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name

class TestResult(models.Model):
    # Refactored relationships
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='tests')
    prescribing_doctor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name='prescribed_tests', on_delete=models.SET_NULL)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name='recorded_tests', on_delete=models.SET_NULL)
    
    # New required fields
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)
    
    # Preserving medical data fields
    test_type = models.ForeignKey(TestType, on_delete=models.RESTRICT, related_name='results', null=True, blank=True)
    result_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    result_text = models.CharField(max_length=50, null=True, blank=True)
    lab_min_range = models.FloatField(null=True, blank=True)
    lab_max_range = models.FloatField(null=True, blank=True)
    test_date = models.DateField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(max_length=500, null=True, blank=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['patient', 'test_date']),
        ]

    def __str__(self):
        return f"{self.title} - {self.patient} ({self.test_date})"

class Attachment(models.Model):
    test_result = models.ForeignKey(TestResult, on_delete=models.CASCADE, related_name='attachments')
    file_path = models.FileField(upload_to='attachments/')
    file_name = models.CharField(max_length=200)
    mime_type = models.CharField(max_length=50, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)
    target_id = models.BigIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.action} at {self.created_at}"

# Signals for Automatic Profile Creation
@receiver(post_save, sender=User)
def create_user_patient_profile(sender, instance, created, **kwargs):
    if created:
        PatientProfile.objects.create(user=instance)

# 5. PatientAccess Model (Guardian/Dependent Access)
class PatientAccess(models.Model):
    RELATIONSHIP_CHOICES = [
        ('PARENT', 'Parent'),
        ('GUARDIAN', 'Guardian'),
        ('SPOUSE', 'Spouse'),
        ('OTHER', 'Other'),
    ]
    ACCESS_LEVEL_CHOICES = [
        ('READ', 'Read'),
        ('FULL', 'Full'),
    ]
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='accesses')
    guardian = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_accesses')
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    access_level = models.CharField(max_length=10, choices=ACCESS_LEVEL_CHOICES, default='READ')
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('patient', 'guardian')
        verbose_name = 'Patient Access'
        verbose_name_plural = 'Patient Accesses'

    def __str__(self):
        return f"{self.guardian} -> {self.patient} ({self.relationship}, {self.access_level})"
