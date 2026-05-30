import { create } from 'zustand';
import { fetchMemberNutritionPlan } from '@/api/member-hub';
import type { ActiveNutritionPlan } from '@/api/member-hub';

export type { ActiveNutritionPlan };

interface MemberNutritionState {
  activePlan: ActiveNutritionPlan | null;
  isLoading: boolean;
  error: string | null;

  fetchActivePlan: (memberId: string) => Promise<void>;
}

export const useMemberNutritionStore = create<MemberNutritionState>((set) => ({
  activePlan: null,
  isLoading: false,
  error: null,

  fetchActivePlan: async (memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      const plan = await fetchMemberNutritionPlan(memberId);
      set({ activePlan: plan ?? null, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
}));
