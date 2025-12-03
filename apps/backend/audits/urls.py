from django.urls import path
from . import views

app_name = 'audits'

urlpatterns = [
    # Main audit endpoint
    path('analyze/', views.analyze_post, name='analyze'),
    
    # Audit history and details
    path('history/', views.audit_history, name='history'),
    path('<int:audit_id>/', views.audit_detail, name='detail'),
    path('<int:audit_id>/delete/', views.delete_audit, name='delete'),
    path('clear-all/', views.clear_all_audits, name='clear-all'),
    
    # Analytics
    path('analytics/', views.analytics, name='analytics'),
    
    # Drift alerts
    path('drift-alerts/', views.drift_alerts, name='drift-alerts'),
    path('drift-alerts/<int:alert_id>/acknowledge/', views.acknowledge_alert, name='acknowledge-alert'),
    
    # Usage stats
    path('usage/', views.usage_stats, name='usage-stats'),
]
