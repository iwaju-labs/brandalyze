from django.middleware.csrf import CsrfViewMiddleware

class ApiCsrfExemptMiddleware(CsrfViewMiddleware):
    """
    CSRF middleware that exempts API endpoints from CSRF protection.
    """
    def process_view(self, request, callback, callback_args, callback_kwargs):
        # Exempt all /api/ endpoints from CSRF protection
        if request.path.startswith('/api/'):
            return None
        return super().process_view(request, callback, callback_args, callback_kwargs)
