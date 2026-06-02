import { create } from 'zustand';
import { fetchServiceTypes as apiFetchServiceTypes } from '../lib/api/service-types.api';
import { ServiceType, FilterTab } from '../types/service-types';

interface ServiceTypesState {
  items: ServiceType[];
  filter: FilterTab;
  loading: boolean;
  error: string | null;
  fetchServiceTypes(): Promise<void>;
  addItem(item: ServiceType): void;
  updateItem(item: ServiceType): void;
  setFilter(filter: FilterTab): void;
}

export const useServiceTypesStore = create<ServiceTypesState>((set) => ({
  items: [],
  filter: 'all',
  loading: false,
  error: null,

  async fetchServiceTypes(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const items = await apiFetchServiceTypes();
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  addItem(item: ServiceType): void {
    set((state) => ({ items: [item, ...state.items] }));
  },

  updateItem(item: ServiceType): void {
    set((state) => ({
      items: state.items.map((existing) => (existing._id === item._id ? item : existing)),
    }));
  },

  setFilter(filter: FilterTab): void {
    set({ filter });
  },
}));
