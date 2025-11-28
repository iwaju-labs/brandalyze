from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from brands.utils.responses import error_response, success_response
from brands.permissions import ClerkAuthenticated
from brands.views import ClerkAuthentication
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import hashlib
import uuid
import secrets
import string
import random

from brands.models import Brand
from analysis.models import UserSubscription
from .models import ExtensionAnalysis, ExtensionSession, ExtensionToken
from .serializers import (
    ExtensionBrandSerializer,
    ExtensionAnalysisRequestSerializer,
)

from .analyzers.voice_analysis import (
    perform_profile_voice_analysis,
    perform_brand_alignment_analysis,
    perform_profile_alignment_analysis,
    perform_extension_analysis,
)
from .utils.helpers import extract_key_insights

# Constants
EXTENSION_REQUIRES_PAID_PLAN_MESSAGE = "Browser extension requires Pro or Enterprise subscription"


class ExtensionTokenAuthentication(BaseAuthentication):
    """Authentication for extension using long-lived tokens"""
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('ExtensionToken '):
            return None
            
        token = auth_header.split(' ', 1)[1]
        
        try:
            token_obj = ExtensionToken.objects.get(
                token=token,
                is_active=True,
                expires_at__gt=timezone.now()
            )
            
            # Update last used
            token_obj.last_used = timezone.now()
            token_obj.save(update_fields=['last_used'])
            
            return (token_obj.user, token_obj)
            
        except ExtensionToken.DoesNotExist:
            raise AuthenticationFailed('Invalid or expired extension token')


def generate_short_code():
    """Generate a short 8-character auth code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def generate_extension_token(request):
    """Generate a long-lived extension token for authenticated user (NEW FLOW)"""
    try:
        user = request.user
        subscription = UserSubscription.objects.filter(user=user).first()

        # Check subscription requirements for extension access
        extension_enabled = subscription and subscription.tier in ["pro", "enterprise"]
        
        if not extension_enabled:
            return error_response(
                message=EXTENSION_REQUIRES_PAID_PLAN_MESSAGE,
                code="SUBSCRIPTION_REQUIRED",
                status_code=status.HTTP_403_FORBIDDEN
            )

        # Generate token
        extension_token = secrets.token_urlsafe(32)
        
        # Set token expiry to match subscription end date (or 90 days if no end date)
        if subscription.subscription_end:
            expiry = subscription.subscription_end
        else:
            # Fallback to 90 days if subscription has no end date (e.g., lifetime)
            expiry = timezone.now() + timedelta(days=90)

        # Deactivate any existing tokens for this user
        ExtensionToken.objects.filter(user=user, is_active=True).update(is_active=False)

        # Create new token
        token_obj = ExtensionToken.objects.create(
            user=user,
            token=extension_token,
            auth_code=None,  # Not using auth codes in new flow
            expires_at=expiry,
            is_active=True
        )

        return success_response(data={
            'token': extension_token,
            'expires_at': expiry.isoformat(),
            'message': 'Extension token generated successfully'
        })

    except Exception as e:
        return error_response(
            message=f"Failed to generate extension token: {str(e)}",
            code="TOKEN_GENERATION_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def create_extension_token(request):
    """Exchange Clerk JWT for long-lived extension token (LEGACY - auth code flow)"""
    try:
        user = request.user
        subscription = UserSubscription.objects.filter(user=user).first()

        # Check subscription requirements for extension access
        extension_enabled = subscription and subscription.tier in ["pro", "enterprise"]
        
        if not extension_enabled:
            return error_response(
                message=EXTENSION_REQUIRES_PAID_PLAN_MESSAGE,
                code="SUBSCRIPTION_REQUIRED",
                status_code=status.HTTP_403_FORBIDDEN
            )

        # Generate tokens
        extension_token = secrets.token_urlsafe(32)
        auth_code = generate_short_code()
        
        # Set token expiry to match subscription end date (or 30 days if no end date)
        if subscription.subscription_end:
            expiry = subscription.subscription_end
        else:
            # Fallback to 30 days if subscription has no end date
            expiry = timezone.now() + timedelta(days=30)

        # Deactivate any existing tokens for this user
        ExtensionToken.objects.filter(user=user, is_active=True).update(is_active=False)

        # Create new token
        token_obj = ExtensionToken.objects.create(
            user=user,
            token=extension_token,
            auth_code=auth_code,
            expires_at=expiry,
            is_active=True
        )

        return success_response(data={
            'auth_code': auth_code,
            'expires_at': expiry.isoformat(),
            'message': 'Extension token created successfully'
        })

    except Exception as e:
        return error_response(
            message=f"Failed to create extension token: {str(e)}",
            code="TOKEN_CREATION_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([])  # No auth required for code exchange
def exchange_auth_code(request):
    """Exchange auth code for extension token"""
    try:
        auth_code = request.data.get('auth_code')
        
        if not auth_code:
            return error_response(
                message="Auth code is required",
                code="MISSING_AUTH_CODE",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Find valid token by auth code
        try:
            token_obj = ExtensionToken.objects.get(
                auth_code=auth_code,
                is_active=True,
                expires_at__gt=timezone.now()
            )
        except ExtensionToken.DoesNotExist:
            return error_response(
                message="Invalid or expired auth code",
                code="INVALID_AUTH_CODE",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Get user info
        user = token_obj.user
        subscription = UserSubscription.objects.filter(user=user).first()

        # Clear the auth code (one-time use)
        token_obj.auth_code = None
        token_obj.last_used = timezone.now()
        token_obj.save()

        user_info = {
            "user_id": user.id,
            "email": user.email,
            "display_name": f"{user.first_name} {user.last_name}".strip() or user.email,
            "subscription_tier": subscription.tier if subscription else "free",
            "extension_enabled": True,  # They must have pro/enterprise to get here
        }

        return success_response(data={
            'extension_token': token_obj.token,
            'user_info': user_info,
            'expires_at': token_obj.expires_at.isoformat()
        })

    except Exception as e:
        return error_response(
            message=f"Failed to exchange auth code: {str(e)}",
            code="CODE_EXCHANGE_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def verify_extension_auth(request):
    """Verify extension authentication and return user info"""
    try:
        user = request.user
        subscription = UserSubscription.objects.filter(user=user).first()

        # Check subscription requirements for extension access
        extension_enabled = subscription and subscription.tier in ["pro", "enterprise"]
          # Always return user info for authenticated users, but indicate extension status
        user_data = {
            "user_id": user.id,
            "email": user.email,
            "display_name": f"{user.first_name} {user.last_name}".strip() or user.email,
            "subscription_tier": subscription.tier if subscription else "free",
            "extension_enabled": extension_enabled,
        }

        return success_response(
            data=user_data,
            message="User authenticated successfully"
        )

    except Exception as e:
        return error_response(
            message=f"Extension authentication failed: {e}",
            code="AUTH_VERIFICATION_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@authentication_classes([ExtensionTokenAuthentication])
@permission_classes([])  # Token auth handles permission
def verify_extension_token(request):
    """Verify extension token and return user info"""
    try:
        user = request.user
        subscription = UserSubscription.objects.filter(user=user).first()

        # Check subscription requirements for extension access
        extension_enabled = subscription and subscription.tier in ["pro", "enterprise"]
        
        if not extension_enabled:
            return error_response(
                message=EXTENSION_REQUIRES_PAID_PLAN_MESSAGE,
                code="SUBSCRIPTION_REQUIRED",
                status_code=status.HTTP_403_FORBIDDEN
            )

        user_data = {
            "user_id": user.id,
            "email": user.email,
            "display_name": f"{user.first_name} {user.last_name}".strip() or user.email,
            "subscription_tier": subscription.tier if subscription else "free",
            "extension_enabled": extension_enabled,
        }

        return success_response(
            data=user_data,
            message="Extension token verified successfully"
        )

    except Exception as e:
        return error_response(
            message=f"Extension token verification failed: {e}",
            code="TOKEN_VERIFICATION_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def list_user_brands(request):
    """Get user's brands in lightweight format for extension"""
    try:
        # Check subscription requirements for extension access
        subscription = UserSubscription.objects.filter(user=request.user).first()
        if not subscription or subscription.tier == "free":
            return error_response(
                message=EXTENSION_REQUIRES_PAID_PLAN_MESSAGE,
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        brands = Brand.objects.filter(user=request.user).prefetch_related("samples")
        serializer = ExtensionBrandSerializer(brands, many=True)

        return success_response(
            data={"brands": serializer.data, "total_count": len(serializer.data)}
        )
    except Exception as e:
        return error_response(
            message=f"Failed to fetch brands: {e}",
            code="BRANDS_FETCH_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@authentication_classes([ExtensionTokenAuthentication, ClerkAuthentication])
@permission_classes([])  # Authentication handled by either token or Clerk
def analyze_profile_voice(request):
    """Analyze a profile's posts to extract their brand voice and style characteristics"""
    try:
        print("🔍 Profile voice analysis request received")
        print(f"📤 Request data: {request.data}")

        handle = request.data.get("handle")
        platform = request.data.get("platform", "twitter")
        posts_count = request.data.get("posts_count", 10)

        print(
            f"🎯 Parameters: handle={handle}, platform={platform}, posts_count={posts_count}"
        )

        if not handle:
            return error_response(
                message="Handle is required",
                code="MISSING_HANDLE",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Check subscription and daily limits
        subscription = UserSubscription.objects.filter(user=request.user).first()
        if not subscription or subscription.tier == "free":
            return error_response(
                message=EXTENSION_REQUIRES_PAID_PLAN_MESSAGE,
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        daily_count = ExtensionAnalysis.objects.filter(
            user=request.user, created_at__date=timezone.now().date()
        ).count()
        daily_limit = 50 if subscription.tier == "pro" else 200

        if daily_count >= daily_limit:
            return error_response(
                message=f"Daily analysis limit of {daily_limit} reached",
                code="DAILY_LIMIT_EXCEEDED",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Perform profile voice analysis using bio (more efficient for rate limits)
        use_bio = request.data.get("use_bio", True)  # Default to bio analysis
        extracted_posts = request.data.get("extracted_posts")  # Posts from extension
        extracted_bio = request.data.get("extracted_bio")  # Bio from extension

        # get user-selected emotional indicators (default to the 4 below, if not specified)
        emotional_indicators = request.data.get("emotional_indicators", [
            "enthusiasm", "professionalism", "approachability", "authority"
        ])

        # limit to 4 emotional_indicators
        emotional_indicators = emotional_indicators[:4]
        
        analysis_result = perform_profile_voice_analysis(
            handle, platform, posts_count, 
            extracted_posts=extracted_posts,
            use_bio=use_bio, 
            extracted_bio=extracted_bio,
            emotional_indicators=emotional_indicators
        )

        # Record the analysis
        ExtensionAnalysis.objects.create(
            user=request.user,
            platform=platform,
            content_hash=hashlib.sha256(f"profile_voice_{handle}".encode()).hexdigest()[
                :16
            ],
            alignment_score=0.0,  # Not applicable for voice analysis
        )

        # Create or update a Brand from this profile analysis
        # This allows post audits to use the analyzed voice
        from brands.models import Brand, BrandSample
        
        brand_name = f"@{handle} ({platform})"
        brand, created = Brand.objects.update_or_create(
            user=request.user,
            name=brand_name,
            defaults={
                'description': f"Brand voice extracted from {platform} profile @{handle}"
            }
        )
        
        # Store voice analysis as a brand sample
        voice_summary = analysis_result.get('voice_analysis', {})
        if voice_summary:
            import json
            sample_text = json.dumps(voice_summary, indent=2)
            BrandSample.objects.update_or_create(
                brand=brand,
                source_name=f"{platform}_profile_voice",
                defaults={
                    'text': sample_text,
                    'file_type': 'txt'
                }
            )

        return success_response(
            data=analysis_result,
            message="Profile voice analysis completed successfully",
        )

    except Exception as e:
        return error_response(
            message=f"Profile voice analysis failed: {str(e)}",
            code="PROFILE_VOICE_ANALYSIS_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@authentication_classes([ExtensionTokenAuthentication, ClerkAuthentication])
@permission_classes([])  # Authentication handled by either token or Clerk
def analyze_content_alignment(request):
    """Analyze how well a piece of content aligns with a brand or profile voice"""
    try:
        print("🔍 Content alignment analysis request received")

        content = request.data.get("content")
        alignment_type = request.data.get("type", "brand")  # 'brand' or 'profile'
        brand_id = request.data.get("brand_id")
        reference_handle = request.data.get("reference_handle")
        platform = request.data.get("platform", "twitter")

        if not content:
            return error_response(
                message="Content is required",
                code="MISSING_CONTENT",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Check subscription and daily limits
        subscription = UserSubscription.objects.filter(user=request.user).first()
        if not subscription or subscription.tier == "free":
            return error_response(
                message=EXTENSION_REQUIRES_PAID_PLAN_MESSAGE,
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        daily_count = ExtensionAnalysis.objects.filter(
            user=request.user, created_at__date=timezone.now().date()
        ).count()
        daily_limit = 50 if subscription.tier == "pro" else 200

        if daily_count >= daily_limit:
            return error_response(
                message=f"Daily analysis limit of {daily_limit} reached",
                code="DAILY_LIMIT_EXCEEDED",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Perform alignment analysis based on type
        if alignment_type == "brand":
            if not brand_id:
                # Use user's first brand if not specified
                brand = Brand.objects.filter(user=request.user).first()
                if not brand:
                    return error_response(
                        message="No brand found. Please create a brand first.",
                        code="NO_BRAND_FOUND",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                try:
                    brand = Brand.objects.get(id=brand_id, user=request.user)
                except Brand.DoesNotExist:
                    return error_response(
                        message="Brand not found or access denied",
                        code="BRAND_NOT_FOUND",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

            analysis_result = perform_brand_alignment_analysis(content, brand)
            content_hash = hashlib.sha256(
                f"brand_alignment_{content}_{brand.id}".encode()
            ).hexdigest()[:16]

            # Record the analysis
            ExtensionAnalysis.objects.create(
                user=request.user,
                platform=platform,
                content_hash=content_hash,
                brand_id=brand.id,
                alignment_score=analysis_result.get("alignment_score", 0),
            )

        elif alignment_type == "profile":
            if not reference_handle:
                return error_response(
                    message="Reference handle is required for profile alignment",
                    code="MISSING_REFERENCE_HANDLE",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            analysis_result = perform_profile_alignment_analysis(
                content, reference_handle, platform
            )
            content_hash = hashlib.sha256(
                f"profile_alignment_{content}_{reference_handle}".encode()
            ).hexdigest()[:16]

            # Record the analysis
            ExtensionAnalysis.objects.create(
                user=request.user,
                platform=platform,
                content_hash=content_hash,
                alignment_score=analysis_result.get("alignment_score", 0),
            )

        else:
            return error_response(
                message="Invalid alignment type. Use 'brand' or 'profile'",
                code="INVALID_ALIGNMENT_TYPE",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        return success_response(
            data=analysis_result,
            message="Content alignment analysis completed successfully",
        )

    except Exception as e:
        return error_response(
            message=f"Content alignment analysis failed: {str(e)}",
            code="CONTENT_ALIGNMENT_ANALYSIS_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def quick_analyze(request):
    """Optimised analysis endpoint for extension"""
    try:
        serializer = ExtensionAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Invalid request",
                code="INVALID_REQUEST",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        content = data["content"]
        brand_id = data["brand_id"]
        platform = data.get("platform", "unknown")
        session_id = data.get("session_id")

        # checking daily usage limits
        daily_count = ExtensionAnalysis.objects.filter(
            user=request.user, created_at__date=timezone.now().date()
        ).count()
        subscription = UserSubscription.objects.filter(user=request.user).first()

        # Check subscription requirements for extension access
        if not subscription or subscription.tier == "free":
            return error_response(
                message=EXTENSION_REQUIRES_PAID_PLAN_MESSAGE,
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        daily_limit = 50 if subscription.tier == "pro" else 200

        if daily_count >= daily_limit:
            return error_response(
                message=f"Daily analysis limit of {daily_limit} reached",
                code="DAILY_LIMIT_EXCEEDED",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # check if cached results exist for this content
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        cache_key = f"ext_analysis_{request.user.id}_{content_hash}_{brand_id}"
        cached_result = cache.get(cache_key)

        if cached_result:
            return success_response(data=cached_result, status_code=status.HTTP_200_OK)

        # verify brand ownership
        try:
            brand = Brand.objects.get(id=brand_id, user=request.user)
        except Brand.DoesNotExist:
            return error_response(
                message="Brand not found or access denied",
                code="BRAND_NOT_FOUND",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        analysis_result = perform_extension_analysis(content, brand)
        alignment_score = analysis_result.get("alignment_score", 0)

        # determine alignment level
        if alignment_score >= 0.8:
            alignment_level = "high"
        elif alignment_score >= 0.6:
            alignment_level = "medium"
        else:
            alignment_level = "low"

        feedback = analysis_result.get("feedback", {})
        ai_feedback = (
            feedback.get("ai_feedback", "")
            if isinstance(feedback, dict)
            else str(feedback)
        )
        key_insights = extract_key_insights(ai_feedback)

        # generate response
        analysis_id = str(uuid.uuid4())[:8]
        response_data = {
            "alignment_score": alignment_score,
            "alignment_level": alignment_level,
            "key_insights": key_insights,
            "analysis_id": analysis_id,
        }

        # cache result
        cache.set(cache_key, response_data, 3600)

        ExtensionAnalysis.objects.create(
            user=request.user,
            platform=platform,
            content_hash=content_hash,
            brand_id=brand_id,
            alignment_score=alignment_score,
        )

        if session_id:
            session, _ = ExtensionSession.objects.get_or_create(
                session_id=session_id,
                defaults={"user": request.user, "platform": platform},
            )
            session.analyses_count += 1
            session.save()

        return success_response(
            data=response_data, message="Analysis completed successfully"
        )

    except Exception as e:
        return error_response(
            message=f"Analysis failed: {str(e)}",
            code="ANALYSIS_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def check_usage_limits(request):
    """Check current usage against subscription limits"""
    try:
        subscription = UserSubscription.objects.filter(user=request.user).first()
        if not subscription:
            return error_response(
                message="No subscription found",
                code="NO_SUBSCRIPTION",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Get today's usage
        today_count = ExtensionAnalysis.objects.filter(
            user=request.user, created_at__date=timezone.now().date()
        ).count()

        daily_limit = 50 if subscription.tier == "pro" else 200

        return success_response(
            data={
                "subscription_tier": subscription.tier,
                "daily_limit": daily_limit,
                "daily_used": today_count,
                "daily_remaining": max(0, daily_limit - today_count),
                "can_analyze": today_count < daily_limit,
            },
            message="Usage limits retrieved successfully",
        )

    except Exception as e:
        return error_response(
            message=f"Usage check failed: {str(e)}",
            code="USAGE_CHECK_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )