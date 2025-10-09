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

                User = get_user_model()
                clerk_id = payload["sub"]
                email = payload.get("email_addresses", [None])[0]
                user, created = User.objects.get_or_create(
                    username=clerk_id,
                    defaults={"email": email}
                )
                request.user = user
            except jwt.ExpiredSignatureError:
                return JsonResponse({"error": "Token expired"}, status=401)
            except jwt.InvalidTokenError:
                return JsonResponse({"error": "Invalid token"}, status=401)
        else:
            request.clerk_user = None

        return self.get_response(request)