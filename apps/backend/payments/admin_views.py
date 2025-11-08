from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes
)
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Q
from brands.utils.responses import success_response, error_response
from brands.permissions import ClerkAuthenticated
from brands.authentication import ClerkAuthentication
from analysis.models import UserSubscription
from payments.stripe_service import StripeService
import json

User = get_user_model()

# Constants
ADMIN_ACCESS_DENIED_MESSAGE = "Access denied. Admin privileges required."
ADMIN_ACCESS_DENIED_CODE = "ADMIN_ACCESS_REQUIRED"
UTC_SUFFIX = '+00:00'

def parse_iso_date(date_string):
    """Parse ISO date string to datetime object"""
    if not date_string:
        return None
    try:
        from datetime import datetime
        # Handle different ISO formats including microseconds
        date_string = str(date_string).replace('Z', '+00:00')
        return datetime.fromisoformat(date_string)
    except (ValueError, TypeError) as e:
        print(f"[DEBUG] Date parsing error for '{date_string}': {e}")
        raise ValueError(f"Invalid date format: {date_string}. Use ISO format (YYYY-MM-DDTHH:MM:SS)")

def is_admin_user(user):
    """Check if user has admin privileges"""
    # Check if user is Django superuser first
    if user.is_superuser:
        return True
    
    # Check Clerk metadata for admin role
    if hasattr(user, 'clerk_metadata') and user.clerk_metadata:
        metadata = user.clerk_metadata or {}
        return metadata.get('role') == 'admin'
    
    return False

@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def check_admin_status(request):
    """Check if current user has admin privileges"""
    try:
        is_admin = is_admin_user(request.user)
        return success_response({
            'is_admin': is_admin
        })
    except Exception as e:
        return error_response(
            message=f"Error checking admin status: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def list_users(request):
    """List all users with their subscription information"""
    if not is_admin_user(request.user):
        return error_response(
            "Access denied. Admin privileges required.",
            code="ADMIN_ACCESS_REQUIRED",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get query parameters
        search = request.GET.get('search', '')
        tier_filter = request.GET.get('tier', '')
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 20))
        
        # Build query
        query = Q()
        if search:
            query &= (
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        users = User.objects.filter(query).order_by('-date_joined')
        
        # Filter by tier if specified
        if tier_filter:
            subscription_ids = UserSubscription.objects.filter(
                tier=tier_filter
            ).values_list('user_id', flat=True)
            users = users.filter(id__in=subscription_ids)
        
        # Pagination
        total_count = users.count()
        start = (page - 1) * per_page
        end = start + per_page
        users = users[start:end]
        
        # Prepare user data with subscription info
        user_data = []
        for user in users:
            try:
                subscription = UserSubscription.objects.get(user=user)
            except UserSubscription.DoesNotExist:
                subscription = UserSubscription.objects.create(user=user)
            
            user_data.append({
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'subscription': {
                    'tier': subscription.tier,
                    'is_active': subscription.is_active,
                    'payment_status': subscription.payment_status,
                    'stripe_customer_id': subscription.stripe_customer_id,
                    'stripe_subscription_id': subscription.stripe_subscription_id,
                    'trial_start': subscription.trial_start.isoformat() if subscription.trial_start else None,
                    'trial_end': subscription.trial_end.isoformat() if subscription.trial_end else None,
                    'is_trial_active': subscription.is_trial_active,
                    'subscription_start': subscription.subscription_start.isoformat(),
                    'subscription_end': subscription.subscription_end.isoformat() if subscription.subscription_end else None,
                    'next_billing_date': subscription.next_billing_date.isoformat() if subscription.next_billing_date else None,
                }
            })
        
        return success_response(
            data={
                'users': user_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total_count': total_count,
                    'total_pages': (total_count + per_page - 1) // per_page
                }
            },
            message="Users fetched successfully"
        )
        
    except Exception as e:
        return error_response(
            f"Failed to fetch users: {str(e)}",
            code="FETCH_USERS_ERROR"
        )

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def update_user_subscription(request):
    """Update user subscription tier and status"""
    if not is_admin_user(request.user):
        return error_response(
            "Access denied. Admin privileges required.",
            code="ADMIN_ACCESS_REQUIRED",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        data = json.loads(request.body)
        print(f"[DEBUG] Received data: {data}")  # Debug logging
        
        user_id = data.get('user_id')
        new_tier = data.get('tier')
        is_active = data.get('is_active')
        subscription_start = data.get('subscription_start')
        subscription_end = data.get('subscription_end')
        trial_start = data.get('trial_start')
        trial_end = data.get('trial_end')
        
        print(f"[DEBUG] Parsed values:")  # Debug logging
        print(f"  user_id: {user_id}")
        print(f"  new_tier: {new_tier}")
        print(f"  is_active: {is_active}")
        print(f"  subscription_start: {subscription_start}")
        print(f"  subscription_end: {subscription_end}")
        print(f"  trial_start: {trial_start}")
        print(f"  trial_end: {trial_end}")
        
        if not user_id or not new_tier:
            return error_response(
                "user_id and tier are required",
                code="MISSING_REQUIRED_FIELDS",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user and subscription
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return error_response(
                "User not found",
                code="USER_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        subscription, _ = UserSubscription.objects.get_or_create(user=user)
        
        # Update subscription
        old_tier = subscription.tier
        subscription.tier = new_tier
        if is_active is not None:
            subscription.is_active = is_active        # Update subscription dates if provided
        try:
            print(f"[DEBUG] Updating subscription dates...")
            if subscription_start:
                print(f"[DEBUG] Parsing subscription_start: {subscription_start}")
                subscription.subscription_start = parse_iso_date(subscription_start)
                print(f"[DEBUG] Parsed subscription_start: {subscription.subscription_start}")
            if subscription_end:
                print(f"[DEBUG] Parsing subscription_end: {subscription_end}")
                subscription.subscription_end = parse_iso_date(subscription_end)
            elif subscription_end == "":
                subscription.subscription_end = None
            if trial_start:
                print(f"[DEBUG] Parsing trial_start: {trial_start}")
                subscription.trial_start = parse_iso_date(trial_start)
            elif trial_start == "":
                subscription.trial_start = None
            if trial_end:
                print(f"[DEBUG] Parsing trial_end: {trial_end}")
                subscription.trial_end = parse_iso_date(trial_end)
            elif trial_end == "":
                subscription.trial_end = None
            print(f"[DEBUG] Date parsing completed successfully")
        except ValueError as e:
            print(f"[DEBUG] Date parsing ValueError: {e}")
            return error_response(
                str(e),
                code="INVALID_DATE_FORMAT",
                status_code=status.HTTP_400_BAD_REQUEST
            )        # Update limits based on tier
        print(f"[DEBUG] Getting tier limits for: {new_tier}")
        tier_limits = UserSubscription.get_tier_limits(new_tier)
        print(f"[DEBUG] Tier limits: {tier_limits}")
        # Handle unlimited limits (None) by using high numbers to represent unlimited
        if tier_limits['daily_analysis_limit'] is None:
            subscription.daily_analysis_limit = 999999  # Represents unlimited
        else:
            subscription.daily_analysis_limit = tier_limits['daily_analysis_limit']
        if tier_limits['brand_sample_limit'] is None:
            subscription.brand_sample_limit = 999999  # Represents unlimited
        else:
            subscription.brand_sample_limit = tier_limits['brand_sample_limit']
        print(f"[DEBUG] Saving subscription...")

        try:
            subscription.save()
            print(f"[DEBUG] Subscription saved successfully")
        except Exception as save_error:
            print(f"[DEBUG] Error saving subscription: {save_error}")
            print(f"[DEBUG] Error type: {type(save_error)}")
            return error_response(
                f"Failed to save subscription: {str(save_error)}",
                code="SUBSCRIPTION_SAVE_ERROR",
                status_code=status.HTTP_400_BAD_REQUEST
            )
          # Update Clerk metadata to reflect the change
        try:
            from django.conf import settings
            import requests
            
            clerk_secret = getattr(settings, 'CLERK_SECRET_KEY', None)
            if clerk_secret and user.clerk_id:
                headers = {
                    'Authorization': f'Bearer {clerk_secret}',
                    'Content-Type': 'application/json'
                }
                
                metadata_update = {
                    'public_metadata': {
                        'subscription_tier': new_tier,
                        'stripe_customer_id': subscription.stripe_customer_id or '',
                        'stripe_subscription_id': subscription.stripe_subscription_id or ''
                    }
                }
                
                response = requests.patch(
                    f'https://api.clerk.dev/v1/users/{user.clerk_id}',
                    headers=headers,
                    json=metadata_update,
                    timeout=5
                )
                
                if response.status_code == 200:
                    print(f"[DEBUG] Updated Clerk metadata for user {user.id}")
                    # Update local metadata
                    user.update_clerk_metadata({
                        'subscription_tier': new_tier,
                        'stripe_customer_id': subscription.stripe_customer_id or '',
                        'stripe_subscription_id': subscription.stripe_subscription_id or ''
                    })
                else:
                    print(f"[DEBUG] Failed to update Clerk metadata: {response.status_code}")
                    
        except Exception as e:
            print(f"[DEBUG] Error updating Clerk metadata: {e}")
        
        return success_response(
            data={
                'user_id': user.id,
                'old_tier': old_tier,
                'new_tier': new_tier,
                'subscription': {
                    'tier': subscription.tier,
                    'is_active': subscription.is_active,
                    'daily_analysis_limit': subscription.daily_analysis_limit,
                    'brand_sample_limit': subscription.brand_sample_limit,
                }
            },
            message=f"Successfully updated user subscription from {old_tier} to {new_tier}"
        )
        
    except json.JSONDecodeError:
        return error_response(
            "Invalid JSON payload",
            code="INVALID_JSON",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return error_response(
            f"Failed to update subscription: {str(e)}",
            code="UPDATE_SUBSCRIPTION_ERROR"
        )

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def sync_stripe_subscription(request):
    """Manually sync subscription from Stripe"""
    if not is_admin_user(request.user):
        return error_response(
            "Access denied. Admin privileges required.",
            code="ADMIN_ACCESS_REQUIRED",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return error_response(
                "user_id is required",
                code="MISSING_USER_ID",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return error_response(
                "User not found",
                code="USER_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        subscription, created = UserSubscription.objects.get_or_create(user=user)
        
        if not subscription.stripe_customer_id:
            return error_response(
                "No Stripe customer ID found for this user",
                code="NO_STRIPE_CUSTOMER",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Sync from Stripe
        success = StripeService.sync_subscription_from_stripe(subscription.stripe_customer_id)
        
        if success:
            # Refresh subscription data
            subscription.refresh_from_db()
            
            return success_response(
                data={
                    'user_id': user.id,
                    'subscription': {
                        'tier': subscription.tier,
                        'is_active': subscription.is_active,
                        'payment_status': subscription.payment_status,
                        'stripe_subscription_id': subscription.stripe_subscription_id,
                    }
                },
                message="Successfully synced subscription from Stripe"
            )
        else:
            return error_response(
                "Failed to sync subscription from Stripe",
                code="STRIPE_SYNC_ERROR"
            )
            
    except json.JSONDecodeError:
        return error_response(
            "Invalid JSON payload",
            code="INVALID_JSON",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return error_response(
            f"Failed to sync subscription: {str(e)}",
            code="SYNC_ERROR"
        )

@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def admin_stats(request):
    """Get admin dashboard statistics"""
    if not is_admin_user(request.user):
        return error_response(
            "Access denied. Admin privileges required.",
            code="ADMIN_ACCESS_REQUIRED",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Count users by subscription tier
        total_users = User.objects.count()
        free_users = UserSubscription.objects.filter(tier='free').count()
        pro_users = UserSubscription.objects.filter(tier='pro').count()
        enterprise_users = UserSubscription.objects.filter(tier='enterprise').count()
        
        # Active subscriptions
        active_subscriptions = UserSubscription.objects.filter(
            is_active=True,
            tier__in=['pro', 'enterprise']
        ).count()
        
        # Trial users
        trial_users = UserSubscription.objects.filter(is_trial_active=True).count()
        
        return success_response(
            data={
                'total_users': total_users,
                'subscription_breakdown': {
                    'free': free_users,
                    'pro': pro_users,
                    'enterprise': enterprise_users
                },
                'active_paid_subscriptions': active_subscriptions,
                'active_trials': trial_users
            },
            message="Admin statistics fetched successfully"
        )
        
    except Exception as e:
        return error_response(
            f"Failed to fetch admin stats: {str(e)}",
            code="ADMIN_STATS_ERROR"
        )
