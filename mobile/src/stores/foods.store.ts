import { create } from 'zustand';
import { searchFoods as apiSearchFoods } from '../lib/api/foods.api';
import { Food } from '../types/nutrition-templates';

interface FoodsState {
  results: Food[];
  loading: boolean;
  error: string | null;

  search(q: string): Promise<void>;
  addResult(food: Food): void;
}

export const useFoodsStore = create<FoodsState>((set) => ({
  results: [],
  loading: false,
  error: null,

  async search(q: string): Promise<void> {
    set({ loading: true, error: null });
    try {
      const results = await apiSearchFoods(q, 20);
      set({ results, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  addResult(food: Food): void {
    set((state) => ({ results: [food, ...state.results] }));
  },
}));
