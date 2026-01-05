import time
from datetime import timedelta
from django.utils import timezone
from django.db import connection
from django.db.models import Count, Avg
from django.db.models.functions import TruncHour
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework import status

from brands.utils.responses import success_response, error_response
from brands.permissions import ClerkAuthenticated
from brands.authentication import ClerkAuthentication
from payments.admin_views import is_admin_user

ADMIN_ACCESS_DENIED_MESSAGE = "Access denied. Admin privileges required."
ADMIN_ACCESS_DENIED_CODE = "ADMIN_ACCESS_REQUIRED"


def check_database_health():
    """Check database connectivity and response time"""
    try:
        start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        response_time = (time.time() - start) * 1000
        return True, response_time
    except Exception as e:
        return False, str(e)


def check_external_service(service_name):
    """Check external service availability"""
    import requests
    
    endpoints = {
        'clerk': 'https://api.clerk.dev/v1/health',
        'stripe': 'https://api.stripe.com/v1',
        'openai': 'https://api.openai.com/v1/models',
    }
    
    try:
        url = endpoints.get(service_name)
        if not url:
            return True, 0
        
        start = time.time()
        response = requests.head(url, timeout=5)
        response_time = (time.time() - start) * 1000
        
        # Consider 2xx and 4xx (auth required) as "up"
        is_up = response.status_code < 500
        return is_up, response_time
    except requests.Timeout:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def system_health(request):
    """Get comprehensive system health metrics"""
    if not is_admin_user(request.user):
        return error_response(
            ADMIN_ACCESS_DENIED_MESSAGE,
            code=ADMIN_ACCESS_DENIED_CODE,
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from audits.models import APIMetric, PostAudit
        from django.contrib.auth import get_user_model
        from analysis.models import UserSubscription, AnalysisLog
        
        user_model = get_user_model()
        now = timezone.now()
        
        # Time ranges
        last_hour = now - timedelta(hours=1)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        # Database health
        db_ok, db_response = check_database_health()
        
        # Get API metrics for last hour
        hour_metrics = APIMetric.objects.filter(timestamp__gte=last_hour)
        hour_total = hour_metrics.count()
        hour_errors = hour_metrics.filter(status_code__gte=400).count()
        hour_avg_response = hour_metrics.aggregate(avg=Avg('response_time_ms'))['avg'] or 0
        
        # Get API metrics for last 24 hours
        day_metrics = APIMetric.objects.filter(timestamp__gte=last_24h)
        day_total = day_metrics.count()
        day_errors = day_metrics.filter(status_code__gte=400).count()
        day_avg_response = day_metrics.aggregate(avg=Avg('response_time_ms'))['avg'] or 0
        
        # Calculate error rate
        hour_error_rate = (hour_errors / hour_total * 100) if hour_total > 0 else 0
        day_error_rate = (day_errors / day_total * 100) if day_total > 0 else 0
        
        # P95 response time (approximate using sorted values)
        p95_response = 0
        if hour_total > 0:
            p95_index = int(hour_total * 0.95)
            p95_values = list(hour_metrics.order_by('response_time_ms').values_list('response_time_ms', flat=True))
            if p95_values:
                p95_response = p95_values[min(p95_index, len(p95_values) - 1)]
        
        # Error breakdown by status code
        error_breakdown = list(
            day_metrics.filter(status_code__gte=400)
            .values('status_code')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        # Top slow endpoints
        slow_endpoints = list(
            day_metrics
            .values('endpoint', 'method')
            .annotate(
                avg_time=Avg('response_time_ms'),
                request_count=Count('id')
            )
            .filter(request_count__gte=5)
            .order_by('-avg_time')[:10]
        )
        
        # Endpoint error rates
        endpoint_errors = list(
            day_metrics.filter(status_code__gte=400)
            .values('endpoint', 'method')
            .annotate(error_count=Count('id'))
            .order_by('-error_count')[:10]
        )
        
        # Hourly request trend (last 24 hours)
        hourly_trend_fixed = []
        for h in day_metrics.annotate(hour=TruncHour('timestamp')).values('hour').distinct().order_by('hour'):
            hour_data = day_metrics.filter(timestamp__hour=h['hour'].hour, timestamp__date=h['hour'].date())
            hourly_trend_fixed.append({
                'hour': h['hour'].isoformat(),
                'requests': hour_data.count(),
                'errors': hour_data.filter(status_code__gte=400).count(),
                'avg_response': hour_data.aggregate(avg=Avg('response_time_ms'))['avg'] or 0,
            })
        
        # Recent errors (last 10)
        recent_errors = list(
            APIMetric.objects.filter(status_code__gte=400)
            .order_by('-timestamp')[:10]
            .values('endpoint', 'method', 'status_code', 'error_message', 'timestamp')
        )
        
        # System stats
        total_users = user_model.objects.count()
        active_subscriptions = UserSubscription.objects.filter(
            is_active=True,
            tier__in=['pro', 'enterprise']
        ).count()
        
        # Audits today (content alignment checks from extension)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        audits_today = PostAudit.objects.filter(created_at__gte=today_start).count()
        audits_week = PostAudit.objects.filter(created_at__gte=last_7d).count()
        
        # Analysis logs (brand voice analyses from /analyze page)
        analyses_today = AnalysisLog.objects.filter(created_at__gte=today_start).count()
        analyses_week = AnalysisLog.objects.filter(created_at__gte=last_7d).count()
        analyses_success_today = AnalysisLog.objects.filter(created_at__gte=today_start, success=True).count()
        
        # Check external services (optional, can be slow)
        check_externals = request.GET.get('check_externals', 'false').lower() == 'true'
        external_services = {}
        if check_externals:
            for service in ['clerk', 'stripe', 'openai']:
                is_up, response = check_external_service(service)
                external_services[service] = {
                    'status': 'up' if is_up else 'down',
                    'response_time_ms': response if isinstance(response, (int, float)) else None,
                    'error': response if isinstance(response, str) else None,
                }
        
        # Overall system status
        system_status = 'healthy'
        if not db_ok:
            system_status = 'critical'
        elif hour_error_rate > 10:
            system_status = 'degraded'
        elif hour_error_rate > 5:
            system_status = 'warning'
        
        return success_response(
            data={
                'status': system_status,
                'timestamp': now.isoformat(),
                'database': {
                    'status': 'up' if db_ok else 'down',
                    'response_time_ms': db_response if isinstance(db_response, (int, float)) else None,
                    'error': db_response if isinstance(db_response, str) else None,
                },
                'api_metrics': {
                    'last_hour': {
                        'total_requests': hour_total,
                        'error_count': hour_errors,
                        'error_rate_percent': round(hour_error_rate, 2),
                        'avg_response_time_ms': round(hour_avg_response, 2),
                        'p95_response_time_ms': round(p95_response, 2),
                    },
                    'last_24h': {
                        'total_requests': day_total,
                        'error_count': day_errors,
                        'error_rate_percent': round(day_error_rate, 2),
                        'avg_response_time_ms': round(day_avg_response, 2),
                    },
                },
                'error_breakdown': error_breakdown,
                'slow_endpoints': [
                    {
                        'endpoint': e['endpoint'],
                        'method': e['method'],
                        'avg_time_ms': round(e['avg_time'], 2),
                        'request_count': e['request_count'],
                    }
                    for e in slow_endpoints
                ],
                'endpoint_errors': [
                    {
                        'endpoint': e['endpoint'],
                        'method': e['method'],
                        'error_count': e['error_count'],
                    }
                    for e in endpoint_errors
                ],
                'hourly_trend': hourly_trend_fixed[-24:],
                'recent_errors': [
                    {
                        'endpoint': e['endpoint'],
                        'method': e['method'],
                        'status_code': e['status_code'],
                        'error_preview': (e['error_message'] or '')[:200],
                        'timestamp': e['timestamp'].isoformat(),
                    }
                    for e in recent_errors
                ],
                'platform_stats': {
                    'total_users': total_users,
                    'active_subscriptions': active_subscriptions,
                    'audits_today': audits_today,
                    'audits_this_week': audits_week,
                    'analyses_today': analyses_today,
                    'analyses_this_week': analyses_week,
                    'analyses_success_today': analyses_success_today,
                },
                'external_services': external_services,
            },
            message="System health data retrieved successfully"
        )
        
    except Exception as e:
        return error_response(
            f"Failed to fetch system health: {str(e)}",
            code="SYSTEM_HEALTH_ERROR"
        )


@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def cleanup_old_metrics(request):
    """Clean up old API metrics to prevent database bloat"""
    if not is_admin_user(request.user):
        return error_response(
            ADMIN_ACCESS_DENIED_MESSAGE,
            code=ADMIN_ACCESS_DENIED_CODE,
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from audits.models import APIMetric
        
        days = int(request.data.get('days', 7))
        deleted_count, _ = APIMetric.cleanup_old_metrics(days=days)
        
        return success_response(
            data={'deleted_count': deleted_count},
            message=f"Cleaned up {deleted_count} metrics older than {days} days"
        )
        
    except Exception as e:
        return error_response(
            f"Failed to cleanup metrics: {str(e)}",
            code="CLEANUP_ERROR"
        )
