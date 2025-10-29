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