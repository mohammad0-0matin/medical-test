from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import PatientProfile, PatientAccess, TestResult, Attachment
from .permissions import IsPatientOwnerOrStaff, IsLabStaff, LabStaffCanCreateTestResult
from .serializers import (
    PatientProfileSerializer,
    PatientAccessSerializer,
    TestResultReadSerializer,
    TestResultWriteSerializer,
    AttachmentSerializer,
)
from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """View to get/update the current authenticated user's profile info."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class MyDependentsView(generics.ListAPIView):
    """View to list all patient profiles that the current user has been granted access to as a guardian."""
    serializer_class = PatientAccessSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PatientAccess.objects.filter(
            guardian=self.request.user,
            is_active=True
        ).select_related('patient', 'patient__user')


class PatientLookupView(generics.GenericAPIView):
    """
    Endpoint for Lab Staff to look up a patient by national_code.
    Usage: GET /api/patients/lookup/?national_code=1234567890
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PatientProfileSerializer

    def get(self, request, *args, **kwargs):
        national_code = request.query_params.get('national_code', None)
        if not national_code:
            return Response(
                {"detail": "national_code query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(national_code=national_code, role=User.Role.PATIENT)
            patient_profile = PatientProfile.objects.get(user=user)
            serializer = self.get_serializer(patient_profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {"detail": "No patient found with that national code."},
                status=status.HTTP_404_NOT_FOUND
            )
        except PatientProfile.DoesNotExist:
            return Response(
                {"detail": "User found but no patient profile exists."},
                status=status.HTTP_404_NOT_FOUND
            )


class PatientProfileViewSet(ModelViewSet):
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return PatientProfile.objects.all()
        # Lab staff can look up patients via the dedicated lookup endpoint;
        # they see only their own profile in the standard list view.
        if user.is_lab_staff:
            return PatientProfile.objects.filter(user=user)
        # A user can see their own profile, or profiles they have active access to as a guardian
        guardian_patient_ids = PatientAccess.objects.filter(
            guardian=user,
            is_active=True
        ).values_list('patient_id', flat=True)
        return PatientProfile.objects.filter(
            models.Q(user=user) | models.Q(id__in=guardian_patient_ids)
        )


class TestResultViewSet(ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'test_type', 'is_archived']
    search_fields = ['title', 'patient__user__first_name', 'patient__user__last_name', 'patient__user__national_code']
    ordering_fields = ['test_date', 'recorded_at']
    ordering = ['-test_date']
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff, LabStaffCanCreateTestResult]

    def get_queryset(self):
        user = self.request.user
        base_queryset = TestResult.objects.select_related(
            'patient', 'test_type', 'prescribing_doctor', 'recorded_by'
        )

        if user.is_staff:
            return base_queryset.all()

        if user.is_lab_staff:
            # Lab staff see results they recorded
            return base_queryset.filter(
                models.Q(recorded_by=user)
            )

        # Get patient IDs for which the user is an active guardian
        guardian_patient_ids = PatientAccess.objects.filter(
            guardian=user,
            is_active=True
        ).values_list('patient_id', flat=True)

        # Allow access if test result belongs to the user, prescribing doctor, or a dependent
        return base_queryset.filter(
            models.Q(patient__user=user) |
            models.Q(prescribing_doctor=user) |
            models.Q(patient_id__in=guardian_patient_ids)
        )

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return TestResultReadSerializer
        return TestResultWriteSerializer

    def perform_create(self, serializer):
        # Automatically set recorded_by to the current user
        serializer.save(recorded_by=self.request.user)


class AttachmentViewSet(ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Attachment.objects.all()

        if user.is_lab_staff:
            return Attachment.objects.filter(
                test_result__recorded_by=user
            )

        guardian_patient_ids = PatientAccess.objects.filter(
            guardian=user,
            is_active=True
        ).values_list('patient_id', flat=True)

        return Attachment.objects.filter(
            models.Q(test_result__patient__user=user) |
            models.Q(test_result__prescribing_doctor=user) |
            models.Q(test_result__patient_id__in=guardian_patient_ids)
        )