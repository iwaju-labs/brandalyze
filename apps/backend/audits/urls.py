from django.urls import path
from . import views

urlpatterns = [
    # Main audit endpoint
    path('analyze', views.analyze_post, name='analyze_post'),
    
    # Audit history and details
    path('history', views.audit_history, name='audit_history'),
    path('<int:audit_id>', views.audit_detail, name='audit_detail'),
    
    # Drift alerts
    path('drift-alerts', views.drift_alerts, name='drift_alerts'),
    path('drift-alerts/<int:alert_id>/acknowledge', views.acknowledge_alert, name='acknowledge_alert'),
    
    # Usage stats
    path('usage', views.usage_stats, name='usage_stats'),
]
