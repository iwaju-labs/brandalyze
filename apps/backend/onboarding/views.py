from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction

from brands.authentication import ClerkAuthentication
from brands.permissions import ClerkAuthenticated
from brands.utils.responses import error_response, success_response

from .models import Mission, UserMissionProgress, OnboardingState
from .serializers import OnboardingStateSerializer
from .services import OnboardingService


@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def get_onboarding_state(request):
    """Get user's complete onboarding state with all missions"""
    try:
        # Ensure user has onboarding state and mission progress initialized
        OnboardingService.initialize_user_missions(request.user)
        
        # Refresh mission progress from actual data
        OnboardingService.refresh_mission_progress(request.user)
        
        state = OnboardingState.objects.get(user=request.user)
        serializer = OnboardingStateSerializer(state, context={'request': request})
        
        return success_response(data=serializer.data)
    
    except Exception as e:
        return error_response(
            message=f"Failed to get onboarding state: {str(e)}",
            code="ONBOARDING_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def complete_mission(request, mission_id):
    """Manually complete a mission (for manual-only missions)"""
    try:
        mission = Mission.objects.filter(id=mission_id, is_active=True).first()
        
        if not mission:
            return error_response(
                message="Mission not found",
                code="MISSION_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        if not mission.is_manual:
            return error_response(
                message="This mission cannot be manually completed",
                code="MISSION_NOT_MANUAL",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Check tier access
        from analysis.models import UserSubscription
        subscription = UserSubscription.objects.filter(user=request.user).first()
        user_tier = subscription.tier if subscription else 'free'
        
        if mission.tier == 'pro' and user_tier == 'free':
            return error_response(
                message="This mission requires a Pro subscription",
                code="PRO_REQUIRED",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        # Complete the mission
        progress, _ = UserMissionProgress.objects.get_or_create(
            user=request.user,
            mission=mission,
            defaults={'current_count': 0}
        )
        
        if not progress.is_completed:
            progress.current_count = mission.target_count
            progress.is_completed = True
            progress.completed_at = timezone.now()
            progress.save()
        
        return success_response(
            data={'mission_id': mission_id, 'is_completed': True},
            message="Mission completed successfully"
        )
    
    except Exception as e:
        return error_response(
            message=f"Failed to complete mission: {str(e)}",
            code="COMPLETION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def toggle_checklist(request):
    """Toggle checklist collapsed state"""
    try:
        state, _ = OnboardingState.objects.get_or_create(user=request.user)
        state.is_checklist_collapsed = not state.is_checklist_collapsed
        state.save()
        
        return success_response(
            data={'is_collapsed': state.is_checklist_collapsed},
            message="Checklist state updated"
        )
    
    except Exception as e:
        return error_response(
            message=f"Failed to toggle checklist: {str(e)}",
            code="TOGGLE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([ClerkAuthenticated])
def track_page_visit(request):
    """Track page visits for missions like 'View audit history'"""
    try:
        page = request.data.get('page')
        
        if page == 'audit_history':
            OnboardingService.complete_mission(request.user, 'pro_view_history')
        
        return success_response(message="Page visit tracked")
    
    except Exception as e:
        return error_response(
            message=f"Failed to track visit: {str(e)}",
            code="TRACKING_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )