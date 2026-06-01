import { create } from 'zustand';
import { getMemberDashboard } from '../lib/api/member-dashboard.api';
import { MemberDashboardResponse } from '../types/dashboard';

interface MemberDashboardState {
  data: MemberDashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  selectedExercise: string | null;
  fetchDashboard(): Promise<void>;
  selectExercise(exercise: string): Promise<void>;
}

export const useMemberDashboardStore = create<MemberDashboardState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  selectedExercise: null,

  async fetchDashboard(): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const data = await getMemberDashboard();
      set({ data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
    }
  },

  async selectExercise(exercise: string): Promise<void> {
    set({ selectedExercise: exercise });
    try {
      const result = await getMemberDashboard(exercise);
      const current = get().data;
      if (current) {
        set({ data: { ...current, strengthProgress: result.strengthProgress } });
      }
    } catch {
      // Non-critical — leave existing strength data intact
    }
  },
}));
