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

@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def check_trial_status(request):
    user = request.user
    try:
        from analysis.models import UserSubscription
        subscription = UserSubscription.objects.filter(user=user).first()
        has_used_trial = bool(subscription and subscription.trial_start)
        return success_response(
            data={"has_used_trial": has_used_trial},
            message="Fetched trial use status",
            status_code=status.HTTP_200_OK
        )
    except Exception as e:
        return error_response(
            f"Could not fetch trial use status {e}",
            code="TRIAL_STATUS_UNKNOWN",
        )

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
    print("[DEBUG] ===== CANCEL SUBSCRIPTION ENDPOINT HIT =====")
    print(f"[DEBUG] cancel_subscription called by user: {request.user}")
    print(f"[DEBUG] Request method: {request.method}")
    print(f"[DEBUG] Request data: {request.data}")
    print(f"[DEBUG] User authenticated: {request.user.is_authenticated}")
    print(f"[DEBUG] Headers: {dict(request.headers)}")
    print("[DEBUG] ===============================================")
    
    try:
        success, message = StripeService.cancel_subscription(request.user)

        if success:
            return success_response(message=message)
        else:
            return error_response(message, "CANCELLATION_FAILED")
    except Exception as e:
        print(f"[DEBUG] Exception in cancel_subscription: {str(e)}")
        import traceback
        traceback.print_exc()
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
        session = StripeService.start_free_trial(request.user)
        print(f"[DEBUG] trial session: {session}")
        
        if session:
            return success_response(
                data={'checkout_url': session.url},
                message="Trial checkout session created successfully"
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
                    'pending_cancellation': subscription.payment_status == 'cancel_at_period_end',
                    'cancellation_date': subscription.next_billing_date.isoformat() if subscription.payment_status == 'cancel_at_period_end' and subscription.next_billing_date else None,
                }
            }
        )
        
    except Exception as e:
        return error_response(str(e), "INTERNAL_ERROR")

@api_view(['POST', 'GET'])
def test_auth(request):
    """Test endpoint to check authentication"""
    print(f"[DEBUG] TEST AUTH - User: {request.user}")
    print(f"[DEBUG] TEST AUTH - Method: {request.method}")
    print(f"[DEBUG] TEST AUTH - Authenticated: {request.user.is_authenticated}")
    return success_response(data={'user': str(request.user), 'authenticated': request.user.is_authenticated})