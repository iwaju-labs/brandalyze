from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from brands.authentication import ClerkAuthentication
from brands.permissions import ClerkAuthenticated
from brands.models import Brand
from .models import PostAudit, AuditMetrics, DriftAlert, AuditUsage
from .serializers import (
    PostAuditSerializer,
    PostAuditCreateSerializer,
    DriftAlertSerializer,
    AuditUsageSerializer
)
from .services import BrandVoiceScorer, XAlgorithmChecker


@api_view(['POST'])
@permission_classes([ClerkAuthenticated])
def analyze_post(request):
    """
    Analyze a post for brand voice alignment
    
    POST /api/audits/analyze
    {
        "brand_id": 1,
        "content": "Post text...",
        "platform": "twitter",
        "context": {"has_media": true}
    }
    """
    # Check if user can perform audit (Pro/Enterprise only)
    can_audit, remaining = AuditUsage.can_perform_audit(request.user)
    
    if not can_audit:
        return Response(
            {
                'error': 'Audits are a Pro feature. Upgrade to access unlimited post audits.',
                'code': 'UPGRADE_REQUIRED',
                'remaining': remaining
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Validate input
    serializer = PostAuditCreateSerializer(
        data=request.data,
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
        if platform == 'twitter':
            x_checker = XAlgorithmChecker()
            x_optimization = x_checker.analyze(content, context_data)
        
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
                x_optimization=x_optimization
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
