from django.urls import path
from .views import stripe_webhook
from .api_views import (
    create_checkout_session,
    start_trial,
    get_billing_info,
    create_customer_portal,
    cancel_subscription,
    test_auth,
)

urlpatterns = [
    # API endpoints
    path('create-checkout-session/', create_checkout_session, name='create_checkout_session'),
    path('start-trial/', start_trial, name='start_trial'),
    path('billing-info/', get_billing_info, name='get_billing_info'),
    path('portal/', create_customer_portal, name='create_customer_portal'),
    path('cancel/', cancel_subscription, name='cancel_subscription'),
    path('test-auth/', test_auth, name='test_auth'),

    # Webhook endpoint
    path('webhook/', stripe_webhook, name='stripe_webhook'),
]
