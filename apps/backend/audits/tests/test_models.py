"""
Unit tests for audit models
"""
import pytest
from django.utils import timezone
from audits.models import PostAudit, AuditMetrics, DriftAlert, AuditUsage
from brands.models import Brand


@pytest.mark.unit
@pytest.mark.models
@pytest.mark.django_db
class TestPostAudit:
    """Test suite for PostAudit model"""
    
    def test_create_post_audit(self, user, brand):
        """Test creating a basic post audit"""
        audit = PostAudit.objects.create(
            user=user,
            brand=brand,
            content="Test post content",
            platform="twitter",
            score=85.0
        )
        
        assert audit.id is not None
        assert audit.user == user
        assert audit.brand == brand
        assert audit.content == "Test post content"
        assert audit.platform == "twitter"
        assert audit.score is not None
    
    def test_post_audit_default_values(self, user, brand):
        """Test default values for post audit"""
        audit = PostAudit.objects.create(
            user=user,
            brand=brand,
            content="Test",
            platform="twitter",
            score=80.0
        )
        
        assert audit.platform == "twitter"
        assert audit.created_at is not None
        assert audit.context == {}
    
    def test_post_audit_ordering(self, user, brand):
        """Test post audits are ordered by creation date descending"""
        import time
        
        audit1 = PostAudit.objects.create(
            user=user,
            brand=brand,
            content="First",
            platform="twitter",
            score=85.0
        )
        
        time.sleep(0.01)  # Ensure different timestamps
        
        audit2 = PostAudit.objects.create(
            user=user,
            brand=brand,
            content="Second",
            platform="twitter",
            score=90.0
        )
        
        audits = PostAudit.objects.all()
        assert audits[0] == audit2
        assert audits[1] == audit1


@pytest.mark.unit
@pytest.mark.models
@pytest.mark.django_db
class TestAuditMetrics:
    """Test suite for AuditMetrics model"""
    
    def test_create_audit_metrics(self, post_audit):
        """Test creating audit metrics"""
        metrics = AuditMetrics.objects.create(
            audit=post_audit,
            tone_match=85.0,
            vocabulary_consistency=90.0,
            emotional_alignment=88.0,
            style_deviation=92.0
        )
        
        assert metrics.id is not None
        assert metrics.audit == post_audit
        assert 84.0 <= metrics.tone_match <= 86.0
        assert 89.0 <= metrics.vocabulary_consistency <= 91.0
        assert 87.0 <= metrics.emotional_alignment <= 89.0
        assert 91.0 <= metrics.style_deviation <= 93.0
    
    def test_audit_metrics_json_fields(self, post_audit):
        """Test JSON field storage"""
        metrics = AuditMetrics.objects.create(
            audit=post_audit,
            tone_match=80.0,
            vocabulary_consistency=80.0,
            emotional_alignment=80.0,
            style_deviation=80.0,
            deviations=[
                {"phrase": "test", "reason": "corporate jargon", "severity": "medium"}
            ],
            x_optimization={
                "score": 75,
                "tips": [{"category": "media", "message": "Add images"}]
            }
        )
        
        assert isinstance(metrics.deviations, list)
        assert len(metrics.deviations) == 1
        assert metrics.deviations[0]['phrase'] == "test"
        
        assert isinstance(metrics.x_optimization, dict)
        assert metrics.x_optimization['score'] == 75


@pytest.mark.unit
@pytest.mark.models
@pytest.mark.django_db
class TestDriftAlert:
    """Test suite for DriftAlert model"""
    
    def test_create_drift_alert(self, user, brand):
        """Test creating drift alert"""
        alert = DriftAlert.objects.create(
            user=user,
            brand=brand,
            severity="high",
            message="Brand voice drift detected",
            threshold_breached=55.0
        )
        
        assert alert.id is not None
        assert alert.user == user
        assert alert.brand == brand
        assert alert.severity == "high"
        assert not alert.acknowledged
        assert 54.0 <= alert.threshold_breached <= 56.0
    
    def test_drift_alert_default_values(self, user, brand):
        """Test default values for drift alert"""
        alert = DriftAlert.objects.create(
            user=user,
            brand=brand,
            severity="medium",
            message="Test alert",
            threshold_breached=60.0
        )
        
        assert alert.severity == "medium"
        assert not alert.acknowledged
        assert alert.acknowledged_at is None
        assert alert.detected_at is not None
    
    def test_resolve_drift_alert(self, drift_alert):
        """Test resolving a drift alert"""
        assert not drift_alert.acknowledged
        assert drift_alert.acknowledged_at is None
        
        drift_alert.acknowledge()
        
        assert drift_alert.acknowledged
        assert drift_alert.acknowledged_at is not None


@pytest.mark.unit
@pytest.mark.models
@pytest.mark.django_db
class TestAuditUsage:
    """Test suite for AuditUsage model"""
    
    def test_create_audit_usage(self, user):
        """Test creating audit usage record"""
        usage = AuditUsage.objects.create(
            user=user,
            audit_count=5
        )
        
        assert usage.id is not None
        assert usage.user == user
        assert usage.audit_count == 5
        assert usage.date == timezone.now().date()
    
    def test_audit_usage_default_values(self, user):
        """Test default values for audit usage"""
        usage = AuditUsage.objects.create(
            user=user
        )
        
        assert usage.audit_count == 0
        assert usage.date is not None
    
    def test_can_perform_audit_pro_user(self, pro_user):
        """Test Pro users can always perform audits"""
        can_audit, _ = AuditUsage.can_perform_audit(pro_user)
        assert can_audit is True
    
    def test_can_perform_audit_free_user(self, free_user):
        """Test free users cannot perform audits"""
        can_audit, message = AuditUsage.can_perform_audit(free_user)
        assert can_audit is False
        assert message == 0
    
    def test_increment_usage(self, user):
        """Test incrementing audit usage"""
        # Create initial usage
        AuditUsage.objects.create(user=user, audit_count=5)
        
        # Increment usage
        AuditUsage.increment_audit_count(user)
        
        # Check updated value
        usage = AuditUsage.objects.get(user=user)
        assert usage.audit_count == 6
    
    def test_increment_usage_creates_record(self, user):
        """Test incrementing usage creates record if none exists"""
        assert not AuditUsage.objects.filter(user=user).exists()
        
        AuditUsage.increment_audit_count(user)
        
        assert AuditUsage.objects.filter(user=user).exists()
        usage = AuditUsage.objects.get(user=user)
        assert usage.audit_count == 1
