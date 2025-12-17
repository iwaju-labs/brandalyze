from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from brands.models import Brand

User = get_user_model()


def get_current_date():
    """Return current date for AuditUsage default"""
    return timezone.now().date()

class PostAudit(models.Model):
    """Individual audit for a piece of content"""
    PLATFORM_CHOICES = [
        ('twitter', 'Twitter/X'),
        ('linkedin', 'LinkedIn'),
        ('other', 'Other')
        # more to come later
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_audits')
    brand = models.ForeignKey(
        Brand,
        on_delete=models.CASCADE,
        related_name='audits',
        help_text="Brand profile used for this audit"
    )
    content = models.TextField(help_text="The content that was audited")
    platform = models.CharField(
        max_length=20,
        help_text="platform chosen from platform choices",
        choices=PLATFORM_CHOICES    
    )
    score = models.FloatField(help_text="Overall brand voice alignment score (0-100)", null=True, blank=True, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    # context from chrome extension
    context = models.JSONField(
        default=dict,
        help_text="Additional context (has_media, is_thread, etc)"
    )

    content_embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Vector embedding of audited content"
    )

    class Meta:
        db_table = 'post_audits'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['brand', '-created_at']),
            models.Index(fields=['platform', '-created_at']),
            models.Index(fields=['score'])
        ]
        verbose_name = 'Post Audit'
        verbose_name_plural = 'Post Audits'

    def __str__(self):
        return f"{self.user.email} - {self.platform} - Score: {self.score}"

class AuditMetrics(models.Model):
    """Detailed breakdown of audit scores"""
    audit = models.OneToOneField(PostAudit, on_delete=models.CASCADE, related_name='metrics')

    # core scoring components
    tone_match = models.FloatField(help_text="How well tone matches brand voice")
    vocabulary_consistency = models.FloatField(help_text="Vocabulary alignment score")
    emotional_alignment = models.FloatField(help_text="Emotional tone alignment")
    style_deviation = models.FloatField(help_text="Style consistency score")

    # detailed findings
    deviations = models.JSONField(
        default=list,
        help_text="List of specific deviations found"
    )

    x_optimization = models.JSONField(
        null=True,
        blank=True,
        help_text="X/Twitter specific optimization tips"
    )

    ai_feedback = models.TextField(
        blank=True,
        null=True,
        help_text="AI-generated suggestions"
    )

    metric_tips = models.JSONField(
        default=dict,
        blank=True,
        help_text="Improvement tips for each metric"
    )

    class Meta:
        db_table = 'audit_metrics'
        verbose_name = 'Audit Metrics'
        verbose_name_plural = 'Audit Metrics'

    def __str__(self):
        return f"Metrics for Audit #{self.audit.id}"

class DriftAlert(models.Model):
    """Alerts when brand voice consistency drifts"""
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='drift_alerts')
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='drift_alerts')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    message = models.TextField(help_text="Alert message describing the drift")
    detected_at = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    related_audits=models.ManyToManyField(PostAudit, related_name='drift_alerts')
    threshold_breached=models.FloatField(
        help_text="The score threshold that triggered this alert"
    )

    class Meta:
        db_table = 'drift_alerts'
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['user', '-detected_at']),
            models.Index(fields=['brand', '-detected_at']),
            models.Index(fields=['acknowledged'])
        ]
        verbose_name = 'Drift Alert'
        verbose_name_plural = 'Drift Alerts'

    def __str__(self):
        status = "Acknowledged" if self.acknowledged else "Pending"
        return f"{self.user.email} - {self.severity.upper()} - {status}"
    
    def acknowledge(self):
        """Mark alert as acknowledged"""
        from django.utils import timezone
        self.acknowledged = True
        self.acknowledged_at = timezone.now()
        self.save()

class AuditUsage(models.Model):
    """Track audit usage for subscription tiers (extends DailyUsage pattern)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_usage')
    date = models.DateField(default=get_current_date)
    audit_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'audit_usage'
        unique_together = ['user', 'date']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.date} - {self.audit_count} audits"
    
    @classmethod
    def can_perform_audit(cls, user):
        """Check if the user can perform another audit"""
        from analysis.models import UserSubscription

        subscription = UserSubscription.objects.filter(user=user).first()
        if subscription and subscription.tier in ['pro', 'enterprise']:
            return True, None
        
        return False, 0
        
    @classmethod
    def increment_audit_count(cls, user):
        """Increment audit count for today"""
        from django.utils import timezone
        today = timezone.now().date()
        usage, _ = cls.objects.get_or_create(user=user, date=today)
        usage.audit_count += 1
        usage.save()
        return usage