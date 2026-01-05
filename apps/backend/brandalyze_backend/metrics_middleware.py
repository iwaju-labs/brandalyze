import time
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


class APIMetricsMiddleware:
    """Middleware to track API request metrics for system health monitoring"""
    
    # Endpoints to skip tracking (health checks, static files, admin)
    SKIP_PATTERNS = [
        '/health/',
        '/static/',
        '/admin/',
        '/__debug__/',
        '/favicon.ico',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if we should skip this request
        path = request.path
        if any(path.startswith(pattern) for pattern in self.SKIP_PATTERNS):
            return self.get_response(request)
        
        # Record start time
        start_time = time.time()
        
        # Process request
        response = self.get_response(request)
        
        # Calculate response time
        response_time_ms = (time.time() - start_time) * 1000
        
        # Record metric asynchronously to avoid blocking
        try:
            self._record_metric(request, response, response_time_ms)
        except Exception as e:
            logger.warning(f"Failed to record API metric: {e}")
        
        return response
    
    def _record_metric(self, request, response, response_time_ms):
        """Record the API metric to database"""
        # Import here to avoid circular imports
        from audits.models import APIMetric
        
        # Get user ID if authenticated
        user_id = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = request.user.id
        
        # Extract error message for failed requests
        error_message = ""
        if response.status_code >= 400:
            try:
                if hasattr(response, 'content'):
                    content = response.content.decode('utf-8')[:500]
                    error_message = content
            except Exception:
                pass
        
        # Normalize endpoint path (remove IDs for grouping)
        endpoint = self._normalize_endpoint(request.path)
        
        APIMetric.objects.create(
            endpoint=endpoint,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=response_time_ms,
            timestamp=timezone.now(),
            user_id=user_id,
            error_message=error_message,
        )
    
    def _normalize_endpoint(self, path):
        """Normalize endpoint by replacing IDs with placeholders"""
        import re
        # Replace numeric IDs with :id
        normalized = re.sub(r'/\d+/', '/:id/', path)
        # Replace UUIDs with :uuid
        normalized = re.sub(
            r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/',
            '/:uuid/',
            normalized,
            flags=re.IGNORECASE
        )
        return normalized
