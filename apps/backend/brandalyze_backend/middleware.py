import requests
import jwt
from jwt import PyJWKClient
from django.http import JsonResponse
from django.conf import settings
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
CLERK_JWKS_URL = getattr(settings, "CLERK_JWKS_URL", None)

class ClerkAuthMiddleware:    
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwk_client = PyJWKClient(CLERK_JWKS_URL)

    def _extract_email_from_payload(self, payload, clerk_id):
        """Extract email from Clerk JWT payload or fetch from Clerk API"""
        email = None
        
        # Try different email field patterns
        email_fields = ["email", "email_address", "primary_email_address"]
        
        for field in email_fields:
            if field in payload and payload[field]:
                email = payload[field]
                break
        
        # Try email_addresses array
        if not email and "email_addresses" in payload:
            email_addrs = payload["email_addresses"]
            if isinstance(email_addrs, list) and len(email_addrs) > 0:
                first_addr = email_addrs[0]
                if isinstance(first_addr, dict):
                    email = first_addr.get("email_address") or first_addr.get("email")
                elif isinstance(first_addr, str):
                    email = first_addr
          # If no email found in JWT, fetch from Clerk API
        if not email or not isinstance(email, str) or "@" not in email:
            email = self._fetch_email_from_clerk_api(clerk_id)
        
        # Provide default email if still none found
        if not email or not isinstance(email, str) or "@" not in email:
            email = f"{clerk_id}@clerk.local"
        
        return email
    
    def _fetch_email_from_clerk_api(self, clerk_id):
        """Fetch user email from Clerk API"""
        try:
            # Get Clerk secret key from settings
            clerk_secret = getattr(settings, 'CLERK_SECRET_KEY', None)
            if not clerk_secret:
                logger.error("No CLERK_SECRET_KEY found in settings")
                return None
            
            # Fetch user details from Clerk API
            headers = {
                'Authorization': f'Bearer {clerk_secret}',
                'Content-Type': 'application/json'
            }
            
            logger.info(f"Fetching user email from Clerk API for user: {clerk_id}")
            
            response = requests.get(
                f'https://api.clerk.dev/v1/users/{clerk_id}',
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                user_data = response.json()
                email_addresses = user_data.get('email_addresses', [])
                
                logger.info(f"Clerk API response - found {len(email_addresses)} email addresses")
                
                # Find primary email (first one that's verified)
                for email_obj in email_addresses:
                    if email_obj.get('verification', {}).get('status') == 'verified':
                        email = email_obj.get('email_address')
                        logger.info(f"Found verified email: {email}")
                        return email
                
                # If no verified email, use the first one
                if email_addresses:
                    email = email_addresses[0].get('email_address')
                    logger.info(f"Using first email address: {email}")
                    return email
                    
            else:
                logger.error(f"Clerk API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to fetch email from Clerk API: {e}")
        
        return None

    def __call__(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                signing_key = self.jwk_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    audience=None,
                    options={"verify_exp": True}
                )
                request.clerk_user = payload
                
                # Only log in debug mode
                if settings.DEBUG:
                    logger.info(f"Clerk JWT payload: {payload}")
                else:
                    logger.debug(f"Clerk JWT payload: {payload}")
                
                user_model = get_user_model()
                clerk_id = payload.get("sub")
                
                if not clerk_id:
                    logger.error(f"No 'sub' field found in payload keys: {list(payload.keys())}")
                    return JsonResponse({"error": "Invalid token: missing subject"}, status=401)
                  # Extract email from Clerk JWT payload
                email = self._extract_email_from_payload(payload, clerk_id)
                logger.info(f"Extracted email: {email}")
                
                # Extract metadata from JWT payload
                public_metadata = payload.get('public_metadata', {})
                private_metadata = payload.get('private_metadata', {})
                
                # Combine metadata
                clerk_metadata = {
                    'role': public_metadata.get('role', private_metadata.get('role')),
                    'subscription_tier': public_metadata.get('subscription_tier', 'free'),
                    'stripe_customer_id': public_metadata.get('stripe_customer_id', ''),
                    'stripe_subscription_id': public_metadata.get('stripe_subscription_id', ''),
                }
                
                # Try to get existing user by clerk_id first
                try:
                    user = user_model.objects.get(clerk_id=clerk_id)
                    created = False
                    # Update existing user
                    user.email = email
                    user.clerk_metadata = clerk_metadata
                    user.save()
                    logger.info(f"Updated existing user: {user}")
                except user_model.DoesNotExist:
                    # Create new user - handle username conflicts
                    username = email
                    counter = 1
                    while user_model.objects.filter(username=username).exists():
                        username = f"{email.split('@')[0]}_{counter}@{email.split('@')[1]}"
                        counter += 1
                    
                    user = user_model.objects.create(
                        clerk_id=clerk_id,
                        email=email,
                        username=username,
                        clerk_metadata=clerk_metadata
                    )
                    created = True
                    logger.info(f"Created new user: {user} with username: {username}")
                
                logger.info(f"User created/retrieved: {user} (created: {created})")
                logger.info(f"User is_authenticated: {user.is_authenticated}")
                
                # Store the authenticated user for our custom authentication class to retrieve
                # Don't set request.user here as AuthenticationMiddleware will override it
                request.clerk_authenticated_user = user
                
                logger.info(f"Set request.clerk_authenticated_user to: {user}")
                
            except jwt.ExpiredSignatureError:
                logger.warning("JWT token expired")
                return JsonResponse({"error": "Token expired"}, status=401)
            except jwt.InvalidTokenError:
                logger.warning("Invalid JWT token")
                return JsonResponse({"error": "Invalid token"}, status=401)
            except Exception as e:
                logger.error(f"Authentication error: {str(e)}")
                return JsonResponse({"error": f"Authentication error: {str(e)}"}, status=401)
        else:
            request.clerk_user = None

        return self.get_response(request)
