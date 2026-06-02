import { create } from 'zustand';
import { fetchEquipment as apiFetchEquipment } from '../lib/api/equipment.api';
import { EquipmentItem, FilterTab } from '../types/equipment';

interface EquipmentState {
  items: EquipmentItem[];
  filter: FilterTab;
  loading: boolean;
  error: string | null;
  fetchEquipment(): Promise<void>;
  addItem(item: EquipmentItem): void;
  updateItem(item: EquipmentItem): void;
  removeItem(id: string): void;
  setFilter(filter: FilterTab): void;
}

export const useEquipmentStore = create<EquipmentState>((set) => ({
  items: [],
  filter: 'all',
  loading: false,
  error: null,

  async fetchEquipment(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const items = await apiFetchEquipment();
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  addItem(item: EquipmentItem): void {
    set((state) => ({ items: [item, ...state.items] }));
  },

  updateItem(item: EquipmentItem): void {
    set((state) => ({
      items: state.items.map((existing) => (existing._id === item._id ? item : existing)),
    }));
  },

  removeItem(id: string): void {
    set((state) => ({ items: state.items.filter((item) => item._id !== id) }));
  },

  setFilter(filter: FilterTab): void {
    set({ filter });
  },
}));
