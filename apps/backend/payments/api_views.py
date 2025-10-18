from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes
)
from rest_framework import status

from brands.utils.responses import success_response, error_response
from brands.permissions import ClerkAuthenticated
from brands.authentication import ClerkAuthentication
from django.conf import settings
from payments.stripe_service import StripeService

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def create_customer_portal(request):
    """Create Stripe customer portal session"""
    try:
        return_url = f"{settings.FRONTEND_URL}/subscription"

        portal_url = StripeService.get_customer_portal_url(
            user=request.user,
            return_url=return_url
        )

        if not portal_url:
            return error_response(
                "Unable to create customer portal. No active subscription found.",
                code="NO_SUBSCRIPTION",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        return success_response(
            data={'portal_url': portal_url},
            message="Customer portal created successfully",
            status_code=status.HTTP_200_OK
        )
    
    except Exception as e:
        return error_response(str(e), "INTERNAL_ERROR")
    
@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def cancel_subscription(request):
    """Cancel user's subscription"""
    try:
        success, message = StripeService.cancel_subscription(request.user)

        if success:
            return success_response(message=message)
        else:
            return error_response(message, "CANCELLATION_FAILED")
    except Exception as e:
        return error_response(str(e), "INTERNAL_ERROR")

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def create_checkout_session(request):
    """Create Stripe checkout session"""
    print("[DEBUG] create_checkout_session called - START")
    try:
        print(f"[DEBUG] request.data: {request.data}")
        price_id = request.data.get('price_id')
        
        if not price_id:
            return error_response("Price ID is required", "MISSING_PRICE_ID")
        
        print(f"[DEBUG] Creating checkout session for user: {request.user}")
        print(f"[DEBUG] User email: {request.user.email}")
        print(f"[DEBUG] Price ID: {price_id}")
        
        # Build URLs
        success_url = f"{settings.FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{settings.FRONTEND_URL}/pricing"
        
        print(f"[DEBUG] Success URL: {success_url}")
        print(f"[DEBUG] Cancel URL: {cancel_url}")
        
        session = StripeService.create_checkout_session(
            user=request.user,
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        if not session:
            return error_response("Failed to create checkout session", "STRIPE_ERROR")
        
        return success_response(
            data={'checkout_url': session.url, 'session_id': session.id},
            message="Checkout session created successfully"
        )
        
    except Exception as e:
        print(f"[DEBUG] Exception in create_checkout_session: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(str(e), "INTERNAL_ERROR")

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def start_trial(request):
    """Start free trial for user"""
    try:
        print(f"[DEBUG] start_trial for user: {request.user}")
        trial_started = StripeService.start_free_trial(request.user)
        print(f"[DEBUG] trial_started: {trial_started}")
        
        if trial_started:
            return success_response(
                message="Free trial started successfully"
            )
        else:
            return error_response(
                "Trial already used or user already has subscription",
                "TRIAL_NOT_AVAILABLE"
            )
            
    except Exception as e:
        print(f"[DEBUG] Exception in start_trial: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(str(e), "INTERNAL_ERROR")

@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def get_billing_info(request):
    """Get user's billing and subscription information"""
    try:
        from analysis.models import UserSubscription
        subscription = UserSubscription.objects.get_or_create(user=request.user)[0]
        
        return success_response(
            data={
                'subscription': {
                    'tier': subscription.tier,
                    'status': subscription.payment_status,
                    'trial_active': subscription.is_on_trial,
                    'trial_days_left': subscription.days_left_in_trial if subscription.is_on_trial else 0,
                    'next_billing_date': subscription.next_billing_date.isoformat() if subscription.next_billing_date else None,
                }
            }
        )
        
    except Exception as e:
        return error_response(str(e), "INTERNAL_ERROR")