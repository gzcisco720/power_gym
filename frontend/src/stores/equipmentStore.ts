import { create } from 'zustand';
import {
  fetchEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipmentItem,
  fetchConditionReports,
  addConditionReport,
} from '@/api/equipment';
import type { EquipmentItem, EquipmentPayload, ConditionReport } from '@/api/equipment';

interface EquipmentState {
  items: EquipmentItem[];
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  create: (payload: EquipmentPayload) => Promise<EquipmentItem>;
  update: (id: string, payload: Partial<EquipmentPayload>) => Promise<EquipmentItem>;
  remove: (id: string) => Promise<void>;
  getConditionReports: (id: string) => Promise<ConditionReport[]>;
  addReport: (id: string, note: string) => Promise<ConditionReport>;
}

export const useEquipmentStore = create<EquipmentState>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await fetchEquipment();
      set({ items, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  create: async (payload: EquipmentPayload) => {
    const created = await createEquipment(payload);
    set((s) => ({ items: [...s.items, created] }));
    return created;
  },

  update: async (id: string, payload: Partial<EquipmentPayload>) => {
    const updated = await updateEquipment(id, payload);
    set((s) => ({
      items: s.items.map((item) => (item._id === id ? updated : item)),
    }));
    return updated;
  },

  remove: async (id: string) => {
    await deleteEquipmentItem(id);
    set((s) => ({ items: s.items.filter((item) => item._id !== id) }));
  },

  getConditionReports: async (id: string) => {
    return fetchConditionReports(id);
  },

  addReport: async (id: string, note: string) => {
    return addConditionReport(id, note);
  },
}));
