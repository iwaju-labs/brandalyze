from django.urls import path
from .views import stripe_webhook
from .api_views import (
    create_checkout_session,
    start_trial,
    get_billing_info,
    create_customer_portal,
    cancel_subscription,
    test_auth,
    check_trial_status
)
from .admin_views import (
    check_admin_status,
    list_users,
    update_user_subscription,
    sync_stripe_subscription,
    admin_stats
)

urlpatterns = [
    # API endpoints
    path('check-trial-status/', check_trial_status, name='check_trial_status'),
    path('create-checkout-session/', create_checkout_session, name='create_checkout_session'),
    path('start-trial/', start_trial, name='start_trial'),
    path('billing-info/', get_billing_info, name='get_billing_info'),    path('portal/', create_customer_portal, name='create_customer_portal'),
    path('cancel/', cancel_subscription, name='cancel_subscription'),
    path('test-auth/', test_auth, name='test_auth'),
    
    # Admin endpoints
    path('admin/check-status/', check_admin_status, name='check_admin_status'),
    path('admin/users/', list_users, name='admin_list_users'),
    path('admin/update-subscription/', update_user_subscription, name='admin_update_subscription'),
    path('admin/sync-stripe/', sync_stripe_subscription, name='admin_sync_stripe'),
    path('admin/stats/', admin_stats, name='admin_stats'),

    # Webhook endpoint
    path('webhook/', stripe_webhook, name='stripe_webhook'),
]
