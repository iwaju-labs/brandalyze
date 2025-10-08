from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Brand, BrandSample
from .serializers import BrandSerializer, BrandSampleSerializer
# from packages.ai_core.embeddings import extract_embedding

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
        # embedding = extract_embedding(text)

        sample = BrandSample.objects.create(
            brand=brand,
            text=text,
            embedding=embedding
        )
        return Response(BrandSampleSerializer(sample).data, status=status.HTTP_201_CREATED)