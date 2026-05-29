import { create } from 'zustand';
import * as api from '@/api/body-tests';

interface BodyTestsState {
  testsByMember: Record<string, api.BodyTest[]>;
  isLoading: boolean;
  error: string | null;
  fetchTests: (memberId: string) => Promise<void>;
  createTest: (memberId: string, data: api.CreateBodyTestData) => Promise<void>;
  deleteTest: (memberId: string, testId: string) => Promise<void>;
  exportCsv: (memberId: string) => string;
}

export const useBodyTestsStore = create<BodyTestsState>((set) => ({
  testsByMember: {},
  isLoading: false,
  error: null,

  fetchTests: async (memberId) => {
    set({ isLoading: true, error: null });
    try {
      const tests = await api.fetchBodyTests(memberId);
      set((s) => ({ testsByMember: { ...s.testsByMember, [memberId]: tests }, isLoading: false }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createTest: async (memberId, data) => {
    const test = await api.createBodyTest(memberId, data);
    set((s) => ({
      testsByMember: {
        ...s.testsByMember,
        [memberId]: [...(s.testsByMember[memberId] ?? []), test],
      },
    }));
  },

  deleteTest: async (memberId, testId) => {
    await api.deleteBodyTest(memberId, testId);
    set((s) => ({
      testsByMember: {
        ...s.testsByMember,
        [memberId]: (s.testsByMember[memberId] ?? []).filter((t) => t._id !== testId),
      },
    }));
  },

  exportCsv: (memberId) => api.exportBodyTestsCsv(memberId),
}));
