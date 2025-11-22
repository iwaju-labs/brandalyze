from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
from brands.models import Brand

User = get_user_model()

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
    score = models.FloatField(help_text="Overall brand voice alignment score (0-100)")
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
        verbose_name = 'Post Audit',
        verbose_name_plural = 'Post Audits'

    def __str__(self):
        return f"{self.user.email} - {self.platform} - Score: {self.score}"

class AuditMetrics:
    """Detailed breakdown of audit scores"""
    audit = models.OneToOneField(PostAudit, on_delete=models.CASCADE, related_name='metrics')

    # core scoring components
    tone_match = models.FloatField(help_text="How well tone matches brand voice")
    vocabulary_consistency = models.FloatField(help_text="Vocabulary alignment score")
    emotional_alignment = models.FloatField(help_text="Emotional tone alignment")
    style_deviation = models.FloatField(help_text="Style consistency score")

    # detailed findings
    deviations = models.JSONField(
        default=dict,
        help_text="List of specific deviations found"
    )

    x_optimization = models.JSONField(
        null=True,
        blank=True,
        help_text="X/Twittter specific optimizaion tips"
    )

    ai_feedback = models.TextField(
        blank=True,
        null=True,
        help_text="AI_generated suggestions"
    )

    class Meta:
        db_table = 'audit_metrics'
        verbose_name = 'Audit Metrics'
        verbose_name_plural = 'Audit Metrics'

    def __str__(self):
        return f"Metrics for Audit #{self.audit.id}"