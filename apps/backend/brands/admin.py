from django.contrib import admin
from django.db.models import Count, Avg
from django.utils.html import format_html

from .models import Brand, BrandSample


class BrandSampleInline(admin.TabularInline):
    model = BrandSample
    extra = 0
    readonly_fields = ['text_preview', 'file_type', 'file_size', 'chunk_index', 'created_at']
    fields = ['text_preview', 'file_type', 'file_size', 'created_at']
    can_delete = True
    max_num = 20

    def text_preview(self, obj):
        if obj.text:
            return obj.text[:150] + "..." if len(obj.text) > 150 else obj.text
        return "-"
    text_preview.short_description = "Text"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'user_email', 'sample_count_display', 'audit_count_display', 'avg_audit_score', 'created_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'user__email', 'user__username', 'description']
    readonly_fields = ['created_at', 'updated_at', 'brand_stats_display']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Brand Info', {
            'fields': ('user', 'name', 'description')
        }),
        ('Statistics', {
            'fields': ('brand_stats_display',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [BrandSampleInline]
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.annotate(
            _sample_count=Count('samples'),
            _audit_count=Count('audits'),
            _avg_score=Avg('audits__score'),
        ).select_related('user')
        return qs
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "User"
    user_email.admin_order_field = 'user__email'
    
    def sample_count_display(self, obj):
        return getattr(obj, '_sample_count', 0)
    sample_count_display.short_description = "Samples"
    sample_count_display.admin_order_field = '_sample_count'
    
    def audit_count_display(self, obj):
        return getattr(obj, '_audit_count', 0)
    audit_count_display.short_description = "Audits"
    audit_count_display.admin_order_field = '_audit_count'
    
    def avg_audit_score(self, obj):
        avg = getattr(obj, '_avg_score', None)
        if avg is not None:
            if avg >= 80:
                color = '#10b981'
            elif avg >= 60:
                color = '#f59e0b'
            else:
                color = '#ef4444'
            return format_html('<span style="color: {}; font-weight: 500;">{:.1f}</span>', color, avg)
        return "-"
    avg_audit_score.short_description = "Avg Score"
    avg_audit_score.admin_order_field = '_avg_score'
    
    def brand_stats_display(self, obj):
        sample_count = obj.samples.count()
        audit_count = obj.audits.count()
        avg_score = obj.audits.aggregate(avg=Avg('score'))['avg']
        
        # Platform breakdown for this brand
        platform_stats = obj.audits.values('platform').annotate(
            count=Count('id')
        ).order_by('-count')
        
        platform_html = ""
        for p in platform_stats:
            platform_html += f"<li>{p['platform']}: {p['count']} audits</li>"
        if not platform_html:
            platform_html = "<li>No audits yet</li>"
        
        return format_html('''
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; padding: 10px 0;">
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">Content</h4>
                    <p style="margin: 5px 0;"><strong>Samples:</strong> {samples}</p>
                    <p style="margin: 5px 0;"><strong>Total Audits:</strong> {audits}</p>
                    <p style="margin: 5px 0;"><strong>Avg Score:</strong> {avg:.1f}</p>
                </div>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">Platform Breakdown</h4>
                    <ul style="margin: 0; padding-left: 20px;">{platforms}</ul>
                </div>
            </div>
        ''',
            samples=sample_count,
            audits=audit_count,
            avg=avg_score or 0,
            platforms=format_html(platform_html)
        )
    brand_stats_display.short_description = "Brand Statistics"


@admin.register(BrandSample)
class BrandSampleAdmin(admin.ModelAdmin):
    list_display = ['id', 'brand_name', 'user_email', 'text_preview', 'file_type', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['brand__name', 'brand__user__email', 'text']
    readonly_fields = ['created_at', 'updated_at', 'embedding']
    date_hierarchy = 'created_at'
    
    def brand_name(self, obj):
        return obj.brand.name
    brand_name.short_description = "Brand"
    brand_name.admin_order_field = 'brand__name'
    
    def user_email(self, obj):
        return obj.brand.user.email
    user_email.short_description = "User"
    user_email.admin_order_field = 'brand__user__email'
    
    def text_preview(self, obj):
        if obj.text:
            return obj.text[:100] + "..." if len(obj.text) > 100 else obj.text
        return "-"
    text_preview.short_description = "Text"
