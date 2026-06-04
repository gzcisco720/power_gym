jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchMyPlan,
  startSession,
  patchSet,
  finishSession,
  assignPlan,
  fetchMemberHistory,
} from './training.api';
import { ActivePlan, WorkoutSession, PatchSetInput } from '../../types/training';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;

const MOCK_PLAN: ActivePlan = {
  _id: 'plan1',
  name: 'Push Pull Legs',
  templateId: 'tpl1',
  assignedAt: '2024-01-01T00:00:00.000Z',
  days: [
    {
      dayNumber: 1,
      name: 'Push Day',
      exercises: [
        {
          groupId: 'g1',
          isSuperset: false,
          exerciseId: 'ex1',
          exerciseName: 'Bench Press',
          imageUrl: null,
          isBodyweight: false,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
        },
      ],
    },
  ],
};

const MOCK_SESSION: WorkoutSession = {
  _id: 'sess1',
  memberId: 'mem1',
  memberPlanId: 'plan1',
  dayNumber: 1,
  dayName: 'Push Day',
  startedAt: '2024-01-02T10:00:00.000Z',
  completedAt: null,
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
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('training.api', () => {
  describe('fetchMyPlan', () => {
    it('GETs /training/my-plan and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_PLAN });

      const result = await fetchMyPlan();

      expect(mockGet).toHaveBeenCalledWith('/training/my-plan');
      expect(result).toEqual(MOCK_PLAN);
    });

    it('returns null when the server responds with null', async () => {
      mockGet.mockResolvedValueOnce({ data: null });

      const result = await fetchMyPlan();

      expect(result).toBeNull();
    });
  });

  describe('startSession', () => {
    it('POSTs /training/sessions with {dayNumber} and returns the session', async () => {
      mockPost.mockResolvedValueOnce({ data: MOCK_SESSION });

      const result = await startSession(1);

      expect(mockPost).toHaveBeenCalledWith('/training/sessions', { dayNumber: 1 });
      expect(result).toEqual(MOCK_SESSION);
    });
  });

  describe('patchSet', () => {
    it('PATCHes /training/sessions/:id/sets with the input body', async () => {
      const input: PatchSetInput = {
        setNumber: 1,
        exerciseId: 'ex1',
        actualReps: 10,
        actualWeight: 80,
      };
      const patched: WorkoutSession = {
        ...MOCK_SESSION,
        sets: [{ ...MOCK_SESSION.sets[0], actualReps: 10, actualWeight: 80, completedAt: '2024-01-02T10:05:00.000Z' }],
      };
      mockPatch.mockResolvedValueOnce({ data: patched });

      const result = await patchSet('sess1', input);

      expect(mockPatch).toHaveBeenCalledWith('/training/sessions/sess1/sets', input);
      expect(result).toEqual(patched);
    });
  });

  describe('finishSession', () => {
    it('POSTs /training/sessions/:id/finish and returns the finished session', async () => {
      const finished: WorkoutSession = { ...MOCK_SESSION, completedAt: '2024-01-02T10:30:00.000Z' };
      mockPost.mockResolvedValueOnce({ data: finished });

      const result = await finishSession('sess1');

      expect(mockPost).toHaveBeenCalledWith('/training/sessions/sess1/finish', {});
      expect(result).toEqual(finished);
    });
  });

  describe('assignPlan', () => {
    it('POSTs /training/members/:id/assign-plan with {templateId}', async () => {
      mockPost.mockResolvedValueOnce({ data: MOCK_PLAN });

      const result = await assignPlan('mem1', 'tpl1');

      expect(mockPost).toHaveBeenCalledWith('/training/members/mem1/assign-plan', { templateId: 'tpl1' });
      expect(result).toEqual(MOCK_PLAN);
    });
  });

  describe('fetchMemberHistory', () => {
    it('GETs /training/members/:id/history and returns the sessions array', async () => {
      const history: WorkoutSession[] = [{ ...MOCK_SESSION, completedAt: '2024-01-02T10:30:00.000Z' }];
      mockGet.mockResolvedValueOnce({ data: history });

      const result = await fetchMemberHistory('mem1');

      expect(mockGet).toHaveBeenCalledWith('/training/members/mem1/history');
      expect(result).toEqual(history);
    });
  });
});
