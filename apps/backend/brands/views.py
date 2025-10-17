from rest_framework import viewsets, status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.authentication import BaseAuthentication
from django.conf import settings
import tempfile
import os
from .models import Brand, BrandSample
from .serializers import BrandSerializer, BrandSampleSerializer
from .utils.utils import validate_uploaded_file
from .utils.responses import error_response, success_response
from ai_core.text_extraction import extract_text
from ai_core.text_processing import process_text
from ai_core.analysis import BrandAnalyzer
from analysis.models import DailyUsage, AnalysisLog, UserSubscription
from .permissions import ClerkAuthenticated


class ClerkAuthentication(BaseAuthentication):
    """Custom DRF authentication that retrieves middleware-created user"""

    def authenticate(self, request):
        print("[DEBUG] ClerkAuthentication.authenticate() called")

        # Check if middleware stored an authenticated user
        if hasattr(request, "clerk_authenticated_user"):
            user = request.clerk_authenticated_user
            print(f"[DEBUG] ClerkAuthentication found stored user: {user}")
            print(
                f"[DEBUG] ClerkAuthentication user.is_authenticated: {user.is_authenticated}"
            )

            # Set the backend for proper authentication
            user.backend = "django.contrib.auth.backends.ModelBackend"
            return (user, None)

        # Fallback: if middleware decoded JWT but didn't store user, try to retrieve it
        if hasattr(request, "clerk_user") and request.clerk_user is not None:
            print(
                "[DEBUG] ClerkAuthentication fallback: retrieving user from clerk_user"
            )
            from django.contrib.auth import get_user_model

            user_model = get_user_model()
            clerk_id = request.clerk_user.get("sub")

            if clerk_id:
                try:
                    user = user_model.objects.get(username=clerk_id)
                    print(f"[DEBUG] ClerkAuthentication fallback found user: {user}")
                    user.backend = "django.contrib.auth.backends.ModelBackend"
                    return (user, None)
                except user_model.DoesNotExist:
                    print(
                        f"[DEBUG] ClerkAuthentication: User with username {clerk_id} does not exist"
                    )
                    return None

        print(
            "[DEBUG] ClerkAuthentication: No clerk_user or clerk_authenticated_user found"
        )
        # Return None to let other authentication methods try
        return None


@api_view(["POST"])
@permission_classes([AllowAny])
def upload_file(request):
    """
    Enhanced file upload with text extraction and analysis (MVP - no database saving)
    """
    try:
        if "file" not in request.FILES:
            return error_response("No file provided", code="MISSING_FILE")

        uploaded_file = request.FILES["file"]
        # Validate file using comprehensive validation
        validation_result = validate_uploaded_file(uploaded_file)

        if not validation_result.is_valid:
            return error_response(
                f"File validation failed: {', '.join(validation_result.errors)}",
                code="FILE_VALIDATION_FAILED",
            )

        # Extract and process text
        try:
            # Save file temporarily for text extraction
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=f".{validation_result.file_type}"
            ) as temp_file:
                uploaded_file.seek(0)
                temp_file.write(uploaded_file.read())
                temp_file_path = temp_file.name

            try:
                # Extract text using our text extraction engine
                extracted_text = extract_text(
                    temp_file_path, validation_result.file_type
                )

                # Process and chunk the text
                if extracted_text and not extracted_text.startswith("Error"):
                    text_chunks = process_text(
                        extracted_text, max_chunk_size=1000, strategy="sentences"
                    )
                else:
                    text_chunks = []

            finally:
                # Clean up temp file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)

        except Exception as text_error:
            extracted_text = f"Text extraction failed: {str(text_error)}"
            text_chunks = []

        # Basic content analysis (without saving to database)
        analysis_results = {
            "word_count": len(extracted_text.split())
            if extracted_text and not extracted_text.startswith("Error")
            else 0,
            "character_count": len(extracted_text) if extracted_text else 0,
            "chunks_created": len(text_chunks) if text_chunks else 0,
            "extraction_successful": bool(
                extracted_text and not extracted_text.startswith("Error")
            ),
            "text_preview": extracted_text[:300] + "..."
            if extracted_text and len(extracted_text) > 300
            else extracted_text,
        }

        return success_response(
            data={
                "file_info": {
                    "filename": uploaded_file.name,
                    "size": uploaded_file.size,
                    "detected_type": validation_result.file_type,
                    "content_type": uploaded_file.content_type,
                },
                "validation": {
                    "is_valid": validation_result.is_valid,
                    "metadata": validation_result.metadata,
                },
                "analysis": analysis_results,
            },
            message=f"File analyzed successfully - {analysis_results['word_count']} words extracted",
        )
    except Exception as e:
        return error_response(
            str(e), "INTERNAL_ERROR", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def analyze_text(request):
    """
    Direct text analysis without file upload (MVP - no database saving)
    """
    try:
        text = request.data.get("text", "")

        is_valid, error_message = _validate_text_input(text)
        if not is_valid:
            return error_response(
                error_message,
                code="INVALID_TEXT_INPUT",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        text = text.strip()

        try:
            text_chunks = process_text(text, max_chunk_size=1000, strategy="sentences")
        except Exception as _:
            text_chunks = []

        words = text.split()
        sentences = text.count(".") + text.count("!") + text.count("?")

        analysis_results = {
            "word_count": len(words),
            "character_count": len(text),
            "sentence_count": max(1, sentences),
            "chunks_created": len(text_chunks),
            "extraction_successful": True,
            "text_preview": text[:300] + "..." if len(text) > 300 else text,
            "avg_words_per_sentence": round(len(words) / max(1, sentences), 1),
        }

        return success_response(
            data={
                "input_info": {"input_type": "direct_text", "length": len(text)},
                "analysis": analysis_results,
            },
            message=f"Text analysed successfully - {analysis_results['word_count']} words, {analysis_results['sentence_count']} sentences",
        )
    except Exception as e:
        return error_response(
            str(e), "INTERNAL_ERROR", status_code=status.HTTP_400_BAD_REQUEST
        )


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def analyze_brand_alignment(request):
    """
    Brand alignment analysis endpoint | checks usage limit enforcement
    """
    try:
        # enforcing usage limits before processing 

        can_analyze, remaining = DailyUsage.can_perform_analysis(request)
        if not can_analyze:
            subscription = UserSubscription.objects.get_or_create(
                user = request.user,
                defaults = {'tier': 'free', 'daily_analysis_limit' : 3}
            )[0]
        
            return error_response(
                f"Daily analysis limit reached ({subscription.daily_analysis_limit} analyses). Upgrade your plan or try again tomorrow",
                code="USAGE_LIMIT_EXCEEDED",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )

        text = request.data.get("text", "")
        brand_samples = request.data.get("brand_samples", [])

        # Validate input
        if not text.strip():
            return error_response("Text content is required", "MISSING_TEXT")

        if not brand_samples or len(brand_samples) == 0:
            return error_response(
                "At least one brand sample is required", "MISSING_BRAND_SAMPLES"
            )

        # Filter out empty brand samples
        filtered_samples = [
            sample.strip() for sample in brand_samples if sample.strip()
        ]
        if len(filtered_samples) == 0:
            return error_response(
                "At least one non-empty brand sample is required", "EMPTY_BRAND_SAMPLES"
            )

        # Initialize AI analyzer
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return error_response("AI service not configured", "AI_SERVICE_ERROR")

        analyzer = BrandAnalyzer(api_key)
        # Perform AI analysis
        analysis_result = analyzer.analyze_brand_alignment(text, filtered_samples)

        # Check for analysis errors
        if "error" in analysis_result:
            return error_response(
                f"Analysis failed: {analysis_result['error']}", "ANALYSIS_ERROR"
            )

        try:
            # Increment daily usage count
            daily_usage = DailyUsage.get_today_usage(request.user)
            daily_usage.analysis_count += 1
            daily_usage.save()

            # Log the analysis
            AnalysisLog.objects.create(
                user=request.user,
                text_length=len(text),
                brand_samples_count=len(filtered_samples),
                alignment_score=analysis_result.get("alignment_score", 0),
                success=analysis_result.get("analysis_successful", False),
            )
        except Exception as e:
            print(f"[WARNING] Failed to update usage tracking: {e}")

        # Use success_response to match other authenticated endpoints
        return success_response(
            data={
                "brand_analysis": {
                    "alignment_score": analysis_result.get("alignment_score", 0),
                    "feedback": analysis_result.get("feedback", {}).get(
                        "ai_feedback", "No feedback available"
                    ),
                    "brand_samples_analyzed": analysis_result.get(
                        "brand_samples_analyzed", len(filtered_samples)
                    ),
                    "analysis_successful": analysis_result.get(
                        "analysis_successful", False
                    ),
                },
                "input_info": {
                    "new_text_length": len(text),
                    "brand_samples_count": len(filtered_samples),
                    "analysis_type": "brand_alignment",
                },
            },
            message="Brand alignment analysis completed successfully",
        )

    except Exception as e:
        print(f"[DEBUG] Exception in analyze_brand_alignment: {e}")
        import traceback

        traceback.print_exc()
        return error_response(
            str(e), "INTERNAL_ERROR", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def get_user_usage(request):
    """
    Get current user's usage information and subscription details
    """
    try:
        user = request.user

        # Get or create subscription
        subscription, _ = UserSubscription.objects.get_or_create(
            user=user, defaults={"tier": "free", "daily_analysis_limit": 3}
        )

        # Get today's usage
        today_usage = DailyUsage.get_today_usage(user)

        # Calculate remaining
        if subscription.daily_analysis_limit is None:
            remaining = None  # Unlimited
        else:
            remaining = max(
                0, subscription.daily_analysis_limit - today_usage.analysis_count
            )

        return success_response(
            data={
                "subscription": {
                    "tier": subscription.tier,
                    "daily_limit": subscription.daily_analysis_limit,
                    "brand_sample_limit": subscription.brand_sample_limit,
                    "is_active": subscription.is_subscription_active,
                },
                "usage": {
                    "today_count": today_usage.analysis_count,
                    "remaining_today": remaining,
                    "date": today_usage.date.isoformat(),
                },
            },
            message="Usage information retrieved successfully",
        )
    except Exception as e:
        return error_response(
            str(e), "INTERNAL_ERROR", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _validate_text_input(text: str):
    if not text or not text.strip():
        return False, "Text cannot be empty"

    if len(text) > 50000:
        return False, "Text exceeds maximum length of 50,000 characters"

    if len(text.strip()) < 3:
        return False, "Text must be at least 3 characters long"

    return True, None


class BrandViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [ClerkAuthenticated]

    def get_queryset(self):
        """Only return brands owned by the current user"""
        return Brand.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Automatically set the user when creating a brand"""
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new brand with proper validation"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return error_response(
                f"An unexpected error occurred {e}",
                code="INTERNAL_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BrandSampleViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSampleSerializer
    permission_classes = [ClerkAuthenticated]

    def get_queryset(self):
        """Only return samples for brands owned by the current user"""
        user_brands = Brand.objects.filter(user=self.request.user)
        return BrandSample.objects.filter(brand__in=user_brands)

    def create(self, request, *args, **kwargs):
        """Create a new brand sample with proper validation"""
        try:
            brand_id = request.data.get("brand_id")
            text = request.data.get("text")

            # Validate required fields
            if not brand_id:
                return error_response(
                    "brand_id is required",
                    code="BRAND_ID_REQUIRED",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            if not text or not text.strip():
                return error_response(
                    "text is required and cannot be empty",
                    code="TEXT_REQUIRED",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            # Validate brand ownership
            try:
                brand = Brand.objects.get(id=brand_id, user=request.user)
            except Brand.DoesNotExist:
                return error_response(
                    "Brand not found or you do not have permission to access it",
                    code="BRAND_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND,
                )

            # Create the sample
            sample = BrandSample.objects.create(
                brand=brand,
                text=text.strip(),
                # embedding will be generated later when the AI service is implemented
            )

            serializer = BrandSampleSerializer(sample)
            return success_response(
                data=serializer.data, status_code=status.HTTP_201_CREATED
            )

        except Exception as e:
            return error_response(
                f"An unexpected error occurred {e}",
                code="INTERNAL_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
@permission_classes([AllowAny])
def test_post_endpoint(request):
    """Simple test endpoint to debug POST request issues"""
    return success_response(
        data={"message": "POST request successful", "received_data": request.data},
        message="Test endpoint working",
    )
