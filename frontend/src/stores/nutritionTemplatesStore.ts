import { create } from 'zustand';
import {
  fetchNutritionTemplates,
  fetchNutritionTemplateById,
  createNutritionTemplate,
  updateNutritionTemplate,
  deleteNutritionTemplate,
} from '@/api/nutrition-templates';
import type {
  NutritionTemplateListItem,
  NutritionTemplateDetail,
  NutritionTemplatePayload,
} from '@/api/nutrition-templates';

interface NutritionTemplatesState {
  templates: NutritionTemplateListItem[];
  currentTemplate: NutritionTemplateDetail | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  save: (payload: NutritionTemplatePayload) => Promise<NutritionTemplateDetail>;
  update: (id: string, payload: NutritionTemplatePayload) => Promise<NutritionTemplateDetail>;
  remove: (id: string) => Promise<void>;
}

export const useNutritionTemplatesStore = create<NutritionTemplatesState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await fetchNutritionTemplates();
      set({ templates, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchOne: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const template = await fetchNutritionTemplateById(id);
      set({ currentTemplate: template, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  save: async (payload: NutritionTemplatePayload) => {
    const created = await createNutritionTemplate(payload);
    const fresh = await fetchNutritionTemplates();
    const existingIds = new Set(get().templates.map((t) => t._id));
    const newTemplates = fresh.filter((t) => !existingIds.has(t._id));
    set({ templates: [...newTemplates, ...get().templates] });
    return created;
  },

  update: async (id: string, payload: NutritionTemplatePayload) => {
    const updated = await updateNutritionTemplate(id, payload);
    set({
      templates: get().templates.map((t) =>
        t._id === id ? { ...t, name: updated.name, description: updated.description } : t,
      ),
      currentTemplate: updated,
    });
    return updated;
  },

  remove: async (id: string) => {
    await deleteNutritionTemplate(id);
    set({ templates: get().templates.filter((t) => t._id !== id) });
  },
}));
