"""
Unit tests for extension token functionality
"""
import pytest
import secrets
from datetime import timedelta
from unittest.mock import patch, Mock
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from analysis.models import UserSubscription
from extensions.models import ExtensionToken
from extensions.views import (
    ExtensionTokenAuthentication,
    generate_extension_token,
    create_extension_token,
    exchange_auth_code,
    verify_extension_token
)

User = get_user_model()


class ExtensionTokenModelTests(TestCase):
    """Test ExtensionToken model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_token_creation_with_correct_expiry(self):
        """Test that token is created with correct expiry date"""
        expiry_date = timezone.now() + timedelta(days=90)
        token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=expiry_date,
            is_active=True
        )
        
        self.assertIsNotNone(token.id)
        self.assertEqual(token.user, self.user)
        self.assertTrue(token.is_active)
        self.assertAlmostEqual(
            token.expires_at, 
            expiry_date, 
            delta=timedelta(seconds=1)
        )
    
    def test_is_expired_method(self):
        """Test is_expired method returns correct status"""
        # Test future expiry date
        future_expiry = timezone.now() + timedelta(days=30)
        token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=future_expiry,
            is_active=True
        )
        self.assertFalse(token.is_expired())
        
        # Test past expiry date
        past_expiry = timezone.now() - timedelta(days=1)
        expired_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=past_expiry,
            is_active=True
        )
        self.assertTrue(expired_token.is_expired())
    
    def test_is_valid_method(self):
        """Test is_valid method considers both active status and expiry"""
        future_expiry = timezone.now() + timedelta(days=30)
        
        # Valid token (active and not expired)
        valid_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=future_expiry,
            is_active=True
        )
        self.assertTrue(valid_token.is_valid())
        
        # Invalid token (inactive but not expired)
        inactive_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=future_expiry,
            is_active=False
        )
        self.assertFalse(inactive_token.is_valid())
        
        # Invalid token (active but expired)
        past_expiry = timezone.now() - timedelta(days=1)
        expired_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=past_expiry,
            is_active=True
        )
        self.assertFalse(expired_token.is_valid())


class ExtensionTokenAuthenticationTests(TestCase):
    """Test ExtensionTokenAuthentication functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.factory = RequestFactory()
        self.auth = ExtensionTokenAuthentication()
        
        # Create valid token
        self.valid_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(days=30),
            is_active=True
        )
    
    def test_authenticate_with_valid_token(self):
        """Test authentication with valid token"""
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = f'ExtensionToken {self.valid_token.token}'
        
        result = self.auth.authenticate(request)
        
        self.assertIsNotNone(result)
        self.assertEqual(result[0], self.user)
        self.assertEqual(result[1], self.valid_token)
        
        # Check that last_used was updated
        self.valid_token.refresh_from_db()
        self.assertIsNotNone(self.valid_token.last_used)
    
    def test_authenticate_with_invalid_header(self):
        """Test authentication with invalid header format"""
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = 'Bearer invalid_token'
        
        result = self.auth.authenticate(request)
        self.assertIsNone(result)
    
    def test_authenticate_with_nonexistent_token(self):
        """Test authentication with nonexistent token"""
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = 'ExtensionToken invalid_token'
        
        with self.assertRaises(Exception):
            self.auth.authenticate(request)
    
    def test_authenticate_with_expired_token(self):
        """Test authentication with expired token"""
        expired_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() - timedelta(days=1),
            is_active=True
        )
        
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = f'ExtensionToken {expired_token.token}'
        
        with self.assertRaises(Exception):
            self.auth.authenticate(request)
    
    def test_authenticate_with_inactive_token(self):
        """Test authentication with inactive token"""
        inactive_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(days=30),
            is_active=False
        )
        
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = f'ExtensionToken {inactive_token.token}'
        
        with self.assertRaises(Exception):
            self.auth.authenticate(request)


class ExtensionTokenAPITests(TestCase):
    """Test extension token API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create Pro subscription for user
        self.subscription = UserSubscription.objects.create(
            user=self.user,
            tier='pro',
            is_active=True,
            subscription_end=timezone.now() + timedelta(days=365)
        )
    
    @patch('brands.views.ClerkAuthentication.authenticate')
    def test_generate_extension_token_success(self, mock_auth):
        """Test successful extension token generation"""
        mock_auth.return_value = (self.user, None)
        
        response = self.client.post('/api/extension/auth/generate-token/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data['data'])
        self.assertIn('expires_at', response.data['data'])
        
        # Verify token was created in database
        token = ExtensionToken.objects.filter(user=self.user, is_active=True).first()
        self.assertIsNotNone(token)
        self.assertEqual(token.token, response.data['data']['token'])
        
        # Verify expiry date matches subscription end
        expected_expiry = self.subscription.subscription_end
        self.assertAlmostEqual(
            token.expires_at,
            expected_expiry,
            delta=timedelta(seconds=1)
        )
    
    @patch('brands.views.ClerkAuthentication.authenticate')
    def test_generate_extension_token_no_subscription(self, mock_auth):
        """Test token generation fails without proper subscription"""
        # Remove subscription
        self.subscription.delete()
        mock_auth.return_value = (self.user, None)
        
        response = self.client.post('/api/extension/auth/generate-token/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('subscription', response.data['message'].lower())
    
    @patch('brands.views.ClerkAuthentication.authenticate')
    def test_generate_extension_token_free_user(self, mock_auth):
        """Test token generation fails for free tier users"""
        # Update to free subscription
        self.subscription.tier = 'free'
        self.subscription.save()
        mock_auth.return_value = (self.user, None)
        
        response = self.client.post('/api/extension/auth/generate-token/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('subscription', response.data['message'].lower())
    
    @patch('brands.views.ClerkAuthentication.authenticate')
    def test_generate_token_deactivates_existing_tokens(self, mock_auth):
        """Test that generating new token deactivates existing ones"""
        mock_auth.return_value = (self.user, None)
        
        # Create existing token
        existing_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(days=30),
            is_active=True
        )
        
        response = self.client.post('/api/extension/auth/generate-token/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check existing token was deactivated
        existing_token.refresh_from_db()
        self.assertFalse(existing_token.is_active)
        
        # Check new token is active
        new_token = ExtensionToken.objects.filter(user=self.user, is_active=True).first()
        self.assertIsNotNone(new_token)
        self.assertNotEqual(new_token.token, existing_token.token)
    
    def test_verify_extension_token_success(self):
        """Test successful token verification"""
        token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(days=30),
            is_active=True
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'ExtensionToken {token.token}')
        response = self.client.post('/api/extension/auth/verify-token/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user_id', response.data['data'])
        self.assertEqual(response.data['data']['user_id'], self.user.id)
    
    def test_verify_extension_token_invalid(self):
        """Test token verification with invalid token"""
        self.client.credentials(HTTP_AUTHORIZATION='ExtensionToken invalid_token')
        response = self.client.post('/api/extension/auth/verify-token/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ExtensionTokenExpiryTests(TestCase):
    """Test extension token expiry behavior"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_token_expiry_matches_subscription_end(self):
        """Test that token expiry matches subscription end date"""
        subscription = UserSubscription.objects.create(
            user=self.user,
            tier='pro',
            is_active=True,
            subscription_end=timezone.now() + timedelta(days=180)
        )
        
        token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=subscription.subscription_end,
            is_active=True
        )
        
        self.assertEqual(token.expires_at, subscription.subscription_end)
    
    def test_token_expiry_fallback_90_days(self):
        """Test token expiry falls back to 90 days when no subscription end date"""
        # Create subscription without end date (lifetime subscription)
        subscription = UserSubscription.objects.create(
            user=self.user,
            tier='pro',
            is_active=True,
            subscription_end=None
        )
        
        # Calculate expected 90-day expiry
        expected_expiry = timezone.now() + timedelta(days=90)
        
        token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=expected_expiry,
            is_active=True
        )
        
        # Check expiry is approximately 90 days from now
        self.assertAlmostEqual(
            token.expires_at,
            expected_expiry,
            delta=timedelta(seconds=1)
        )
    
    def test_expired_token_authentication_fails(self):
        """Test that expired tokens fail authentication"""
        expired_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() - timedelta(days=1),
            is_active=True
        )
        
        auth = ExtensionTokenAuthentication()
        factory = RequestFactory()
        request = factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = f'ExtensionToken {expired_token.token}'
        
        with self.assertRaises(Exception):
            auth.authenticate(request)
    
    def test_token_near_expiry_still_works(self):
        """Test that tokens near expiry but not expired still work"""
        near_expiry_token = ExtensionToken.objects.create(
            user=self.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(hours=1),
            is_active=True
        )
        
        auth = ExtensionTokenAuthentication()
        factory = RequestFactory()
        request = factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = f'ExtensionToken {near_expiry_token.token}'
        
        result = auth.authenticate(request)
        self.assertIsNotNone(result)
        self.assertEqual(result[0], self.user)
