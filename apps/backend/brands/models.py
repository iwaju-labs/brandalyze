from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Brand(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='brands')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    
class BrandSample(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='samples')
    text = models.TextField()
    embedding = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)