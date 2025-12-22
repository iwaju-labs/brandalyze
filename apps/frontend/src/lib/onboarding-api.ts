import { authenticatedFetch } from '../../lib/api';
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
