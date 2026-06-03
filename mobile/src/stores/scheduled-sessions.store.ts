import { create } from 'zustand';
import { fetchMySessions } from '../lib/api/scheduled-sessions.api';
import { ScheduledSession } from '../types/scheduled-sessions';

interface ScheduledSessionsState {
  items: ScheduledSession[];
  loading: boolean;
  error: string | null;
  fetchSessions(): Promise<void>;
  getUpcoming(now?: Date): ScheduledSession[];
  getPast(now?: Date): ScheduledSession[];
}

export const useScheduledSessionsStore = create<ScheduledSessionsState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  async fetchSessions(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const items = await fetchMySessions();
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  getUpcoming(now: Date = new Date()): ScheduledSession[] {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return get()
      .items.filter(
        (s) => s.status === 'scheduled' && new Date(s.date) >= startOfToday,
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  getPast(now: Date = new Date()): ScheduledSession[] {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return get()
      .items.filter(
        (s) => s.status === 'cancelled' || new Date(s.date) < startOfToday,
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
}));
