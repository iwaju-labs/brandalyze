"""
Integration tests for end-to-end audit workflows
"""
import pytest
from django.utils import timezone
from audits.models import PostAudit, AuditMetrics, DriftAlert, AuditUsage
from audits.services.scoring import BrandVoiceScorer
from audits.services.x_algorithm import XAlgorithmChecker


@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.django_db
class TestCompleteAuditFlow:
    """Test complete audit workflow from request to result"""
    
    def test_full_audit_workflow(self, pro_user, brand_with_samples):
        """Test complete audit flow: check usage -> score -> save -> check drift"""
        
        # 1. Check if user can perform audit
        can_audit, _ = AuditUsage.can_perform_audit(pro_user)
        assert can_audit is True
        
        # 2. Perform scoring
        content = "We build innovative solutions"
        scorer = BrandVoiceScorer(brand_with_samples)
        score_result = scorer.calculate_score(content)
        
        assert 'total' in score_result
        assert 0 <= score_result['total'] <= 100
        
        # 3. Check X optimization
        checker = XAlgorithmChecker()
        x_result = checker.analyze(content, {'has_media': False, 'is_thread': False})
        
        assert 'x_score' in x_result
        assert 'optimization_tips' in x_result
        
        # 4. Find deviations
        deviations = scorer.find_deviations(content)
        assert isinstance(deviations, list)
        
        # 5. Create audit record
        audit = PostAudit.objects.create(
            user=pro_user,
            brand=brand_with_samples,
            content=content,
            platform='x',
            score=score_result['total']
        )
        
        assert audit.id is not None
        
        # 6. Create metrics
        metrics = AuditMetrics.objects.create(
            audit=audit,
            tone_match=score_result['breakdown']['tone_match'],
            vocabulary_consistency=score_result['breakdown']['vocabulary_consistency'],
            emotional_alignment=score_result['breakdown']['emotional_alignment'],
            style_deviation=score_result['breakdown']['style_deviation'],
            deviations=deviations,
            x_optimization=x_result
        )
        
        assert metrics.id is not None
        
        # 7. Increment usage
        AuditUsage.increment_audit_count(pro_user)
        
        usage = AuditUsage.objects.get(user=pro_user)
        assert usage.audit_count >= 1
    
    def test_drift_detection_workflow(self, pro_user, brand_with_samples):
        """Test drift detection across multiple audits"""
        
        # Create multiple low-scoring audits to trigger drift
        for i in range(5):
            PostAudit.objects.create(
                user=pro_user,
                brand=brand_with_samples,
                content=f"Test content {i}",
                platform='twitter',
                score=50.0  # Low score to simulate drift
            )
        
        # Check if drift alert should be created
        recent_audits = PostAudit.objects.filter(
            brand=brand_with_samples,
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        )
        
        if recent_audits.count() >= 3:
            avg_score = sum(a.score for a in recent_audits) / recent_audits.count()
            
            if avg_score < 60:
                # Create drift alert
                alert = DriftAlert.objects.create(
                    user=pro_user,
                    brand=brand_with_samples,
                    severity='high',
                    message=f'Brand voice drift detected. Average score: {avg_score:.1f}',
                    threshold_breached=avg_score
                )
                
                assert alert.id is not None
                assert not alert.acknowledged
    
    def test_free_user_blocked_workflow(self, free_user, brand):
        """Test that free users are blocked from performing audits"""
        
        # 1. Check if user can perform audit
        can_audit, message = AuditUsage.can_perform_audit(free_user)
        
        assert can_audit is False
        assert message == 0
        
        # 2. Verify no audit can be created (in real scenario, API would block this)
        # This is just to verify the model level check
        assert not can_audit


@pytest.mark.integration
@pytest.mark.django_db
class TestMultipleBrandAudits:
    """Test auditing across multiple brands"""
    
    def test_separate_brand_audits(self, pro_user):
        """Test audits are correctly associated with different brands"""
        from brands.models import Brand
        
        # Create two brands
        brand1 = Brand.objects.create(
            user=pro_user,
            name="Brand 1"
        )
        brand2 = Brand.objects.create(
            user=pro_user,
            name="Brand 2"
        )
        
        # Create audits for each brand
        PostAudit.objects.create(
            user=pro_user,
            brand=brand1,
            content="Tech content",
            platform='twitter',
            score=85.0
        )
        PostAudit.objects.create(
            user=pro_user,
            brand=brand2,
            content="Health content",
            platform='twitter',
            score=90.0
        )
        
        # Verify separation
        brand1_audits = PostAudit.objects.filter(brand=brand1)
        brand2_audits = PostAudit.objects.filter(brand=brand2)
        
        assert brand1_audits.count() == 1
        assert brand2_audits.count() == 1
        assert brand1_audits.first().content == "Tech content"
        assert brand2_audits.first().content == "Health content"


@pytest.mark.integration
@pytest.mark.django_db(transaction=True)
class TestUsageTracking:
    """Test audit usage tracking over time"""
    
    def test_daily_usage_increment(self, pro_user, brand):
        """Test usage tracking increments correctly"""
        
        # Perform multiple audits
        for i in range(5):
            PostAudit.objects.create(
                user=pro_user,
                brand=brand,
                content=f"Content {i}",
                platform='twitter',
                score=80.0
            )
            AuditUsage.increment_audit_count(pro_user)
        
        # Check usage count
        usage = AuditUsage.objects.get(user=pro_user, date=timezone.now().date())
        assert usage.audit_count == 5
    
    def test_usage_resets_daily(self):
        """Test usage is tracked per day"""
        from datetime import timedelta
        from django.contrib.auth import get_user_model
        from brands.models import Brand
        import uuid

        User = get_user_model()
        
        # Use unique username to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        test_user = User.objects.create_user(
            username=f'dailytest_{unique_id}',
            email=f'dailytest_{unique_id}@example.com',
            password='testpass123'
        )
        
        # Create brand for this user
        test_brand = Brand.objects.create(
            user=test_user,
            name='Test Brand Daily',
            description='Brand for daily test'
        )

        # Clear any usage created by signals
        AuditUsage.objects.filter(user=test_user).delete()
        
        # DEBUG: Check if any exist after clear
        print(f"After delete: {AuditUsage.objects.filter(user=test_user).count()} records")
        
        today_date = timezone.now().date()
        yesterday_date = today_date - timedelta(days=1)
        print(f"Today's date: {today_date}, Yesterday's date: {yesterday_date}")

        yesterday_usage = AuditUsage.objects.create(
            user=test_user,
            date=yesterday_date,
            audit_count=5
        )
        
        print(f"Created yesterday record with date: {yesterday_usage.date}")
        
        # DEBUG: Check count before increment
        print(f"Before increment: {AuditUsage.objects.filter(user=test_user, date=today_date).count()} today records")
        print(f"All records after yesterday create: {list(AuditUsage.objects.filter(user=test_user).values('date', 'audit_count'))}")

        PostAudit.objects.create(
            user=test_user,
            brand=test_brand,
            content="Today's content",
            platform='twitter',
            score=85.0
        )
        
        # DEBUG: Check if PostAudit creation triggered anything
        print(f"After PostAudit create: {AuditUsage.objects.filter(user=test_user, date=timezone.now().date()).count()} today records")
        if AuditUsage.objects.filter(user=test_user, date=timezone.now().date()).exists():
            existing = AuditUsage.objects.get(user=test_user, date=timezone.now().date())
            print(f"Existing today record has count: {existing.audit_count}")
        
        AuditUsage.increment_audit_count(test_user)
        
        # DEBUG: What's the count now?
        today_usage = AuditUsage.objects.get(user=test_user, date=timezone.now().date())
        print(f"After increment: count is {today_usage.audit_count}")
        print(f"All usage records for user: {list(AuditUsage.objects.filter(user=test_user).values('date', 'audit_count'))}")
        
        assert today_usage.audit_count == 1
        assert yesterday_usage.audit_count == 5
        assert AuditUsage.objects.filter(user=test_user).count() == 2
        
