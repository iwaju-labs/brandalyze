from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator
from django.utils import timezone

User = get_user_model()

class Brand(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='brands')
    name = models.CharField(max_length=100, validators=[MinLengthValidator(2)])
    description = models.TextField(
        blank=True, 
        null=True,
        help_text="Optional description of the brand, its values, or key characteristics"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', 'name']
        unique_together = ['user', 'name']  # Prevent duplicate brand names per user

    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    @property
    def sample_count(self):
        """Return the number of samples for this brand"""
        return self.samples.count()
    
    @property
    def total_text_length(self):
        """Return the total length of all text samples"""
        return sum(len(sample.text) for sample in self.samples.all())
    
    def get_recent_samples(self, limit=5):
        """Get the most recent samples for this brand"""
        return self.samples.order_by('-created_at')[:limit]


class BrandSample(models.Model):
    """
    Text samples extracted from brand documents
    """
    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF Document'),
        ('docx', 'Word Document'),
        ('txt', 'Text File'),
        ('md', 'Markdown File'),
    ]
    
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='samples')
    text = models.TextField(validators=[MinLengthValidator(5)])
    
    # File tracking fields
    file_ref = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Reference to the original uploaded file"
    )
    file_type = models.CharField(
        max_length=10, 
        choices=FILE_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text="Type of the original file this sample was extracted from"
    )
    file_size = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Size of the original file in bytes"
    )
    
    # Text chunk information
    chunk_index = models.PositiveIntegerField(
        default=0,
        help_text="Index of this chunk within the original document (0 for single chunk)"
    )
    total_chunks = models.PositiveIntegerField(
        default=1,
        help_text="Total number of chunks the original document was split into"
    )
    
    # AI fields
    embedding = models.JSONField(
        null=True, 
        blank=True,
        help_text="Vector embedding for semantic search"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['brand', '-created_at']),
            models.Index(fields=['file_ref']),
            models.Index(fields=['file_type']),
        ]

    def __str__(self):
        preview = self.text[:50] + "..." if len(self.text) > 50 else self.text
        return f"{self.brand.name} - {preview}"
    
    @property
    def text_length(self):
        """Return the length of the text content"""
        return len(self.text)
    
    @property
    def text_preview(self):
        """Return a preview of the text content"""
        return self.text[:100] + "..." if len(self.text) > 100 else self.text
    
    @property
    def is_multi_chunk(self):
        """Return True if this sample is part of a multi-chunk document"""
        return self.total_chunks > 1
    
    def get_related_chunks(self):
        """Get all chunks from the same original file"""
        if not self.file_ref:
            return BrandSample.objects.none()
        return BrandSample.objects.filter(
            brand=self.brand,
            file_ref=self.file_ref
        ).order_by('chunk_index')
    
    @classmethod
    def create_from_file(cls, brand, text_chunks, file_info):
        """
        Utility method to create multiple samples from a file
        
        Args:
            brand: Brand instance
            text_chunks: List of text strings
            file_info: Dict with file metadata (name, type, size)
        
        Returns:
            List of created BrandSample instances
        """
        samples = []
        total_chunks = len(text_chunks)
        
        for i, chunk_text in enumerate(text_chunks):
            if chunk_text.strip():  # Only create non-empty samples
                sample = cls.objects.create(
                    brand=brand,
                    text=chunk_text.strip(),
                    file_ref=file_info.get('name'),
                    file_type=file_info.get('type'),
                    file_size=file_info.get('size'),
                    chunk_index=i,
                    total_chunks=total_chunks
                )
                samples.append(sample)
        
        return samples