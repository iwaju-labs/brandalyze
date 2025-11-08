from rest_framework import serializers
from .models import Brand, BrandSample

class BrandSampleSerializer(serializers.ModelSerializer):
    brand_id = serializers.IntegerField(write_only=True, required=False)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    text_length = serializers.ReadOnlyField()
    text_preview = serializers.ReadOnlyField()
    is_multi_chunk = serializers.ReadOnlyField()
    
    class Meta:
        model = BrandSample
        fields = [
            'id', 'text', 'embedding', 'created_at', 'updated_at',
            'brand_id', 'brand_name', 'file_ref', 'file_type', 'file_size',
            'chunk_index', 'total_chunks', 'text_length', 'text_preview', 'is_multi_chunk'
        ]
        read_only_fields = [
            'id', 'embedding', 'created_at', 'updated_at', 'brand_name',
            'text_length', 'text_preview', 'is_multi_chunk'
        ]
    
    def validate_text(self, value):
        """Validate that text is not empty or just whitespace"""
        if not value or not value.strip():
            raise serializers.ValidationError("Text cannot be empty or contain only whitespace.")
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Text must be at least 5 characters long.")
        return value.strip()


class BrandSampleDetailSerializer(BrandSampleSerializer):
    """Extended serializer for detailed sample view with related chunks"""
    related_chunks = serializers.SerializerMethodField()
    
    class Meta(BrandSampleSerializer.Meta):
        fields = BrandSampleSerializer.Meta.fields + ['related_chunks']
    
    def get_related_chunks(self, obj):
        """Get all chunks from the same file"""
        if not obj.file_ref:
            return []
        
        related = obj.get_related_chunks()
        return [{
            'id': chunk.id,
            'chunk_index': chunk.chunk_index,
            'text_preview': chunk.text_preview,
            'created_at': chunk.created_at
        } for chunk in related]


class BrandSerializer(serializers.ModelSerializer):
    samples = BrandSampleSerializer(many=True, read_only=True)
    samples_count = serializers.SerializerMethodField()
    sample_count = serializers.ReadOnlyField()
    total_text_length = serializers.ReadOnlyField()
    recent_samples = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at',
            'samples', 'samples_count', 'sample_count', 'total_text_length', 'recent_samples'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'sample_count', 'total_text_length']
    
    def validate_name(self, value):
        """Validate brand name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Brand name cannot be empty.")
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Brand name must be at least 2 characters long.")
        return value.strip()
    
    def validate(self, data):
        """Validate unique brand name per user"""
        user = self.context['request'].user
        name = data.get('name')
        
        if name:
            # Check for duplicate names, excluding current instance if updating
            queryset = Brand.objects.filter(user=user, name=name)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise serializers.ValidationError({
                    'name': 'You already have a brand with this name.'
                })
        
        return data
    
    def get_samples_count(self, obj):
        """Return the number of samples for this brand"""
        return obj.samples.count()
    
    def get_recent_samples(self, obj):
        """Return recent samples preview"""
        recent = obj.get_recent_samples(limit=3)
        return [{
            'id': sample.id,
            'text_preview': sample.text_preview,
            'file_type': sample.file_type,
            'created_at': sample.created_at
        } for sample in recent]


class BrandListSerializer(serializers.ModelSerializer):
    """Simplified serializer for brand list view"""
    sample_count = serializers.ReadOnlyField()
    total_text_length = serializers.ReadOnlyField()
    
    class Meta:
        model = Brand
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at',
            'sample_count', 'total_text_length'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'sample_count', 'total_text_length']