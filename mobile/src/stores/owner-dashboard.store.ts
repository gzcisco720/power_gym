import { create } from 'zustand';
import { getOwnerDashboard } from '../lib/api/owner-dashboard.api';
import { OwnerDashboardResponse } from '../types/dashboard';

interface OwnerDashboardState {
  data: OwnerDashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard(): Promise<void>;
}

export const useOwnerDashboardStore = create<OwnerDashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  async fetchDashboard(): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const data = await getOwnerDashboard();
      set({ data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ isLoading: false, error: message });
    }
  },
}));
