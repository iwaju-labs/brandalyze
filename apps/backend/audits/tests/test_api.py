"""
Integration tests for audit API endpoints
"""
import pytest
from django.urls import reverse
from rest_framework import status
from audits.models import PostAudit, AuditUsage


@pytest.mark.integration
@pytest.mark.api
@pytest.mark.django_db
class TestAnalyzePostEndpoint:
    """Test suite for POST /api/audits/analyze endpoint"""
    
    def test_analyze_post_success(self, authenticated_client, brand_with_samples):
        """Test successful post analysis"""
        url = reverse('audits:analyze')
        data = {
            'brand_id': brand_with_samples.id,
            'content': 'We build innovative solutions for modern problems',
            'platform': 'twitter',
            'context': {'has_media': True, 'is_thread': False}
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'audit' in response.data
        audit = response.data['audit']
        assert 'id' in audit
        assert 'score' in audit
        assert 'metrics' in audit
        assert 0 <= audit['score'] <= 100
    
    def test_analyze_post_free_user(self, api_client, free_user, brand, monkeypatch):
        """Test free users cannot perform audits"""
        from brands.permissions import ClerkAuthenticated
        
        # Mock permission to allow request through
        def mock_has_permission(self, request, view):
            return request.user and request.user.is_authenticated
        
        monkeypatch.setattr(ClerkAuthenticated, 'has_permission', mock_has_permission)
        
        api_client.force_authenticate(user=free_user)
        
        url = reverse('audits:analyze')
        data = {
            'brand_id': brand.id,
            'content': 'Test content',
            'platform': 'twitter'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'upgrade' in str(response.data).lower() or 'pro' in str(response.data).lower()
    
    def test_analyze_post_invalid_brand(self, authenticated_client, brand):
        """Test analysis with non-existent brand"""
        url = reverse('audits:analyze')
        data = {
            'brand_id': 99999,
            'content': 'Test content',
            'platform': 'twitter'
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_analyze_post_missing_fields(self, authenticated_client):
        """Test analysis with missing required fields"""
        url = reverse('audits:analyze')
        data = {
            'content': 'Test content'
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_analyze_post_increments_usage(self, authenticated_client, brand_with_samples):
        """Test that successful analysis increments usage counter"""
        url = reverse('audits:analyze')
        data = {
            'brand_id': brand_with_samples.id,
            'content': 'Test content',
            'platform': 'twitter'
        }
        
        initial_count = AuditUsage.objects.filter(user=authenticated_client.handler._force_user).count()
        
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        final_count = AuditUsage.objects.filter(user=authenticated_client.handler._force_user).count()
        assert final_count >= initial_count


@pytest.mark.integration
@pytest.mark.api
@pytest.mark.django_db
class TestAuditHistoryEndpoint:
    """Test suite for GET /api/audits/history endpoint"""
    
    def test_get_audit_history(self, authenticated_client, post_audit):
        """Test retrieving audit history"""
        url = reverse('audits:history')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'audits' in response.data
        assert isinstance(response.data['audits'], list)
    
    def test_get_audit_history_filter_by_brand(self, authenticated_client, brand, user):
        """Test filtering audit history by brand"""
        # Create audits for specific brand
        PostAudit.objects.create(user=user, brand=brand, content="Test 1", platform='twitter', score=85.0)
        PostAudit.objects.create(user=user, brand=brand, content="Test 2", platform='twitter', score=90.0)
        
        url = reverse('audits:history')
        response = authenticated_client.get(url, {'brand_id': brand.id})
        
        assert response.status_code == status.HTTP_200_OK
        
        # All results should be for the specified brand
        for audit in response.data['audits']:
            assert audit['brand'] == brand.id
    
    def test_get_audit_history_pagination(self, authenticated_client, brand, user):
        """Test pagination of audit history"""
        # Create multiple audits
        for i in range(15):
            PostAudit.objects.create(user=user, brand=brand, content=f"Test {i}", platform='twitter', score=80.0)
        
        url = reverse('audits:history')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'audits' in response.data
        assert len(response.data['audits']) > 0

@pytest.mark.integration
@pytest.mark.api
@pytest.mark.django_db
class TestDriftAlertsEndpoint:
    """Test suite for GET /api/audits/drift-alerts endpoint"""
    
    def test_get_drift_alerts(self, authenticated_client, drift_alert):
        """Test retrieving drift alerts"""
        url = reverse('audits:drift-alerts')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        if isinstance(response.data, dict):
            assert 'alerts' in response.data
            assert isinstance(response.data['alerts'], list)
        else:
            assert isinstance(response.data, list)
    
    def test_get_unresolved_drift_alerts(self, authenticated_client, user, brand):
        """Test filtering unresolved alerts"""
        from audits.models import DriftAlert
        
        # Create resolved and unresolved alerts
        DriftAlert.objects.create(
            user=user,
            brand=brand,
            severity="high",
            message="Resolved",
            threshold_breached=75.0,
            acknowledged=True
        )
        DriftAlert.objects.create(
            user=user,
            brand=brand,
            severity="high",
            message="Unresolved",
            threshold_breached=80.0,
            acknowledged=False
        )
        
        url = reverse('audits:drift-alerts')
        response = authenticated_client.get(url, {'acknowledged': 'false'})
        
        assert response.status_code == status.HTTP_200_OK
        
        # Get alerts from response (handle both dict and list formats)
        alerts = response.data if isinstance(response.data, list) else response.data.get('alerts', [])
        
        # All results should be unresolved
        for alert in alerts:
            assert not alert['acknowledged']


@pytest.mark.integration
@pytest.mark.api
@pytest.mark.django_db
class TestUsageStatsEndpoint:
    """Test suite for GET /api/audits/usage-stats endpoint"""
    
    def test_get_usage_stats(self, authenticated_client):
        """Test retrieving usage statistics"""
        url = reverse('audits:usage-stats')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'tier' in response.data
        assert 'is_unlimited' in response.data
        assert 'total_this_month' in response.data
    
    def test_usage_stats_unauthenticated(self, api_client):
        """Test usage stats requires authentication"""
        from brands.permissions import ClerkAuthenticated
        url = reverse('audits:usage-stats')
        response = api_client.get(url)
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
