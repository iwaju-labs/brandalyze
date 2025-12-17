from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from django.conf import settings
import requests

from brands.authentication import ClerkAuthentication
from brands.permissions import ClerkAuthenticated


@api_view(['DELETE'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def delete_account(request):
    """
    Delete user account from both database and Clerk
    
    DELETE /api/accounts/delete/
    """
    user = request.user
    clerk_id = user.clerk_id
    
    # Delete from Clerk if clerk_id exists
    if clerk_id:
        clerk_secret = getattr(settings, 'CLERK_SECRET_KEY', None)
        if clerk_secret:
            try:
                response = requests.delete(
                    f'https://api.clerk.dev/v1/users/{clerk_id}',
                    headers={
                        'Authorization': f'Bearer {clerk_secret}',
                        'Content-Type': 'application/json'
                    }
                )
                if response.status_code not in [200, 204, 404]:
                    return Response(
                        {'error': 'Failed to delete Clerk account'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except Exception as e:
                return Response(
                    {'error': f'Failed to connect to Clerk: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    # Delete user from database (cascades to related records)
    user.delete()
    
    return Response(
        {'message': 'Account deleted successfully'},
        status=status.HTTP_200_OK
    )
