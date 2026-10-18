import pytest
import json
from datetime import date
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from core.models import (
    Patient,
    UserPatientAccess,
    UserRole,
    Prescription,
    PrescriptionItem
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def patient_user_a(db):
    user = User.objects.create_user(username='patient_a', password='Password123', first_name='John', last_name='Doe')
    Patient.objects.create(user=user, first_name='John', last_name='Doe', national_code='1234567890')
    UserRole.objects.create(user=user, role=UserRole.ROLE_STANDARD)
    return user


@pytest.fixture
def patient_user_b(db):
    user = User.objects.create_user(username='patient_b', password='Password123', first_name='Jane', last_name='Smith')
    Patient.objects.create(user=user, first_name='Jane', last_name='Smith', national_code='0987654321')
    UserRole.objects.create(user=user, role=UserRole.ROLE_STANDARD)
    return user


@pytest.fixture
def doctor_user(db):
    user = User.objects.create_user(username='dr_house', password='Password123', first_name='Gregory', last_name='House')
    UserRole.objects.create(user=user, role=UserRole.ROLE_DOCTOR, medical_id='DOC-12345', specialty='Internal Medicine')
    return user


@pytest.fixture
def sample_prescription(db, patient_user_a):
    prescription = Prescription.objects.create(
        patient=patient_user_a.patient_profile,
        external_doctor_name='Dr. External Adams',
        external_doctor_specialty='Cardiology',
        external_doctor_clinic='City Clinic',
        external_doctor_license_number='LIC-9988',
        prescribed_date=date(2026, 9, 20),
        diagnosis='Hypertension',
        notes='Take pills regularly',
        source=Prescription.SOURCE_MANUAL,
        created_by=patient_user_a
    )
    PrescriptionItem.objects.create(
        prescription=prescription,
        drug_name='Amlodipine',
        strength_dose='5mg',
        form='Tablet',
        frequency='Once daily in the morning',
        duration='30 days',
        quantity='30 tablets',
        instructions='After breakfast',
        order=0
    )
    return prescription


@pytest.mark.django_db
class TestPrescriptionValidation:
    """Test Either/Or Doctor validation and item constraints."""

    def test_doctor_either_or_both_fails(self, api_client, patient_user_a, doctor_user):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-list')
        payload = {
            'registered_doctor': doctor_user.id,
            'external_doctor_name': 'Dr. External Both',
            'prescribed_date': '2026-09-24',
            'items': [
                {'drug_name': 'Amoxicillin', 'frequency': 'Every 8 hours'}
            ]
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'doctor' in response.data

    def test_doctor_either_or_neither_fails(self, api_client, patient_user_a):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-list')
        payload = {
            'prescribed_date': '2026-09-24',
            'items': [
                {'drug_name': 'Amoxicillin', 'frequency': 'Every 8 hours'}
            ]
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'doctor' in response.data

    def test_empty_items_fails(self, api_client, patient_user_a):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-list')
        payload = {
            'external_doctor_name': 'Dr. Valid External',
            'prescribed_date': '2026-09-24',
            'items': []
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'items' in response.data


@pytest.mark.django_db
class TestPrescriptionOwnershipAndPermissions:
    """Test ownership isolation and doctor access via UserPatientAccess."""

    def test_patient_can_access_own_prescription(self, api_client, patient_user_a, sample_prescription):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['uuid'] == str(sample_prescription.uuid)

    def test_patient_cannot_access_other_patient_prescription(self, api_client, patient_user_b, sample_prescription):
        api_client.force_authenticate(user=patient_user_b)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_doctor_cannot_read_without_approved_access(self, api_client, doctor_user, sample_prescription):
        api_client.force_authenticate(user=doctor_user)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_doctor_can_read_with_approved_user_patient_access(self, api_client, doctor_user, patient_user_a, sample_prescription):
        UserPatientAccess.objects.create(
            user=doctor_user,
            patient=patient_user_a.patient_profile,
            status='approved',
            access_level='read_only'
        )
        api_client.force_authenticate(user=doctor_user)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_doctor_cannot_read_when_registered_doctor_but_access_revoked(self, api_client, doctor_user, patient_user_a):
        prescription = Prescription.objects.create(
            patient=patient_user_a.patient_profile,
            registered_doctor=doctor_user,
            prescribed_date=date(2026, 9, 21),
            created_by=doctor_user
        )
        PrescriptionItem.objects.create(
            prescription=prescription,
            drug_name='Metformin',
            frequency='Twice daily'
        )
        UserPatientAccess.objects.create(
            user=doctor_user,
            patient=patient_user_a.patient_profile,
            status='rejected',
            access_level='read_only'
        )
        api_client.force_authenticate(user=doctor_user)
        url = reverse('prescription-detail', kwargs={'uuid': prescription.uuid})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_doctor_with_read_only_access_patch_fails_403(self, api_client, doctor_user, patient_user_a, sample_prescription):
        UserPatientAccess.objects.create(
            user=doctor_user,
            patient=patient_user_a.patient_profile,
            status='approved',
            access_level='read_only'
        )
        api_client.force_authenticate(user=doctor_user)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.patch(url, {'notes': 'Unauthorized doctor edit'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_doctor_with_read_only_access_delete_fails_403(self, api_client, doctor_user, patient_user_a, sample_prescription):
        UserPatientAccess.objects.create(
            user=doctor_user,
            patient=patient_user_a.patient_profile,
            status='approved',
            access_level='read_only'
        )
        api_client.force_authenticate(user=doctor_user)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unrelated_user_patch_and_delete_returns_404(self, api_client, patient_user_b, sample_prescription):
        api_client.force_authenticate(user=patient_user_b)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response_patch = api_client.patch(url, {'notes': 'Hacked'}, format='json')
        assert response_patch.status_code == status.HTTP_404_NOT_FOUND
        response_del = api_client.delete(url)
        assert response_del.status_code == status.HTTP_404_NOT_FOUND

    def test_create_with_another_patient_id_rejected(self, api_client, patient_user_a, patient_user_b):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-list')
        payload = {
            'patient': patient_user_b.patient_profile.id,
            'external_doctor_name': 'Dr. Stranger',
            'prescribed_date': '2026-09-24',
            'items': [{'drug_name': 'Aspirin', 'frequency': 'Daily'}]
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'patient' in response.data

    def test_create_with_no_patient_and_no_profile_rejected(self, api_client, db):
        user_without_profile = User.objects.create_user(username='no_profile_user', password='Password123')
        api_client.force_authenticate(user=user_without_profile)
        url = reverse('prescription-list')
        payload = {
            'external_doctor_name': 'Dr. Stranger',
            'prescribed_date': '2026-09-24',
            'items': [{'drug_name': 'Aspirin', 'frequency': 'Daily'}]
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'patient' in response.data

    def test_patient_field_is_read_only_on_update(self, api_client, patient_user_a, patient_user_b, sample_prescription):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.patch(url, {'patient': patient_user_b.patient_profile.id}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'patient' in response.data


@pytest.mark.django_db
class TestPrescriptionNestedCreateUpdateAndSoftDelete:
    """Test nested create, update with ID-matching sync, and soft delete."""

    def test_nested_create_prescription(self, api_client, patient_user_a):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-list')
        payload = {
            'external_doctor_name': 'Dr. Sample External',
            'external_doctor_specialty': 'Pediatrics',
            'prescribed_date': '2026-09-24',
            'diagnosis': 'Common Cold',
            'notes': 'Rest and hydration',
            'items': [
                {
                    'drug_name': 'Acetaminophen',
                    'strength_dose': '325mg',
                    'form': 'Tablet',
                    'frequency': 'Every 6 hours as needed',
                    'quantity': '20'
                },
                {
                    'drug_name': 'Vitamin C',
                    'strength_dose': '500mg',
                    'form': 'Effervescent tablet',
                    'frequency': 'Once daily',
                    'quantity': '10'
                }
            ]
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['items']) == 2
        p_uuid = response.data['uuid']
        prescription = Prescription.objects.get(uuid=p_uuid)
        assert prescription.items.count() == 2
        assert prescription.created_by == patient_user_a

    def test_nested_update_id_matching_sync(self, api_client, patient_user_a, sample_prescription):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        existing_item = sample_prescription.items.first()

        payload = {
            'external_doctor_name': 'Dr. External Adams Updated',
            'prescribed_date': '2026-09-20',
            'items': [
                {
                    'id': existing_item.id,
                    'drug_name': 'Amlodipine Besylate',
                    'strength_dose': '10mg',
                    'frequency': 'Once daily'
                },
                {
                    'drug_name': 'Hydrochlorothiazide',
                    'strength_dose': '12.5mg',
                    'frequency': 'Once daily in morning'
                }
            ]
        }
        response = api_client.put(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK

        sample_prescription.refresh_from_db()
        assert sample_prescription.external_doctor_name == 'Dr. External Adams Updated'
        assert sample_prescription.items.count() == 2

        existing_item.refresh_from_db()
        assert existing_item.drug_name == 'Amlodipine Besylate'
        assert existing_item.strength_dose == '10mg'

    def test_nested_update_omitted_item_is_soft_deleted(self, api_client, patient_user_a, sample_prescription):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        existing_item = sample_prescription.items.first()

        payload = {
            'external_doctor_name': 'Dr. External Adams',
            'prescribed_date': '2026-09-20',
            'items': [
                {
                    'drug_name': 'Losartan',
                    'strength_dose': '50mg',
                    'frequency': 'Once daily'
                }
            ]
        }
        response = api_client.put(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK

        assert sample_prescription.items.count() == 1
        existing_item.refresh_from_db()
        assert existing_item.is_deleted is True
        assert existing_item.deleted_at is not None
        assert existing_item.deleted_by == patient_user_a

    def test_patch_without_items_leaves_items_untouched(self, api_client, patient_user_a, sample_prescription):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        original_item = sample_prescription.items.first()
        original_drug = original_item.drug_name
        original_count = sample_prescription.items.count()

        # PATCH without 'items' key in payload
        response = api_client.patch(url, {'notes': 'Updated notes only'}, format='json')
        assert response.status_code == status.HTTP_200_OK

        sample_prescription.refresh_from_db()
        assert sample_prescription.notes == 'Updated notes only'
        assert sample_prescription.items.count() == original_count
        original_item.refresh_from_db()
        assert original_item.drug_name == original_drug
        assert original_item.is_deleted is False

    def test_update_with_unrelated_item_id_fails(self, api_client, patient_user_a, patient_user_b, sample_prescription):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})

        other_p = Prescription.objects.create(
            patient=patient_user_b.patient_profile,
            external_doctor_name='Other Doc',
            prescribed_date=date(2026, 9, 21),
            created_by=patient_user_b
        )
        other_item = PrescriptionItem.objects.create(
            prescription=other_p,
            drug_name='Other Drug',
            frequency='Daily'
        )

        payload = {
            'external_doctor_name': 'Dr. External Adams',
            'prescribed_date': '2026-09-20',
            'items': [
                {
                    'id': other_item.id,
                    'drug_name': 'Stolen Item',
                    'frequency': 'Daily'
                }
            ]
        }
        response = api_client.put(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_soft_delete_prescription(self, api_client, patient_user_a, sample_prescription):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-detail', kwargs={'uuid': sample_prescription.uuid})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        assert Prescription.objects.filter(uuid=sample_prescription.uuid).count() == 0
        raw = Prescription.all_objects.get(uuid=sample_prescription.uuid)
        assert raw.is_deleted is True
        assert raw.deleted_at is not None
        assert raw.deleted_by == patient_user_a


@pytest.mark.django_db
class TestPrescriptionScanFileAndDraftExtract:
    """Test scan_file upload validation, nosniff download, and draft extract endpoint."""

    def test_scan_file_validation_and_nosniff_download(self, api_client, patient_user_a):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-list')

        # 1. Reject fake image (magic bytes mismatch)
        fake_file = SimpleUploadedFile("fake.jpg", b"This is not a real JPEG image", content_type="image/jpeg")
        payload = {
            'external_doctor_name': 'Dr. Scan Test',
            'prescribed_date': '2026-09-24',
            'scan_file': fake_file,
            'items': json.dumps([{'drug_name': 'Paracetamol', 'frequency': 'Daily'}])
        }
        response = api_client.post(url, payload, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'scan_file' in response.data

        # 2. Accept valid JPEG magic bytes
        valid_jpeg_content = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 100
        real_file = SimpleUploadedFile("scan.jpg", valid_jpeg_content, content_type="image/jpeg")
        payload['scan_file'] = real_file
        response_ok = api_client.post(url, payload, format='multipart')
        assert response_ok.status_code == status.HTTP_201_CREATED
        p_uuid = response_ok.data['uuid']

        # 3. Download scan file and verify X-Content-Type-Options: nosniff
        download_url = reverse('prescription-download-scan', kwargs={'uuid': p_uuid})
        download_res = api_client.get(download_url)
        assert download_res.status_code == status.HTTP_200_OK
        assert download_res.headers.get('X-Content-Type-Options') == 'nosniff'

    def test_draft_extract_validation(self, api_client, patient_user_a):
        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-extract-draft')

        # Reject fake file (plain text instead of image or PDF)
        fake_file = SimpleUploadedFile("test.txt", b"plain text content", content_type="text/plain")
        res = api_client.post(url, {'file': fake_file}, format='multipart')
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in res.data


@pytest.mark.django_db
class TestPrescriptionQueryCount:
    """Test that list endpoint runs a bounded number of queries (avoids N+1)."""

    def test_list_query_count(self, api_client, patient_user_a, django_assert_num_queries):
        for i in range(5):
            p = Prescription.objects.create(
                patient=patient_user_a.patient_profile,
                external_doctor_name=f'Doctor {i}',
                prescribed_date=date(2026, 9, 20),
                created_by=patient_user_a
            )
            for j in range(3):
                PrescriptionItem.objects.create(
                    prescription=p,
                    drug_name=f'Drug {i}-{j}',
                    frequency='Daily',
                    order=j
                )

        api_client.force_authenticate(user=patient_user_a)
        url = reverse('prescription-list')

        # Queries should be bounded (User, UserPatientAccess, Prescriptions with select_related & prefetch)
        with django_assert_num_queries(3):
            response = api_client.get(url)
            assert response.status_code == status.HTTP_200_OK
            assert len(response.data['results']) >= 5
