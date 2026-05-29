import { create } from 'zustand';
import * as api from '@/api/progress';

interface ProgressState {
  trend: Record<string, api.OneRepMaxTrendPoint[]>;
  isLoading: boolean;
  error: string | null;
  fetchTrend: (memberId: string) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  trend: {},
  isLoading: false,
  error: null,

  fetchTrend: async (memberId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.fetchProgress(memberId);
      set((s) => ({
        trend: { ...s.trend, [memberId]: data.oneRepMaxTrend },
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },
}));
