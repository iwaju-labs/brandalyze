from rest_framework import serializers
from .models import Brand, BrandSample

class BrandSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandSample
        fields = ['id', 'text', 'embedding', 'created_at']

class BrandSerializer(serializers.ModelSerializer):
    samples = BrandSampleSerializer(many=True, read_only=True)

    class Meta:
        model = Brand
        fields = ['id', 'name', 'samples']