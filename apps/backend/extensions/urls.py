from django.urls import path
from . import views

urlpatterns = [
    # NEW: Token-based authentication (simple flow)
    path('auth/generate-token/', views.generate_extension_token, name='extension_generate_token'),
    path('auth/verify-token/', views.verify_extension_token, name='extension_token_verify'),
    
    # LEGACY: Auth code flow (keeping for backward compatibility)
    path('auth/create/', views.create_extension_token, name='extension_auth_create'),
    path('auth/exchange-code/', views.exchange_auth_code, name='extension_auth_exchange'),
    
    # LEGACY: Clerk auth endpoint
    path('auth/verify/', views.verify_extension_auth, name='extension_auth_verify'),
    
    # Extension endpoints
    path('brands/list/', views.list_user_brands, name='extension_brands_list'),
    path('analyze/quick/', views.quick_analyze, name='extension_quick_analyze'),
    path('analyze/profile/voice/', views.analyze_profile_voice, name='extension_profile_voice_analyze'),
    path('analyze/content/alignment/', views.analyze_content_alignment, name='extension_content_alignment'),
    path('usage/check/', views.check_usage_limits, name='extension_usage_check'),
]