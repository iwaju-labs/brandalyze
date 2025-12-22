from django.urls import path
from . import views

urlpatterns = [
    path('state/', views.get_onboarding_state, name='onboarding-state'),
    path('missions/<str:mission_id>/complete/', views.complete_mission, name='complete-mission'),
    path('toggle-checklist/', views.toggle_checklist, name='toggle-checklist'),
    path('track-visit/', views.track_page_visit, name='track-page-visit'),
]