import { create } from 'zustand';
import { submitCheckIn, fetchCheckIns, fetchCheckIn } from '@/api/check-ins';
import type { CheckInRecord, CheckInPayload } from '@/api/check-ins';

export type { CheckInRecord, CheckInPayload };

interface MemberCheckInState {
  checkIns: CheckInRecord[];
  hasThisWeek: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  fetchHistory: () => Promise<void>;
  fetchOne: (id: string) => Promise<CheckInRecord>;
  submit: (payload: CheckInPayload) => Promise<CheckInRecord>;
}

function computeHasThisWeek(checkIns: CheckInRecord[]): boolean {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return checkIns.some((c) => new Date(c.submittedAt) >= weekStart);
}

export const useMemberCheckInStore = create<MemberCheckInState>((set, get) => ({
  checkIns: [],
  hasThisWeek: false,
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const checkIns = await fetchCheckIns();
      set({ checkIns, hasThisWeek: computeHasThisWeek(checkIns), isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchOne: async (id: string) => {
    return fetchCheckIn(id);
  },

  submit: async (payload: CheckInPayload) => {
    set({ isSubmitting: true, error: null });
    try {
      const result = await submitCheckIn(payload);
      const checkIns = [result, ...get().checkIns];
      set({ checkIns, hasThisWeek: true, isSubmitting: false });
      return result;
    } catch (err) {
      set({ isSubmitting: false, error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    }
  },
}));
