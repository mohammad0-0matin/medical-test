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

    def test_non_dependent_test_registration_inbox_and_reject(self):
        """Registering a test for a non-dependent creates pending status; inbox and reject work."""
        # 1. Normal user registers a test for patient_2 (other_user) who has no access link
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('test-result-list')
        data = {
            'patient': self.patient_2.id,
            'test_type': self.test_type.id,
            'result_value': 110.0,
            'test_date': timezone.now().date()
        }
        create_res = self.client.post(url, data, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        test_id = create_res.data['id']
        self.assertEqual(create_res.data['status'], 'pending')

        # 2. Patient 2 (other_user) checks test-results inbox and sees this test
        self.client.force_authenticate(user=self.other_user)
        inbox_url = reverse('test-result-inbox')
        inbox_res = self.client.get(inbox_url)
        self.assertEqual(inbox_res.status_code, status.HTTP_200_OK)
        inbox_ids = [item['id'] for item in inbox_res.data]
        self.assertIn(test_id, inbox_ids)

        # Patient 2 does not see it in normal list yet (since status is pending)
        list_res_p2 = self.client.get(url)
        p2_ids = [res['id'] for res in (list_res_p2.data if isinstance(list_res_p2.data, list) else list_res_p2.data.get('results', []))]
        self.assertNotIn(test_id, p2_ids)

        # 3. Patient 2 rejects the test: "یا رد کنه و برای هر دو ثبت نشه"
        review_url = reverse('test-result-review', kwargs={'pk': test_id})
        reject_res = self.client.post(review_url, {'action': 'reject'}, format='json')
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)

        # 4. Confirm neither Patient 2 nor Submitter (normal_user) sees the test in test-results list
        list_p2_after = self.client.get(url)
        p2_ids_after = [res['id'] for res in (list_p2_after.data if isinstance(list_p2_after.data, list) else list_p2_after.data.get('results', []))]
        self.assertNotIn(test_id, p2_ids_after)

        self.client.force_authenticate(user=self.normal_user)
        list_submitter_after = self.client.get(url)
        submitter_ids_after = [res['id'] for res in (list_submitter_after.data if isinstance(list_submitter_after.data, list) else list_submitter_after.data.get('results', []))]
        self.assertNotIn(test_id, submitter_ids_after)

    def test_non_dependent_test_registration_and_approve(self):
        """Registering a test for a non-dependent and approving makes it visible to both."""
        self.client.force_authenticate(user=self.normal_user)
        url = reverse('test-result-list')
        data = {
            'patient': self.patient_2.id,
            'test_type': self.test_type.id,
            'result_value': 115.0,
            'test_date': timezone.now().date()
        }
        create_res = self.client.post(url, data, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        test_id = create_res.data['id']
        self.assertEqual(create_res.data['status'], 'pending')

        # Patient 2 approves it
        self.client.force_authenticate(user=self.other_user)
        review_url = reverse('test-result-review', kwargs={'pk': test_id})
        approve_res = self.client.post(review_url, {'action': 'approve'}, format='json')
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        # Both patient 2 and normal_user can see the approved test in the list
        list_p2 = self.client.get(url)
        p2_ids = [res['id'] for res in (list_p2.data if isinstance(list_p2.data, list) else list_p2.data.get('results', []))]
        self.assertIn(test_id, p2_ids)

        self.client.force_authenticate(user=self.normal_user)
        list_submitter = self.client.get(url)
        submitter_ids = [res['id'] for res in (list_submitter.data if isinstance(list_submitter.data, list) else list_submitter.data.get('results', []))]
        self.assertIn(test_id, submitter_ids)