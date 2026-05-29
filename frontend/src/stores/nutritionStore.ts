import { create } from 'zustand';
import * as api from '@/api/nutrition';

interface NutritionState {
  templates: api.NutritionTemplate[];
  foods: api.Food[];
  foodSearchResults: api.Food[];
  memberPlans: Record<string, api.MemberNutritionPlan | null>;
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: { name: string; description?: string }) => Promise<void>;
  updateTemplate: (id: string, data: Partial<api.NutritionTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  fetchFoods: (q?: string) => Promise<void>;
  createFood: (data: Partial<api.Food>) => Promise<void>;
  updateFood: (id: string, data: Partial<api.Food>) => Promise<void>;
  deleteFood: (id: string) => Promise<void>;
  searchFood: (q: string) => Promise<void>;
  assignPlan: (memberId: string, nutritionTemplateId: string) => Promise<void>;
  fetchMemberPlan: (memberId: string) => Promise<void>;
}

export const useNutritionStore = create<NutritionState>((set) => ({
  templates: [],
  foods: [],
  foodSearchResults: [],
  memberPlans: {},
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await api.fetchNutritionTemplates();
      set({ templates, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createTemplate: async (data) => {
    const template = await api.createNutritionTemplate(data);
    set((s) => ({ templates: [...s.templates, template] }));
  },

  updateTemplate: async (id, data) => {
    const updated = await api.updateNutritionTemplate(id, data);
    set((s) => ({ templates: s.templates.map((t) => (t._id === id ? updated : t)) }));
  },

  deleteTemplate: async (id) => {
    await api.deleteNutritionTemplate(id);
    set((s) => ({ templates: s.templates.filter((t) => t._id !== id) }));
  },

  fetchFoods: async (q) => {
    set({ isLoading: true, error: null });
    try {
      const foods = await api.fetchFoods(q);
      set({ foods, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createFood: async (data) => {
    const food = await api.createFood(data);
    set((s) => ({ foods: [...s.foods, food] }));
  },

  updateFood: async (id, data) => {
    const updated = await api.updateFood(id, data);
    set((s) => ({ foods: s.foods.map((f) => (f._id === id ? updated : f)) }));
  },

  deleteFood: async (id) => {
    await api.deleteFood(id);
    set((s) => ({ foods: s.foods.filter((f) => f._id !== id) }));
  },

  searchFood: async (q) => {
    try {
      const results = await api.searchFoods(q);
      set({ foodSearchResults: results });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  assignPlan: async (memberId, nutritionTemplateId) => {
    const plan = await api.assignNutritionPlan(memberId, nutritionTemplateId);
    set((s) => ({ memberPlans: { ...s.memberPlans, [memberId]: plan } }));
  },

  fetchMemberPlan: async (memberId) => {
    try {
      const plan = await api.fetchMemberNutritionPlan(memberId);
      set((s) => ({ memberPlans: { ...s.memberPlans, [memberId]: plan } }));
    } catch {
      set((s) => ({ memberPlans: { ...s.memberPlans, [memberId]: null } }));
    }
  },
}));
