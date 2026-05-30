import { create } from 'zustand';
import { fetchDay, upsertDay, fetchRecentLogs } from '@/api/self-nutrition';
import type { SelfNutritionLog, UpsertDayPayload, SelfMeal } from '@/api/self-nutrition';

export type { SelfNutritionLog, SelfMeal };

interface SelfNutritionState {
  dayLog: SelfNutritionLog | null;
  isLoading: boolean;
  error: string | null;

  fetchDay: (date: string) => Promise<void>;
  upsertDay: (date: string, payload: UpsertDayPayload) => Promise<SelfNutritionLog>;
  fetchRecent: (year: number, month: number) => Promise<SelfNutritionLog[]>;
}

export const useSelfNutritionStore = create<SelfNutritionState>((set) => ({
  dayLog: null,
  isLoading: false,
  error: null,

  fetchDay: async (date: string) => {
    set({ isLoading: true, error: null });
    try {
      const log = await fetchDay(date);
      set({ dayLog: log, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  upsertDay: async (date: string, payload: UpsertDayPayload) => {
    const log = await upsertDay(date, payload);
    set({ dayLog: log });
    return log;
  },

  fetchRecent: async (year: number, month: number) => {
    return fetchRecentLogs(year, month);
  },
}));
