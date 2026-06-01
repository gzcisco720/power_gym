import { create } from 'zustand';
import { getTrainerDashboard } from '../lib/api/trainer-dashboard.api';
import { TrainerDashboardResponse } from '../types/dashboard';

interface TrainerDashboardState {
  data: TrainerDashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard(): Promise<void>;
}

export const useTrainerDashboardStore = create<TrainerDashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  async fetchDashboard(): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const data = await getTrainerDashboard();
      set({ data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
    }
  },
}));
