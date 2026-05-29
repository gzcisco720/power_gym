import { create } from 'zustand';
import * as equipmentApi from '@/api/equipment';

interface EquipmentState {
  equipment: equipmentApi.Equipment[];
  conditionReports: Record<string, equipmentApi.ConditionReport[]>;
  isLoading: boolean;
  error: string | null;
  fetchEquipment: () => Promise<void>;
  createEquipment: (data: { name: string; status?: string; brand?: string; quantity?: number; note?: string }) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  fetchConditionReports: (equipmentId: string) => Promise<void>;
  addConditionReport: (equipmentId: string, data: { note: string }) => Promise<void>;
}

export const useEquipmentStore = create<EquipmentState>((set) => ({
  equipment: [],
  conditionReports: {},
  isLoading: false,
  error: null,

  fetchEquipment: async () => {
    set({ isLoading: true, error: null });
    try {
      const equipment = await equipmentApi.fetchEquipment();
      set({ equipment, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createEquipment: async (data) => {
    try {
      const item = await equipmentApi.createEquipment(data);
      set((s) => ({ equipment: [...s.equipment, item] }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteEquipment: async (id) => {
    await equipmentApi.deleteEquipment(id);
    set((s) => ({ equipment: s.equipment.filter((eq) => eq._id !== id) }));
  },

  fetchConditionReports: async (equipmentId) => {
    const reports = await equipmentApi.fetchConditionReports(equipmentId);
    set((s) => ({ conditionReports: { ...s.conditionReports, [equipmentId]: reports } }));
  },

  addConditionReport: async (equipmentId, data) => {
    try {
      const report = await equipmentApi.addConditionReport(equipmentId, data);
      set((s) => ({
        conditionReports: {
          ...s.conditionReports,
          [equipmentId]: [...(s.conditionReports[equipmentId] ?? []), report],
        },
      }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },
}));
