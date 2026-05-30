import { create } from 'zustand';
import { fetchDashboard } from '@/api/member-portal';
import type { DashboardResponse } from '@/api/member-portal';

export type { DashboardResponse };

interface MemberDashboardState {
  dashboard: DashboardResponse | null;
  isLoading: boolean;
  error: string | null;

  fetch: () => Promise<void>;
}

export const useMemberDashboardStore = create<MemberDashboardState>((set) => ({
  dashboard: null,
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const dashboard = await fetchDashboard();
      set({ dashboard, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
}));
