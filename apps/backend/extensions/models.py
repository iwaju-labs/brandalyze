from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ExtensionSession(models.Model):
    """Track extension session for analytics"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_id = models.CharField(max_length=64, unique=True)
    platform = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    analyses = models.IntegerField(default=0)

    class Meta:
        db_table = 'extension_sessions'

class ExtensionAnalysis(models.Model):
    """Track analyses performed through extension"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session = models.ForeignKey(ExtensionSession, on_delete=models.CASCADE, null=True, blank=True)
    platform = models.CharField(max_length=50)
    content_hash = models.CharField(max_length=64)
    brand_id = models.IntegerField(null=True, blank=True)  # Made nullable for profile voice analysis
    alignment_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'extension_analyses'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['content_hash'])
        ]

class ExtensionToken(models.Model):
    """Long-lived tokens for extension authentication"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    auth_code = models.CharField(max_length=32, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'extension_tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['auth_code']),
            models.Index(fields=['user', 'is_active'])
        ]

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def is_valid(self):
        return self.is_active and not self.is_expired()
    
class ProfileAnalysis(models.Model):
    """Store profile voice analysis results"""
    PLATFORM_CHOICES = [
        ('twitter', 'Twitter/X'),
        ('linkedin', 'LinkedIn')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='profile_analyses')
    handle = models.CharField(max_length=100)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    confidence_score = models.FloatField(help_text="Analysis confidence (0-1)")

    voice_analysis = models.JSONField(
        default=dict,
        help_text="Tone, style, content themes, communication patterns"
    )

    emotional_indicators = models.JSONField(
        default=dict,
        help_text="Scores for selected emotional indicators"
    )

    brand_recommendations = models.JSONField(
        default=list,
        help_text="AI-generated brand recommendations"
    )

    post_analyzed = models.IntegerField(default=0)
    bio_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profile_analyses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['platform', 'created_at']),
            models.Index(fields=['handle'])
        ]

    def __str__(self):
        return f"@{self.handle} ({self.platform}) - {self.created_at.date()}"