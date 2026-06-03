import { create } from 'zustand';
import {
  fetchTemplates as apiFetchTemplates,
  createTemplate as apiCreateTemplate,
  updateTemplate as apiUpdateTemplate,
  deleteTemplate as apiDeleteTemplate,
} from '../lib/api/nutrition-templates.api';
import {
  NutritionTemplate,
  CreateNutritionTemplateDto,
  UpdateNutritionTemplateDto,
} from '../types/nutrition-templates';

interface NutritionTemplatesState {
  items: NutritionTemplate[];
  loading: boolean;
  error: string | null;

  fetchTemplates(): Promise<void>;
  createTemplate(dto: CreateNutritionTemplateDto): Promise<NutritionTemplate>;
  updateTemplate(id: string, dto: UpdateNutritionTemplateDto): Promise<NutritionTemplate>;
  removeTemplate(id: string): Promise<void>;
}

export const useNutritionTemplatesStore = create<NutritionTemplatesState>((set) => ({
  items: [],
  loading: false,
  error: null,

  async fetchTemplates(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const items = await apiFetchTemplates();
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async createTemplate(dto: CreateNutritionTemplateDto): Promise<NutritionTemplate> {
    const template = await apiCreateTemplate(dto);
    set((state) => ({ items: [template, ...state.items] }));
    return template;
  },

  async updateTemplate(id: string, dto: UpdateNutritionTemplateDto): Promise<NutritionTemplate> {
    const template = await apiUpdateTemplate(id, dto);
    set((state) => ({
      items: state.items.map((item) => (item._id === id ? template : item)),
    }));
    return template;
  },

  async removeTemplate(id: string): Promise<void> {
    await apiDeleteTemplate(id);
    set((state) => ({ items: state.items.filter((item) => item._id !== id) }));
  },
}));
