from django.urls import path
from .views import stripe_webhook
from .api_views import (
    create_checkout_session,
    start_trial,
    get_billing_info,
    create_customer_portal,
    cancel_subscription,
)

urlpatterns = [
    # API endpoints
    path('api/create-checkout-session/', create_checkout_session, name='create_checkout_session'),
    path('api/start-trial/', start_trial, name='start_trial'),
    path('api/billing-info/', get_billing_info, name='get_billing_info'),
    path('api/portal/', create_customer_portal, name='create_customer_portal'),
    path('api/cancel/', cancel_subscription, name='cancel_subscription'),
    
    # Webhook endpoint
    path('webhook/', stripe_webhook, name='stripe_webhook'),
]
