import requests
import jwt
from jwt import PyJWKClient
from django.http import JsonResponse
from django.conf import settings
from django.contrib.auth import get_user_model

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
            import requests
            from django.conf import settings
            
            # Get Clerk secret key from settings
            clerk_secret = getattr(settings, 'CLERK_SECRET_KEY', None)
            if not clerk_secret:
                print("[DEBUG] No CLERK_SECRET_KEY found in settings")
                return None
            
            # Fetch user details from Clerk API
            headers = {
                'Authorization': f'Bearer {clerk_secret}',
                'Content-Type': 'application/json'
            }
            
            print(f"[DEBUG] Fetching user email from Clerk API for user: {clerk_id}")
            
            response = requests.get(
                f'https://api.clerk.dev/v1/users/{clerk_id}',
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                user_data = response.json()
                email_addresses = user_data.get('email_addresses', [])
                
                print(f"[DEBUG] Clerk API response - found {len(email_addresses)} email addresses")
                
                # Find primary email (first one that's verified)
                for email_obj in email_addresses:
                    if email_obj.get('verification', {}).get('status') == 'verified':
                        email = email_obj.get('email_address')
                        print(f"[DEBUG] Found verified email: {email}")
                        return email
                
                # If no verified email, use the first one
                if email_addresses:
                    email = email_addresses[0].get('email_address')
                    print(f"[DEBUG] Using first email address: {email}")
                    return email
                    
            else:
                print(f"[DEBUG] Clerk API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"[DEBUG] Failed to fetch email from Clerk API: {e}")
        
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
                
                # Debug: Print JWT payload to understand structure
                print(f"[DEBUG] Clerk JWT payload: {payload}")
                user_model = get_user_model()
                clerk_id = payload.get("sub")
                
                if not clerk_id:
                    print(f"[DEBUG] No 'sub' field found in payload keys: {list(payload.keys())}")
                    return JsonResponse({"error": "Invalid token: missing subject"}, status=401)
                  # Extract email from Clerk JWT payload
                email = self._extract_email_from_payload(payload, clerk_id)
                print(f"[DEBUG] Extracted email: {email}")
                
                user, created = user_model.objects.get_or_create(
                    username=clerk_id,
                    defaults={"email": email}
                )
                
                # Update email if it's different (e.g., from fake @clerk.local to real email)
                if not created and user.email != email and "@clerk.local" in user.email:
                    user.email = email
                    user.save()
                    print(f"[DEBUG] Updated user email from {user.email} to {email}")
                
                print(f"[DEBUG] User created/retrieved: {user} (created: {created})")
                print(f"[DEBUG] User is_authenticated: {user.is_authenticated}")
                
                # Store the authenticated user for our custom authentication class to retrieve
                # Don't set request.user here as AuthenticationMiddleware will override it
                request.clerk_authenticated_user = user
                
                print(f"[DEBUG] Set request.clerk_authenticated_user to: {user}")
                
            except jwt.ExpiredSignatureError:
                return JsonResponse({"error": "Token expired"}, status=401)
            except jwt.InvalidTokenError:
                return JsonResponse({"error": "Invalid token"}, status=401)
            except Exception as e:
                print(f"[DEBUG] Authentication error: {str(e)}")
                return JsonResponse({"error": f"Authentication error: {str(e)}"}, status=401)
        else:
            request.clerk_user = None

        return self.get_response(request)
