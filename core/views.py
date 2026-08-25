from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Patient, TestResult, UserPatientAccess, Attachment
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
from .serializers import RegisterSerializer
from rest_framework import viewsets
from .models import TestType
from .serializers import TestTypeSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

class TestTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TestType.objects.select_related('category').all()
    serializer_class = TestTypeSerializer
    permission_classes = [IsAuthenticated]

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
            return Patient.objects.filter(
                Q(user=user) | 
                Q(user_accesses__user=user, user_accesses__status='approved') # 👈 شرط تایید شدن به اینجا هم اضافه شد
            ).distinct()
        
    @action(detail=False, methods=['get'], url_path='search')
    def search_global(self, request):
        # دریافت کلمه‌ای که سرچ شده (مثلاً از طریق آدرس api/patients/search/?q=1234567890)
        search_query = request.query_params.get('q', '').strip()
        if not search_query:
            return Response(
                {"detail": "لطفاً کد ملی یا شناسه بیمار را وارد کنید."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # در اینجا فرض کردیم فیلد شما در دیتابیس national_id است. 
        # اگر اسم فیلد کد ملی چیز دیگری است (مثلا user__username)، آن را جایگزین کنید.
        patients = Patient.objects.filter(national_code=search_query)

        if not patients.exists():
            return Response(
                {"detail": "بیماری با این مشخصات یافت نشد."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # دیتای پیدا شده را سریالایز کرده و می‌فرستیم
        serializer = self.get_serializer(patients, many=True)
        return Response(serializer.data)
    @action(detail=False, methods=['get', 'post', 'put'], url_path='me')
    def my_profile(self, request):
        user = request.user
        patient = Patient.objects.filter(user=user).first()

        # ۱. هندل کردن درخواست GET (دریافت اطلاعات)
        if request.method == 'GET':
            if patient:
                serializer = self.get_serializer(patient)
                return Response(serializer.data)
            return Response({"detail": "پرونده تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)

        # ۲. هندل کردن درخواست POST و PUT (ثبت اطلاعات)
        # یک کپی از دیتای ارسالی می‌گیریم و آیدی یوزر را همان ابتدا به آن تزریق می‌کنیم 
        # تا سریالایزر الکی ارور "فیلد user اجباری است" ندهد.
        data = request.data.copy()
        data['user'] = user.id
        
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        user.save()
        
        if patient:
            serializer = self.get_serializer(patient, data=data, partial=True)
        else:
            serializer = self.get_serializer(data=data)

        # ۳. اعتبارسنجی و ذخیره
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data)
        
        # چاپ کاملاً امنِ خطاها (فقط زمانی به اینجا می‌رسد که متد POST باشد و فرم مشکل داشته باشد)
        print("❌ ارورهای اعتبارسنجی فرم:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['get'])
    def me(self, request):
        try:
            # پیدا کردن پروفایل کاربری که الان لاگین کرده است
            patient = Patient.objects.get(user=request.user)
            serializer = self.get_serializer(patient)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Patient.DoesNotExist:
            return Response({"error": "پروفایل یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
    
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
        
            return base_queryset.filter(
                Q(patient__user=user) | 
                Q(patient__user_accesses__user=user, patient__user_accesses__status='approved') | # 👈 شرط تایید شدن به اینجا اضافه شد
                Q(created_by=user)
            ).distinct()

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return TestResultReadSerializer
        return TestResultWriteSerializer
    def perform_create(self, serializer):
        user = self.request.user
        patient = serializer.validated_data.get('patient')

        # اگر فیلد بیمار خالی بود، یعنی شخص دارد برای خودش ثبت می‌کند
        # پس بیمار را همان صاحب پرونده در نظر می‌گیریم
        if not patient:
            from core.models import Patient # (یا اسم اپلیکیشن خودتان)
            try:
                patient = Patient.objects.get(user=user)
                serializer.save(patient=patient, created_by=user, status='approved')
                return
            except Patient.DoesNotExist:
                pass

        # اگر بیمار مشخص شده بود، چک می‌کنیم آیا خودش است یا نه
        if patient and patient.user_id == user.id:
            serializer.save(created_by=user, status='approved')
        else:
            serializer.save(created_by=user, status='pending')
    @action(detail=False, methods=['get'], url_path='inbox')
    def inbox(self, request):
        user = request.user
        # پیدا کردن آزمایش‌هایی که متعلق به پرونده این کاربر است اما هنوز در انتظار تایید است
        pending_tests = TestResult.objects.filter(
            patient__user=user,
            status='pending'
        ).select_related('created_by', 'test_type')
        serializer = TestResultReadSerializer(pending_tests, many=True)
        return Response(serializer.data)
    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        # 👇 تله‌ی امنیتی جنگو را با خواندن مستقیم از دیتابیس دور می‌زنیم
        test_result = get_object_or_404(TestResult, pk=pk)
        
        action_type = request.data.get('action') # 'approve' یا 'reject'

        # قفل امنیتی اختصاصی خودمان: چک می‌کنیم این آزمایش حتماً برای همین بیمار باشد
        if test_result.patient.user_id != request.user.id:
            return Response({"detail": "شما اجازه تغییر وضعیت این آزمایش را ندارید."}, status=403)

        if action_type == 'approve':
            test_result.status = 'approved'
            test_result.save()
            return Response({"detail": "آزمایش با موفقیت تایید و به پرونده اضافه شد."})
        elif action_type == 'reject':
            test_result.status = 'rejected'
            test_result.save()
            return Response({"detail": "آزمایش رد و حذف شد."})
        
        return Response({"detail": "عملیات نامعتبر است."}, status=400)

class AttachmentViewSet(ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated, IsPatientOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Attachment.objects.all()

        allowed_patient_ids = UserPatientAccess.objects.filter(user=user).values_list('patient_id', flat=True)
        return Attachment.objects.filter(test_result__patient_id__in=allowed_patient_ids)
# --- این ایمپورت‌ها را بالای کلاس جدید قرار دهید ---
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

class AddDependentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        search_value = request.data.get('national_code')
        if not search_value:
            return Response({'error': 'لطفاً کد ملی فرزند را وارد کنید.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # جستجوی مستقیم در جدول بیماران با استفاده از کدملی
            patient = Patient.objects.get(national_code=search_value)

            # ایجاد دسترسی برای پدر (کاربری که لاگین کرده)
            UserPatientAccess.objects.get_or_create(user=request.user, patient=patient)

            display_name = f"{patient.first_name} {patient.last_name}".strip()

            return Response({
                'message': f'اطلاعات {display_name} با موفقیت به پنل شما اضافه شد.'
            }, status=status.HTTP_200_OK)

        except Patient.DoesNotExist:
            return Response({'error': 'هیچ پرونده پزشکی با این کد ملی در سیستم ثبت نشده است.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'خطای سیستمی: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# ۱. API ارسال درخواست دسترسی (توسط سرپرست/پزشک)
class RequestAccessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        national_code = request.data.get('national_code')
        if not national_code:
            return Response({"error": "لطفا کد ملی را وارد کنید."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # پیدا کردن پرونده بیماری که این کد ملی را دارد
            target_patient = Patient.objects.get(national_code=national_code)
        except Patient.DoesNotExist:
            return Response({"error": "بیماری با این کد ملی در سیستم یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        # جلوگیری از ارسال درخواست به خودمان
        if target_patient.user == request.user:
            return Response({"error": "شما مالک این پرونده هستید و نیازی به درخواست ندارید."}, status=status.HTTP_400_BAD_REQUEST)

        # ایجاد یا بررسی وجود درخواست قبلی
        access, created = UserPatientAccess.objects.get_or_create(
            user=request.user,
            patient=target_patient,
            defaults={'status': 'pending', 'access_level': 'read_only'}
        )

        if not created:
            return Response({"error": f"شما قبلاً درخواستی داده‌اید که در وضعیت '{access.get_status_display()}' است."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "درخواست با موفقیت ارسال شد و در انتظار تایید بیمار است."}, status=status.HTTP_201_CREATED)


# ۲. API صندوق پیام ورودی (برای دیدن درخواست‌هایی که دیگران به من داده‌اند)
class PendingAccessRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # بررسی اینکه آیا کاربر لاگین شده اصلاً پرونده پزشکی دارد یا نه
        if not hasattr(request.user, 'patient_profile'):
            return Response([])

        # پیدا کردن تمام درخواست‌هایی که برای پرونده من آمده و هنوز تایید نشده‌اند
        pending_requests = UserPatientAccess.objects.filter(
            patient=request.user.patient_profile,
            status='pending'
        )
        
        # یک دیتای ساده برای فرانت‌اند می‌سازیم
        data = [
            {
                "id": req.id,
                "requester_name": req.user.get_full_name() or req.user.username,
                "requested_at": req.granted_at,
            }
            for req in pending_requests
        ]
        return Response(data, status=status.HTTP_200_OK)


# ۳. API تایید یا رد درخواست توسط بیمار
class RespondAccessRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        action = request.data.get('action') # 'approve' یا 'reject'
        
        try:
            # پیدا کردن درخواست، به شرطی که واقعاً متعلق به پرونده شخص لاگین شده باشد (امنیت)
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
            # یا می‌توانید کلاً رکورد را پاک کنید: access_request.delete()
            return Response({"message": "درخواست رد شد."}, status=status.HTTP_200_OK)
            
        return Response({"error": "عملیات نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)
# ۴. API لیست کسانی که به پرونده من دسترسی تایید شده دارند
class GrantedAccessesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
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


# ۵. API لغو (حذف) دسترسی
class RevokeAccessView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            access = UserPatientAccess.objects.get(
                id=pk, 
                patient=request.user.patient_profile
            )
            access.delete()
            return Response({"message": "دسترسی با موفقیت لغو شد."}, status=status.HTTP_200_OK)
            
        except (UserPatientAccess.DoesNotExist, AttributeError):
            return Response({"error": "رکوردی یافت نشد یا شما مجوز این کار را ندارید."}, status=status.HTTP_404_NOT_FOUND)
    # ۶. API لیست افرادی که من به پرونده آن‌ها دسترسی دارم (افراد تحت تکفل من)
class MyDependentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # پیدا کردن رکوردهایی که "کاربر لاگین شده" به عنوان گیرنده دسترسی (تایید شده) در آن‌ها ثبت شده است
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