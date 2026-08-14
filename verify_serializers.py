import os, sys
sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
from core.models import PatientProfile, DoctorProfile, LabStaffProfile, TestResult
from core.serializers import TestResultWriteSerializer, TestResultReadSerializer

User = get_user_model()

try:
    print("Creating fixtures...")
    patient_user = User.objects.create_user(
        username='verify_p', password='P', national_code='11111',
        mobile='091', role=User.Role.PATIENT)
    lab_user = User.objects.create_user(
        username='verify_l', password='P', national_code='33333',
        mobile='093', role=User.Role.LAB_STAFF)
    doc_user = User.objects.create_user(
        username='verify_d', password='P', national_code='22222',
        mobile='092', role=User.Role.DOCTOR)
    DoctorProfile.objects.create(user=doc_user,
        medical_council_code='DOC-1', specialty='General')

    ws = TestResultWriteSerializer(data={
        'patient': patient_user.patient_profile.id,
        'title': 'Verify',
        'prescribing_doctor': doc_user.id,
        'test_type': None,
        'result_value': 95.5,
        'test_date': '2026-08-14'
    })
    if not ws.is_valid():
        raise Exception('serializers invalid')
    
    tr = ws.save()
    print(f'✓ Created TestResult(id={tr.id}, recorded_by={tr.recorded_by.username})')

    read = TestResultReadSerializer(tr).data
    assert read['recorded_by']['username'] == lab_user.username
    assert read['patient']['user']['username'] == patient_user.username
    print(f'✓ Read serializes correctly')
    print(f'  patient: {read["patient"]["user"]["username"]}')
    print(f'  prescribing_doctor: {read["prescribing_doctor"]["username"]}')
    print(f'  recorded_by: {read["recorded_by"]["username"]}')
    
    # cleanup
    TestResult.objects.filter(id=tr.id).delete()
    DoctorProfile.objects.filter(user__username='verify_d').delete()
    User.objects.filter(username__in=['verify_p', 'verify_l', 'verify_d']).delete()
    print('✓ Cleanup')
    print('Done.')
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
