from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta

User = get_user_model()

class UserSubscription(models.Model):
    """Track user subscription tiers and limits"""
    
    TIER_CHOICES = [
        ('free', 'Free'),
        ('pro', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='free')
    daily_analysis_limit = models.PositiveIntegerField(default=3)
    brand_sample_limit = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Subscription management
    is_active = models.BooleanField(default=True)
    subscription_start = models.DateTimeField(default=timezone.now)
    subscription_end = models.DateTimeField(null=True, blank=True)

    # Stripe integration fields
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_price_id = models.CharField(max_length=255, blank=True, null=True)

    # Trial management
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    is_trial_active = models.BooleanField(default=False)

    # Payment status
    payment_status = models.CharField(max_length=50, default="active") # active, past_due, cancelled
    next_billing_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_subscriptions'
    
    def __str__(self):
        return f"{self.user.username} - {self.get_tier_display()}"
    
    @property
    def is_subscription_active(self):
        """Check if subscription is currently active"""
        if not self.is_active:
            return False
        if self.subscription_end and self.subscription_end < timezone.now():
            return False
        return True
    
    @property
    def is_on_trial(self):
        """Check if a user is currently on trial"""
        if not self.trial_start or not self.trial_end:
            return False
        return timezone.now() <= self.trial_end and self.is_trial_active
    
    @property
    def days_left_in_trial(self):
        """Get days remaining in trial"""
        if not self.is_on_trial:
            return 0
        return (self.trial_end - timezone.now()).days
    
    @property
    def is_pending_cancellation(self):
        """Check if subscription is marked for cancellation at period end"""
        return self.payment_status == 'cancel_at_period_end'
    
    @property
    def should_have_access(self):
        """Check if user should have access (active subscription or pending cancellation in grace period)"""
        if not self.is_active:
            return False
        
        # User has access if subscription is active or pending cancellation but still in grace period
        if self.payment_status in ['active', 'cancel_at_period_end']:
            if self.next_billing_date and self.next_billing_date > timezone.now():
                return True
        
        # Check trial access
        if self.is_on_trial:
            return True
            
        return False

    @classmethod
    def get_tier_limits(cls, tier):
        """Get the limits for a specific tier"""
        limits = {
            'free': {
                'daily_analysis_limit': 3,
                'brand_sample_limit': 5,
            },
            'pro': {
                'daily_analysis_limit': 50,
                'brand_sample_limit': None,  # Unlimited
            },
            'enterprise': {
                'daily_analysis_limit': None,  # Unlimited
                'brand_sample_limit': None,  # Unlimited
            }
        }
        return limits.get(tier, limits['free'])


class DailyUsage(models.Model):
    """Track daily usage per user"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_usage')
    date = models.DateField(default=timezone.now)
    analysis_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'daily_usage'
        unique_together = ['user', 'date']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.analysis_count} analyses"
    
    @classmethod
    def get_today_usage(cls, user):
        """Get or create today's usage record for a user"""
        today = timezone.now().date()
        usage, created = cls.objects.get_or_create(
            user=user,
            date=today,
            defaults={'analysis_count': 0}
        )
        return usage
    
    @classmethod
    def increment_analysis_count(cls, user):
        """Increment the analysis count for today"""
        usage = cls.get_today_usage(user)
        usage.analysis_count += 1
        usage.save()
        return usage
    
    @classmethod
    def can_perform_analysis(cls, user):
        """Check if user can perform another analysis today"""
        subscription = getattr(user, 'subscription', None)
        if not subscription:
            # Create default free subscription if none exists
            subscription = UserSubscription.objects.create(user=user)
        
        # Check if subscription is active
        if not subscription.is_subscription_active:
            subscription.tier = 'free'  # Downgrade to free if subscription expired
            subscription.daily_analysis_limit = 3
            subscription.save()
        
        # Unlimited for enterprise or if no limit set
        if subscription.daily_analysis_limit is None:
            return True, subscription.daily_analysis_limit
        
        today_usage = cls.get_today_usage(user)
        remaining = subscription.daily_analysis_limit - today_usage.analysis_count
        
        return remaining > 0, remaining


class AnalysisLog(models.Model):
    """Log each analysis request for tracking and debugging"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analysis_logs')
    text_length = models.PositiveIntegerField()
    brand_samples_count = models.PositiveIntegerField()
    alignment_score = models.FloatField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'analysis_logs'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['success']),
        ]
    
    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
