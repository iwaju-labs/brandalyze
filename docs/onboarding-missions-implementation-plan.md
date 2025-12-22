# Onboarding Missions Implementation Plan

## Overview

An onboarding missions system to guide users through Brandalyze features based on their subscription tier. Missions are non-linear, plan-aware, and tracked via a floating checklist UI.

## Requirements Summary

| Aspect | Decision |
|--------|----------|
| Mission order | Non-linear, any order |
| Plan awareness | Pro missions locked for free users (greyed + lock icon + "Upgrade to Pro") |
| Completion detection | Backend-detected (automatic), with manual fallback for extension settings |
| Progress indicators | Checkmarks for discrete tasks, progress bars for cumulative tasks |
| Dismissibility | Not skippable, resurfaces until complete |
| Resurface behavior | Floating icon when closed, reappears on login |
| Cumulative missions | Lifetime totals |
| Completion state | Show "completed" state + upsell prompt for free users |
| UI | Floating checklist |

---

## Mission Definitions

### Free Tier Missions

| ID | Mission | Type | Target | Detection Method |
|----|---------|------|--------|------------------|
| `free_first_sample` | Add your first brand sample | Discrete | 1 | `AnalysisLog` count >= 1 |
| `free_three_samples` | Add 3 brand samples | Progress | 3 | `AnalysisLog` count (capped at 3) |
| `free_first_analysis` | Run your first brand alignment analysis | Discrete | 1 | `AnalysisLog` exists with `success=True` |

### Pro Tier Missions (Locked for Free Users)

| ID | Mission | Type | Target | Detection Method |
|----|---------|------|--------|------------------|
| `pro_first_audit` | Run your first post audit | Discrete | 1 | `PostAudit` exists for user |
| `pro_view_history` | View your audit history | Discrete | 1 | API call to `/audits/history/` tracked |
| `pro_install_extension` | Install the Chrome extension | Discrete | 1 | `ExtensionToken` exists for user |
| `pro_auth_extension` | Authenticate the extension | Discrete | 1 | `ExtensionToken` with `is_active=True` |
| `pro_config_emotions` | Configure emotional indicators | Discrete | 1 | Manual confirmation |
| `pro_add_handles` | Add your social handle(s) | Discrete | 1 | Manual confirmation |
| `pro_first_profile` | Run your first profile analysis | Discrete | 1 | `ProfileAnalysis` exists for user |
| `pro_profile_audit` | Run a post audit using profile analysis | Discrete | 1 | `PostAudit` linked to profile-based brand |

---

## Backend Implementation

### 1. Create Onboarding App

```bash
cd apps/backend
python manage.py startapp onboarding
```

Add to `INSTALLED_APPS` in `settings.py`:

```python
INSTALLED_APPS = [
    # ...
    'onboarding',
]
```

### 2. Models

**File: `apps/backend/onboarding/models.py`**

```python
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Mission(models.Model):
    """Definition of an onboarding mission"""
    
    TIER_CHOICES = [
        ('free', 'Free'),
        ('pro', 'Pro'),
    ]
    
    TYPE_CHOICES = [
        ('discrete', 'Discrete'),
        ('progress', 'Progress'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    tier = models.CharField(max_length=10, choices=TIER_CHOICES)
    mission_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='discrete')
    target_count = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)
    is_manual = models.BooleanField(default=False, help_text="Requires manual completion confirmation")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'onboarding_missions'
        ordering = ['tier', 'order']
    
    def __str__(self):
        return f"[{self.tier}] {self.title}"


class UserMissionProgress(models.Model):
    """Track user progress on missions"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mission_progress')
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name='user_progress')
    current_count = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_mission_progress'
        unique_together = ['user', 'mission']
        indexes = [
            models.Index(fields=['user', 'is_completed']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.mission.title} ({self.current_count}/{self.mission.target_count})"
    
    @property
    def progress_percentage(self):
        if self.mission.target_count == 0:
            return 100
        return min(100, int((self.current_count / self.mission.target_count) * 100))


class OnboardingState(models.Model):
    """Track user's overall onboarding state"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding_state')
    is_checklist_collapsed = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'onboarding_state'
    
    def __str__(self):
        return f"{self.user.username} - Onboarding State"
```

### 3. Serializers

**File: `apps/backend/onboarding/serializers.py`**

```python
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
```

### 4. Views

**File: `apps/backend/onboarding/views.py`**

```python
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
```

### 5. Services

**File: `apps/backend/onboarding/services.py`**

```python
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
```

### 6. URLs

**File: `apps/backend/onboarding/urls.py`**

```python
from django.urls import path
from . import views

urlpatterns = [
    path('state/', views.get_onboarding_state, name='onboarding-state'),
    path('missions/<str:mission_id>/complete/', views.complete_mission, name='complete-mission'),
    path('toggle-checklist/', views.toggle_checklist, name='toggle-checklist'),
    path('track-visit/', views.track_page_visit, name='track-page-visit'),
]
```

**Add to main `urls.py` in `brandalyze_backend/urls.py`:**

```python
urlpatterns = [
    # ... existing paths
    path('api/onboarding/', include('onboarding.urls')),
]
```

### 7. Data Migration for Default Missions

**File: `apps/backend/onboarding/migrations/0002_seed_missions.py`**

```python
from django.db import migrations


def seed_missions(apps, schema_editor):
    Mission = apps.get_model('onboarding', 'Mission')
    
    missions = [
        # Free tier
        {
            'id': 'free_first_sample',
            'title': 'Add your first brand sample',
            'description': 'Paste text content that represents your brand voice into the analysis form.',
            'tier': 'free',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 1,
            'is_manual': False,
        },
        {
            'id': 'free_three_samples',
            'title': 'Add 3 brand samples',
            'description': 'Build a stronger brand profile by adding multiple samples.',
            'tier': 'free',
            'mission_type': 'progress',
            'target_count': 3,
            'order': 2,
            'is_manual': False,
        },
        {
            'id': 'free_first_analysis',
            'title': 'Run your first brand alignment analysis',
            'description': 'Compare new content against your brand samples to check alignment.',
            'tier': 'free',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 3,
            'is_manual': False,
        },
        # Pro tier
        {
            'id': 'pro_first_audit',
            'title': 'Run your first post audit',
            'description': 'Audit a social media post for brand voice alignment.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 1,
            'is_manual': False,
        },
        {
            'id': 'pro_view_history',
            'title': 'View your audit history',
            'description': 'Review past audits to track your brand consistency over time.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 2,
            'is_manual': False,
        },
        {
            'id': 'pro_install_extension',
            'title': 'Install the Chrome extension',
            'description': 'Get real-time brand voice feedback directly in Twitter and LinkedIn.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 3,
            'is_manual': False,
        },
        {
            'id': 'pro_auth_extension',
            'title': 'Authenticate the extension',
            'description': 'Connect your extension to your Brandalyze account.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 4,
            'is_manual': False,
        },
        {
            'id': 'pro_config_emotions',
            'title': 'Configure emotional indicators',
            'description': 'Set your preferred emotional indicators in extension settings.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 5,
            'is_manual': True,
        },
        {
            'id': 'pro_add_handles',
            'title': 'Add your social handle(s)',
            'description': 'Add your Twitter or LinkedIn handles in extension settings.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 6,
            'is_manual': True,
        },
        {
            'id': 'pro_first_profile',
            'title': 'Run your first profile analysis',
            'description': 'Analyze your social media profile to extract your voice patterns.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 7,
            'is_manual': False,
        },
        {
            'id': 'pro_profile_audit',
            'title': 'Run a post audit using profile analysis',
            'description': 'Use your analyzed profile as the brand voice for a post audit.',
            'tier': 'pro',
            'mission_type': 'discrete',
            'target_count': 1,
            'order': 8,
            'is_manual': False,
        },
    ]
    
    for mission_data in missions:
        Mission.objects.update_or_create(
            id=mission_data['id'],
            defaults=mission_data
        )


def reverse_seed(apps, schema_editor):
    Mission = apps.get_model('onboarding', 'Mission')
    Mission.objects.all().delete()


class Migration(migrations.Migration):
    
    dependencies = [
        ('onboarding', '0001_initial'),
    ]
    
    operations = [
        migrations.RunPython(seed_missions, reverse_seed),
    ]
```

---

## Frontend Implementation

### 1. Types

**File: `apps/frontend/src/types/onboarding.ts`**

```typescript
export interface Mission {
  id: string;
  title: string;
  description: string;
  tier: 'free' | 'pro';
  mission_type: 'discrete' | 'progress';
  target_count: number;
  order: number;
  is_manual: boolean;
}

export interface MissionProgress {
  mission: Mission;
  current_count: number;
  is_completed: boolean;
  completed_at: string | null;
  progress_percentage: number;
  is_locked: boolean;
}

export interface OnboardingState {
  is_checklist_collapsed: boolean;
  missions: MissionProgress[];
  all_free_completed: boolean;
  all_pro_completed: boolean;
  user_tier: 'free' | 'pro' | 'enterprise';
}
```

### 2. API Functions

**File: `apps/frontend/src/lib/onboarding-api.ts`**

```typescript
import { authenticatedFetch } from './api';
import type { OnboardingState } from '@/types/onboarding';

export async function getOnboardingState(
  getToken: () => Promise<string | null>
): Promise<OnboardingState> {
  const response = await authenticatedFetch('/onboarding/state/', getToken);
  return response.data;
}

export async function completeMission(
  missionId: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  await authenticatedFetch(`/onboarding/missions/${missionId}/complete/`, getToken, {
    method: 'POST',
  });
}

export async function toggleChecklist(
  getToken: () => Promise<string | null>
): Promise<{ is_collapsed: boolean }> {
  const response = await authenticatedFetch('/onboarding/toggle-checklist/', getToken, {
    method: 'POST',
  });
  return response.data;
}

export async function trackPageVisit(
  page: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  await authenticatedFetch('/onboarding/track-visit/', getToken, {
    method: 'POST',
    body: JSON.stringify({ page }),
  });
}
```

### 3. Onboarding Context

**File: `apps/frontend/src/contexts/OnboardingContext.tsx`**

```tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { getOnboardingState, completeMission, toggleChecklist } from '@/lib/onboarding-api';
import type { OnboardingState, MissionProgress } from '@/types/onboarding';

interface OnboardingContextType {
  state: OnboardingState | null;
  isLoading: boolean;
  error: string | null;
  refreshState: () => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  toggleCollapsed: () => Promise<void>;
  freeMissions: MissionProgress[];
  proMissions: MissionProgress[];
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    if (!isSignedIn) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await getOnboardingState(getToken);
      setState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding state');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const handleCompleteMission = useCallback(async (missionId: string) => {
    try {
      await completeMission(missionId, getToken);
      await refreshState();
    } catch (err) {
      console.error('Failed to complete mission:', err);
    }
  }, [getToken, refreshState]);

  const handleToggleCollapsed = useCallback(async () => {
    try {
      await toggleChecklist(getToken);
      await refreshState();
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
    }
  }, [getToken, refreshState]);

  const freeMissions = state?.missions.filter(m => m.mission.tier === 'free') || [];
  const proMissions = state?.missions.filter(m => m.mission.tier === 'pro') || [];

  return (
    <OnboardingContext.Provider
      value={{
        state,
        isLoading,
        error,
        refreshState,
        completeMission: handleCompleteMission,
        toggleCollapsed: handleToggleCollapsed,
        freeMissions,
        proMissions,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
```

### 4. Floating Checklist Component

**File: `apps/frontend/src/components/onboarding/FloatingChecklist.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  Lock, 
  ChevronUp, 
  ChevronDown,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingChecklist() {
  const { 
    state, 
    isLoading, 
    freeMissions, 
    proMissions, 
    completeMission,
    toggleCollapsed 
  } = useOnboarding();
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);

  if (isLoading || !state) return null;

  const allCompleted = state.all_free_completed && 
    (state.user_tier !== 'free' ? state.all_pro_completed : true);

  // Minimized floating icon
  if (isMinimized || state.is_checklist_collapsed) {
    return (
      <button
        onClick={() => {
          setIsMinimized(false);
          if (state.is_checklist_collapsed) {
            toggleCollapsed();
          }
        }}
        className="fixed bottom-6 right-6 z-50 bg-purple-600 hover:bg-purple-700 
                   text-white rounded-full p-4 shadow-lg transition-all 
                   hover:scale-105 flex items-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-medium">
          {allCompleted ? 'Complete!' : 'Get Started'}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-900 
                    rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 
                    overflow-hidden">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">Getting Started</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="hover:bg-purple-700 rounded p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {/* Free Missions */}
        <MissionSection
          title="Basics"
          missions={freeMissions}
          onComplete={completeMission}
          userTier={state.user_tier}
        />

        {/* Pro Missions */}
        <MissionSection
          title="Pro Features"
          missions={proMissions}
          onComplete={completeMission}
          userTier={state.user_tier}
          showUpgrade={state.user_tier === 'free'}
        />

        {/* Completion State */}
        {allCompleted && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-t 
                          border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">All missions complete!</span>
            </div>
          </div>
        )}

        {/* Upsell for Free Users */}
        {state.user_tier === 'free' && state.all_free_completed && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-t 
                          border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Unlock Pro features to continue your journey
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white 
                         py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface MissionSectionProps {
  title: string;
  missions: MissionProgress[];
  onComplete: (id: string) => Promise<void>;
  userTier: string;
  showUpgrade?: boolean;
}

function MissionSection({ 
  title, 
  missions, 
  onComplete, 
  userTier,
  showUpgrade 
}: MissionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const completedCount = missions.filter(m => m.is_completed).length;

  if (missions.length === 0) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 first:border-t-0">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between 
                   hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {completedCount}/{missions.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Mission Items */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {missions.map((progress) => (
            <MissionItem
              key={progress.mission.id}
              progress={progress}
              onComplete={onComplete}
              userTier={userTier}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MissionItemProps {
  progress: MissionProgress;
  onComplete: (id: string) => Promise<void>;
  userTier: string;
}

function MissionItem({ progress, onComplete, userTier }: MissionItemProps) {
  const { mission, is_completed, is_locked, current_count, progress_percentage } = progress;
  const router = useRouter();

  const handleClick = () => {
    if (is_locked) {
      router.push('/pricing');
      return;
    }
    
    if (mission.is_manual && !is_completed) {
      onComplete(mission.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer",
        is_completed
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : is_locked
          ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5">
          {is_completed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : is_locked ? (
            <Lock className="w-5 h-5 text-gray-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium",
              is_completed 
                ? "text-green-700 dark:text-green-400 line-through" 
                : is_locked
                ? "text-gray-400 dark:text-gray-500"
                : "text-gray-900 dark:text-white"
            )}>
              {mission.title}
            </span>
            {is_locked && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 
                             text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                Pro
              </span>
            )}
          </div>

          {/* Progress Bar for progress-type missions */}
          {mission.mission_type === 'progress' && !is_locked && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{current_count}/{mission.target_count}</span>
                <span>{progress_percentage}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${progress_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Manual completion hint */}
          {mission.is_manual && !is_completed && !is_locked && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Click to mark as complete
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5. Integration in Layout

**File: `apps/frontend/src/app/layout.tsx`** (add to existing)

```tsx
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { FloatingChecklist } from '@/components/onboarding/FloatingChecklist';

// Inside the layout component, wrap with provider and add checklist:
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ClerkProvider>
          <OnboardingProvider>
            {children}
            <FloatingChecklist />
          </OnboardingProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
```

### 6. Track Page Visits (Example for Audit History)

**File: `apps/frontend/src/app/audits/page.tsx`** (add to existing)

```tsx
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { trackPageVisit } from '@/lib/onboarding-api';

// Inside the component:
const { getToken } = useAuth();

useEffect(() => {
  trackPageVisit('audit_history', getToken);
}, [getToken]);
```

---

## Migration Steps

1. Create the onboarding app:
   ```bash
   cd apps/backend
   python manage.py startapp onboarding
   ```

2. Add models, serializers, views, services, urls as described above.

3. Register the app in `settings.py`.

4. Add URL include in main `urls.py`.

5. Create and run migrations:
   ```bash
   python manage.py makemigrations onboarding
   python manage.py migrate
   ```

6. Verify seed data was created:
   ```bash
   python manage.py shell
   >>> from onboarding.models import Mission
   >>> Mission.objects.all().count()
   11
   ```

7. Implement frontend components.

8. Add `OnboardingProvider` to layout.

9. Add `FloatingChecklist` component to layout.

10. Add page visit tracking to relevant pages.

---

## Testing Checklist

### Backend Tests

- [ ] `GET /api/onboarding/state/` returns all missions with correct progress
- [ ] `POST /api/onboarding/missions/{id}/complete/` works for manual missions
- [ ] `POST /api/onboarding/missions/{id}/complete/` rejects non-manual missions
- [ ] Free user cannot complete pro missions
- [ ] Progress refreshes correctly based on actual user data
- [ ] Mission progress updates when user creates relevant records

### Frontend Tests

- [ ] Floating checklist appears for authenticated users
- [ ] Checklist minimizes to icon when closed
- [ ] Checklist reappears on page reload/login
- [ ] Progress bars update correctly
- [ ] Locked missions show lock icon and Pro badge
- [ ] Clicking locked mission navigates to pricing
- [ ] Manual completion works
- [ ] Completion state shows when all missions done
- [ ] Upsell prompt appears for free users after completing free missions

---

## Future Enhancements

1. **Notifications**: Toast notifications when missions complete
2. **Celebrations**: Confetti animation on completing all missions
3. **Analytics**: Track mission completion rates for product insights
4. **A/B Testing**: Test different mission orders/descriptions
5. **Personalization**: Customize missions based on user behavior
