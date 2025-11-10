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
        
        # Add Content Security Policy
        response['Content-Security-Policy'] = "default-src 'self'"
        
        return response