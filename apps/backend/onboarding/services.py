from django.utils import timezone
from django.db import transaction
from .models import Mission, UserMissionProgress, OnboardingState


class OnboardingService:
    """Service class for onboarding operations"""
    
    @classmethod
    def initialize_user_missions(cls, user):
        """Initialize onboarding state and mission progress for a user"""
        with transaction.atomic():
            # Create onboarding state
            OnboardingState.objects.get_or_create(user=user)
            
            # Create progress entries for all active missions
            active_missions = Mission.objects.filter(is_active=True)
            for mission in active_missions:
                UserMissionProgress.objects.get_or_create(
                    user=user,
                    mission=mission,
                    defaults={'current_count': 0}
                )
    
    @classmethod
    def refresh_mission_progress(cls, user):
        """Refresh mission progress based on actual user data"""
        from analysis.models import AnalysisLog
        from audits.models import PostAudit
        from extensions.models import ExtensionToken, ProfileAnalysis
        from brands.models import Brand
        
        with transaction.atomic():
            # Free tier missions
            
            # free_first_sample & free_three_samples - based on AnalysisLog count
            analysis_count = AnalysisLog.objects.filter(user=user).count()
            cls._update_progress(user, 'free_first_sample', min(analysis_count, 1))
            cls._update_progress(user, 'free_three_samples', min(analysis_count, 3))
            
            # free_first_analysis - successful analysis
            successful_analysis = AnalysisLog.objects.filter(user=user, success=True).exists()
            cls._update_progress(user, 'free_first_analysis', 1 if successful_analysis else 0)
            
            # Pro tier missions
            
            # pro_first_audit - PostAudit exists
            has_audit = PostAudit.objects.filter(user=user).exists()
            cls._update_progress(user, 'pro_first_audit', 1 if has_audit else 0)
            
            # pro_install_extension & pro_auth_extension - ExtensionToken exists and active
            extension_token = ExtensionToken.objects.filter(user=user).first()
            cls._update_progress(user, 'pro_install_extension', 1 if extension_token else 0)
            cls._update_progress(user, 'pro_auth_extension', 1 if extension_token and extension_token.is_active else 0)
            
            # pro_first_profile - ProfileAnalysis exists
            has_profile = ProfileAnalysis.objects.filter(user=user).exists()
            cls._update_progress(user, 'pro_first_profile', 1 if has_profile else 0)
            
            # pro_profile_audit - PostAudit with profile-based brand
            # Profile-based brands have names matching "@handle" pattern
            profile_brands = Brand.objects.filter(
                user=user,
                name__startswith='@'
            ).values_list('id', flat=True)
            has_profile_audit = PostAudit.objects.filter(
                user=user,
                brand_id__in=profile_brands
            ).exists()
            cls._update_progress(user, 'pro_profile_audit', 1 if has_profile_audit else 0)
    
    @classmethod
    def _update_progress(cls, user, mission_id, count):
        """Update progress for a specific mission"""
        try:
            progress = UserMissionProgress.objects.filter(
                user=user,
                mission_id=mission_id
            ).select_related('mission').first()
            
            if not progress:
                return
            
            # Don't update if already completed
            if progress.is_completed:
                return
            
            progress.current_count = count
            
            # Check if mission is now complete
            if count >= progress.mission.target_count:
                progress.is_completed = True
                progress.completed_at = timezone.now()
            
            progress.save()
        
        except Exception:
            pass  # Silently fail for individual mission updates
    
    @classmethod
    def complete_mission(cls, user, mission_id):
        """Manually complete a specific mission"""
        try:
            progress = UserMissionProgress.objects.filter(
                user=user,
                mission_id=mission_id
            ).select_related('mission').first()
            
            if progress and not progress.is_completed:
                progress.current_count = progress.mission.target_count
                progress.is_completed = True
                progress.completed_at = timezone.now()
                progress.save()
                return True
        except Exception:
            pass
        return False
    
    @classmethod
    def increment_mission(cls, user, mission_id, amount=1):
        """Increment progress for a mission"""
        try:
            progress = UserMissionProgress.objects.filter(
                user=user,
                mission_id=mission_id
            ).select_related('mission').first()
            
            if progress and not progress.is_completed:
                progress.current_count = min(
                    progress.current_count + amount,
                    progress.mission.target_count
                )
                
                if progress.current_count >= progress.mission.target_count:
                    progress.is_completed = True
                    progress.completed_at = timezone.now()
                
                progress.save()
                return True
        except Exception:
            pass
        return False