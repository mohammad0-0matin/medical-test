"""Serializers translating between ORM models and API payloads.

Two read/write serializer pairs exist by design: ``TestResultReadSerializer``
returns the fully denormalized dashboard shape, while
``TestResultWriteSerializer`` validates incoming submissions. Persian string
literals (the "نامشخص"/"سیستم" fallbacks and validation messages) are runtime
values consumed by the UI and are intentionally preserved.
"""
import json
from django.utils import timezone
from django.db import transaction
from rest_framework import serializers
from .models import Patient, UserPatientAccess, TestResult, TestType, TestCategory, Attachment, HealthSummary, TestReminder, ChatSession, ChatMessage, Prescription, PrescriptionItem
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

    test_type = serializers.PrimaryKeyRelatedField(
        queryset=TestType.objects.all(),
        required=False,
        allow_null=True
    )
    custom_test_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    custom_unit = serializers.CharField(required=False, write_only=True, allow_blank=True)
    custom_min_normal = serializers.FloatField(required=False, write_only=True, allow_null=True)
    custom_max_normal = serializers.FloatField(required=False, write_only=True, allow_null=True)

    class Meta:
        """Editable submission columns only (identity fields stay server-side)."""

        model = TestResult
        fields = [
            'id',
            'patient',
            'test_type',
            'custom_test_name',
            'custom_unit',
            'custom_min_normal',
            'custom_max_normal',
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
        """
        if not attrs.get('test_type') and not attrs.get('custom_test_name'):
            raise serializers.ValidationError(
                {"test_type": "نوع آزمایش را انتخاب یا وارد کنید."}
            )

        result_value = attrs.get('result_value')
        result_text = attrs.get('result_text')

        if result_value is None and not result_text:
            raise serializers.ValidationError(
                "باید حداقل یکی از مقادیر عددی (result_value) یا متنی (result_text) وارد شود."
            )

        return attrs

    def create(self, validated_data):
        custom_name = validated_data.pop('custom_test_name', None)
        custom_unit = validated_data.pop('custom_unit', None)
        custom_min = validated_data.pop('custom_min_normal', None)
        custom_max = validated_data.pop('custom_max_normal', None)

        if not validated_data.get('test_type') and custom_name:
            default_cat, _ = TestCategory.objects.get_or_create(
                name="سایر آزمایش‌ها",
                defaults={"description": "دسته‌بندی آزمایش‌های ثبت‌شده توسط کاربر"}
            )
            test_type, _ = TestType.objects.get_or_create(
                name=custom_name.strip(),
                defaults={
                    'category': default_cat,
                    'unit': custom_unit or '',
                    'min_normal': custom_min,
                    'max_normal': custom_max,
                }
            )
            validated_data['test_type'] = test_type

        return super().create(validated_data)
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

class PrescriptionItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'drug_name', 'strength_dose', 'form',
            'frequency', 'duration', 'quantity', 'instructions', 'order'
        ]


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, required=False)
    registered_doctor_name = serializers.SerializerMethodField(read_only=True)
    patient_name = serializers.SerializerMethodField(read_only=True)
    scan_file_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'uuid', 'patient', 'patient_name', 'registered_doctor', 'registered_doctor_name',
            'external_doctor_name', 'external_doctor_specialty',
            'external_doctor_clinic', 'external_doctor_license_number',
            'prescribed_date', 'diagnosis', 'notes', 'source',
            'scan_file', 'scan_file_url', 'created_at', 'updated_at',
            'is_deleted', 'items'
        ]
        read_only_fields = [
            'uuid', 'created_at', 'updated_at', 'is_deleted', 'scan_file_url', 'patient_name'
        ]
        extra_kwargs = {
            'patient': {'required': False},
            'scan_file': {'write_only': True, 'required': False},
        }

    def get_registered_doctor_name(self, obj):
        if obj.registered_doctor:
            name = f"{obj.registered_doctor.first_name} {obj.registered_doctor.last_name}".strip()
            return name if name else obj.registered_doctor.username
        return None

    def get_patient_name(self, obj):
        if obj.patient:
            name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            return name if name else obj.patient.national_code
        return None

    def get_scan_file_url(self, obj):
        if obj.scan_file:
            return f"/api/prescriptions/{obj.uuid}/scan/"
        return None

    def to_internal_value(self, data):
        # Support multipart/form-data where items is passed as a JSON string or serialized list
        if hasattr(data, 'dict'):
            d = data.dict()
            if 'scan_file' in data:
                d['scan_file'] = data['scan_file']
            data = d
        elif hasattr(data, 'copy'):
            data = data.copy()

        if 'items' in data and isinstance(data['items'], str):
            try:
                data['items'] = json.loads(data['items'])
            except (ValueError, TypeError):
                try:
                    import ast
                    val = ast.literal_eval(data['items'])
                    if isinstance(val, list):
                        data['items'] = val
                except (ValueError, SyntaxError):
                    pass
        return super().to_internal_value(data)

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if (request and request.user.is_authenticated) else None

        # ۱. مدیریت پرونده بیمار (در ویرایش کاملاً فقط‌خواندنی است)
        if self.instance is not None:
            if 'patient' in attrs and attrs['patient'] != self.instance.patient:
                raise serializers.ValidationError({
                    "patient": "امکان تغییر بیمار برای نسخه ثبت‌شده وجود ندارد."
                })
            attrs.pop('patient', None)
        else:
            # در ایجاد: اعتبارسنجی مالکیت یا دسترسی با سطح نوشتن
            patient = attrs.get('patient')
            if not patient:
                own_profile = getattr(user, 'patient_profile', None) if user else None
                if not own_profile:
                    raise serializers.ValidationError({
                        "patient": "پرونده بیماری برای حساب کاربری شما یافت نشد. لطفاً پرونده بیمار مجاز را مشخص کنید."
                    })
                attrs['patient'] = own_profile
            else:
                own_profile = getattr(user, 'patient_profile', None) if user else None
                is_own = bool(own_profile and own_profile.id == patient.id)
                has_write_access = bool(
                    user and UserPatientAccess.objects.filter(
                        user=user,
                        patient=patient,
                        status='approved',
                        access_level__in=['owner', 'read_write']
                    ).exists()
                )
                is_staff = bool(user and user.is_staff)
                if not (is_own or has_write_access or is_staff):
                    raise serializers.ValidationError({
                        "patient": "شما مجوز ثبت نسخه برای این پرونده بیمار را ندارید."
                    })

        # ۲. بررسی انحصاری بودن اطلاعات پزشک صادرکننده
        registered_doctor = attrs.get('registered_doctor', getattr(self.instance, 'registered_doctor', None))
        external_name = attrs.get('external_doctor_name', getattr(self.instance, 'external_doctor_name', None))

        has_registered = bool(registered_doctor)
        has_external = bool(external_name and external_name.strip())

        if has_registered and has_external:
            raise serializers.ValidationError({
                "doctor": "لطفاً فقط یکی از دو گزینه (پزشک عضو سامانه یا نام پزشک خارج از سامانه) را انتخاب کنید."
            })
        if not has_registered and not has_external:
            raise serializers.ValidationError({
                "doctor": "مشخص کردن اطلاعات پزشک صادرکننده (عضو سامانه یا خارج از سامانه) الزامی است."
            })

        # ۳. اعتبارسنجی اقلام نسخه
        items = attrs.get('items', None)
        if self.instance is None and (items is None or len(items) == 0):
            raise serializers.ValidationError({
                "items": "ثبت حداقل یک قلم دارویی برای نسخه الزامی است."
            })
        if items is not None and len(items) == 0:
            raise serializers.ValidationError({
                "items": "ثبت حداقل یک قلم دارویی برای نسخه الزامی است."
            })

        # ۴. اعتبارسنجی فایل اسکن بر اساس محتوا (Magic Bytes) و حجم فایل
        scan_file = attrs.get('scan_file')
        if scan_file:
            if scan_file.size > 5 * 1024 * 1024:
                raise serializers.ValidationError({
                    "scan_file": "حجم فایل اسکن نباید بیش از ۵ مگابایت باشد."
                })
            header_bytes = scan_file.read(2048)
            scan_file.seek(0)
            is_jpeg = header_bytes.startswith(b'\xff\xd8\xff')
            is_png = header_bytes.startswith(b'\x89PNG\r\n\x1a\n')
            is_pdf = header_bytes.startswith(b'%PDF-')
            is_webp = header_bytes.startswith(b'RIFF') and len(header_bytes) >= 12 and header_bytes[8:12] == b'WEBP'
            if not (is_jpeg or is_png or is_pdf or is_webp):
                raise serializers.ValidationError({
                    "scan_file": "فرمت فایل اسکن مجاز نیست. لطفاً یک تصویر معتبر (JPEG, PNG, WebP) یا فایل PDF ارسال کنید."
                })

        return attrs


    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({"items": "ثبت حداقل یک قلم دارویی برای نسخه الزامی است."})

        request = self.context.get('request')
        user = request.user if (request and request.user.is_authenticated) else None
        if user and 'created_by' not in validated_data:
            validated_data['created_by'] = user

        with transaction.atomic():
            prescription = Prescription.objects.create(**validated_data)
            for idx, item_data in enumerate(items_data):
                item_data.pop('id', None)
                item_data['order'] = idx
                PrescriptionItem.objects.create(
                    prescription=prescription,
                    **item_data
                )
        return prescription

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        request = self.context.get('request')
        user = request.user if (request and request.user.is_authenticated) else None

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            if user:
                instance.updated_by = user
            instance.save()

            if items_data is not None:
                if len(items_data) == 0:
                    raise serializers.ValidationError({"items": "نسخه باید حداقل شامل یک قلم دارویی فعال باشد."})

                existing_items_dict = {
                    item.id: item for item in instance.items.filter(is_deleted=False)
                }

                # اعتبارسنجی اینکه همه شناسه‌های ارسالی متعلق به همین نسخه باشند
                submitted_ids = set()
                for item_data in items_data:
                    item_id = item_data.get('id')
                    if item_id:
                        if item_id not in existing_items_dict:
                            raise serializers.ValidationError({
                                "items": f"شناسه قلم دارویی {item_id} نامعتبر است یا به این نسخه تعلق ندارد."
                            })
                        submitted_ids.add(item_id)

                now = timezone.now()
                # حذف نرم اقلامی که در آرایه جدید حذف شده‌اند
                for item_id, existing_item in existing_items_dict.items():
                    if item_id not in submitted_ids:
                        existing_item.is_deleted = True
                        existing_item.deleted_at = now
                        existing_item.deleted_by = user
                        existing_item.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

                # ویرایش یا ایجاد اقلام ارسالی با حفظ ترتیب
                for idx, item_data in enumerate(items_data):
                    item_id = item_data.get('id')
                    item_data['order'] = idx
                    if item_id:
                        target_item = existing_items_dict[item_id]
                        for field, val in item_data.items():
                            if field != 'id':
                                setattr(target_item, field, val)
                        target_item.save()
                    else:
                        item_data.pop('id', None)
                        PrescriptionItem.objects.create(
                            prescription=instance,
                            **item_data
                        )

        return instance


class PrescriptionDraftItemSchemaSerializer(serializers.Serializer):
    """طرح‌واره اعتبارسنجی اقلام استخراج‌شده توسط هوش مصنوعی."""
    drug_name = serializers.CharField(max_length=200, required=True)
    strength_dose = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    form = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    frequency = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    duration = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    quantity = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    instructions = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class PrescriptionDraftSchemaSerializer(serializers.Serializer):
    """طرح‌واره اعتبارسنجی ساختار کلی پیش‌نویس استخراج‌شده از نسخه."""
    external_doctor_name = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    external_doctor_specialty = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    external_doctor_clinic = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    external_doctor_license_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    prescribed_date = serializers.DateField(required=False, allow_null=True)
    diagnosis = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    items = PrescriptionDraftItemSchemaSerializer(many=True, required=False, default=list)
