import { create } from 'zustand';
import { fetchMyBodyTests as apiFetchMyBodyTests } from '../lib/api/body-tests.api';
import { BodyTest } from '../types/body-tests';

interface BodyTestsState {
  items: BodyTest[];
  loading: boolean;
  error: string | null;
  fetchMyBodyTests(): Promise<void>;
  addItem(item: BodyTest): void;
  removeItem(id: string): void;
}

export const useBodyTestsStore = create<BodyTestsState>((set) => ({
  items: [],
  loading: false,
  error: null,

  async fetchMyBodyTests(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const items = await apiFetchMyBodyTests();
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  addItem(item: BodyTest): void {
    set((state) => ({ items: [item, ...state.items] }));
  },

  removeItem(id: string): void {
    set((state) => ({ items: state.items.filter((item) => item._id !== id) }));
  },
}));
