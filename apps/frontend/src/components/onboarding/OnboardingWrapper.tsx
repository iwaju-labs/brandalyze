'use client';

import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { FloatingChecklist } from '@/components/onboarding/FloatingChecklist';

interface OnboardingWrapperProps {
  readonly children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  return (
    <OnboardingProvider>
      {children}
      <FloatingChecklist />
    </OnboardingProvider>
  );
}
