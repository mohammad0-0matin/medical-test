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
        # ۱. ساخت کاربر ادمین و دو کاربر عادی
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

        # ۲. ساخت دو بیمار (همراه با مقداردهی فیلد اجباری user)
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

        # ۳. اعطای دسترسی به کاربر عادی فقط برای بیمار اول در جدول واسط
        UserPatientAccess.objects.create(
            user=self.normal_user,
            patient=self.patient_1
        )

        # ۴. ساخت دسته و نوع آزمایش تستی
        self.category = TestCategory.objects.create(name='بیوشیمی')
        self.test_type = TestType.objects.create(
            category=self.category,
            name='FBS',
            unit='mg/dL'
        )

        # ۵. ساخت نتیجه آزمایش برای بیمار دوم (که کاربر عادی نباید آن را ببیند)
        self.test_result_p2 = TestResult.objects.create(
            patient=self.patient_2,
            test_type=self.test_type,
            result_value=100.0,
            test_date=timezone.now().date()
        )

    def test_jwt_token_obtain(self):
        """تست دریافت توکن لاگین"""
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
        """تست عدم دسترسی کاربر عادی به آزمایش بیماران دیگر"""
        # لاگین به عنوان کاربر عادی
        self.client.force_authenticate(user=self.normal_user)
        
        url = reverse('test-result-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # استخراج داده‌ها چه در حالت Pagination چه بدون آن
        results = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        patient_ids = [res['patient']['id'] if isinstance(res['patient'], dict) else res['patient'] for res in results]
        
        # کاربر عادی نباید آزمایش بیمار دوم را در لیست ببیند
        self.assertNotIn(self.patient_2.id, patient_ids)

    def test_future_test_date_validation_fails(self):
        """تست رد شدن آزمایش با تاریخ در آینده"""
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