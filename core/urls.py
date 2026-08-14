from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('patients', views.PatientViewSet, basename='patient')
router.register('test-results', views.TestResultViewSet, basename='test-result')
router.register('attachments', views.AttachmentViewSet, basename='attachment')

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth_register'),
] + router.urls
