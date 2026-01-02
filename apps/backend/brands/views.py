from rest_framework import viewsets, status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import ValidationError
from django.conf import settings
from django.http import StreamingHttpResponse
import tempfile
import os
import json
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
        # Check if middleware stored an authenticated user
        if hasattr(request, "clerk_authenticated_user"):
            user = request.clerk_authenticated_user
            # Set the backend for proper authentication
            user.backend = "django.contrib.auth.backends.ModelBackend"
            return (user, None)

        # Fallback: if middleware decoded JWT but didn't store user, try to retrieve it
        if hasattr(request, "clerk_user") and request.clerk_user is not None:
            from django.contrib.auth import get_user_model

            user_model = get_user_model()
            clerk_id = request.clerk_user.get("sub")

            if clerk_id:
                try:
                    user = user_model.objects.get(username=clerk_id)
                    user.backend = "django.contrib.auth.backends.ModelBackend"
                    return (user, None)
                except user_model.DoesNotExist:
                    return None

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
        subscription, _ = UserSubscription.objects.get_or_create(
            user = request.user,
            defaults = {'tier': 'free', 'daily_analysis_limit' : 3}
        )
        
        can_analyze, remaining = DailyUsage.can_perform_analysis(request.user)
        if not can_analyze:
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
        
        if subscription.tier == 'free' and len(brand_samples) > 5:
            return error_response(
                "Free plan limited to 5 brand samples. Upgrade your plan for unlimited samples.",
                code="BRAND_SAMPLE_LIMIT_EXCEEDED",
                status_code=status.HTTP_400_BAD_REQUEST
            )

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
        
        def generate_streaming_response():
            """Generator function for streaming analysis results"""
            try:
                # Get embeddings and alignment score first
                analysis_result = analyzer.analyze_brand_alignment(text, filtered_samples)
                
                # Check for analysis errors
                if "error" in analysis_result:
                    yield json.dumps({"error": analysis_result["error"]}) + "\n"
                    return
                
                alignment_score = analysis_result.get("alignment_score", 0)
                
                # Stream the feedback generation
                feedback_generator = analyzer._generate_feedback_stream(text, filtered_samples, alignment_score)
                for json_line in feedback_generator:
                    # Add alignment_score and other metadata to each streaming chunk
                    try:
                        chunk_data = json.loads(json_line.strip())
                        chunk_data.update({
                            "alignment_score": alignment_score,
                            "brand_samples_analyzed": analysis_result.get("brand_samples_analyzed", len(filtered_samples))
                        })
                        final_chunk = json.dumps(chunk_data) + "\n"
                        yield final_chunk
                    except json.JSONDecodeError:
                        yield json_line
                
                # Update usage tracking after streaming completes
                try:
                    daily_usage = DailyUsage.get_today_usage(request.user)
                    daily_usage.analysis_count += 1
                    daily_usage.save()

                    AnalysisLog.objects.create(
                        user=request.user,
                        text_length=len(text),
                        brand_samples_count=len(filtered_samples),
                        alignment_score=alignment_score,
                        success=analysis_result.get("analysis_successful", False),
                    )
                except Exception:
                    pass
                    
            except Exception as e:
                yield json.dumps({"error": f"Analysis failed: {str(e)}"}) + "\n"

        response = StreamingHttpResponse(
            generate_streaming_response(),
            content_type='application/x-ndjson'
        )
        response['Cache-Control'] = 'no-cache'
        return response

    except Exception as e:
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
    """ViewSet for managing brands"""
    serializer_class = BrandSerializer
    authentication_classes = [ClerkAuthentication]
    permission_classes = [ClerkAuthenticated]
    
    def get_queryset(self):
        # Return brands for the authenticated user
        return Brand.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Assign the authenticated user when creating a brand
        serializer.save(user=self.request.user)


class BrandSampleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing brand samples"""
    serializer_class = BrandSampleSerializer
    authentication_classes = [ClerkAuthentication]
    permission_classes = [ClerkAuthenticated]
    
    def get_queryset(self):
        # Return samples for brands owned by the authenticated user
        return BrandSample.objects.filter(brand__user=self.request.user)
    
    def perform_create(self, serializer):
        # Ensure the brand belongs to the authenticated user
        brand = serializer.validated_data['brand']
        if brand.user != self.request.user:
            raise ValidationError("You can only add samples to your own brands")
        serializer.save()


@api_view(["POST"])
@permission_classes([AllowAny])
def test_post_endpoint(request):
    """Simple test endpoint to debug POST request issues"""
    return success_response(
        data={"message": "POST request successful", "received_data": request.data},
        message="Test endpoint working",
    )


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def analyze_brand_voice(request):
    """
    Analyze brand samples to extract voice characteristics.
    Available to all tiers with appropriate limits.
    
    POST /api/analyze/brand-voice
    {
        "brand_samples": ["Sample 1 text...", "Sample 2 text..."],
        "emotional_indicators": ["enthusiasm", "professionalism", "approachability", "authority"],
        "name": "My Brand Voice"  // Optional, for display purposes
    }
    """
    try:
        subscription, _ = UserSubscription.objects.get_or_create(
            user=request.user,
            defaults={'tier': 'free', 'daily_analysis_limit': 3}
        )
        
        # Check daily usage limits
        can_analyze, _ = DailyUsage.can_perform_analysis(request.user)
        if not can_analyze:
            return error_response(
                f"Daily analysis limit reached ({subscription.daily_analysis_limit} analyses). Upgrade your plan or try again tomorrow",
                code="USAGE_LIMIT_EXCEEDED",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        brand_samples = request.data.get("brand_samples", [])
        emotional_indicators = request.data.get("emotional_indicators", [
            "enthusiasm", "professionalism", "approachability", "authority"
        ])
        name = request.data.get("name", "Brand Voice Analysis")
        
        # Validate brand samples
        if not brand_samples or len(brand_samples) == 0:
            return error_response(
                "At least one brand sample is required",
                code="MISSING_BRAND_SAMPLES",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter empty samples
        filtered_samples = [s.strip() for s in brand_samples if s.strip()]
        if len(filtered_samples) == 0:
            return error_response(
                "At least one non-empty brand sample is required",
                code="EMPTY_BRAND_SAMPLES",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Apply tier-based sample limits
        if subscription.tier == 'free' and len(filtered_samples) > 5:
            return error_response(
                "Free plan limited to 5 brand samples. Upgrade for unlimited samples.",
                code="BRAND_SAMPLE_LIMIT_EXCEEDED",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit emotional indicators to 4
        emotional_indicators = emotional_indicators[:4]
        
        # Combine samples for analysis
        combined_text = "\n\n".join([
            f"Sample {i+1}: {sample}" for i, sample in enumerate(filtered_samples)
        ])
        total_text_length = sum(len(s) for s in filtered_samples)
        
        # Perform voice analysis using existing AI infrastructure
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return error_response("AI service not configured", "AI_SERVICE_ERROR")
        
        try:
            from extensions.analyzers.voice_analysis import (
                calculate_emotional_indicators,
                calculate_analysis_confidence
            )
            from ai_core.analysis import BrandAnalyzer
            
            analyzer = BrandAnalyzer(api_key)
            
            # Build AI prompt for voice analysis (emotional indicators calculated separately)
            prompt = f"""Analyze the brand voice based on these {len(filtered_samples)} samples:

{combined_text}

Respond with ONLY valid JSON:
{{
    "tone": "Brief tone description",
    "style": "Communication style description",
    "personality_traits": ["Trait1", "Trait2", "Trait3", "Trait4"],
    "communication_patterns": ["Pattern1", "Pattern2", "Pattern3"],
    "content_themes": ["Theme1", "Theme2", "Theme3"],
    "brand_recommendations": ["Recommendation1", "Recommendation2", "Recommendation3"]
}}"""
            
            response = analyzer.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.3,
            )
            
            ai_response = response.choices[0].message.content
            
            # Parse the AI response
            try:
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\{[\s\S]*\}', ai_response)
                if json_match:
                    voice_analysis = json.loads(json_match.group())
                else:
                    raise ValueError("No JSON found in response")
            except (json.JSONDecodeError, ValueError):
                voice_analysis = {
                    "tone": "Professional and engaging",
                    "style": "Clear and direct communication",
                    "personality_traits": ["Authentic", "Knowledgeable", "Approachable", "Consistent"],
                    "communication_patterns": ["Clear messaging", "Consistent voice", "Audience-focused"],
                    "content_themes": ["Brand values", "Industry insights", "Customer focus"],
                    "brand_recommendations": [
                        "Maintain consistent tone across all content",
                        "Focus on your unique value proposition",
                        "Engage authentically with your audience"
                    ],
                }
            
            # Calculate emotional indicators using heuristic analysis (same as profile analysis)
            calculated_indicators = calculate_emotional_indicators(combined_text, emotional_indicators)
            voice_analysis["emotional_indicators"] = calculated_indicators
            
            # Calculate confidence score
            confidence_score = calculate_analysis_confidence(
                analysis_type="brand_samples",
                content_length=total_text_length,
                posts_count=len(filtered_samples),
                requested_posts=len(filtered_samples),
                ai_response_parsed_successfully=True
            )
            
        except ImportError as e:
            return error_response(
                f"Analysis module not available: {str(e)}",
                code="MODULE_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update usage tracking
        try:
            daily_usage = DailyUsage.get_today_usage(request.user)
            daily_usage.analysis_count += 1
            daily_usage.save()
        except Exception:
            pass
        
        # Build response
        response_data = {
            "name": name,
            "voice_analysis": voice_analysis,
            "confidence_score": confidence_score,
            "samples_analyzed": len(filtered_samples),
            "total_text_length": total_text_length,
            "emotional_indicators": voice_analysis.get("emotional_indicators", {}),
            "brand_recommendations": voice_analysis.get("brand_recommendations", []),
            "can_save": subscription.tier in ["pro", "enterprise"],
            "subscription_tier": subscription.tier
        }
        
        return success_response(
            data=response_data,
            message="Brand voice analysis completed successfully"
        )
        
    except Exception as e:
        return error_response(
            str(e),
            "INTERNAL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def save_brand_voice_analysis(request):
    """
    Save a brand voice analysis for Pro+ users.
    Creates a Brand and BrandVoiceAnalysis record.
    
    POST /api/analyze/brand-voice/save
    {
        "name": "My Brand Voice",
        "voice_analysis": {...},
        "emotional_indicators": {...},
        "brand_recommendations": [...],
        "confidence_score": 0.85,
        "samples_analyzed": 3,
        "total_text_length": 1500,
        "brand_samples": ["Sample 1...", "Sample 2..."],  // Optional: save as brand samples
        "use_for_audits": false
    }
    """
    from .models import BrandVoiceAnalysis
    
    try:
        subscription, _ = UserSubscription.objects.get_or_create(
            user=request.user,
            defaults={'tier': 'free', 'daily_analysis_limit': 3}
        )
        
        # Only Pro+ can save
        if subscription.tier not in ["pro", "enterprise"]:
            return error_response(
                "Saving brand voice analysis requires a Pro or Enterprise subscription.",
                code="UPGRADE_REQUIRED",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        name = request.data.get("name", "Brand Voice Analysis")
        voice_analysis = request.data.get("voice_analysis", {})
        emotional_indicators = request.data.get("emotional_indicators", {})
        brand_recommendations = request.data.get("brand_recommendations", [])
        confidence_score = request.data.get("confidence_score", 0.7)
        samples_analyzed = request.data.get("samples_analyzed", 0)
        total_text_length = request.data.get("total_text_length", 0)
        brand_samples = request.data.get("brand_samples", [])
        use_for_audits = request.data.get("use_for_audits", False)
        
        if not name or not name.strip():
            return error_response(
                "Name is required",
                code="MISSING_NAME",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update Brand if samples provided
        brand = None
        if brand_samples:
            filtered_samples = [s.strip() for s in brand_samples if s.strip()]
            if filtered_samples:
                brand, created = Brand.objects.update_or_create(
                    user=request.user,
                    name=name,
                    defaults={
                        'description': f"Brand voice: {voice_analysis.get('tone', 'Professional')}"
                    }
                )
                
                # Clear existing samples and add new ones
                if not created:
                    brand.samples.all().delete()
                
                for i, sample_text in enumerate(filtered_samples):
                    BrandSample.objects.create(
                        brand=brand,
                        text=sample_text,
                        file_ref=f"brand_voice_{name}_{i+1}",
                        file_type='txt'
                    )
        
        # If use_for_audits is True, clear other analyses' use_for_audits flag
        if use_for_audits:
            BrandVoiceAnalysis.objects.filter(
                user=request.user,
                use_for_audits=True
            ).update(use_for_audits=False)
        
        # Create the BrandVoiceAnalysis record
        analysis = BrandVoiceAnalysis.objects.create(
            user=request.user,
            name=name.strip(),
            brand=brand,
            confidence_score=confidence_score,
            voice_analysis=voice_analysis,
            emotional_indicators=emotional_indicators,
            brand_recommendations=brand_recommendations,
            samples_analyzed=samples_analyzed,
            total_text_length=total_text_length,
            use_for_audits=use_for_audits
        )
        
        return success_response(
            data={
                "id": analysis.id,
                "name": analysis.name,
                "brand_id": brand.id if brand else None,
                "use_for_audits": analysis.use_for_audits,
                "created_at": analysis.created_at.isoformat()
            },
            message="Brand voice analysis saved successfully"
        )
        
    except Exception as e:
        return error_response(
            str(e),
            "INTERNAL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def list_brand_voice_analyses(request):
    """
    List user's saved brand voice analyses.
    Pro+ only.
    
    GET /api/analyze/brand-voice/list
    """
    from .models import BrandVoiceAnalysis
    
    try:
        subscription, _ = UserSubscription.objects.get_or_create(
            user=request.user,
            defaults={'tier': 'free', 'daily_analysis_limit': 3}
        )
        
        if subscription.tier not in ["pro", "enterprise"]:
            return error_response(
                "Viewing saved brand voice analyses requires a Pro or Enterprise subscription.",
                code="UPGRADE_REQUIRED",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        analyses = BrandVoiceAnalysis.objects.filter(user=request.user).order_by('-created_at')
        
        data = []
        for analysis in analyses:
            data.append({
                "id": analysis.id,
                "name": analysis.name,
                "brand_id": analysis.brand_id,
                "confidence_score": analysis.confidence_score,
                "voice_analysis": analysis.voice_analysis,
                "emotional_indicators": analysis.emotional_indicators,
                "brand_recommendations": analysis.brand_recommendations,
                "samples_analyzed": analysis.samples_analyzed,
                "total_text_length": analysis.total_text_length,
                "use_for_audits": analysis.use_for_audits,
                "created_at": analysis.created_at.isoformat(),
                "updated_at": analysis.updated_at.isoformat()
            })
        
        return success_response(
            data={"analyses": data, "total_count": len(data)},
            message="Brand voice analyses retrieved successfully"
        )
        
    except Exception as e:
        return error_response(
            str(e),
            "INTERNAL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["DELETE"])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def delete_brand_voice_analysis(request, analysis_id):
    """
    Delete a saved brand voice analysis.
    Pro+ only.
    
    DELETE /api/analyze/brand-voice/<id>/delete
    """
    from .models import BrandVoiceAnalysis
    
    try:
        subscription, _ = UserSubscription.objects.get_or_create(
            user=request.user,
            defaults={'tier': 'free', 'daily_analysis_limit': 3}
        )
        
        if subscription.tier not in ["pro", "enterprise"]:
            return error_response(
                "Managing brand voice analyses requires a Pro or Enterprise subscription.",
                code="UPGRADE_REQUIRED",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        try:
            analysis = BrandVoiceAnalysis.objects.get(id=analysis_id, user=request.user)
        except BrandVoiceAnalysis.DoesNotExist:
            return error_response(
                "Brand voice analysis not found",
                code="NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        analysis.delete()
        
        return success_response(
            data={"deleted_id": analysis_id},
            message="Brand voice analysis deleted successfully"
        )
        
    except Exception as e:
        return error_response(
            str(e),
            "INTERNAL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
