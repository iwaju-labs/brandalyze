from rest_framework import serializers
from .models import Brand, BrandSample

class BrandSampleSerializer(serializers.ModelSerializer):
    brand_id = serializers.IntegerField(write_only=True, required=False)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    
    class Meta:
        model = BrandSample
        fields = ['id', 'text', 'embedding', 'created_at', 'brand_id', 'brand_name']
        read_only_fields = ['id', 'embedding', 'created_at', 'brand_name']
    
    def validate_text(self, value):
        """Validate that text is not empty or just whitespace"""
        if not value or not value.strip():
            raise serializers.ValidationError("Text cannot be empty or contain only whitespace.")
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Text must be at least 5 characters long.")
        return value.strip()

class BrandSerializer(serializers.ModelSerializer):
    samples = BrandSampleSerializer(many=True, read_only=True)
    samples_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ['id', 'name', 'created_at', 'samples', 'samples_count']
        read_only_fields = ['id', 'created_at']
    
    def validate_name(self, value):
        """Validate brand name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Brand name cannot be empty.")
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Brand name must be at least 2 characters long.")
        return value.strip()
    
    def get_samples_count(self, obj):
        """Return the number of samples for this brand"""
        return obj.samples.count()