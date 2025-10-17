from rest_framework.authentication import BaseAuthentication
from django.contrib.auth.models import AnonymousUser

class ClerkAuthentication(BaseAuthentication):
    """
    Custom DRF authentication that uses our Clerk middleware results.
    This prevents DRF from overriding the user set by our middleware.
    """
    
    def authenticate(self, request):
        # If our middleware set a clerk_user, use the request.user that was set
        if hasattr(request, 'clerk_user') and request.clerk_user is not None:
            # Return (user, auth) tuple - auth can be None since we're not using tokens directly
            return (request.user, None)
        
        # If no clerk_user, return None to allow other authentication methods
        return None
