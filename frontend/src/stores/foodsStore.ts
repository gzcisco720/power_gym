import { create } from 'zustand';
import {
  fetchFoods,
  fetchFoodById,
  createFood,
  updateFood,
  deleteFood,
} from '@/api/foods';
import type { FoodItem, FoodPayload } from '@/api/foods';

interface FoodsState {
  foods: FoodItem[];
  currentFood: FoodItem | null;
  isLoading: boolean;
  error: string | null;
  fetch: (q?: string) => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  save: (payload: FoodPayload) => Promise<FoodItem>;
  update: (id: string, payload: Partial<FoodPayload>) => Promise<FoodItem>;
  remove: (id: string) => Promise<void>;
}

export const useFoodsStore = create<FoodsState>((set, get) => ({
  foods: [],
  currentFood: null,
  isLoading: false,
  error: null,

  fetch: async (q?: string) => {
    set({ isLoading: true, error: null });
    try {
      const foods = await fetchFoods(q);
      set({ foods, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchOne: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const food = await fetchFoodById(id);
      set({ currentFood: food, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  save: async (payload: FoodPayload) => {
    const created = await createFood(payload);
    set((s) => ({ foods: [...s.foods, created] }));
    return created;
  },

  update: async (id: string, payload: Partial<FoodPayload>) => {
    const updated = await updateFood(id, payload);
    set((s) => ({
      foods: s.foods.map((f) => (f._id === id ? updated : f)),
      currentFood: s.currentFood?._id === id ? updated : s.currentFood,
    }));
    return updated;
  },

  remove: async (id: string) => {
    const food = get().foods.find((f) => f._id === id);
    if (!food) return;
    await deleteFood(id);
    set((s) => ({ foods: s.foods.filter((f) => f._id !== id) }));
  },
}));
