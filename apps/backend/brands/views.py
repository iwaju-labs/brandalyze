from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import tempfile
import os
from .models import Brand, BrandSample
from .serializers import BrandSerializer, BrandSampleSerializer
from .utils.utils import validate_uploaded_file
from .utils.responses import error_response, success_response
from ai_core.text_extraction import extract_text
from ai_core.text_processing import process_text

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def upload_file(request):
    """
    Enhanced file upload with text extraction and analysis (MVP - no database saving)
    """
    try:
        if 'file' not in request.FILES:
            return error_response("No file provided", code="MISSING_FILE")
        
        uploaded_file = request.FILES['file']
        
        # Validate file using comprehensive validation
        validation_result = validate_uploaded_file(uploaded_file)
        
        if not validation_result.is_valid:
            return error_response(
                f"File validation failed: {', '.join(validation_result.errors)}",
                code="FILE_VALIDATION_FAILED"
            )
          # Extract and process text
        try:
            # Save file temporarily for text extraction
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{validation_result.file_type}") as temp_file:
                uploaded_file.seek(0)
                temp_file.write(uploaded_file.read())
                temp_file_path = temp_file.name
            
            try:
                # Extract text using our text extraction engine
                extracted_text = extract_text(temp_file_path, validation_result.file_type)
                
                # Process and chunk the text
                if extracted_text and not extracted_text.startswith('Error'):
                    text_chunks = process_text(extracted_text, max_chunk_size=1000, strategy="sentences")
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
            'word_count': len(extracted_text.split()) if extracted_text and not extracted_text.startswith('Error') else 0,
            'character_count': len(extracted_text) if extracted_text else 0,
            'chunks_created': len(text_chunks) if text_chunks else 0,
            'extraction_successful': bool(extracted_text and not extracted_text.startswith('Error')),
            'text_preview': extracted_text[:300] + '...' if extracted_text and len(extracted_text) > 300 else extracted_text
        }
        
        return success_response(
            data={
                'file_info': {
                    'filename': uploaded_file.name,
                    'size': uploaded_file.size,
                    'detected_type': validation_result.file_type,
                    'content_type': uploaded_file.content_type
                },
                'validation': {
                    'is_valid': validation_result.is_valid,
                    'metadata': validation_result.metadata
                },
                'analysis': analysis_results
            },
            message=f"File analyzed successfully - {analysis_results['word_count']} words extracted"
        )
    except Exception as e:
        return error_response(str(e), "INTERNAL_ERROR", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def analyze_text(request):
    """
    Direct text analysis without file upload (MVP - no database saving)
    """
    try:
        text = request.data.get('text', '')
        
        is_valid, error_message = _validate_text_input(text)
        if not is_valid:
            return error_response(error_message, code="INVALID_TEXT_INPUT", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        text = text.strip()

        try:
            text_chunks = process_text(text, max_chunk_size=1000, strategy="sentences")
        except Exception as _:
            text_chunks = []

        words = text.split()
        sentences = text.count('.') + text.count('!') + text.count('?')

        analysis_results = {
            'word_count': len(words),
            'character_count': len(text),
            'sentence_count': max(1, sentences),
            'chunks_created': len(text_chunks),
            'extraction_successful': True,
            'text_preview': text[:300] + '...' if len(text) > 300 else text,
            'avg_words_per_sentence': round(len(words) / max(1, sentences), 1)
        }

        return success_response(
            data={
                'input_info': {
                    'input_type': 'direct_text',
                    'length': len(text)
                },
                'analysis': analysis_results
            },
            message=f"Text analysed successfully - {analysis_results['word_count']} words, {analysis_results['sentence_count']} sentences"
        )
    except Exception as e:
        return error_response(str(e), "INTERNAL_ERROR", status_code=status.HTTP_400_BAD_REQUEST)


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
    permission_classes = [IsAuthenticated]

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
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class BrandSampleViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSampleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only return samples for brands owned by the current user"""
        user_brands = Brand.objects.filter(user=self.request.user)
        return BrandSample.objects.filter(brand__in=user_brands)
    
    def create(self, request, *args, **kwargs):
        """Create a new brand sample with proper validation"""
        try:
            brand_id = request.data.get('brand_id')
            text = request.data.get('text')
            
            # Validate required fields
            if not brand_id:
                return error_response(
                    "brand_id is required",
                    code="BRAND_ID_REQUIRED",
                    status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            if not text or not text.strip():
                return error_response(
                    "text is required and cannot be empty",
                    code="TEXT_REQUIRED",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate brand ownership
            try:
                brand = Brand.objects.get(id=brand_id, user=request.user)
            except Brand.DoesNotExist:
                return error_response(
                   "Brand not found or you do not have permission to access it",
                   code="BRAND_NOT_FOUND",
                   status_code=status.HTTP_404_NOT_FOUND 
                )
            
            # Create the sample
            sample = BrandSample.objects.create(
                brand=brand,
                text=text.strip()
                # embedding will be generated later when the AI service is implemented
            )
            
            serializer = BrandSampleSerializer(sample)
            return success_response(data=serializer.data, status_code=status.HTTP_201_CREATED)
            
        except Exception as e:
            return error_response(
                f"An unexpected error occurred {e}",
                code="INTERNAL_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )