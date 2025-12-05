"""
Security headers middleware for Django application
"""

class SecurityHeadersMiddleware:
    """
    Middleware to add security headers to all responses
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # MIME type sniffing protection
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        
        # XSS Protection (legacy but still useful for older browsers)
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Add Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://tally.so https://*.clerk.accounts.dev https://challenges.cloudflare.com; "
            "worker-src 'self' blob:; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:3000 http://localhost:8000 https://*.clerk.accounts.dev https://tally.so wss://*.clerk.accounts.dev; "
            "frame-src https://tally.so https://*.clerk.accounts.dev https://challenges.cloudflare.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        return response