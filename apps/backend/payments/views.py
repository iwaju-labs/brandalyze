from rest_framework.decorators import api_view
from rest_framework import status
import stripe
import json
from brands.utils.responses import error_response, success_response
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .stripe_service import StripeService

stripe_api_key = settings.STRIPE_SECRET_KEY

@csrf_exempt
@api_view(['POST'])
def stripe_webhook(request):
    """Handle Stripe Webhooks"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return error_response("Value error", code="VALUE_ERROR", status_code=status.HTTP_400_BAD_REQUEST)
    except stripe.SignatureVerificationError:
        return error_response("Signature Verification Error", code="SIGNATURE_VERIFICATION_ERROR", status_code=status.HTTP_400_BAD_REQUEST)
    
    if event['type'] == 'customer.subscription.created':
        subscription = event['data']['object']
        StripeService.handle_subscription_created(subscription)

    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        StripeService.handle_subscription_updated(subscription)

    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        StripeService.handle_subscription_canceled(subscription)
    
    elif event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        StripeService.handle_payment_failed(invoice)

    return success_response(status_code=status.HTTP_200_OK)