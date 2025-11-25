from django.contrib import admin
from .models import PostAudit, AuditMetrics, DriftAlert, AuditUsage


@admin.register(PostAudit)
class PostAuditAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'brand', 'platform', 'score', 'created_at']
    list_filter = ['platform', 'created_at']
    search_fields = ['user__email', 'brand__name', 'content']
    readonly_fields = ['created_at', 'content_embedding']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'brand', 'platform', 'score', 'created_at')
        }),
        ('Content', {
            'fields': ('content', 'context')
        }),
        ('Technical', {
            'fields': ('content_embedding',),
            'classes': ('collapse',)
        }),
    )


@admin.register(AuditMetrics)
class AuditMetricsAdmin(admin.ModelAdmin):
    list_display = ['audit', 'tone_match', 'vocabulary_consistency', 'emotional_alignment', 'style_deviation']
    readonly_fields = ['audit']
    
    fieldsets = (
        ('Scores', {
            'fields': ('audit', 'tone_match', 'vocabulary_consistency', 'emotional_alignment', 'style_deviation')
        }),
        ('Details', {
            'fields': ('deviations', 'x_optimization', 'ai_feedback')
        }),
    )


@admin.register(DriftAlert)
class DriftAlertAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'brand', 'severity', 'acknowledged', 'detected_at']
    list_filter = ['severity', 'acknowledged', 'detected_at']
    search_fields = ['user__email', 'brand__name', 'message']
    readonly_fields = ['detected_at', 'acknowledged_at']
    date_hierarchy = 'detected_at'
    
    actions = ['mark_as_acknowledged']
    
    def mark_as_acknowledged(self, request, queryset):
        for alert in queryset:
            alert.acknowledge()
        self.message_user(request, f'{queryset.count()} alert(s) marked as acknowledged.')
    mark_as_acknowledged.short_description = "Mark selected alerts as acknowledged"


@admin.register(AuditUsage)
class AuditUsageAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'audit_count']
    list_filter = ['date']
    search_fields = ['user__email']
    readonly_fields = ['date']
    date_hierarchy = 'date'
