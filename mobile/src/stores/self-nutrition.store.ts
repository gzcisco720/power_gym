import { create } from 'zustand';
import {
  fetchSelfToday as apiFetchSelfToday,
  logSelfFood as apiLogSelfFood,
} from '../lib/api/nutrition.api';
import { SelfNutritionLog, LogSelfFoodInput } from '../types/nutrition';

interface SelfNutritionState {
  log: SelfNutritionLog | null;
  loading: boolean;
  logging: boolean;
  error: string | null;

  fetchToday(): Promise<void>;
  logFood(input: LogSelfFoodInput): Promise<void>;
}

export const useSelfNutritionStore = create<SelfNutritionState>((set) => ({
  log: null,
  loading: false,
  logging: false,
  error: null,

  async fetchToday(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const log = await apiFetchSelfToday();
      set({ log, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async logFood(input: LogSelfFoodInput): Promise<void> {
    set({ logging: true, error: null });
    try {
      const log = await apiLogSelfFood(input);
      set({ log, logging: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ logging: false, error: message });
    }
  },
}));
