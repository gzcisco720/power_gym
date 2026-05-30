import { create } from 'zustand';
import {
  fetchMemberOverview,
  fetchMemberPlan,
  fetchMemberNutrition,
} from '@/api/member-hub';
import type {
  MemberProfile,
  StatStrip,
  PlanCard,
  HealthSummary,
  MemberPlanData,
  MemberNutritionData,
} from '@/api/member-hub';

interface MemberHubState {
  memberId: string | null;
  profile: MemberProfile | null;
  statStrip: StatStrip | null;
  planCard: PlanCard | null;
  healthSummary: HealthSummary | null;
  plan: MemberPlanData | null;
  nutrition: MemberNutritionData | null;
  isLoadingOverview: boolean;
  isLoadingPlan: boolean;
  isLoadingNutrition: boolean;
  error: string | null;

  fetchOverview: (memberId: string) => Promise<void>;
  fetchPlan: (memberId: string) => Promise<void>;
  fetchNutrition: (memberId: string) => Promise<void>;
}

export const useMemberHubStore = create<MemberHubState>((set) => ({
  memberId: null,
  profile: null,
  statStrip: null,
  planCard: null,
  healthSummary: null,
  plan: null,
  nutrition: null,
  isLoadingOverview: false,
  isLoadingPlan: false,
  isLoadingNutrition: false,
  error: null,

  fetchOverview: async (memberId: string) => {
    set({ isLoadingOverview: true, error: null, memberId });
    try {
      const data = await fetchMemberOverview(memberId);
      set({
        profile: data.profile,
        statStrip: data.statStrip,
        planCard: data.planCard,
        healthSummary: data.healthSummary,
        isLoadingOverview: false,
      });
    } catch (err) {
      set({
        isLoadingOverview: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  fetchPlan: async (memberId: string) => {
    set({ isLoadingPlan: true, error: null });
    try {
      const data = await fetchMemberPlan(memberId);
      set({ plan: data, isLoadingPlan: false });
    } catch (err) {
      set({
        isLoadingPlan: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  fetchNutrition: async (memberId: string) => {
    set({ isLoadingNutrition: true, error: null });
    try {
      const data = await fetchMemberNutrition(memberId);
      set({ nutrition: data, isLoadingNutrition: false });
    } catch (err) {
      set({
        isLoadingNutrition: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },
}));
