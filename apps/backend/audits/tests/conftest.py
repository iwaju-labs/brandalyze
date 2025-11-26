"""
Test configuration and fixtures for audit feature tests
"""
import pytest
from unittest.mock import Mock
from django.contrib.auth import get_user_model
from brands.models import Brand, BrandSample
from analysis.models import UserSubscription
from audits.models import PostAudit, AuditMetrics, DriftAlert, AuditUsage

User = get_user_model()


class MockClerkUser:
    """Mock Clerk user for testing"""
    def __init__(self, user):
        self.user_id = str(user.id)
        self.email = user.email


@pytest.fixture
def user(db):
    """Create a test user"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def pro_user(db, user):
    """Create a Pro tier user"""
    UserSubscription.objects.create(
        user=user,
        tier='pro',
        is_active=True,
        daily_analysis_limit=9999
    )
    return user


@pytest.fixture
def free_user(db, user):
    """Create a Free tier user"""
    UserSubscription.objects.create(
        user=user,
        tier='free',
        is_active=True,
        daily_analysis_limit=3
    )
    return user


@pytest.fixture
def brand(db, user):
    """Create a test brand"""
    return Brand.objects.create(
        user=user,
        name='Test Brand',
        description='A test brand for audits'
    )


@pytest.fixture
def brand_with_samples(db, brand):
    """Create a brand with sample texts"""
    samples = [
        "We build innovative solutions that transform businesses.",
        "Our mission is to empower creators worldwide.",
        "Creating amazing experiences for our users is what drives us.",
        "Innovation drives everything we do.",
        "We're passionate about helping people achieve their goals."
    ]
    
    for text in samples:
        BrandSample.objects.create(
            brand=brand,
            text=text
        )
    
    return brand


@pytest.fixture
def post_audit(db, pro_user, brand):
    """Create a test post audit"""
    return PostAudit.objects.create(
        user=pro_user,
        brand=brand,
        content="This is a test post for auditing.",
        platform='twitter',
        score=75.5,
        context={'has_media': True}
    )


@pytest.fixture
def audit_with_metrics(db, post_audit):
    """Create an audit with full metrics"""
    AuditMetrics.objects.create(
        audit=post_audit,
        tone_match=80.0,
        vocabulary_consistency=75.0,
        emotional_alignment=70.0,
        style_deviation=15.0,
        deviations=[
            {
                'phrase': 'synergy',
                'reason': 'Corporate jargon',
                'severity': 'medium'
            }
        ],
        x_optimization={
            'score': 85,
            'tips': ['Add media', 'Use emojis']
        }
    )
    return post_audit


@pytest.fixture
def drift_alert(db, pro_user, brand):
    """Create a test drift alert"""
    return DriftAlert.objects.create(
        user=pro_user,
        brand=brand,
        severity='medium',
        message='Your recent posts show drift',
        threshold_breached=60.0
    )


@pytest.fixture
def sample_content():
    """Sample content for testing"""
    return {
        'good': "Just launched our new product! We're excited to help creators build amazing things. 🚀",
        'with_jargon': "We need to leverage synergy and circle back on this initiative.",
        'short': "Hi",
        'long': "Lorem ipsum " * 100,
        'question': "What do you think about this new feature?",
        'with_numbers': "We grew 10x this quarter and reached $100k MRR!"
    }


@pytest.fixture
def api_client():
    """DRF API client"""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, pro_user, monkeypatch):
    """Authenticated API client with Clerk user"""
    from brands.permissions import ClerkAuthenticated
    
    # Mock the permission check to always return True for tests
    def mock_has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    monkeypatch.setattr(ClerkAuthenticated, 'has_permission', mock_has_permission)
    
    api_client.force_authenticate(user=pro_user)
    return api_client


@pytest.fixture
def mock_openai_response(monkeypatch):
    """Mock OpenAI API responses"""
    class MockEmbedding:
        def __init__(self):
            self.embedding = [0.1] * 1536
    
    class MockResponse:
        def __init__(self):
            self.data = [MockEmbedding()]
    
    def mock_create(*args, **kwargs):
        return MockResponse()
    
    # This will need to be adjusted based on your actual OpenAI usage
    # monkeypatch.setattr('openai.Embedding.create', mock_create)
    return mock_create
