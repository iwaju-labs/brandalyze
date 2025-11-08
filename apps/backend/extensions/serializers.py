from rest_framework import serializers
from brands.models import Brand

class ExtensionBrandSerializer(serializers.ModelSerializer):
    """Lightweight brand serializer for extension use"""
    sample_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ['id', 'name', 'industry', 'target_audience', 'sample_count']

    def get_sample_count(self, obj):
        return obj.samples.count()

class ExtensionAnalysisRequestSerializer(serializers.Serializer):
    """Serializer for extension analysis requests"""
    content = serializers.CharField(max_length=10000)
    brand_id = serializers.IntegerField()
    platform = serializers.CharField(max_length=50, required=False, default='unknown')
    session_id = serializers.CharField(max_length=64, required=False)

class ExtensionAnalysisResponseSerializer(serializers.Serializer):
    """Serializer for extension analysis responses"""
    alignment_score = serializers.FloatField()
    alignment_level = serializers.CharField() # e.g. high, medium, low
    key_insights = serializers.ListField(child=serializers.CharField())
    suggestions = serializers.ListField(child=serializers.CharField(), required=False)
    analysis_id = serializers.CharField()