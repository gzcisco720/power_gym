import { create } from 'zustand';
import {
  searchFoods as apiSearchFoods,
  updateFood as apiUpdateFood,
  deleteFood as apiDeleteFood,
} from '../lib/api/foods.api';
import { Food, UpdateFoodDto } from '../types/nutrition-templates';

interface FoodsState {
  results: Food[];
  loading: boolean;
  error: string | null;

  search(q: string): Promise<void>;
  addResult(food: Food): void;
  update(id: string, dto: UpdateFoodDto): Promise<void>;
  remove(id: string): Promise<void>;
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

  async update(id: string, dto: UpdateFoodDto): Promise<void> {
    set({ loading: true, error: null });
    try {
      const updated = await apiUpdateFood(id, dto);
      set((state) => ({
        results: state.results.map((f) => (f._id === id ? updated : f)),
        loading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async remove(id: string): Promise<void> {
    set({ loading: true, error: null });
    try {
      await apiDeleteFood(id);
      set((state) => ({
        results: state.results.filter((f) => f._id !== id),
        loading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },
}));
