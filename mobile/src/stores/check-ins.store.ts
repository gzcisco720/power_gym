import { create } from 'zustand';
import { fetchCheckIns as apiFetchCheckIns } from '../lib/api/check-ins.api';
import { CheckIn } from '../types/check-ins';

interface CheckInsState {
  items: CheckIn[];
  loading: boolean;
  error: string | null;
  fetchCheckIns(): Promise<void>;
  addItem(item: CheckIn): void;
  hasCheckedInThisWeek(): boolean;
}

/** Returns Monday 00:00:00 of the current week in local time. */
function getThisWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
}

export const useCheckInsStore = create<CheckInsState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  async fetchCheckIns(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const items = await apiFetchCheckIns();
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  addItem(item: CheckIn): void {
    set((state) => ({ items: [item, ...state.items] }));
  },

  hasCheckedInThisWeek(): boolean {
    const { items } = get();
    if (items.length === 0) return false;
    const weekStart = getThisWeekMonday();
    const submittedAt = new Date(items[0].submittedAt);
    return submittedAt >= weekStart;
  },
}));
