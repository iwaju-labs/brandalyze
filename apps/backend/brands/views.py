from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from .models import Brand, BrandSample
from .serializers import BrandSerializer, BrandSampleSerializer
# from packages.ai_core.embeddings import extract_embedding

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

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Brand.objects.filter(owner=self.request.user)
    
class BrandSampleViewSet(viewsets.ModelViewSet):
    queryset = BrandSample.objects.all()
    serializer_class = BrandSampleSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        brand_id = request.data.get('brand_id')
        text = request.data.get('text')

        brand = Brand.objects.get(id=brand_id, owner=request.user)
        # embedding = extract_embedding(text)  # TODO: Implement this later

        sample = BrandSample.objects.create(
            brand=brand,
            text=text,
            # embedding=embedding  # TODO: Add this back when embeddings are implemented
        )
        return Response(BrandSampleSerializer(sample).data, status=status.HTTP_201_CREATED)