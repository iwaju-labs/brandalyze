from django.contrib import admin
from .models import UserSubscription, DailyUsage, AnalysisLog

@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'tier', 'payment_status', 'is_trial_active', 'trial_start', 'trial_end', 'created_at']
    list_filter = ['tier', 'payment_status', 'is_trial_active', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User Info', {
            'fields': ('user',)
        }),
        ('Subscription', {
            'fields': ('tier', 'daily_analysis_limit', 'brand_sample_limit', 'is_active', 'payment_status')
        }),
        ('Trial', {
            'fields': ('is_trial_active', 'trial_start', 'trial_end')
        }),
        ('Stripe', {
            'fields': ('stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id', 'next_billing_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(DailyUsage)
class DailyUsageAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'analysis_count', 'created_at']
    list_filter = ['date', 'created_at']
    search_fields = ['user__username', 'user__email']

@admin.register(AnalysisLog)
class AnalysisLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'success', 'text_length', 'alignment_score', 'created_at']
    list_filter = ['success', 'created_at']
    search_fields = ['user__username', 'user__email']
