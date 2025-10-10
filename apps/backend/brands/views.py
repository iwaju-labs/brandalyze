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

# Import AI core modules for text extraction and processing
try:
    from ai_core.text_extraction import extract_text
    from ai_core.text_processing import process_text
    TEXT_PROCESSING_AVAILABLE = True
except ImportError:
    TEXT_PROCESSING_AVAILABLE = False

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def upload_file(request):
    """
    Simple file upload endpoint for testing
    """
    try:
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        
        # Basic file validation
        max_size = 10 * 1024 * 1024  # 10MB
        if uploaded_file.size > max_size:
            return Response({'error': 'File too large. Max size is 10MB.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, just return success - you can add actual file processing later
        return Response({
            'message': 'File uploaded successfully',
            'filename': uploaded_file.name,
            'size': uploaded_file.size,
            'content_type': uploaded_file.content_type
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _validate_upload_request(request):
    """Helper function to validate upload request"""
    if 'file' not in request.FILES:
        return None, Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    brand_id = request.data.get('brand_id')
    if not brand_id:
        return None, Response({'error': 'brand_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    return brand_id, None


def _validate_brand_ownership(brand_id, user):
    """Helper function to validate brand ownership"""
    try:
        brand = Brand.objects.get(id=brand_id, user=user)
        return brand, None
    except Brand.DoesNotExist:
        return None, Response(
            {'error': 'Brand not found or you do not have permission to access it'}, 
            status=status.HTTP_404_NOT_FOUND
        )


def _extract_and_process_text(uploaded_file, file_type):
    """Helper function to extract and process text from uploaded file"""
    if not TEXT_PROCESSING_AVAILABLE:
        return "Text processing not available - ai_core modules not imported", []
    
    try:
        # Save file temporarily for text extraction
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as temp_file:
            uploaded_file.seek(0)
            temp_file.write(uploaded_file.read())
            temp_file_path = temp_file.name
        
        try:
            # Extract text using our text extraction engine
            extracted_text = extract_text(temp_file_path, file_type)
            
            # Process and chunk the text
            if extracted_text and not extracted_text.startswith('Error'):
                text_chunks = process_text(extracted_text, max_chunk_size=1000, strategy="sentences")
                return extracted_text, text_chunks
            else:
                return extracted_text, []
                
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as text_error:
        return f"Text extraction failed: {str(text_error)}", []


def _create_brand_samples(brand, extracted_text, text_chunks):
    """Helper function to create brand samples from text chunks"""
    created_samples = []
    
    if text_chunks and len(text_chunks) > 0:
        for i, chunk in enumerate(text_chunks):
            if chunk.strip():  # Only create samples for non-empty chunks
                sample = BrandSample.objects.create(brand=brand, text=chunk)
                created_samples.append({
                    'id': sample.id,
                    'text_preview': chunk[:100] + '...' if len(chunk) > 100 else chunk,
                    'chunk_number': i + 1
                })
    elif extracted_text and not extracted_text.startswith('Error') and not extracted_text.startswith('Text'):
        # If no chunks but we have extracted text, create a single sample
        sample = BrandSample.objects.create(brand=brand, text=extracted_text)
        created_samples.append({
            'id': sample.id,
            'text_preview': extracted_text[:100] + '...' if len(extracted_text) > 100 else extracted_text,
            'chunk_number': 1
        })
    
    return created_samples


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def upload_brand_document(request):
    """
    Upload and process brand documents with full validation and text extraction
    """
    try:
        # Step 1: Validate request
        brand_id, error_response = _validate_upload_request(request)
        if error_response:
            return error_response
        
        # Step 2: Validate brand ownership
        brand, error_response = _validate_brand_ownership(brand_id, request.user)
        if error_response:
            return error_response
        
        uploaded_file = request.FILES['file']
        
        # Step 3: Validate file using our validation utility
        validation_result = validate_uploaded_file(uploaded_file)
        
        if not validation_result.is_valid:
            return Response({
                'error': 'File validation failed',
                'validation_errors': validation_result.errors,
                'file_metadata': validation_result.metadata
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 4: Extract and process text
        extracted_text, text_chunks = _extract_and_process_text(uploaded_file, validation_result.file_type)
        
        # Step 5: Create brand samples
        created_samples = _create_brand_samples(brand, extracted_text, text_chunks)
        
        # Step 6: Return comprehensive response
        return Response({
            'message': 'File processed successfully',
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
            'text_extraction': {
                'success': extracted_text and not extracted_text.startswith('Error'),
                'extracted_length': len(extracted_text) if extracted_text else 0,
                'chunks_created': len(text_chunks) if text_chunks else 0,
                'extraction_preview': extracted_text[:200] + '...' if extracted_text and len(extracted_text) > 200 else extracted_text
            },
            'brand_samples': {
                'created_count': len(created_samples),
                'samples': created_samples
            },
            'brand_info': {
                'id': brand.id,
                'name': brand.name,
                'total_samples': brand.samples.count()
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'An unexpected error occurred during file processing: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
                return Response(
                    {'error': 'brand_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not text or not text.strip():
                return Response(
                    {'error': 'text is required and cannot be empty'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate brand ownership
            try:
                brand = Brand.objects.get(id=brand_id, user=request.user)
            except Brand.DoesNotExist:
                return Response(
                    {'error': 'Brand not found or you do not have permission to access it'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create the sample
            sample = BrandSample.objects.create(
                brand=brand,
                text=text.strip()
                # embedding will be generated later when the AI service is implemented
            )
            
            serializer = BrandSampleSerializer(sample)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )