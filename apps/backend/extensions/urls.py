from django.urls import path
from . import views

urlpatterns = [
    path('auth/verify/', views.verify_extension_auth, name='extension_auth_verify'),
    path('brands/list/', views.list_user_brands, name='extension_brands_list'),
    path('analyze/quick/', views.quick_analyze, name='extension_quick_analyze'),
    path('analyze/profile/', views.analyze_profile, name='extension_profile_analyze'),
    path('usage/check/', views.check_usage_limits, name='extension_usage_check'),
]