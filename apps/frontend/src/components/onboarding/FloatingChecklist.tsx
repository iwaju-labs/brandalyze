'use client';

import React, { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  LockKeyholeCircle, 
  ChevronUp, 
  ChevronDown,
  XClose,
  Stars01
} from '@untitledui/icons';
import { cn } from '@/lib/utils';
import type { MissionProgress } from '@/types/onboarding';

function getMissionItemClassName(is_completed: boolean, is_locked: boolean): string {
  if (is_completed) {
    return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  }
  if (is_locked) {
    return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60";
  }
  return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300";
}

function getMissionTitleClassName(is_completed: boolean, is_locked: boolean): string {
  if (is_completed) {
    return "text-green-700 dark:text-green-400 line-through";
  }
  if (is_locked) {
    return "text-gray-400 dark:text-gray-500";
  }
  return "text-gray-900 dark:text-white";
}

function MissionStatusIcon({ is_completed, is_locked }: { readonly is_completed: boolean; readonly is_locked: boolean }) {
  if (is_completed) {
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
  if (is_locked) {
    return <LockKeyholeCircle className="w-5 h-5 text-gray-400" />;
  }
  return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
}

export function FloatingChecklist() {
  const { isSignedIn, isLoaded } = useUser();
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

  // Don't render for unauthenticated users or while Clerk is loading
  if (!isLoaded || !isSignedIn) return null;
  if (isLoading || !state) return null;

  const allCompleted = state.all_free_completed && 
    (state.user_tier === 'free' || state.all_pro_completed);

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
        <Stars01 className="w-5 h-5" />
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
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stars01 className="w-5 h-5" />
          <span className="font-semibold">Getting Started</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="hover:bg-purple-700 rounded p-1 transition-colors"
        >
          <XClose className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <MissionSection
          title="Basics"
          missions={freeMissions}
          onComplete={completeMission}
        />

        <MissionSection
          title="Pro Features"
          missions={proMissions}
          onComplete={completeMission}
        />

        {allCompleted && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-t 
                          border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">All missions complete!</span>
            </div>
          </div>
        )}

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
  readonly title: string;
  readonly missions: MissionProgress[];
  readonly onComplete: (id: string) => Promise<void>;
}

function MissionSection({ 
  title, 
  missions, 
  onComplete,
}: MissionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const completedCount = missions.filter(m => m.is_completed).length;

  if (missions.length === 0) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 first:border-t-0">
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

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {missions.map((progress) => (
            <MissionItem
              key={progress.mission.id}
              progress={progress}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MissionItemProps {
  readonly progress: MissionProgress;
  readonly onComplete: (id: string) => Promise<void>;
}

function MissionItem({ progress, onComplete }: MissionItemProps) {
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
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer w-full text-left",
        getMissionItemClassName(is_completed, is_locked)
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <MissionStatusIcon is_completed={is_completed} is_locked={is_locked} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium",
              getMissionTitleClassName(is_completed, is_locked)
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

          {mission.is_manual && !is_completed && !is_locked && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Click to mark as complete
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
