"""Serializers translating between ORM models and API payloads.

Two read/write serializer pairs exist by design: ``TestResultReadSerializer``
returns the fully denormalized dashboard shape, while
``TestResultWriteSerializer`` validates incoming submissions. Persian string
literals (the "نامشخص"/"سیستم" fallbacks and validation messages) are runtime
values consumed by the UI and are intentionally preserved.
"""
from django.utils import timezone
from rest_framework import serializers
from .models import Patient, TestResult, TestType, Attachment, HealthSummary, TestReminder, ChatSession, ChatMessage
from django.contrib.auth.models import User

class TestTypeSerializer(serializers.ModelSerializer):
    """Expose test types together with their category name for dropdowns.

    Read-only projection of :class:`~core.models.TestType` rows enriched
    with the parent category name, used by frontend test-selection
    dropdowns.
    """

    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        """Fields mirrored from :class:`~core.models.TestType`."""

        model = TestType
        fields = ['id', 'name', 'category_name', 'unit', 'min_normal', 'max_normal']

class RegisterSerializer(serializers.ModelSerializer):
    """Create a Django user account from a public registration payload.

    The password is declared write-only so it can never echo back in
    responses.
    """

    # Write-only: the password is never serialized back out.
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        """Username plus optional real-name fields."""

        model = User
        fields = ['username', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        """Persist the account via ``create_user`` so the password is hashed.

        :param dict validated_data: Cleaned fields from the request payload.
        :returns: The newly created ``User`` instance.
        """
        # create_user() is essential here - it hashes the password.
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user
class PatientSerializer(serializers.ModelSerializer):
    """Serializer exposing unified clinical patient and authorization role data.

    Exposes related personal names and authorization attributes as read-only
    context fields while managing core patient demographic properties.
    """

    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    medical_role = serializers.SerializerMethodField()
    medical_id = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id',
            'user',
            'first_name',
            'last_name',
            'national_code',
            'birth_date',
            'insurance_provider',
            'phone_number',
            'medical_role',
            'medical_id',
            'has_seen_tour',
        ]
        read_only_fields = ['id', 'user']

    def get_medical_role(self, obj):
        """Safely retrieve role from related UserRole or return standard default."""
        role_profile = getattr(obj.user, 'user_role', None)
        return role_profile.role if role_profile else 'standard'

    def get_medical_id(self, obj):
        """Safely retrieve professional registry identifier or return empty string."""
        role_profile = getattr(obj.user, 'user_role', None)
        return role_profile.medical_id if role_profile else ''

class AttachmentSerializer(serializers.ModelSerializer):
    """Serialize uploaded report files attached to a test result.

    Exposes the file and its metadata (original name, MIME type, upload
    timestamp) for the dashboard attachment lists.
    """

    class Meta:
        """All attachment columns; the upload timestamp stays read-only."""

        model = Attachment
        fields = ['id', 'test_result', 'file_path', 'file_name', 'mime_type', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class TestResultReadSerializer(serializers.ModelSerializer):
    """Fully denormalized read shape consumed by the dashboard tables/timeline.

    Joins patient identity, test-type naming, catalog-derived reference
    range, nested attachments and creator attribution into a single payload,
    saving the frontend several round trips.
    """

    patient = PatientSerializer(read_only=True)
    test_type_name = serializers.ReadOnlyField(source='test_type.name')
    attachments = AttachmentSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    min_range = serializers.FloatField(source='test_type.min_normal', read_only=True)
    max_range = serializers.FloatField(source='test_type.max_normal', read_only=True)

    class Meta:
        """Complete dashboard field list (read side only)."""

        model = TestResult
        fields = [
            'id',
            'patient',
            'patient_name',
            'test_type',
            'test_type_name',
            'result_value',
            'result_text',
            'min_range',
            'max_range',
            'test_date',
            'recorded_at',
            'notes',
            'is_archived',
            'creator_name', 
            'attachments',
            'status'
        ]
    def get_patient_name(self, obj):
        """Resolve a human-readable patient name.

        Reads straight off the ``Patient`` row rather than the user relation
        and falls back to the owning account's username when the name fields
        are blank.

        :param obj: A ``TestResult`` instance.
        :returns: Display string, or the Persian "نامشخص" marker when no
            usable name is available.
        """
        if obj.patient:
            # Read straight from the patient record instead of the user relation.
            full_name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            
            # Plan B when the names are blank: show the account username.
            if full_name:
                return full_name
            elif hasattr(obj.patient, 'user') and obj.patient.user:
                return obj.patient.user.username
                
        return "نامشخص"
    def get_creator_name(self, obj):
        """Resolve who submitted the result (real name -> username -> system label)."""
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            # Prefer the real name; fall back to the username otherwise.
            return full_name if full_name else obj.created_by.username
        return "سیستم"

class TestResultWriteSerializer(serializers.ModelSerializer):
    """Validated write shape for creating/updating test results.

    Accepts the editable submission columns only; identity and attribution
    fields are filled in server-side by the viewset.
    """

    class Meta:
        """Editable submission columns only (identity fields stay server-side)."""

        model = TestResult
        fields = [
            'id',
            'patient',
            'test_type',
            'result_value',
            'result_text',
            'test_date',
            'notes',
            'is_archived',
            'status'
        ]

    def validate_test_date(self, value):
        """Reject future test dates with a field-level 400 error.

        :param value: Parsed date taken from the request payload.
        :raises serializers.ValidationError: When the date lies in the future.
        :returns: The validated date unchanged otherwise.
        """
        today = timezone.localdate()
        if value > today:
            raise serializers.ValidationError("تاریخ آزمایش نمی‌تواند در آینده باشد.")
        return value

    def validate(self, attrs):
        """Require at least one measurable result across the two carriers.

        A submission carrying neither a numeric ``result_value`` nor a
        qualitative ``result_text`` would be unreadable downstream, so it is
        rejected before any database write occurs.

        :param dict attrs: Cross-field payload being assembled.
        :raises serializers.ValidationError: When both result carriers are
            missing.
        :returns: The attributes unchanged when validation passes.
        """
        result_value = attrs.get('result_value')
        result_text = attrs.get('result_text')

        if result_value is None and not result_text:
            raise serializers.ValidationError(
                "باید حداقل یکی از مقادیر عددی (result_value) یا متنی (result_text) وارد شود."
            )

        return attrs
class HealthSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthSummary
        fields = [
            'allergies',
            'conditions',
            'medications',
            'care_plans',
            'immunizations',
            'screenings',
            'updated_at'
        ]


class TestReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestReminder
        fields = [
            'id',
            'title',
            'due_date',
            'frequency',
            'is_completed',
            'notes',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    # تعداد پیام‌های موجود در هر نشست را برمی‌گرداند
    messages_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'created_at', 'updated_at', 'messages_count']
        read_only_fields = ['id', 'created_at', 'updated_at']