from django.db import models
from django.contrib.auth.models import User

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