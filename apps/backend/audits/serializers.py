from rest_framework import serializers
from .models import PostAudit, AuditMetrics, DriftAlert, AuditUsage
from brands.models import Brand


class AuditMetricsSerializer(serializers.ModelSerializer):
    """Serializer for detailed audit metrics"""
    
    class Meta:
        model = AuditMetrics
        fields = [
            'tone_match',
            'vocabulary_consistency',
            'emotional_alignment',
            'style_deviation',
            'deviations',
            'x_optimization',
            'ai_feedback',
            'metric_tips'
        ]


class PostAuditSerializer(serializers.ModelSerializer):
    """Serializer for post audit records"""
    metrics = AuditMetricsSerializer(read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)
    
    class Meta:
        model = PostAudit
        fields = [
            'id',
            'brand',
            'brand_name',
            'content',
            'platform',
            'platform_display',
            'score',
            'created_at',
            'context',
            'metrics'
        ]
        read_only_fields = ['id', 'created_at', 'score']


class PostAuditCreateSerializer(serializers.Serializer):
    """Serializer for creating a new audit"""
    brand_id = serializers.IntegerField()
    content = serializers.CharField(min_length=5)
    platform = serializers.ChoiceField(
        choices=['twitter', 'linkedin', 'other'],
        default='other'
    )
    context = serializers.JSONField(required=False, default=dict)
    
    def validate_brand_id(self, value):
        """Validate that brand exists and belongs to user"""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")
        
        if not Brand.objects.filter(id=value, user=request.user).exists():
            raise serializers.ValidationError("Brand not found or does not belong to you")
        
        return value
    
    def validate_content(self, value):
        """Validate content is not empty"""
        if not value.strip():
            raise serializers.ValidationError("Content cannot be empty")
        return value.strip()


class DriftAlertSerializer(serializers.ModelSerializer):
    """Serializer for drift alerts"""
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    related_audit_count = serializers.IntegerField(
        source='related_audits.count',
        read_only=True
    )
    
    class Meta:
        model = DriftAlert
        fields = [
            'id',
            'brand',
            'brand_name',
            'severity',
            'severity_display',
            'message',
            'detected_at',
            'acknowledged',
            'acknowledged_at',
            'threshold_breached',
            'related_audit_count'
        ]
        read_only_fields = [
            'id',
            'detected_at',
            'acknowledged_at',
            'threshold_breached'
        ]


class AuditUsageSerializer(serializers.ModelSerializer):
    """Serializer for audit usage tracking"""
    
    class Meta:
        model = AuditUsage
        fields = ['date', 'audit_count']
        read_only_fields = ['date', 'audit_count']
