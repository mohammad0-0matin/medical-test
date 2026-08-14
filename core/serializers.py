from django.utils import timezone
from rest_framework import serializers
from .models import PatientProfile, LabStaffProfile, PatientAccess, TestResult, TestType, Attachment
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'password', 'first_name', 'last_name', 'national_code', 'mobile', 'role']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            national_code=validated_data.get('national_code', ''),
            mobile=validated_data.get('mobile', ''),
            role=validated_data.get('role', User.Role.PATIENT),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'national_code', 'mobile', 'role']
        read_only_fields = ['id']


class LabStaffProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = LabStaffProfile
        fields = ['id', 'user', 'lab_name', 'personnel_code']
        read_only_fields = ['id']


class LabStaffProfileWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabStaffProfile
        fields = ['lab_name', 'personnel_code']


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ['id', 'user', 'blood_type', 'insurance_number']


class PatientProfileReadSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PatientProfile
        fields = ['id', 'user', 'blood_type', 'insurance_number']
        read_only_fields = ['id']


class PatientAccessSerializer(serializers.ModelSerializer):
    patient = PatientProfileReadSerializer(read_only=True)

    class Meta:
        model = PatientAccess
        fields = ['id', 'patient', 'relationship', 'access_level', 'is_active']


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'test_result', 'file_path', 'file_name', 'mime_type', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class TestResultReadSerializer(serializers.ModelSerializer):
    patient = PatientProfileReadSerializer(read_only=True)
    prescribing_doctor = UserSerializer(read_only=True)
    recorded_by = UserSerializer(read_only=True)
    test_type_name = serializers.ReadOnlyField(source='test_type.name')
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = TestResult
        fields = [
            'id',
            'patient',
            'prescribing_doctor',
            'recorded_by',
            'title',
            'test_type',
            'test_type_name',
            'result_value',
            'result_text',
            'lab_min_range',
            'lab_max_range',
            'test_date',
            'recorded_at',
            'created_at',
            'notes',
            'is_archived',
            'attachments',
        ]


class TestResultWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = [
            'id',
            'patient',
            'prescribing_doctor',
            'title',
            'test_type',
            'result_value',
            'result_text',
            'lab_min_range',
            'lab_max_range',
            'test_date',
            'notes',
            'is_archived',
        ]
        read_only_fields = ['recorded_by']

    def validate_test_date(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Test date cannot be in the future.")
        return value

    def create(self, validated_data):
        return TestResult.objects.create(**validated_data)

    def to_representation(self, instance):
        return TestResultReadSerializer(instance, context=self.context).data