from rest_framework import serializers
from .models import Mission, UserMissionProgress, OnboardingState


class MissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = ['id', 'title', 'description', 'tier', 'mission_type', 'target_count', 'order', 'is_manual']


class UserMissionProgressSerializer(serializers.ModelSerializer):
    mission = MissionSerializer(read_only=True)
    progress_percentage = serializers.ReadOnlyField()
    is_locked = serializers.SerializerMethodField()
    
    class Meta:
        model = UserMissionProgress
        fields = [
            'mission', 'current_count', 'is_completed', 
            'completed_at', 'progress_percentage', 'is_locked'
        ]
    
    def get_is_locked(self, obj):
        """Check if mission is locked based on user's subscription tier"""
        request = self.context.get('request')
        if not request or not request.user:
            return True
        
        user_tier = self._get_user_tier(request.user)
        
        # Free users can't access pro missions
        if obj.mission.tier == 'pro' and user_tier == 'free':
            return True
        return False
    
    def _get_user_tier(self, user):
        from analysis.models import UserSubscription
        subscription = UserSubscription.objects.filter(user=user).first()
        if subscription:
            return subscription.tier
        return 'free'


class OnboardingStateSerializer(serializers.ModelSerializer):
    missions = serializers.SerializerMethodField()
    all_free_completed = serializers.SerializerMethodField()
    all_pro_completed = serializers.SerializerMethodField()
    user_tier = serializers.SerializerMethodField()
    
    class Meta:
        model = OnboardingState
        fields = [
            'is_checklist_collapsed', 'missions', 
            'all_free_completed', 'all_pro_completed', 'user_tier'
        ]
    
    def get_missions(self, obj):
        progress = UserMissionProgress.objects.filter(
            user=obj.user,
            mission__is_active=True
        ).select_related('mission').order_by('mission__tier', 'mission__order')
        
        return UserMissionProgressSerializer(
            progress, many=True, context=self.context
        ).data
    
    def get_all_free_completed(self, obj):
        return not UserMissionProgress.objects.filter(
            user=obj.user,
            mission__tier='free',
            mission__is_active=True,
            is_completed=False
        ).exists()
    
    def get_all_pro_completed(self, obj):
        return not UserMissionProgress.objects.filter(
            user=obj.user,
            mission__tier='pro',
            mission__is_active=True,
            is_completed=False
        ).exists()
    
    def get_user_tier(self, obj):
        from analysis.models import UserSubscription
        subscription = UserSubscription.objects.filter(user=obj.user).first()
        return subscription.tier if subscription else 'free'