jest.mock('../lib/api/member-progress.api', () => ({
  fetchMemberProgress: jest.fn(),
  fetchExerciseHistory: jest.fn(),
}));

import * as memberProgressApi from '../lib/api/member-progress.api';
import { useMemberProgressStore } from './member-progress.store';
import { MemberProgress, ExerciseSessionHistory } from '../types/member-progress';

const mockFetchMemberProgress = memberProgressApi.fetchMemberProgress as jest.MockedFunction<
  typeof memberProgressApi.fetchMemberProgress
>;
const mockFetchExerciseHistory = memberProgressApi.fetchExerciseHistory as jest.MockedFunction<
  typeof memberProgressApi.fetchExerciseHistory
>;

const MOCK_PROGRESS: MemberProgress = {
  heatmapDates: ['2026-06-04', '2026-06-02'],
  exercises: [
    { exerciseId: 'ex1', exerciseName: 'Back Squat' },
    { exerciseId: 'ex2', exerciseName: 'Bench Press' },
  ],
};

const MOCK_HISTORY: ExerciseSessionHistory = {
  exerciseId: 'ex1',
  exerciseName: 'Back Squat',
  sessions: [
    {
      sessionId: 'sess1',
      date: '2026-06-04',
      sets: [{ setNumber: 1, weight: 100, reps: 5 }],
      estimatedOneRepMax: 117,
    },
  ],
};

const MOCK_HISTORY_2: ExerciseSessionHistory = {
  exerciseId: 'ex2',
  exerciseName: 'Bench Press',
  sessions: [
    {
      sessionId: 'sess2',
      date: '2026-06-03',
      sets: [{ setNumber: 1, weight: 80, reps: 8 }],
      estimatedOneRepMax: 101,
    },
  ],
};

function resetStore() {
  useMemberProgressStore.setState({
    progressByMember: {},
    historyByExercise: {},
    loadingProgress: false,
    loadingHistory: false,
    error: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useMemberProgressStore', () => {
  describe('fetchProgress', () => {
    it('populates progressByMember[memberId] and clears loadingProgress on success', async () => {
      mockFetchMemberProgress.mockResolvedValueOnce(MOCK_PROGRESS);

      await useMemberProgressStore.getState().fetchProgress('mem1');

      const state = useMemberProgressStore.getState();
      expect(state.progressByMember['mem1']).toEqual(MOCK_PROGRESS);
      expect(state.loadingProgress).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error message and clears loadingProgress when the API rejects', async () => {
      mockFetchMemberProgress.mockRejectedValueOnce(new Error('Network error'));

      await useMemberProgressStore.getState().fetchProgress('mem1');

      const state = useMemberProgressStore.getState();
      expect(state.loadingProgress).toBe(false);
      expect(state.error).toBe('Network error');
      expect(state.progressByMember['mem1']).toBeUndefined();
    });
  });

  describe('fetchExerciseHistory', () => {
    it('stores history under the `${memberId}:${exerciseId}` key and clears loadingHistory on success', async () => {
      mockFetchExerciseHistory.mockResolvedValueOnce(MOCK_HISTORY);

      await useMemberProgressStore.getState().fetchExerciseHistory('mem1', 'ex1');

      const state = useMemberProgressStore.getState();
      expect(state.historyByExercise['mem1:ex1']).toEqual(MOCK_HISTORY);
      expect(state.loadingHistory).toBe(false);
      expect(state.error).toBeNull();
    });

    it('leaves previously fetched exercise histories intact when fetching a new exercise', async () => {
      mockFetchExerciseHistory.mockResolvedValueOnce(MOCK_HISTORY);
      await useMemberProgressStore.getState().fetchExerciseHistory('mem1', 'ex1');

      mockFetchExerciseHistory.mockResolvedValueOnce(MOCK_HISTORY_2);
      await useMemberProgressStore.getState().fetchExerciseHistory('mem1', 'ex2');

      const state = useMemberProgressStore.getState();
      expect(state.historyByExercise['mem1:ex1']).toEqual(MOCK_HISTORY);
      expect(state.historyByExercise['mem1:ex2']).toEqual(MOCK_HISTORY_2);
    });
  });
});
