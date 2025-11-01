from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from brands.utils.responses import error_response, success_response
from brands.permissions import ClerkAuthenticated
from brands.views import ClerkAuthentication
from django.core.cache import cache
from django.utils import timezone
import hashlib
import uuid

from brands.models import Brand
from analysis.models import UserSubscription
from .models import ExtensionAnalysis, ExtensionSession
from .serializers import (
    ExtensionBrandSerializer,
    ExtensionAnalysisRequestSerializer,
)

# Import refactored modules
from .analyzers.voice_analysis import (
    perform_profile_voice_analysis,
    perform_brand_alignment_analysis,
    perform_profile_alignment_analysis,
    perform_extension_analysis,
)
from .utils.helpers import extract_key_insights

# Constants
EXTENSION_REQUIRES_PAID_PLAN_MESSAGE = "Browser extension requires Pro or Enterprise subscription"


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
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
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
        
        analysis_result = perform_profile_voice_analysis(
            handle, platform, posts_count, 
            extracted_posts=extracted_posts,
            use_bio=use_bio, 
            extracted_bio=extracted_bio
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
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
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