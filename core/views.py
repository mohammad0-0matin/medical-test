"""
REST API views for patients, test results, attachments and access control.

Includes ModelViewSets with record-level queryset scoping plus dedicated
APIView endpoints for registration, profile completion and the family-access
request/inbox workflow. Persian strings inside responses are runtime values
returned to the UI and are intentionally preserved.
"""
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Patient, TestResult, UserPatientAccess, Attachment, UserRole, ChatSession, ChatMessage
from django.db.models import Q
from django.shortcuts import get_object_or_404
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
from .serializers import RegisterSerializer,HealthSummarySerializer, TestReminderSerializer
from rest_framework import viewsets
from .models import TestType, HealthSummary, TestReminder, Patient
from .serializers import TestTypeSerializer, ChatSessionSerializer, ChatMessageSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from .ai_service import generate_ai_reply

class TestTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only catalog of lab test types with their categories pre-fetched.

    Any authenticated user may list/retrieve the catalog; staff manage
    entries through the Django admin. ``select_related('category')`` avoids
    an N+1 query when serializing ``category_name``.
    """

    queryset = TestType.objects.select_related('category').all()
    serializer_class = TestTypeSerializer
    permission_classes = [IsAuthenticated]

class RegisterView(generics.CreateAPIView):
    """Public account-registration endpoint (POST only).

    Open to anonymous callers so new users can sign up; responds 201 with
    the created user payload or 400 with field validation errors.
    """

    queryset = User.objects.all()
    # Allow everyone, including logged-out visitors, to register.
    authentication_classes = ()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class PatientViewSet(ModelViewSet):
    """CRUD for patient records scoped to the requesting user's visibility.

    List/retrieve results are limited to profiles the user owns or can see
    through an approved access grant; object-level mutations additionally
    pass :class:`~core.permissions.IsPatientOwnerOrStaff`.
    """

    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]
    
    def get_queryset(self):
        """Scope records to owned profiles plus approved-access shares.

        :returns: A distinct ``Patient`` queryset: profiles the user owns,
            plus profiles shared with them through an ``approved``
            :class:`~core.models.UserPatientAccess` row.
        """
        user = self.request.user
        return Patient.objects.filter(
            Q(user=user) |
            Q(user_accesses__user=user, user_accesses__status='approved')  # Only approved grants count.
        ).distinct()
        
    @action(detail=False, methods=['get'], url_path='search')
    def search_global(self, request):
        """Look up a patient by exact national code for access requests.

        Query parameter ``q`` carries the national code, e.g.
        ``/api/patients/search/?q=1234567890``.

        :returns:
            * 200 -- serialized list of matching patients.
            * 400 -- missing/blank ``q`` parameter.
            * 404 -- no patient found for the given code.
        """
        # Read the searched term (e.g. from /api/patients/search/?q=1234567890).
        search_query = request.query_params.get('q', '').strip()
        if not search_query:
            return Response(
                {"detail": "لطفاً کد ملی یا شناسه بیمار را وارد کنید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Filters on the national_code column; adjust the lookup here if the
        # identifier field ever changes (e.g. to user__username).
        patients = Patient.objects.filter(national_code=search_query)

        if not patients.exists():
            return Response(
                {"detail": "بیماری با این مشخصات یافت نشد."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Serialize the matching patients and return them.
        serializer = self.get_serializer(patients, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get', 'post', 'put', 'patch'], url_path='me')
    def my_profile(self, request):
        """Retrieve or update unified personal, clinical, and authorization profile.

        GET returns the caller's complete profile combining base auth account
        names, clinical identifiers (:class:`~core.models.Patient`), and system
        privileges (:class:`~core.models.UserRole`). Write methods
        (POST/PUT/PATCH) synchronize real-name properties onto ``User``, assign
        clinical roles/credentials onto ``UserRole``, and create or partially
        update demographic and insurance attributes on the underlying
        ``Patient`` record.

        :param request: Incoming HTTP request context carrying the authenticated
            user and submitted payload.
        :returns:
            * 200 -- Serialized profile dataset after successful retrieval or
              state mutation.
            * 400 -- Payload validation errors returned by
              :class:`~core.serializers.PatientSerializer`.
            * 404 -- Returned on GET requests when no initialized medical profile
              exists for the authenticated user.
        """
        user = request.user
        patient = Patient.objects.filter(user=user).first()

        # 1. Fetch current medical and authorization record.
        if request.method == 'GET':
            if patient:
                serializer = self.get_serializer(patient)
                return Response(serializer.data)
            return Response(
                {"detail": "پرونده تکمیل نشده است."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Extract payload for side-effects
        data = request.data

        # 3. Synchronize core user legal name fields.
        if 'first_name' in data:
            user.first_name = data.get('first_name', user.first_name)
        if 'last_name' in data:
            user.last_name = data.get('last_name', user.last_name)
        user.save()

        # 4. Synchronize clinical identity and professional identifiers on UserRole.
        role_profile, _ = UserRole.objects.get_or_create(user=user)
        if 'medical_role' in data:
            role_profile.role = data['medical_role']
        if 'medical_id' in data:
            role_profile.medical_id = (
                data['medical_id'] if data.get('medical_role') != UserRole.ROLE_STANDARD else ''
            )
        role_profile.save()

        # 5. Persist demographic, insurance, and national code on Patient record.
        if patient:
            serializer = self.get_serializer(patient, data=data, partial=True)
        else:
            serializer = self.get_serializer(data=data)

        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)     
class TestResultViewSet(ModelViewSet):
    """CRUD for test results with dashboard-oriented read/write serializers.

    List/retrieve responses use
    :class:`~core.serializers.TestResultReadSerializer` (denormalized
    dashboard shape); every other action uses the validating write
    serializer. Queryset scoping, the owner review workflow and record-level
    permissions mirror the patient rules; filtering/search/ordering are
    configured below.
    """

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'test_type', 'is_archived']
    search_fields = ['patient__first_name', 'patient__last_name']
    ordering_fields = ['test_date', 'recorded_at']
    ordering = ['-test_date']
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]
    
    def get_queryset(self):
        """Scope results to submitter audit logs and approved patient records.

        Submitters retain visibility over all records they personally authored
        (including those marked as ``rejected``), while patient profile owners
        and approved access grantees only see tests in the ``approved`` state.

        :returns: A distinct ``TestResult`` queryset with related patient and
            test type entities pre-fetched.
        """
        user = self.request.user
        base_queryset = TestResult.objects.select_related('patient', 'test_type')

        # 1. Submitter retains audit visibility over all authored entries.
        created_by_user = Q(created_by=user)

        # 2. Patients and approved delegates only observe confirmed tests.
        accessible_as_patient = (
            Q(patient__user=user) |
            Q(patient__user_accesses__user=user, patient__user_accesses__status='approved')
        ) & Q(status='approved')

        return base_queryset.filter(created_by_user | accessible_as_patient).distinct()

    def get_serializer_class(self):
        """Return the read serializer for list/retrieve, write serializer otherwise."""
        if self.action in ['list', 'retrieve']:
            return TestResultReadSerializer
        return TestResultWriteSerializer
    def perform_create(self, serializer):
        """Assign attribution and set the initial review status.

        The submitting user is always recorded in ``created_by``. Results
        saved onto the user's own profile are auto-approved; results saved
        onto somebody else's profile stay ``pending`` until that owner
        reviews them through the ``review`` action.

        :param serializer: The write serializer holding validated data.
        """
        user = self.request.user
        patient = serializer.validated_data.get('patient')

        # Empty patient field means the user is recording a test for
        # themselves; fall back to their own profile.
        if not patient:
            from core.models import Patient  # Local re-import; mirrors the top-level import.
            try:
                patient = Patient.objects.get(user=user)
                serializer.save(patient=patient, created_by=user, status='approved')
                return
            except Patient.DoesNotExist:
                pass

        # When a patient was supplied, check whether it is the user's own profile.
        if patient and patient.user_id == user.id:
            serializer.save(created_by=user, status='approved')
        else:
            serializer.save(created_by=user, status='pending')
    @action(detail=False, methods=['get'], url_path='inbox')
    def inbox(self, request):
        """List results on the caller's own profile still awaiting review.

        :returns: 200 with ``TestResultReadSerializer`` data for every
            ``pending`` result attached to the caller's patient profile.
        """
        user = request.user
        # Find results that belong to this user's profile but are still pending.
        pending_tests = TestResult.objects.filter(
            patient__user=user,
            status='pending'
        ).select_related('created_by', 'test_type')
        serializer = TestResultReadSerializer(pending_tests, many=True)
        return Response(serializer.data)
    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        """Approve or reject a test result submitted to the caller's profile.

        Applies a soft status transition to prevent physical deletion and
        maintain clinical audit history. Only the profile owner holding the
        underlying patient record may perform this action.

        :param pk: Primary key of the target ``TestResult`` to review.
        :returns:
            * 200 -- Confirmation message after successfully updating status.
            * 400 -- Unrecognized ``action`` value in payload.
            * 403 -- Caller does not own the target patient record.
            * 404 -- Test result matching ``pk`` does not exist.
        """
        test_result = get_object_or_404(TestResult, pk=pk)
        action_type = request.data.get('action')

        # Security lock: the target record must belong directly to the caller.
        if test_result.patient.user_id != request.user.id:
            return Response(
                {"detail": "شما اجازه تغییر وضعیت این آزمایش را ندارید."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        if action_type == 'approve':
            test_result.status = 'approved'
            test_result.save(update_fields=['status'])
            return Response({"detail": "آزمایش با موفقیت تایید و به پرونده اضافه شد."})

        elif action_type == 'reject':
            test_result.status = 'rejected'
            test_result.save(update_fields=['status'])
            return Response({"detail": "آزمایش رد شد و از دید پرونده شما خارج گردید."})
        
        return Response({"detail": "عملیات نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
class AttachmentViewSet(ModelViewSet):
    """CRUD for report files attached to test results.

    List/retrieve is scoped through :meth:`get_queryset`; object-level
    mutations additionally pass
    :class:`~core.permissions.IsPatientOwnerOrStaff`.
    """

    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]

    def get_queryset(self):
        """Scope attachments to the caller's own and approved-shared records.

        :returns: Staff see every attachment; regular users see only
            attachments whose parent test result belongs to a patient they
            hold an access row for.
        """
        user = self.request.user
        if user.is_staff:
            return Attachment.objects.all()

        allowed_patient_ids = UserPatientAccess.objects.filter(user=user).values_list('patient_id', flat=True)
        return Attachment.objects.filter(test_result__patient_id__in=allowed_patient_ids)


# class AddDependentView(APIView):
#     """Legacy endpoint adding a dependent record directly by national code.

#     Unlike :class:`RequestAccessView`, the access row is created immediately
#     without the pending-approval step. Responds 200 when the record is
#     linked, 400 when the national code is missing, 404 when no record
#     matches and 500 for unexpected failures.
#     """

#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         """Create (or reuse) an access row for the given national code.

#         :param request: POST payload with a ``national_code`` field.
#         :returns:
#             * 200 -- access linked; confirmation message with the patient name.
#             * 400 -- missing national code.
#             * 404 -- no medical record with that national code.
#             * 500 -- unexpected internal error.
#         """
#         search_value = request.data.get('national_code')
#         if not search_value:
#             return Response({'error': 'لطفاً کد ملی فرزند را وارد کنید.'}, status=status.HTTP_400_BAD_REQUEST)
        
#         try:
#             # Look the patient record up directly by national code.
#             patient = Patient.objects.filter(national_code=search_value).first()
#             if not patient:
#                 return Response(
#                     {'error': 'هیچ پرونده پزشکی با این کد ملی در سیستم ثبت نشده است.'}, 
#                     status=status.HTTP_404_NOT_FOUND
#                 )
#             # Create (or reuse) the access row for the requesting guardian.
#             UserPatientAccess.objects.get_or_create(user=request.user, patient=patient)

#             display_name = f"{patient.first_name} {patient.last_name}".strip()

#             return Response({
#                 'message': f'اطلاعات {display_name} با موفقیت به پنل شما اضافه شد.'
#             }, status=status.HTTP_200_OK)

#         except Patient.DoesNotExist:
#             return Response({'error': 'هیچ پرونده پزشکی با این کد ملی در سیستم ثبت نشده است.'}, status=status.HTTP_404_NOT_FOUND)
#         except Exception as e:
#             return Response({'error': f'خطای سیستمی: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# # 1. API for submitting an access request (by the guardian/relative).
class RequestAccessView(APIView):
    """Submit a read-only access request to another patient's medical record.

    Looks up the target record by national code using a non-throwing lookup,
    ensures the requester cannot request access to their own profile, and
    creates a ``pending`` :class:`~core.models.UserPatientAccess` grant awaiting
    record owner approval.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Request access to the record identified by ``national_code``.

        :param request: The incoming HTTP request carrying ``national_code``.
        :returns:
            * 201 -- Access request created successfully with ``pending`` status.
            * 400 -- Missing national code, self-request attempt, or duplicate open request.
            * 404 -- No patient profile found matching the provided national code.
        """
        national_code = request.data.get('national_code')
        if not national_code:
            return Response(
                {"error": "لطفا کد ملی را وارد کنید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Safe lookup preventing MultipleObjectsReturned / unhandled 500 errors.
        target_patient = Patient.objects.filter(national_code=national_code).first()
        if not target_patient:
            return Response(
                {"error": "بیماری با این کد ملی در سیستم یافت نشد."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Security check: prevent requesting access to one's own medical record.
        if target_patient.user == request.user:
            return Response(
                {"error": "شما مالک این پرونده هستید و نیازی به درخواست ندارید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the authorization record or identify an existing application.
        access, created = UserPatientAccess.objects.get_or_create(
            user=request.user,
            patient=target_patient,
            defaults={'status': 'pending', 'access_level': 'read_only'}
        )

        if not created:
            return Response(
                {"error": f"شما قبلاً درخواستی داده‌اید که در وضعیت '{access.get_status_display()}' است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"message": "درخواست با موفقیت ارسال شد و در انتظار تایید بیمار است."}, 
            status=status.HTTP_201_CREATED
        )

# 2. Inbox API (requests others have sent to my record).
class PendingAccessRequestsView(APIView):
    """Inbox listing the pending access requests for the caller's own record.

    Retrieves incoming access authorization requests targeting the logged-in
    patient's profile. Employs ``select_related('user')`` to avoid N+1 queries
    when resolving the requester's full name or username.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return the pending requests targeting the caller's patient profile.

        :param request: The incoming HTTP request containing the authenticated user.
        :returns:
            * 200 -- A list of dictionary payloads containing ``id``,
              ``requester_name``, and ``requested_at`` timestamps.
            * 200 -- An empty list when the caller has no associated patient profile.
        """
        # Bail out with an empty inbox when the caller has no medical record yet.
        if not hasattr(request.user, 'patient_profile'):
            return Response([])

        # Collect every request targeting this record with user details pre-fetched.
        pending_requests = UserPatientAccess.objects.filter(
            patient=request.user.patient_profile,
            status='pending'
        ).select_related('user')
        
        # Build the denormalized response payload for the UI inbox.
        data = [
            {
                "id": req.id,
                "requester_name": req.user.get_full_name() or req.user.username,
                "requested_at": req.granted_at,
            }
            for req in pending_requests
        ]
        return Response(data, status=status.HTTP_200_OK)

# 3. API for the patient to approve or reject a request.
class RespondAccessRequestView(APIView):
    """Approve or reject a pending access request (record-owner side)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Set the final status of a pending request owned by the caller.

        The request is only fetched when it targets the caller's own patient
        profile and is still ``pending``; the payload ``action`` must be
        ``approve`` or ``reject``.

        :param pk: Primary key of the
            :class:`~core.models.UserPatientAccess` row.
        :returns:
            * 200 -- status updated to approved/rejected.
            * 400 -- unrecognized ``action`` value.
            * 404 -- request missing, not pending, or not owned by the caller.
        """
        action = request.data.get('action')  # Expected: 'approve' or 'reject'.
        
        try:
            # Fetch the request only when it targets the logged-in user's own
            # record (security scope).
            access_request = UserPatientAccess.objects.get(
                id=pk, 
                patient=request.user.patient_profile,
                status='pending'
            )
        except (UserPatientAccess.DoesNotExist, AttributeError):
            return Response({"error": "درخواست یافت نشد یا دسترسی ندارید."}, status=status.HTTP_404_NOT_FOUND)

        if action == 'approve':
            access_request.status = 'approved'
            access_request.save()
            return Response({"message": "دسترسی با موفقیت داده شد."}, status=status.HTTP_200_OK)
            
        elif action == 'reject':
            access_request.status = 'rejected'
            access_request.save()
            return Response({"message": "درخواست رد شد."}, status=status.HTTP_200_OK)
            
        return Response({"error": "عملیات نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
# 4. API listing users with approved access to my record.
class GrantedAccessesView(APIView):
    """List the users holding approved access to the caller's own record."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return the approved grantees on the caller's patient profile.

        :returns: 200 with a plain list of ``id``/``grantee_name``/
            ``granted_at`` objects; an empty list when the caller has no
            patient profile yet.
        """
        if not hasattr(request.user, 'patient_profile'):
            return Response([])

        granted_accesses = UserPatientAccess.objects.filter(
            patient=request.user.patient_profile,
            status='approved'
        )
        
        data = [
            {
                "id": access.id,
                "grantee_name": access.user.get_full_name() or access.user.username,
                "granted_at": access.granted_at,
            }
            for access in granted_accesses
        ]
        return Response(data, status=status.HTTP_200_OK)


# 5. API for revoking (deleting) an access grant.
class RevokeAccessView(APIView):
    """Revoke (delete) one user's access to the caller's own record."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """Delete the access row identified by ``pk``.

        :param pk: Primary key of the
            :class:`~core.models.UserPatientAccess` row.
        :returns:
            * 200 -- access revoked (row deleted).
            * 404 -- row missing or not attached to the caller's profile.
        """
        try:
            access = UserPatientAccess.objects.get(
                id=pk, 
                patient=request.user.patient_profile
            )
            access.delete()
            return Response({"message": "دسترسی با موفقیت لغو شد."}, status=status.HTTP_200_OK)
            
        except (UserPatientAccess.DoesNotExist, AttributeError):
            return Response({"error": "رکوردی یافت نشد یا شما مجوز این کار را ندارید."}, status=status.HTTP_404_NOT_FOUND)
    # 6. API listing the records I have access to (my dependents).
class MyDependentsView(APIView):
    """List the records the caller has approved access to (dependents)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return approved access rows where the caller is the grantee.

        :returns: 200 with a plain list of ``access_id``/``patient_name``/
            ``national_code``/``granted_at`` objects.
        """
        # Approved rows where the logged-in user is the access grantee.
        my_accesses = UserPatientAccess.objects.filter(
            user=request.user,
            status='approved'
        ).select_related('patient__user')
        
        data = [
            {
                "access_id": access.id,
                "patient_name": access.patient.user.get_full_name() or access.patient.user.username,
                "national_code": access.patient.national_code,
                "granted_at": access.granted_at,
            }
            for access in my_accesses
        ]
        return Response(data, status=status.HTTP_200_OK)
# 7. API for granting direct access to a doctor or caretaker by national code.
class GrantAccessView(APIView):
    """Grant immediate, pre-approved access to a doctor or caretaker by national code.

    Bypasses the inbound request/approval cycle by allowing the profile owner
    to directly provision an ``approved`` grant for a designated individual.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Provision or upgrade an approved access grant for the target national code.

        :param request: Incoming HTTP request containing ``national_code``.
        :returns:
            * 200 -- Access grant provisioned or confirmed with ``approved`` status.
            * 400 -- Missing input, missing profile, or self-grant attempt.
            * 404 -- Target national code not found.
        """
        grantee_national_code = request.data.get('national_code', '').strip()
        if not grantee_national_code:
            return Response(
                {"error": "کد ملی شخص مورد نظر الزامی است."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. پرونده سلامت خود کاربر جاری
        patient = Patient.objects.filter(user=request.user).first()
        if not patient:
            return Response(
                {"error": "ابتدا باید پرونده سلامت خود را تکمیل کنید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. پیدا کردن شخص مورد نظر بر اساس کد ملی
        grantee_patient = Patient.objects.filter(national_code=grantee_national_code).first()
        if not grantee_patient or not grantee_patient.user:
            return Response(
                {"error": "کاربری با این کد ملی در سامانه یافت نشد."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        grantee_user = grantee_patient.user

        # 3. جلوگیری از اعطای دسترسی به خود
        if grantee_user == request.user:
            return Response(
                {"error": "شما مالک این پرونده هستید و نمی‌توانید به خودتان دسترسی دهید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. ایجاد رکورد یا به‌روزرسانی وضعیت به approved
        access, created = UserPatientAccess.objects.get_or_create(
            user=grantee_user,
            patient=patient,
            defaults={'status': 'approved', 'access_level': 'read_only'}
        )

        if not created and access.status != 'approved':
            access.status = 'approved'
            access.save()

        full_name = grantee_user.get_full_name() or grantee_user.username
        return Response(
            {"message": f"دسترسی با موفقیت به {full_name} اعطا شد."}, 
            status=status.HTTP_200_OK
        )
class HealthSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get_patient(self):
        # جلوگیری از خطای DoesNotExist با ساخت خودکار رکورد پایه در صورت عدم وجود
        patient, _ = Patient.objects.get_or_create(user=self.request.user)
        return patient

    def get(self, request):
        patient = self.get_patient()
        summary, _ = HealthSummary.objects.get_or_create(patient=patient)
        serializer = HealthSummarySerializer(summary)
        return Response(serializer.data)

    def put(self, request):
        patient = self.get_patient()
        summary, _ = HealthSummary.objects.get_or_create(patient=patient)
        serializer = HealthSummarySerializer(summary, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TestReminderViewSet(viewsets.ModelViewSet):
    serializer_class = TestReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TestReminder.objects.filter(patient__user=self.request.user).order_by('due_date')

    def perform_create(self, serializer):
        patient, _ = Patient.objects.get_or_create(user=self.request.user)
        serializer.save(patient=patient)
class DeleteAccountView(APIView):
    """Permanently delete the authenticated user's account and associated data."""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        # حذف کاربر؛ به دلیل on_delete=CASCADE در مدل‌ها، پرونده و آزمایش‌ها نیز پاک می‌شوند
        user.delete()
        return Response(
            {"detail": "حساب کاربری با موفقیت حذف شد."}, 
            status=status.HTTP_200_OK
        )
        
class ChatSessionListCreateView(APIView):
    """
    GET: لیست تمام نشست‌های گفتگوی کاربر جاری
    POST: ایجاد یک نشست گفتگوی تازه
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ChatSession.objects.filter(user=request.user)
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def post(self, request):
        title = request.data.get('title', 'گفتگوی جدید').strip() or 'گفتگوی جدید'
        session = ChatSession.objects.create(user=request.user, title=title)
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatSessionDetailView(APIView):
    """
    DELETE: حذف یک نشست به همراه تمام تاریخچه پیام‌های آن
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id):
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatMessageListView(APIView):
    """
    GET: دریافت سابقه کامل پیام‌های یک نشست مشخص
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        messages = session.messages.all()
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)


class SendMessageView(APIView):
    """
    POST: دریافت پیام کاربر، ارسال به AI، ذخیره هر دو در دیتابیس و بازگرداندن پاسخ
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        user_text = request.data.get('content', '').strip()

        if not user_text:
            return Response(
                {"error": "متن پیام نمی‌تواند خالی باشد."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ۱. ذخیره پیام کاربر در تاریخچه
        user_msg = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.ROLE_USER,
            content=user_text
        )

        # ۲. به‌روزرسانی عنوان چت بر اساس اولین سوال کاربر در صورت پیش‌فرض بودن عنوان
        if session.title == "گفتگوی جدید" and session.messages.count() <= 2:
            session.title = user_text[:35] + ("..." if len(user_text) > 35 else "")
            session.save(update_fields=['title', 'updated_at'])

        # ۳. دریافت پاسخ هوشمند از سرویس AI
        ai_reply_text = generate_ai_reply(session, user_text)

        # ۴. ذخیره پاسخ دستیار سلامت در دیتابیس
        assistant_msg = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.ROLE_ASSISTANT,
            content=ai_reply_text
        )

        return Response({
            "user_message": ChatMessageSerializer(user_msg).data,
            "assistant_message": ChatMessageSerializer(assistant_msg).data
        }, status=status.HTTP_201_CREATED)