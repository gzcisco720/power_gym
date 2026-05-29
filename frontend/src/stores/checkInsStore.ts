import { create } from 'zustand';
import * as api from '@/api/check-ins';

interface CheckInsState {
  checkIns: api.CheckIn[];
  config: api.CheckInConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchCheckIns: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  submitCheckIn: (data: api.SubmitCheckInData) => Promise<void>;
}

export const useCheckInsStore = create<CheckInsState>((set) => ({
  checkIns: [],
  config: null,
  isLoading: false,
  error: null,

  fetchCheckIns: async () => {
    set({ isLoading: true, error: null });
    try {
      const checkIns = await api.fetchCheckIns();
      set({ checkIns, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  fetchConfig: async () => {
    try {
      const config = await api.fetchConfig();
      set({ config });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  submitCheckIn: async (data) => {
    set({ error: null });
    try {
      const checkIn = await api.submitCheckIn(data);
      set((s) => ({ checkIns: [checkIn, ...s.checkIns] }));
    } catch (e) {
      const msg = String(e);
      if (msg.includes('409')) {
        set({ error: 'already_submitted' });
      } else {
        set({ error: msg });
      }
    }
  },
}));
