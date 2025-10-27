from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from brands.utils.responses import error_response, success_response
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

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_extension_auth(request):
    """Verify extension authentication and return user info"""
    try:
        user = request.user
        subscription = UserSubscription.objects.filter(user=user).first()

        if not subscription or subscription.tier == "free":
            return error_response(
                "Browser extension requires Pro or Enterprise subscription",
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        user_info = {
            "user_id": user.id,
            "username": user.username,
            "subscription_tier": subscription.tier,
            "daily_limit": 50 if subscription.tier == "pro" else 200,
            "extension_enabled": True,
        }

        return success_response(
            data=user_info,
            message="User data fetched successfully",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        return error_response(
            message=f"Extension authentication failed: {e}",
            code="AUTH_VERIFICATION_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_brands(request):
    """Get user's brands in lightweight format extension"""
    try:
        brands = Brand.objects.filter(user=request.user).prefetch_related('samples')
        serializer = ExtensionBrandSerializer(brands, many=True)

        return success_response(
            data={
                'brands': serializer.data,
                'total_count': len(serializer.data)
            })
    except Exception as e:
        return error_response(
            message=f"Failed to fetch brands {e}",
            code="BRANDS_FETCH_FAILED",
            status=status.HTTP_400_BAD_REQUEST
        )
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_analyze(request):
    """Optimised analysis endpoint for extension"""
    try:
        serializer = ExtensionAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Invalid request",
                code="INVALID_REQUEST",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        content = data['content']
        brand_id = data['brand_id']
        platform = data.get('platform', 'unknown')
        session_id = data.get('session_id')

        # checking daily usage limits
        daily_count = ExtensionAnalysis.objects.filter(
            user=request.user,
            created_at__date=timezone.now().date()
        ).count()

        subscription = UserSubscription.objects.filter(user=request.user).first()
        daily_limit = 50 if subscription.tier == 'pro' else 200

        if daily_count >= daily_limit:
            return error_response(
                message=f"Daily analysis limit of {daily_limit} reached",
                code='DAILY_LIMIT_EXCEEDED',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # check if cached results exist for this content
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        cache_key = f"ext_analysis_{request.user.id}_{content_hash}_{brand_id}"
        cached_result = cache.get(cache_key)

        if cached_result:
            return success_response(
                data=cached_result,
                status_code=status.HTTP_200_OK
            )
        
        # verify brand ownership
        try:
            brand = Brand.objects.get(id=brand_id, user=request.user)
        except Brand.DoesNotExist:
            return error_response(
                message='Brand not found or access denied',
                code="BRAND_NOT_FOUND",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        analysis_result = perform_extension_analysis(content, brand)
        alignment_score = analysis_result.get('alignment_score', 0)

        # determine alignment level
        if alignment_score >= 0.8:
            alignment_level = 'high'
        elif alignment_score >= 0.6:
            alignment_level = 'medium'
        else:
            alignment_level = 'low'
            
        feedback = analysis_result.get('feedback', {})
        ai_feedback = feedback.get('ai_feedback', '') if isinstance(feedback, dict) else str(feedback)
        key_insights = extract_key_insights(ai_feedback)

        # generate response
        analysis_id = str(uuid.uuid4())[:8]
        response_data = {
            'alignment_score': alignment_score,
            'alignment_level': alignment_level,
            'key_insights': key_insights,
            'analysis_id': analysis_id
        }

        # cache result
        cache.set(cache_key, response_data, 3600)

        ExtensionAnalysis.objects.create(
            user=request.user,
            platform=platform,
            content_hash=content_hash,
            brand_id=brand_id,
            alignment_score=alignment_score
        )

        if session_id:
            session, _ = ExtensionSession.objects.get_or_create(
                session_id=session_id,
                defaults={
                    'user': request.user,
                    'platform': platform
                }
            )
            session.analyses_count += 1
            session.save()

        return success_response(
            data=response_data,
            message="Analysis completed successfully"
        )
    
    except Exception as e:
        return error_response(
            message=f"Analysis failed: {str(e)}",
            code="ANALYSIS_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_usage_limits(request):
    """Check current usage against subscription limits"""
    try:
        subscription = UserSubscription.objects.filter(user=request.user).first()
        if not subscription:
            return error_response(
                message='No subscription found',
                code='NO_SUBSCRIPTION',
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # Get today's usage
        today_count = ExtensionAnalysis.objects.filter(
            user=request.user,
            created_at__date=timezone.now().date()
        ).count()
        
        daily_limit = 50 if subscription.tier == 'pro' else 200
        
        return success_response(
            data={
                'subscription_tier': subscription.tier,
                'daily_limit': daily_limit,
                'daily_used': today_count,
                'daily_remaining': max(0, daily_limit - today_count),
                'can_analyze': today_count < daily_limit
            },
            message="Usage limits retrieved successfully"
        )
        
    except Exception as e:
        return error_response(
            message=f"Usage check failed: {str(e)}",
            code='USAGE_CHECK_FAILED',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def perform_extension_analysis(content, brand):
    """
    Perform brand analysis using existing logic, adapted for extension use
    """
    try:
        # Get brand samples from the Brand object
        brand_samples = []
        for sample in brand.samples.all():
            if sample.content:
                brand_samples.append(sample.content.strip())
        
        if not brand_samples:
            return {
                'alignment_score': 0.5,
                'feedback': {'ai_feedback': 'No brand samples available for comparison'}
            }
        
        # Import and use existing analyzer
        from packages.ai_core.analysis import BrandAnalyzer
        from django.conf import settings
        
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return {
                'alignment_score': 0.5,
                'feedback': {'ai_feedback': 'AI service not configured'}
            }
        
        analyzer = BrandAnalyzer(api_key)
        
        # Perform the analysis using existing logic
        analysis_result = analyzer.analyze_brand_alignment(content, brand_samples)
        
        return analysis_result
        
    except Exception as e:
        return {
            'alignment_score': 0.5,
            'feedback': {'ai_feedback': f'Analysis error: {str(e)}'}
        }

def extract_key_insights(analysis_text):
    """Extract 3 key insights from analysis text"""
    if not analysis_text:
        return ['Analysis completed successfully']
    
    # Simple extraction - look for numbered points or bullet points
    lines = analysis_text.split('\n')
    insights = []
    
    for line in lines:
        line = line.strip()
        if line and (line.startswith('•') or line.startswith('-') or 
                    line.startswith('*') or any(line.startswith(f'{i}.') for i in range(1, 10))):
            # Clean up the line
            cleaned = line.lstrip('•-*123456789. ').strip()
            if cleaned and len(cleaned) > 10:  # Meaningful insight
                insights.append(cleaned)
        
        if len(insights) >= 3:
            break
    
    # Fallback if no structured insights found
    if not insights:
        sentences = analysis_text.replace('\n', ' ').split('.')
        for sentence in sentences[:3]:
            sentence = sentence.strip()
            if len(sentence) > 20:
                insights.append(sentence + '.')
    
    return insights[:3] if insights else ['Brand analysis completed successfully']