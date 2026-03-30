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
