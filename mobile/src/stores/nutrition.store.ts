import { create } from 'zustand';
import {
  fetchMyNutritionPlan as apiFetchMyNutritionPlan,
  fetchToday as apiFetchToday,
  logFood as apiLogFood,
  fetchTodaySummary as apiFetchTodaySummary,
  fetchMyNutritionHistory as apiFetchMyNutritionHistory,
  NutritionHistoryDay,
} from '../lib/api/nutrition.api';
import {
  ActiveNutritionPlan,
  NutritionDailyLog,
  MacroSummary,
  LogFoodInput,
} from '../types/nutrition';

interface NutritionState {
  plan: ActiveNutritionPlan | null;
  todayLog: NutritionDailyLog | null;
  summary: MacroSummary | null;
  history: NutritionHistoryDay[];
  loading: boolean;
  error: string | null;

  fetchToday(): Promise<void>;
  logFood(input: LogFoodInput): Promise<void>;
  loggedItemCount(): number;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  plan: null,
  todayLog: null,
  summary: null,
  history: [],
  loading: false,
  error: null,

  async fetchToday(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const [plan, todayLog, summary, history] = await Promise.all([
        apiFetchMyNutritionPlan(),
        apiFetchToday(),
        apiFetchTodaySummary(),
        apiFetchMyNutritionHistory().catch(() => [] as NutritionHistoryDay[]),
      ]);
      set({ plan, todayLog, summary, history, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async logFood(input: LogFoodInput): Promise<void> {
    const updatedLog = await apiLogFood(input);
    const summary = await apiFetchTodaySummary();
    set({ todayLog: updatedLog, summary });
  },

  loggedItemCount(): number {
    const { todayLog } = get();
    if (!todayLog) return 0;
    return todayLog.meals.reduce((total, meal) => total + meal.items.length, 0);
  },
}));
