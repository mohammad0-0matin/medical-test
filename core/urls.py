from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('patients', views.PatientViewSet, basename='patient')
router.register('test-results', views.TestResultViewSet, basename='test-result')
router.register('attachments', views.AttachmentViewSet, basename='attachment')
router.register('test-types', views.TestTypeViewSet, basename='test-type')  

# 👇 تغییرات فقط در این بخش است:
urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth_register'),
    # این خط را اضافه کردیم (حتماً قبل از روتر باشد)
    path('patients/add-dependent/', views.AddDependentView.as_view(), name='add-dependent'), 
] + router.urls