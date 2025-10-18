from rest_framework.authentication import BaseAuthentication

class ClerkAuthentication(BaseAuthentication):
    """
    Custom DRF authentication that uses our Clerk middleware results.
    This prevents DRF from overriding the user set by our middleware.
    """
    def authenticate(self, request):
        # If our middleware set a clerk_authenticated_user, use that user
        if hasattr(request, 'clerk_authenticated_user') and request.clerk_authenticated_user is not None:
            # Return (user, auth) tuple - auth can be None since we're not using tokens directly
            return (request.clerk_authenticated_user, None)
        
        # If no clerk_authenticated_user, return None to allow other authentication methods
        return None
