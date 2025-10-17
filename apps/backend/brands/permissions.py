from rest_framework.permissions import BasePermission
from django.contrib.auth.models import AnonymousUser

class ClerkAuthenticated(BasePermission):
    """
    Custom permission class that checks for Clerk authentication.
    """
    
    def has_permission(self, request, view):
        print(f"[DEBUG] ClerkAuthenticated permission check for {request.method} {request.path}")
        print(f"[DEBUG] - request.user: {request.user} (type: {type(request.user)})")
        print(f"[DEBUG] - request.user.is_authenticated: {getattr(request.user, 'is_authenticated', 'N/A')}")
        print(f"[DEBUG] - hasattr(request, 'clerk_user'): {hasattr(request, 'clerk_user')}")
        
        if hasattr(request, 'clerk_user'):
            print(f"[DEBUG] - request.clerk_user: {request.clerk_user}")
        
        # Simple check - just look for clerk_user
        has_clerk_user = hasattr(request, 'clerk_user') and request.clerk_user is not None
        print(f"[DEBUG] - has_clerk_user: {has_clerk_user}")
        
        return has_clerk_user
