import { create } from 'zustand';
import {
  fetchMemberOverview,
  fetchMemberPlan,
  fetchMemberNutrition,
  fetchMemberBodyTests,
  createBodyTest,
  fetchMemberHealth,
  createInjury,
  updateInjury,
  deleteInjury,
  fetchMemberCheckIns,
  fetchMemberProgress,
} from '@/api/member-hub';
import type {
  MemberProfile,
  StatStrip,
  PlanCard,
  HealthSummary,
  MemberPlanData,
  MemberNutritionData,
  BodyTestRecord,
  SerializedInjury,
  SerializedMedication,
  SerializedMedicalHistory,
  CheckInRecord,
  CheckInConfig,
  MemberProgressData,
  InjuryPayload,
} from '@/api/member-hub';

interface MemberHubState {
  memberId: string | null;
  profile: MemberProfile | null;
  statStrip: StatStrip | null;
  planCard: PlanCard | null;
  healthSummary: HealthSummary | null;
  plan: MemberPlanData | null;
  nutrition: MemberNutritionData | null;
  bodyTests: BodyTestRecord[];
  injuries: SerializedInjury[];
  medicalHistory: SerializedMedicalHistory | null;
  medications: SerializedMedication[];
  checkIns: CheckInRecord[];
  checkInConfig: CheckInConfig | null;
  progress: MemberProgressData | null;
  isLoadingOverview: boolean;
  isLoadingPlan: boolean;
  isLoadingNutrition: boolean;
  isLoadingBodyTests: boolean;
  isLoadingHealth: boolean;
  isLoadingCheckIns: boolean;
  isLoadingProgress: boolean;
  error: string | null;

  fetchOverview: (memberId: string) => Promise<void>;
  fetchPlan: (memberId: string) => Promise<void>;
  fetchNutrition: (memberId: string) => Promise<void>;
  fetchBodyTests: (memberId: string) => Promise<void>;
  addBodyTest: (memberId: string, payload: Record<string, number | string | null>) => Promise<BodyTestRecord>;
  removeBodyTest: (testId: string) => void;
  fetchHealth: (memberId: string) => Promise<void>;
  addInjury: (memberId: string, payload: InjuryPayload) => Promise<void>;
  updateInjuryRecord: (memberId: string, injuryId: string, patch: Partial<InjuryPayload> & { status?: 'active' | 'resolved'; memberNotes?: string | null }) => Promise<void>;
  deleteInjuryRecord: (memberId: string, injuryId: string) => Promise<void>;
  fetchCheckIns: (memberId: string) => Promise<void>;
  fetchProgress: (memberId: string) => Promise<void>;
}

export const useMemberHubStore = create<MemberHubState>((set) => ({
  memberId: null,
  profile: null,
  statStrip: null,
  planCard: null,
  healthSummary: null,
  plan: null,
  nutrition: null,
  bodyTests: [],
  injuries: [],
  medicalHistory: null,
  medications: [],
  checkIns: [],
  checkInConfig: null,
  progress: null,
  isLoadingOverview: false,
  isLoadingPlan: false,
  isLoadingNutrition: false,
  isLoadingBodyTests: false,
  isLoadingHealth: false,
  isLoadingCheckIns: false,
  isLoadingProgress: false,
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

  fetchBodyTests: async (memberId: string) => {
    set({ isLoadingBodyTests: true, error: null });
    try {
      const tests = await fetchMemberBodyTests(memberId);
      set({ bodyTests: tests, isLoadingBodyTests: false });
    } catch (err) {
      set({
        isLoadingBodyTests: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  addBodyTest: async (memberId: string, payload: Record<string, number | string | null>) => {
    const test = await createBodyTest(memberId, payload);
    set((s) => ({ bodyTests: [test, ...s.bodyTests] }));
    return test;
  },

  removeBodyTest: (testId: string) => {
    set((s) => ({ bodyTests: s.bodyTests.filter((t) => t._id !== testId) }));
  },

  fetchHealth: async (memberId: string) => {
    set({ isLoadingHealth: true, error: null });
    try {
      const data = await fetchMemberHealth(memberId);
      set({ injuries: data.injuries, medications: data.medications, medicalHistory: data.medicalHistory, isLoadingHealth: false });
    } catch (err) {
      set({
        isLoadingHealth: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  addInjury: async (memberId: string, payload: InjuryPayload) => {
    const injury = await createInjury(memberId, payload);
    set((s) => ({ injuries: [injury, ...s.injuries] }));
  },

  updateInjuryRecord: async (memberId: string, injuryId: string, patch) => {
    const updated = await updateInjury(memberId, injuryId, patch);
    set((s) => ({ injuries: s.injuries.map((i) => (i._id === injuryId ? updated : i)) }));
  },

  deleteInjuryRecord: async (memberId: string, injuryId: string) => {
    await deleteInjury(memberId, injuryId);
    set((s) => ({ injuries: s.injuries.filter((i) => i._id !== injuryId) }));
  },

  fetchCheckIns: async (memberId: string) => {
    set({ isLoadingCheckIns: true, error: null });
    try {
      const data = await fetchMemberCheckIns(memberId);
      set({ checkIns: data.checkIns, checkInConfig: data.config, isLoadingCheckIns: false });
    } catch (err) {
      set({
        isLoadingCheckIns: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  fetchProgress: async (memberId: string) => {
    set({ isLoadingProgress: true, error: null });
    try {
      const data = await fetchMemberProgress(memberId);
      set({ progress: data, isLoadingProgress: false });
    } catch (err) {
      set({
        isLoadingProgress: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },
}));

