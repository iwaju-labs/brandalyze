from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Mission(models.Model):
    """Definition of an onboarding mission"""
    
    TIER_CHOICES = [
        ('free', 'Free'),
        ('pro', 'Pro'),
    ]
    
    TYPE_CHOICES = [
        ('discrete', 'Discrete'),
        ('progress', 'Progress'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    tier = models.CharField(max_length=10, choices=TIER_CHOICES)
    mission_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='discrete')
    target_count = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)
    is_manual = models.BooleanField(default=False, help_text="Requires manual completion confirmation")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'onboarding_missions'
        ordering = ['tier', 'order']
    
    def __str__(self):
        return f"[{self.tier}] {self.title}"


class UserMissionProgress(models.Model):
    """Track user progress on missions"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mission_progress')
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name='user_progress')
    current_count = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_mission_progress'
        unique_together = ['user', 'mission']
        indexes = [
            models.Index(fields=['user', 'is_completed']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.mission.title} ({self.current_count}/{self.mission.target_count})"
    
    @property
    def progress_percentage(self):
        if self.mission.target_count == 0:
            return 100
        return min(100, int((self.current_count / self.mission.target_count) * 100))


class OnboardingState(models.Model):
    """Track user's overall onboarding state"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding_state')
    is_checklist_collapsed = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'onboarding_state'
    
    def __str__(self):
        return f"{self.user.username} - Onboarding State"