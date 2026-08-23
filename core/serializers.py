from django.utils import timezone
from rest_framework import serializers
from .models import Patient, TestResult, TestType, Attachment
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import TestType

class TestTypeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = TestType
        fields = ['id', 'name', 'category_name', 'unit', 'min_normal', 'max_normal']

class RegisterSerializer(serializers.ModelSerializer):
    # رمز عبور فقط برای نوشتن است و در پاسخ‌های API نمایش داده نمی‌شود
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        # استفاده از create_user بسیار مهم است تا رمز عبور هش شود!
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ['id', 'first_name', 'last_name', 'birth_date', 'user', 'national_code']


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'test_result', 'file_path', 'file_name', 'mime_type', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class TestResultReadSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    test_type_name = serializers.ReadOnlyField(source='test_type.name')
    attachments = AttachmentSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    class Meta:
        model = TestResult
        fields = [
            'id',
            'patient',
            'patient_name',
            'test_type',
            'test_type_name',
            'result_value',
            'result_text',
            'lab_min_range',
            'lab_max_range',
            'test_date',
            'recorded_at',
            'notes',
            'is_archived',
            'creator_name', 
            'attachments',
            'status'
        ]
    def get_patient_name(self, obj):
        if obj.patient:
            # 👈 اینجا به جای user، مستقیماً از خود patient می‌خوانیم
            full_name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            
            # اگر نام و نام خانوادگی خالی بود، به عنوان پلن B یوزرنیم را نشان بده
            if full_name:
                return full_name
            elif hasattr(obj.patient, 'user') and obj.patient.user:
                return obj.patient.user.username
                
        return "نامشخص"
    def get_creator_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            # اگر نام و نام خانوادگی داشت آن را نشان بده، در غیر این صورت یوزرنیم را برگردان
            return full_name if full_name else obj.created_by.username
        return "سیستم"

class TestResultWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = [
            'id',
            'patient',
            'test_type',
            'result_value',
            'result_text',
            'lab_min_range',
            'lab_max_range',
            'test_date',
            'notes',
            'is_archived',
            'status'
        ]

    def validate_test_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("تاریخ آزمایش نمی‌تواند در آینده باشد.")
        return value

    def validate(self, attrs):
        result_value = attrs.get('result_value')
        result_text = attrs.get('result_text')

        if result_value is None and not result_text:
            raise serializers.ValidationError(
                "باید حداقل یکی از مقادیر عددی (result_value) یا متنی (result_text) وارد شود."
            )

        return attrs