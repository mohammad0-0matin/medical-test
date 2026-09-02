"""URL routing for the core medical-test API under ``/api/``.

Router-backed ModelViewSets cover patients, test results, attachments and
test types; hand-written paths handle registration and the family-access
request/inbox/revoke workflow.
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('patients', views.PatientViewSet, basename='patient')
router.register('test-results', views.TestResultViewSet, basename='test-result')
router.register('attachments', views.AttachmentViewSet, basename='attachment')
router.register('test-types', views.TestTypeViewSet, basename='test-type')  

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth_register'),
    path('patients/add-dependent/', views.AddDependentView.as_view(), name='add-dependent'), 
    
    # --- Access-request inbox / dependents workflow ---
    path('access/request/', views.RequestAccessView.as_view(), name='access-request'),
    path('access/inbox/', views.PendingAccessRequestsView.as_view(), name='access-inbox'),
    path('access/<int:pk>/respond/', views.RespondAccessRequestView.as_view(), name='access-respond'),
    path('access/dependents/', views.MyDependentsView.as_view(), name='access-dependents'),
    
    path('access/granted/', views.GrantedAccessesView.as_view(), name='access-granted'),
    path('access/<int:pk>/revoke/', views.RevokeAccessView.as_view(), name='access-revoke'),
] + router.urls