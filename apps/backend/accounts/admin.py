from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.db.models import Count, Sum, Avg, Max
from django.db.models.functions import Coalesce
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from .models import User
from analysis.models import UserSubscription, DailyUsage, AnalysisLog
from audits.models import PostAudit, AuditUsage
from brands.models import Brand


class SubscriptionInline(admin.StackedInline):
    model = UserSubscription
    can_delete = False
    verbose_name = "Subscription"
    verbose_name_plural = "Subscription"
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Subscription Details', {
            'fields': ('tier', 'is_active', 'payment_status', 'daily_analysis_limit', 'brand_sample_limit')
        }),
        ('Trial', {
            'fields': ('is_trial_active', 'trial_start', 'trial_end'),
            'classes': ('collapse',)
        }),
        ('Stripe', {
            'fields': ('stripe_customer_id', 'stripe_subscription_id', 'next_billing_date'),
            'classes': ('collapse',)
        }),
    )


class RecentAuditsInline(admin.TabularInline):
    model = PostAudit
    extra = 0
    max_num = 10
    can_delete = False
    readonly_fields = ['brand', 'platform', 'score', 'created_at', 'content_preview']
    fields = ['brand', 'platform', 'score', 'content_preview', 'created_at']
    ordering = ['-created_at']
    verbose_name = "Recent Audit"
    verbose_name_plural = "Recent Audits (Last 10)"

    def content_preview(self, obj):
        if obj.content:
            return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content
        return "-"
    content_preview.short_description = "Content"

    def has_add_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('brand')[:10]


class BrandsInline(admin.TabularInline):
    model = Brand
    extra = 0
    can_delete = False
    readonly_fields = ['name', 'sample_count_display', 'created_at', 'updated_at']
    fields = ['name', 'sample_count_display', 'created_at']
    verbose_name = "Brand"
    verbose_name_plural = "Brands"

    def sample_count_display(self, obj):
        return obj.sample_count
    sample_count_display.short_description = "Samples"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        'email', 'username', 'subscription_tier_display', 'total_audits_display',
        'total_brands_display', 'last_activity_display', 'is_active', 'date_joined'
    ]
    list_filter = [
        'is_active', 'is_staff', 'is_superuser', 'date_joined',
        ('subscription__tier', admin.ChoicesFieldListFilter),
        ('subscription__payment_status', admin.ChoicesFieldListFilter),
    ]
    search_fields = ['email', 'username', 'clerk_id']
    ordering = ['-date_joined']
    date_hierarchy = 'date_joined'
    
    readonly_fields = [
        'clerk_id', 'clerk_metadata', 'created_at', 'updated_at', 'date_joined',
        'last_login', 'usage_stats_display'
    ]
    
    fieldsets = (
        ('User Info', {
            'fields': ('username', 'email', 'password')
        }),
        ('Clerk Integration', {
            'fields': ('clerk_id', 'clerk_metadata'),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Usage Statistics', {
            'fields': ('usage_stats_display',),
            'description': 'Overview of user activity and usage'
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
    )
    
    inlines = [SubscriptionInline, BrandsInline, RecentAuditsInline]
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.annotate(
            _total_audits=Count('post_audits'),
            _total_brands=Count('brands'),
            _avg_score=Avg('post_audits__score'),
            _last_audit=Max('post_audits__created_at'),
        ).select_related('subscription')
        return qs
    
    def subscription_tier_display(self, obj):
        try:
            tier = obj.subscription.tier
            colors = {
                'free': '#6b7280',
                'pro': '#3b82f6',
                'enterprise': '#8b5cf6'
            }
            color = colors.get(tier, '#6b7280')
            return format_html(
                '<span style="background-color: {}; color: white; padding: 2px 8px; '
                'border-radius: 4px; font-size: 11px; font-weight: 500;">{}</span>',
                color, tier.upper()
            )
        except UserSubscription.DoesNotExist:
            return format_html(
                '<span style="background-color: #6b7280; color: white; padding: 2px 8px; '
                'border-radius: 4px; font-size: 11px;">FREE</span>'
            )
    subscription_tier_display.short_description = "Tier"
    subscription_tier_display.admin_order_field = 'subscription__tier'
    
    def total_audits_display(self, obj):
        count = getattr(obj, '_total_audits', 0)
        return count
    total_audits_display.short_description = "Audits"
    total_audits_display.admin_order_field = '_total_audits'
    
    def total_brands_display(self, obj):
        count = getattr(obj, '_total_brands', 0)
        return count
    total_brands_display.short_description = "Brands"
    total_brands_display.admin_order_field = '_total_brands'
    
    def last_activity_display(self, obj):
        last_audit = getattr(obj, '_last_audit', None)
        if last_audit:
            days_ago = (timezone.now() - last_audit).days
            if days_ago == 0:
                return format_html('<span style="color: #10b981;">Today</span>')
            elif days_ago <= 7:
                return format_html('<span style="color: #3b82f6;">{} days ago</span>', days_ago)
            elif days_ago <= 30:
                return format_html('<span style="color: #f59e0b;">{} days ago</span>', days_ago)
            else:
                return format_html('<span style="color: #ef4444;">{} days ago</span>', days_ago)
        return format_html('<span style="color: #6b7280;">Never</span>')
    last_activity_display.short_description = "Last Activity"
    last_activity_display.admin_order_field = '_last_audit'
    
    def usage_stats_display(self, obj):
        try:
            # Get subscription info
            subscription = obj.subscription
            tier = subscription.tier
            payment_status = subscription.payment_status
        except UserSubscription.DoesNotExist:
            tier = "free"
            payment_status = "N/A"
        
        # Get audit stats
        total_audits = obj.post_audits.count()
        avg_score = obj.post_audits.aggregate(avg=Avg('score'))['avg'] or 0
        
        # Get time-based stats
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        audits_today = obj.post_audits.filter(created_at__date=today).count()
        audits_week = obj.post_audits.filter(created_at__date__gte=week_ago).count()
        audits_month = obj.post_audits.filter(created_at__date__gte=month_ago).count()
        
        # Get brand stats
        brands_count = obj.brands.count()
        total_samples = Brand.objects.filter(user=obj).annotate(
            sc=Count('samples')
        ).aggregate(total=Sum('sc'))['total'] or 0
        
        # Platform breakdown
        platform_stats = obj.post_audits.values('platform').annotate(
            count=Count('id')
        ).order_by('-count')
        
        platform_html = ""
        for p in platform_stats:
            platform_html += f"<li>{p['platform']}: {p['count']} audits</li>"
        if not platform_html:
            platform_html = "<li>No audits yet</li>"
        
        return format_html('''
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 10px 0;">
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">Subscription</h4>
                    <p style="margin: 5px 0;"><strong>Tier:</strong> {tier}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> {status}</p>
                </div>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">Audit Stats</h4>
                    <p style="margin: 5px 0;"><strong>Total:</strong> {total}</p>
                    <p style="margin: 5px 0;"><strong>Avg Score:</strong> {avg:.1f}</p>
                    <p style="margin: 5px 0;"><strong>Today:</strong> {today_count}</p>
                    <p style="margin: 5px 0;"><strong>This Week:</strong> {week_count}</p>
                    <p style="margin: 5px 0;"><strong>This Month:</strong> {month_count}</p>
                </div>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">Content</h4>
                    <p style="margin: 5px 0;"><strong>Brands:</strong> {brands}</p>
                    <p style="margin: 5px 0;"><strong>Samples:</strong> {samples}</p>
                    <h4 style="margin: 10px 0 5px 0; color: #374151;">Platforms</h4>
                    <ul style="margin: 0; padding-left: 20px;">{platforms}</ul>
                </div>
            </div>
        ''',
            tier=tier.upper(),
            status=payment_status,
            total=total_audits,
            avg=avg_score,
            today_count=audits_today,
            week_count=audits_week,
            month_count=audits_month,
            brands=brands_count,
            samples=total_samples,
            platforms=format_html(platform_html)
        )
    usage_stats_display.short_description = "Usage Statistics"
    
    actions = ['export_user_stats', 'reset_daily_usage', 'upgrade_to_pro_trial']
    
    def export_user_stats(self, request, queryset):
        """Export selected users' stats (placeholder for CSV export)"""
        count = queryset.count()
        self.message_user(request, f"Would export stats for {count} user(s). Implement CSV export as needed.")
    export_user_stats.short_description = "Export user statistics"
    
    def reset_daily_usage(self, request, queryset):
        """Reset daily usage counters for selected users"""
        today = timezone.now().date()
        count = 0
        for user in queryset:
            DailyUsage.objects.filter(user=user, date=today).update(analysis_count=0)
            AuditUsage.objects.filter(user=user, date=today).update(audit_count=0)
            count += 1
        self.message_user(request, f"Reset daily usage for {count} user(s).")
    reset_daily_usage.short_description = "Reset daily usage counters"
    
    def upgrade_to_pro_trial(self, request, queryset):
        """Give selected users a 14-day Pro trial"""
        now = timezone.now()
        trial_end = now + timedelta(days=14)
        count = 0
        for user in queryset:
            subscription, _ = UserSubscription.objects.get_or_create(user=user)
            if subscription.tier == 'free':
                subscription.tier = 'pro'
                subscription.is_trial_active = True
                subscription.trial_start = now
                subscription.trial_end = trial_end
                subscription.daily_analysis_limit = 50
                subscription.save()
                count += 1
        self.message_user(request, f"Upgraded {count} user(s) to Pro trial (14 days).")
    upgrade_to_pro_trial.short_description = "Give 14-day Pro trial"
