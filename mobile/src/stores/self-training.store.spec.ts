jest.mock('../lib/api/training.api', () => ({
  fetchSelfSessions: jest.fn(),
  fetchSelfSession: jest.fn(),
}));

import * as trainingApi from '../lib/api/training.api';
import { useSelfTrainingStore } from './self-training.store';
import { SelfSessionSummary, SelfSessionDetail } from '../types/training';

const mockFetchSelfSessions = trainingApi.fetchSelfSessions as jest.MockedFunction<
  typeof trainingApi.fetchSelfSessions
>;
const mockFetchSelfSession = trainingApi.fetchSelfSession as jest.MockedFunction<
  typeof trainingApi.fetchSelfSession
>;

const MOCK_SUMMARY: SelfSessionSummary = {
  _id: 'sess1',
  dayName: 'Push Day',
  startedAt: '2026-06-01T10:00:00.000Z',
  completedAt: '2026-06-01T11:00:00.000Z',
  setCount: 9,
  rpe: 8,
};

const MOCK_DETAIL: SelfSessionDetail = {
  _id: 'sess1',
  dayName: 'Push Day',
  startedAt: '2026-06-01T10:00:00.000Z',
  completedAt: '2026-06-01T11:00:00.000Z',
  sets: [
    {
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      groupId: 'g1',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 12,
      isExtraSet: false,
      actualWeight: 80,
      actualReps: 10,
      completedAt: '2026-06-01T10:05:00.000Z',
    },
  ],
  rpe: 8,
};

function resetStore() {
  useSelfTrainingStore.setState({
    sessions: [],
    selectedSession: null,
    loading: false,
    error: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useSelfTrainingStore', () => {
  describe('fetchSessions', () => {
    it('populates sessions and clears loading on success', async () => {
      mockFetchSelfSessions.mockResolvedValueOnce([MOCK_SUMMARY]);

      await useSelfTrainingStore.getState().fetchSessions();

      const state = useSelfTrainingStore.getState();
      expect(state.sessions).toEqual([MOCK_SUMMARY]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the api rejects', async () => {
      mockFetchSelfSessions.mockRejectedValueOnce(new Error('Network error'));

      await useSelfTrainingStore.getState().fetchSessions();

      const state = useSelfTrainingStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
      expect(state.sessions).toEqual([]);
    });
  });

  describe('fetchSession', () => {
    it('populates selectedSession with the fetched detail and clears loading', async () => {
      mockFetchSelfSession.mockResolvedValueOnce(MOCK_DETAIL);

      await useSelfTrainingStore.getState().fetchSession('sess1');

      const state = useSelfTrainingStore.getState();
      expect(state.selectedSession).toEqual(MOCK_DETAIL);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the api rejects', async () => {
      mockFetchSelfSession.mockRejectedValueOnce(new Error('Not found'));

      await useSelfTrainingStore.getState().fetchSession('sess1');

      const state = useSelfTrainingStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Not found');
      expect(state.selectedSession).toBeNull();
    });
  });
});
