from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Patient, TestResult, UserPatientAccess, Attachment
from .permissions import IsPatientOwnerOrStaff
from .serializers import (
    PatientSerializer,
    TestResultReadSerializer,
    TestResultWriteSerializer,
    AttachmentSerializer
)
from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from .serializers import RegisterSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    # این خط اجازه می‌دهد همه (حتی کاربران لاگین نشده) بتوانند ثبت‌نام کنند
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class PatientViewSet(ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Patient.objects.all()

        allowed_patient_ids = UserPatientAccess.objects.filter(user=user).values_list('patient_id', flat=True)
        return Patient.objects.filter(id__in=allowed_patient_ids)


class TestResultViewSet(ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'test_type', 'is_archived']
    search_fields = ['patient__first_name', 'patient__last_name']
    ordering_fields = ['test_date', 'recorded_at']
    ordering = ['-test_date']
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user
        base_queryset = TestResult.objects.select_related('patient', 'test_type')

        if user.is_staff:
            return base_queryset.all()

        allowed_patient_ids = UserPatientAccess.objects.filter(user=user).values_list('patient_id', flat=True)
        return base_queryset.filter(patient_id__in=allowed_patient_ids)

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return TestResultReadSerializer
        return TestResultWriteSerializer


class AttachmentViewSet(ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Attachment.objects.all()

        allowed_patient_ids = UserPatientAccess.objects.filter(user=user).values_list('patient_id', flat=True)
        return Attachment.objects.filter(test_result__patient_id__in=allowed_patient_ids)