from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from brands.authentication import ClerkAuthentication
from brands.permissions import ClerkAuthenticated
from brands.models import Brand
from extensions.views import ExtensionTokenAuthentication
from analysis.models import UserSubscription
from .models import PostAudit, AuditMetrics, DriftAlert, AuditUsage
from .serializers import (
    PostAuditSerializer,
    PostAuditCreateSerializer,
    DriftAlertSerializer,
    AuditUsageSerializer
)
from .services import BrandVoiceScorer, XAlgorithmChecker


@api_view(['POST'])
@authentication_classes([ExtensionTokenAuthentication, ClerkAuthentication])
@permission_classes([])  # Authentication handled by either token or Clerk
def analyze_post(request):
    """
    Analyze a post for brand voice alignment
    
    POST /api/audits/analyze/
    {
        "brand_id": 1,  // Optional - uses default brand if not provided
        "content": "Post text...",
        "platform": "twitter",
        "context": {"has_media": true}
    }
    """
    # Check subscription - same pattern as profile analysis
    subscription = UserSubscription.objects.filter(user=request.user).first()
    if not subscription or subscription.tier == 'free':
        return Response(
            {
                'error': 'Post audits require a Pro or Enterprise subscription.',
                'code': 'UPGRADE_REQUIRED'
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    # If brand_id not provided, use user's default brand
    data = request.data.copy()
    if 'brand_id' not in data or not data.get('brand_id'):
        default_brand = Brand.objects.filter(user=request.user).order_by('-created_at').first()
        if not default_brand:
            return Response(
                {'error': 'No brand found. Please create a brand first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        data['brand_id'] = default_brand.id
    
    # Validate input
    serializer = PostAuditCreateSerializer(
        data=data,
        context={'request': request}
    )
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    validated_data = serializer.validated_data
    
    # Get brand
    brand = get_object_or_404(
        Brand,
        id=validated_data['brand_id'],
        user=request.user
    )
    
    content = validated_data['content']
    platform = validated_data['platform']
    context_data = validated_data.get('context', {})
    
    try:
        # Initialize scorer
        scorer = BrandVoiceScorer(brand)
        
        # Calculate brand voice score
        score_result = scorer.calculate_score(content)
        
        if 'error' in score_result:
            return Response(
                {'error': score_result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find deviations
        deviations = scorer.find_deviations(content)
        
        # X algorithm check (only for twitter)
        x_optimization = None
        ai_feedback = None
        if platform == 'twitter':
            x_checker = XAlgorithmChecker()
            x_optimization = x_checker.analyze(content, context_data)
            
            # Generate AI feedback for X posts
            ai_feedback = scorer.generate_ai_feedback(content, platform)
        
        # Save audit in a transaction
        with transaction.atomic():
            # Create audit record
            audit = PostAudit.objects.create(
                user=request.user,
                brand=brand,
                content=content,
                platform=platform,
                score=score_result['total'],
                context=context_data,
                content_embedding=score_result.get('content_embedding')
            )
            
            # Create metrics
            AuditMetrics.objects.create(
                audit=audit,
                tone_match=score_result['breakdown']['tone_match'],
                vocabulary_consistency=score_result['breakdown']['vocabulary_consistency'],
                emotional_alignment=score_result['breakdown']['emotional_alignment'],
                style_deviation=score_result['breakdown']['style_deviation'],
                deviations=deviations,
                x_optimization=x_optimization,
                ai_feedback=ai_feedback
            )
            
            # Increment usage count
            AuditUsage.increment_audit_count(request.user)
            
            # Check for drift (if score is below threshold)
            _check_for_drift(request.user, brand, score_result['total'])
        
        # Serialize response
        audit_serializer = PostAuditSerializer(audit)
        
        return Response(
            {
                'audit': audit_serializer.data,
                'message': 'Post analyzed successfully'
            },
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        return Response(
            {'error': f'Analysis failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def audit_history(request):
    """
    Get audit history for the user
    
    GET /api/audits/history?platform=twitter&brand_id=1&limit=20
    """
    audits = PostAudit.objects.filter(user=request.user)
    
    # Apply filters
    platform = request.query_params.get('platform')
    if platform:
        audits = audits.filter(platform=platform)
    
    brand_id = request.query_params.get('brand_id')
    if brand_id:
        audits = audits.filter(brand_id=brand_id)
    
    min_score = request.query_params.get('min_score')
    if min_score:
        try:
            audits = audits.filter(score__gte=float(min_score))
        except ValueError:
            pass
    
    # Limit results
    limit = request.query_params.get('limit', 50)
    try:
        limit = int(limit)
    except ValueError:
        limit = 50
    
    audits = audits[:limit]
    
    serializer = PostAuditSerializer(audits, many=True)
    
    return Response({
        'audits': serializer.data,
        'count': audits.count()
    })


@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def audit_detail(request, audit_id):
    """
    Get detailed audit information
    
    GET /api/audits/{audit_id}
    """
    audit = get_object_or_404(PostAudit, id=audit_id, user=request.user)
    serializer = PostAuditSerializer(audit)
    
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def drift_alerts(request):
    """
    Get drift alerts for the user
    
    GET /api/audits/drift-alerts?acknowledged=false
    """
    alerts = DriftAlert.objects.filter(user=request.user)
    
    # Filter by acknowledged status
    acknowledged = request.query_params.get('acknowledged')
    if acknowledged is not None:
        acknowledged_bool = acknowledged.lower() in ['true', '1', 'yes']
        alerts = alerts.filter(acknowledged=acknowledged_bool)
    
    serializer = DriftAlertSerializer(alerts, many=True)
    
    return Response({
        'alerts': serializer.data,
        'count': alerts.count()
    })


@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def acknowledge_alert(request, alert_id):
    """
    Acknowledge a drift alert
    
    POST /api/audits/drift-alerts/{alert_id}/acknowledge
    """
    alert = get_object_or_404(DriftAlert, id=alert_id, user=request.user)
    alert.acknowledge()
    
    serializer = DriftAlertSerializer(alert)
    
    return Response({
        'alert': serializer.data,
        'message': 'Alert acknowledged'
    })


@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def usage_stats(request):
    """
    Get audit usage statistics for the user
    
    GET /api/audits/usage
    """
    from django.utils import timezone
    from datetime import timedelta
    
    # Get last 30 days of usage
    today = timezone.now().date()
    thirty_days_ago = today - timedelta(days=30)
    
    usage = AuditUsage.objects.filter(
        user=request.user,
        date__gte=thirty_days_ago
    ).order_by('-date')
    
    serializer = AuditUsageSerializer(usage, many=True)
    
    # Get subscription info
    subscription = getattr(request.user, 'subscription', None)
    tier = subscription.tier if subscription else 'free'
    
    # Calculate total this month
    first_of_month = today.replace(day=1)
    month_usage = AuditUsage.objects.filter(
        user=request.user,
        date__gte=first_of_month
    ).values_list('audit_count', flat=True)
    
    total_this_month = sum(month_usage)
    
    return Response({
        'usage': serializer.data,
        'total_this_month': total_this_month,
        'tier': tier,
        'is_unlimited': tier in ['pro', 'enterprise']
    })


@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def analytics(request):
    """
    Get analytics data for the user's audits
    
    GET /api/audits/analytics?days=30&brand_id=1
    """
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Avg, Count, Min, Max
    from django.db.models.functions import TruncDate
    
    # Parse query params
    days = request.query_params.get('days', 30)
    try:
        days = int(days)
        days = min(days, 90)  # Max 90 days
    except ValueError:
        days = 30
    
    brand_id = request.query_params.get('brand_id')
    
    # Date range
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)
    
    # Base queryset
    audits = PostAudit.objects.filter(
        user=request.user,
        created_at__gte=start_date
    )
    
    if brand_id:
        try:
            audits = audits.filter(brand_id=int(brand_id))
        except ValueError:
            pass
    
    # Overall stats
    overall_stats = audits.aggregate(
        total_audits=Count('id'),
        avg_score=Avg('score'),
        min_score=Min('score'),
        max_score=Max('score')
    )
    
    # Score trend over time (daily averages)
    score_trend = list(
        audits.annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(
            avg_score=Avg('score'),
            count=Count('id')
        )
        .order_by('date')
    )
    
    # Platform breakdown
    platform_stats = list(
        audits.values('platform')
        .annotate(
            count=Count('id'),
            avg_score=Avg('score')
        )
        .order_by('-count')
    )
    
    # Score distribution (buckets: 0-20, 20-40, 40-60, 60-80, 80-100)
    score_distribution = {
        '0-20': audits.filter(score__lt=20).count(),
        '20-40': audits.filter(score__gte=20, score__lt=40).count(),
        '40-60': audits.filter(score__gte=40, score__lt=60).count(),
        '60-80': audits.filter(score__gte=60, score__lt=80).count(),
        '80-100': audits.filter(score__gte=80).count(),
    }
    
    # Brand breakdown (if no specific brand filter)
    brand_stats = []
    if not brand_id:
        brand_stats = list(
            audits.values('brand__id', 'brand__name')
            .annotate(
                count=Count('id'),
                avg_score=Avg('score')
            )
            .order_by('-count')[:10]
        )
    
    # Recent performance (last 7 days vs previous 7 days)
    seven_days_ago = end_date - timedelta(days=7)
    fourteen_days_ago = end_date - timedelta(days=14)
    
    recent_avg = audits.filter(created_at__gte=seven_days_ago).aggregate(
        avg=Avg('score')
    )['avg'] or 0
    
    previous_avg = audits.filter(
        created_at__gte=fourteen_days_ago,
        created_at__lt=seven_days_ago
    ).aggregate(avg=Avg('score'))['avg'] or 0
    
    trend_direction = 'up' if recent_avg > previous_avg else ('down' if recent_avg < previous_avg else 'stable')
    trend_change = recent_avg - previous_avg
    
    return Response({
        'period': {
            'days': days,
            'start_date': start_date.date().isoformat(),
            'end_date': end_date.date().isoformat()
        },
        'overall': {
            'total_audits': overall_stats['total_audits'] or 0,
            'avg_score': round(overall_stats['avg_score'] or 0, 1),
            'min_score': round(overall_stats['min_score'] or 0, 1),
            'max_score': round(overall_stats['max_score'] or 0, 1),
        },
        'trend': {
            'direction': trend_direction,
            'change': round(trend_change, 1),
            'recent_avg': round(recent_avg, 1),
            'previous_avg': round(previous_avg, 1)
        },
        'score_trend': [
            {
                'date': item['date'].isoformat() if item['date'] else None,
                'avg_score': round(item['avg_score'] or 0, 1),
                'count': item['count']
            }
            for item in score_trend
        ],
        'platform_stats': [
            {
                'platform': item['platform'],
                'count': item['count'],
                'avg_score': round(item['avg_score'] or 0, 1)
            }
            for item in platform_stats
        ],
        'score_distribution': score_distribution,
        'brand_stats': [
            {
                'brand_id': item['brand__id'],
                'brand_name': item['brand__name'],
                'count': item['count'],
                'avg_score': round(item['avg_score'] or 0, 1)
            }
            for item in brand_stats
        ]
    })


def _check_for_drift(user, brand, score):
    """
    Internal helper to check if drift alert should be created
    """
    DRIFT_THRESHOLD = 60  # Score below this triggers alert
    
    if score >= DRIFT_THRESHOLD:
        return
    
    # Check recent audits for pattern
    from django.utils import timezone
    from datetime import timedelta
    
    recent_date = timezone.now() - timedelta(days=7)
    recent_audits = PostAudit.objects.filter(
        user=user,
        brand=brand,
        created_at__gte=recent_date
    ).order_by('-created_at')[:5]
    
    if recent_audits.count() < 3:
        return  # Not enough data
    
    # Calculate average score
    avg_score = sum(a.score for a in recent_audits) / recent_audits.count()
    
    if avg_score < DRIFT_THRESHOLD:
        # Determine severity
        if avg_score < 40:
            severity = 'high'
        elif avg_score < 50:
            severity = 'medium'
        else:
            severity = 'low'
        
        # Create alert if one doesn't exist recently
        existing_alert = DriftAlert.objects.filter(
            user=user,
            brand=brand,
            acknowledged=False,
            detected_at__gte=recent_date
        ).exists()
        
        if not existing_alert:
            alert = DriftAlert.objects.create(
                user=user,
                brand=brand,
                severity=severity,
                message=f"Your recent posts for '{brand.name}' are showing low brand voice alignment (avg: {avg_score:.1f}%). Consider reviewing your brand samples or adjusting your content.",
                threshold_breached=DRIFT_THRESHOLD
            )
            
            # Link recent audits
            alert.related_audits.set(recent_audits)
