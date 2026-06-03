import { create } from 'zustand';
import {
  fetchTemplates as apiFetchTemplates,
  createTemplate as apiCreateTemplate,
  updateTemplate as apiUpdateTemplate,
  deleteTemplate as apiDeleteTemplate,
} from '../lib/api/training-templates.api';
import { PlanTemplate, CreatePlanTemplateDto, UpdatePlanTemplateDto } from '../types/training-templates';

interface TrainingTemplatesState {
  items: PlanTemplate[];
  loading: boolean;
  error: string | null;

  fetchTemplates(): Promise<void>;
  addItem(template: PlanTemplate): void;
  updateItem(template: PlanTemplate): void;
  removeItem(id: string): void;
  createAndAdd(dto: CreatePlanTemplateDto): Promise<PlanTemplate>;
  updateAndSync(id: string, dto: UpdatePlanTemplateDto): Promise<PlanTemplate>;
  removeAndDelete(id: string): Promise<void>;
}

export const useTrainingTemplatesStore = create<TrainingTemplatesState>((set, get) => ({
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

  addItem(template: PlanTemplate): void {
    set((state) => ({ items: [template, ...state.items] }));
  },

  updateItem(template: PlanTemplate): void {
    set((state) => ({
      items: state.items.map((item) => (item._id === template._id ? template : item)),
    }));
  },

  removeItem(id: string): void {
    set((state) => ({ items: state.items.filter((item) => item._id !== id) }));
  },

  async createAndAdd(dto: CreatePlanTemplateDto): Promise<PlanTemplate> {
    const template = await apiCreateTemplate(dto);
    get().addItem(template);
    return template;
  },

  async updateAndSync(id: string, dto: UpdatePlanTemplateDto): Promise<PlanTemplate> {
    const template = await apiUpdateTemplate(id, dto);
    get().updateItem(template);
    return template;
  },

  async removeAndDelete(id: string): Promise<void> {
    await apiDeleteTemplate(id);
    get().removeItem(id);
  },
}));
