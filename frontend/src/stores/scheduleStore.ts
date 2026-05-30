import { create } from 'zustand';
import { fetchSessions } from '@/api/schedule';
import type { CalendarSession } from '@/api/schedule';

interface ScheduleState {
  sessions: CalendarSession[];
  isLoading: boolean;
  error: string | null;
  fetchRange: (start: string, end: string) => Promise<CalendarSession[]>;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  sessions: [],
  isLoading: false,
  error: null,

  fetchRange: async (start: string, end: string) => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await fetchSessions(start, end);
      set({ sessions, isLoading: false });
      return sessions;
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
      return [];
    }
  },
}));
