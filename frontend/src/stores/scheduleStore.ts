import { create } from 'zustand';
import * as scheduleApi from '@/api/schedule';

interface ScheduleState {
  sessions: scheduleApi.ScheduledSession[];
  isLoading: boolean;
  error: string | null;
  fetchSchedule: (memberId: string) => Promise<void>;
  createSession: (data: { memberIds: string[]; date: string; startTime: string; endTime: string }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  sessions: [],
  isLoading: false,
  error: null,

  fetchSchedule: async (memberId) => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await scheduleApi.fetchMemberSchedule(memberId);
      set({ sessions, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createSession: async (data) => {
    try {
      const session = await scheduleApi.createScheduledSession(data);
      set((s) => ({ sessions: [...s.sessions, session] }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteSession: async (id) => {
    try {
      await scheduleApi.cancelScheduledSession(id);
      set((s) => ({ sessions: s.sessions.filter((ss) => ss._id !== id) }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },
}));
