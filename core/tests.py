from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Patient, TestCategory, TestType, TestResult, UserPatientAccess

User = get_user_model()


class MedicalAPITestCase(APITestCase):

    def setUp(self):
        # 1. Create one staff user and two regular users.
        self.staff_user = User.objects.create_user(
            username='staff_user',
            password='Password123',
            is_staff=True
        )
        self.normal_user = User.objects.create_user(
            username='normal_user',
            password='Password123',
            is_staff=False
        )
        self.other_user = User.objects.create_user(
            username='other_user',
            password='Password123',
            is_staff=False
        )

        # 2. Create two patients (the mandatory user field is assigned here).
        self.patient_1 = Patient.objects.create(
            first_name='علی',
            last_name='محمدی',
            user=self.normal_user
        )
        self.patient_2 = Patient.objects.create(
            first_name='مریم',
            last_name='حسینی',
            user=self.other_user
        )

        # 3. Grant the regular user access to patient 1 only, via the through-table.
        UserPatientAccess.objects.create(
            user=self.normal_user,
            patient=self.patient_1
        )

        # 4. Create a lab-test category and test type.
        self.category = TestCategory.objects.create(name='بیوشیمی')
        self.test_type = TestType.objects.create(
            category=self.category,
            name='FBS',
            unit='mg/dL'
        )

        # 5. Create a result for patient 2, which the regular user must not see.
        self.test_result_p2 = TestResult.objects.create(
            patient=self.patient_2,
            test_type=self.test_type,
            result_value=100.0,
            test_date=timezone.now().date()
        )

    def test_jwt_token_obtain(self):
        """JWT access/refresh tokens can be obtained with valid credentials."""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'normal_user',
            'password': 'Password123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_patient_access_restriction(self):
        """A regular user cannot list another patient's test results."""
        # Authenticate as the regular user.
        self.client.force_authenticate(user=self.normal_user)
        
        url = reverse('test-result-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Extract the results whether pagination is enabled or not.
        results = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        patient_ids = [res['patient']['id'] if isinstance(res['patient'], dict) else res['patient'] for res in results]
        
        # The regular user must not see patient 2's result in the list.
        self.assertNotIn(self.patient_2.id, patient_ids)

    def test_future_test_date_validation_fails(self):
        """A submission carrying a future test date is rejected."""
        self.client.force_authenticate(user=self.staff_user)
        
        url = reverse('test-result-list')
        future_date = timezone.now().date() + timedelta(days=5)
        data = {
            'patient': self.patient_1.id,
            'test_type': self.test_type.id,
            'result_value': 120.0,
            'test_date': future_date
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('test_date', response.data)