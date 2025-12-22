'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

interface OnboardingProviderProps {
  readonly children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }
    
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
    if (isLoaded && isSignedIn) {
      refreshState();
    } else if (isLoaded && !isSignedIn) {
      setIsLoading(false);
    }
  }, [refreshState, isLoaded, isSignedIn]);

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

  const freeMissions = useMemo(
    () => state?.missions.filter(m => m.mission.tier === 'free') || [],
    [state?.missions]
  );
  const proMissions = useMemo(
    () => state?.missions.filter(m => m.mission.tier === 'pro') || [],
    [state?.missions]
  );

  const contextValue = useMemo(
    () => ({
      state,
      isLoading,
      error,
      refreshState,
      completeMission: handleCompleteMission,
      toggleCollapsed: handleToggleCollapsed,
      freeMissions,
      proMissions,
    }),
    [state, isLoading, error, refreshState, handleCompleteMission, handleToggleCollapsed, freeMissions, proMissions]
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
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
