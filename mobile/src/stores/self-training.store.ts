import { create } from 'zustand';
import { fetchSelfSessions as apiFetchSelfSessions, fetchSelfSession as apiFetchSelfSession } from '../lib/api/training.api';
import { SelfSessionSummary, SelfSessionDetail } from '../types/training';

interface SelfTrainingState {
  sessions: SelfSessionSummary[];
  selectedSession: SelfSessionDetail | null;
  loading: boolean;
  error: string | null;

  fetchSessions(): Promise<void>;
  fetchSession(sessionId: string): Promise<void>;
}

export const useSelfTrainingStore = create<SelfTrainingState>((set) => ({
  sessions: [],
  selectedSession: null,
  loading: false,
  error: null,

  async fetchSessions(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const sessions = await apiFetchSelfSessions();
      set({ sessions, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async fetchSession(sessionId: string): Promise<void> {
    set({ loading: true, error: null });
    try {
      const session = await apiFetchSelfSession(sessionId);
      set({ selectedSession: session, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },
}));
