jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from './client';
import { fetchMemberProgress, fetchExerciseHistory } from './member-progress.api';
import { MemberProgress, ExerciseSessionHistory } from '../../types/member-progress';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const MOCK_PROGRESS: MemberProgress = {
  heatmapDates: ['2026-06-04', '2026-06-02'],
  exercises: [{ exerciseId: 'ex1', exerciseName: 'Back Squat' }],
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

describe('member-progress.api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchMemberProgress', () => {
    it('GETs /training/members/:memberId/progress and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_PROGRESS });

      const result = await fetchMemberProgress('mem1');

      expect(mockGet).toHaveBeenCalledWith('/training/members/mem1/progress');
      expect(result).toEqual(MOCK_PROGRESS);
    });
  });

  describe('fetchExerciseHistory', () => {
    it('GETs /training/members/:memberId/exercise/:exerciseId and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_HISTORY });

      const result = await fetchExerciseHistory('mem1', 'ex1');

      expect(mockGet).toHaveBeenCalledWith('/training/members/mem1/exercise/ex1');
      expect(result).toEqual(MOCK_HISTORY);
    });
  });
});
