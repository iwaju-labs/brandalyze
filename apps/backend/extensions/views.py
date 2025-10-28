from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
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

@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def verify_extension_auth(request):
    """Verify extension authentication and return user info"""
    try:
        user = request.user
        subscription = UserSubscription.objects.filter(user=user).first()
        
        # Check subscription requirements for extension access
        if not subscription or subscription.tier == "free":
            return error_response(
                "Browser extension requires Pro or Enterprise subscription",
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        user_info = {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,  # Add email to response
            "subscription_tier": subscription.tier if subscription else "free",
            "daily_limit": 50 if subscription and subscription.tier == "pro" else 200,
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
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def list_user_brands(request):
    """Get user's brands in lightweight format for extension"""
    try:
        # Check subscription requirements for extension access
        subscription = UserSubscription.objects.filter(user=request.user).first()
        if not subscription or subscription.tier == "free":
            return error_response(
                message="Browser extension requires Pro or Enterprise subscription",
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        
        brands = Brand.objects.filter(user=request.user).prefetch_related('samples')
        serializer = ExtensionBrandSerializer(brands, many=True)

        return success_response(
            data={
                'brands': serializer.data,
                'total_count': len(serializer.data)
            })
    except Exception as e:
        return error_response(
            message=f"Failed to fetch brands: {e}",
            code="BRANDS_FETCH_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def analyze_profile(request):
    """Analyze a Twitter profile's recent posts for brand alignment"""
    try:
        handle = request.data.get('handle')
        platform = request.data.get('platform', 'twitter')
        posts_count = request.data.get('posts_count', 10)
        
        if not handle:
            return error_response(
                message="Twitter handle is required",
                code="MISSING_HANDLE",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Check daily usage limits
        daily_count = ExtensionAnalysis.objects.filter(
            user=request.user,
            created_at__date=timezone.now().date()
        ).count()        
        subscription = UserSubscription.objects.filter(user=request.user).first()
        
        # Check subscription requirements for extension access
        if not subscription or subscription.tier == "free":
            return error_response(
                message="Browser extension requires Pro or Enterprise subscription",
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        
        daily_limit = 50 if subscription.tier == 'pro' else 200

        if daily_count >= daily_limit:
            return error_response(
                message=f"Daily analysis limit of {daily_limit} reached",
                code='DAILY_LIMIT_EXCEEDED',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Get user's first brand for analysis
        brand = Brand.objects.filter(user=request.user).first()
        if not brand:
            return error_response(
                message="No brand found. Please create a brand first.",
                code="NO_BRAND_FOUND",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # For now, return mock data - you can integrate with Twitter API later
        analysis_result = perform_profile_analysis(handle, brand, posts_count)
        
        # Record the analysis
        ExtensionAnalysis.objects.create(
            user=request.user,
            platform=platform,
            content_hash=hashlib.sha256(f"profile_{handle}".encode()).hexdigest()[:16],
            brand_id=brand.id,
            alignment_score=analysis_result['average_score']
        )
        
        return success_response(
            data=analysis_result,
            message="Profile analysis completed successfully"
        )
        
    except Exception as e:
        return error_response(
            message=f"Profile analysis failed: {str(e)}",
            code="PROFILE_ANALYSIS_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['POST'])
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
        
        # Check subscription requirements for extension access
        if not subscription or subscription.tier == "free":
            return error_response(
                message="Browser extension requires Pro or Enterprise subscription",
                code="EXTENSION_REQUIRES_PAID_PLAN",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        
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
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
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

def perform_profile_analysis(handle, brand, posts_count=10):
    """Analyze a Twitter profile's recent posts for brand alignment"""
    # Mock implementation - replace with actual Twitter API integration
    posts = [
        {
            'text': f"Sample tweet from @{handle} about business strategy and innovation",
            'engagement': 25,
            'date': '2024-01-15'
        },
        {
            'text': f"Another post from @{handle} discussing market trends and growth",
            'engagement': 42,
            'date': '2024-01-14'
        },
        {
            'text': f"Sharing insights about customer experience from @{handle}",
            'engagement': 18,
            'date': '2024-01-13'
        }
    ]
    
    # Mock analysis scores for each post
    post_analyses = []
    scores = []
    
    for i, post in enumerate(posts):
        # Generate mock alignment score (in real implementation, use brand analysis)
        score = 0.7 + (i * 0.05)  # Vary scores slightly
        scores.append(score)
        
        post_analyses.append({
            'text': post['text'],
            'alignment_score': score,
            'key_insights': [
                f"Content aligns with brand voice {int(score * 100)}%",
                f"Engagement rate: {post['engagement']} interactions",
                "Tone matches brand guidelines"
            ],
            'engagement': post['engagement'],
            'date': post['date']
        })
    
    average_score = sum(scores) / len(scores) if scores else 0
    
    return {
        'handle': handle,
        'platform': 'twitter',
        'posts_analyzed': len(posts),
        'average_score': round(average_score, 2),
        'post_analyses': post_analyses,
        'overall_insights': [
            f"Profile @{handle} shows {int(average_score * 100)}% brand alignment",
            f"Analyzed {len(posts)} recent posts",
            "Strong consistency in brand messaging"
        ],
        'brand_name': brand.name
    }

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
        from ai_core.analysis import BrandAnalyzer
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