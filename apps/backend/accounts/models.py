from django.contrib.auth.models import AbstractUser
from django.db import models
import json

class User(AbstractUser):
    """Custom user model with Clerk integration"""
    
    # Clerk integration fields
    clerk_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    clerk_metadata = models.JSONField(default=dict, blank=True)
    
    # Additional user fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Ensure clerk_metadata is a dict
        if not isinstance(self.clerk_metadata, dict):
            self.clerk_metadata = {}
        super().save(*args, **kwargs)
    
    def is_admin(self):
        """Check if user has admin privileges"""
        return self.clerk_metadata.get('role') == 'admin'
    
    def get_subscription_tier(self):
        """Get subscription tier from Clerk metadata"""
        return self.clerk_metadata.get('subscription_tier', 'free')
    
    def update_clerk_metadata(self, metadata):
        """Update Clerk metadata"""
        if isinstance(metadata, dict):
            self.clerk_metadata.update(metadata)
        else:
            self.clerk_metadata = metadata if metadata else {}
        self.save()
    
    def __str__(self):
        return self.email or self.username or f"User {self.id}"
