from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import (
    PatientProfile,
    DoctorProfile,
    LabStaffProfile,
    PatientAccess,
    TestCategory,
    TestType,
    TestResult,
)

User = get_user_model()


class RoleArchitectureTestCase(APITestCase):

    def setUp(self):
        # 1. Staff / Admin User
        self.staff_user = User.objects.create_user(
            username='staff_user',
            password='Password123',
            national_code='0000000001',
            mobile='09000000001',
            is_staff=True,
            role=User.Role.DOCTOR,
        )

        # 2. Patient User & Profile
        self.patient_user = User.objects.create_user(
            username='patient_user',
            password='Password123',
            national_code='1111111111',
            mobile='09111111111',
            first_name='Ali',
            last_name='Mohammadi',
            role=User.Role.PATIENT,
        )
        self.patient_profile = self.patient_user.patient_profile

        # 3. Doctor User & Profile
        self.doctor_user = User.objects.create_user(
            username='doctor_user',
            password='Password123',
            national_code='2222222222',
            mobile='09222222222',
            first_name='Dr',
            last_name='Smith',
            role=User.Role.DOCTOR,
        )
        self.doctor_profile = DoctorProfile.objects.create(
            user=self.doctor_user,
            medical_council_code='DOC-100',
            specialty='Cardiology',
        )

        # 4. Lab Staff User & Profile
        self.lab_user = User.objects.create_user(
            username='lab_user',
            password='Password123',
            national_code='3333333333',
            mobile='09333333333',
            first_name='Lab',
            last_name='Operator',
            role=User.Role.LAB_STAFF,
        )
        self.lab_profile = LabStaffProfile.objects.create(
            user=self.lab_user,
            lab_name='Central Lab',
            personnel_code='LAB-500',
        )

        # 5. Supporting Test Types
        self.category = TestCategory.objects.create(name='Biochemistry')
        self.test_type = TestType.objects.create(
            category=self.category,
            name='FBS',
            unit='mg/dL',
            min_normal=70.0,
            max_normal=100.0,
        )

        # 6. Existing Test Result
        self.test_result = TestResult.objects.create(
            title='FBS Test Result',
            patient=self.patient_profile,
            prescribing_doctor=self.doctor_user,
            recorded_by=self.lab_user,
            test_type=self.test_type,
            result_value=95.0,
            test_date=timezone.now().date(),
        )

    def test_user_role_properties(self):
        """Test the helper properties on the User model."""
        self.assertTrue(self.patient_user.is_patient)
        self.assertFalse(self.patient_user.is_doctor)
        self.assertFalse(self.patient_user.is_lab_staff)

        self.assertTrue(self.doctor_user.is_doctor)
        self.assertFalse(self.doctor_user.is_patient)

        self.assertTrue(self.lab_user.is_lab_staff)
        self.assertFalse(self.lab_user.is_patient)

    def test_lab_staff_patient_lookup(self):
        """Lab staff can look up a patient by national code."""
        self.client.force_authenticate(user=self.lab_user)
        url = reverse('patient-lookup') + '?national_code=1111111111'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.patient_profile.id)

    def test_lab_staff_can_create_test_result(self):
        """Lab staff can record a test result for any patient."""
        self.client.force_authenticate(user=self.lab_user)
        url = reverse('test-result-list')
        data = {
            'title': 'Lipid Profile',
            'patient': self.patient_profile.id,
            'prescribing_doctor': self.doctor_user.id,
            'test_type': self.test_type.id,
            'result_value': 120.0,
            'test_date': str(timezone.now().date()),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['recorded_by']['id'], self.lab_user.id)
        self.assertEqual(response.data['prescribing_doctor']['id'], self.doctor_user.id)

    def test_future_test_date_validation_fails(self):
        """Test date in future is rejected by serializer."""
        self.client.force_authenticate(user=self.lab_user)
        url = reverse('test-result-list')
        future_date = timezone.now().date() + timedelta(days=5)
        data = {
            'title': 'Future Test',
            'patient': self.patient_profile.id,
            'test_type': self.test_type.id,
            'result_value': 100.0,
            'test_date': str(future_date),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('test_date', response.data)
