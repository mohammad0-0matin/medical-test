from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('patients', views.PatientProfileViewSet, basename='patient')
router.register('test-results', views.TestResultViewSet, basename='test-result')
router.register('attachments', views.AttachmentViewSet, basename='attachment')

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth_register'),
    path('my-dependents/', views.MyDependentsView.as_view(), name='my_dependents'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    path('patients/lookup/', views.PatientLookupView.as_view(), name='patient-lookup'),
] + router.urls
