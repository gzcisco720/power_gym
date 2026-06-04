jest.mock('../lib/api/training.api', () => ({
  fetchMyPlan: jest.fn(),
  startSession: jest.fn(),
  patchSet: jest.fn(),
  finishSession: jest.fn(),
  assignPlan: jest.fn(),
  fetchMemberHistory: jest.fn(),
}));

import * as trainingApi from '../lib/api/training.api';
import { useTrainingStore } from './training.store';
import { ActivePlan, WorkoutSession, PatchSetInput } from '../types/training';

const mockFetchMyPlan = trainingApi.fetchMyPlan as jest.MockedFunction<typeof trainingApi.fetchMyPlan>;
const mockStartSession = trainingApi.startSession as jest.MockedFunction<typeof trainingApi.startSession>;
const mockPatchSet = trainingApi.patchSet as jest.MockedFunction<typeof trainingApi.patchSet>;
const mockFinishSession = trainingApi.finishSession as jest.MockedFunction<typeof trainingApi.finishSession>;

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
          sets: 2,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
        },
      ],
    },
  ],
};

const makeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
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
    {
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      groupId: 'g1',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 2,
      prescribedRepsMin: 8,
      prescribedRepsMax: 12,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    },
  ],
  ...overrides,
});

function resetStore() {
  useTrainingStore.setState({ plan: null, activeSession: null, loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useTrainingStore', () => {
  describe('fetchPlan', () => {
    it('populates plan and clears loading on success', async () => {
      mockFetchMyPlan.mockResolvedValueOnce(MOCK_PLAN);

      await useTrainingStore.getState().fetchPlan();

      const state = useTrainingStore.getState();
      expect(state.plan).toEqual(MOCK_PLAN);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading on rejection', async () => {
      mockFetchMyPlan.mockRejectedValueOnce(new Error('Network error'));

      await useTrainingStore.getState().fetchPlan();

      const state = useTrainingStore.getState();
      expect(state.plan).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('startWorkout', () => {
    it('sets activeSession to the started session', async () => {
      const session = makeSession();
      mockStartSession.mockResolvedValueOnce(session);

      const result = await useTrainingStore.getState().startWorkout(1);

      const state = useTrainingStore.getState();
      expect(state.activeSession).toEqual(session);
      expect(result).toEqual(session);
    });
  });

  describe('logSet', () => {
    it('replaces the matched set in activeSession with the patched server response', async () => {
      const session = makeSession();
      useTrainingStore.setState({ activeSession: session });

      const patchedSet = { ...session.sets[0], actualReps: 10, actualWeight: 80, completedAt: '2024-01-02T10:05:00.000Z' };
      const patchedSession: WorkoutSession = { ...session, sets: [patchedSet, session.sets[1]] };
      mockPatchSet.mockResolvedValueOnce(patchedSession);

      const input: PatchSetInput = { setNumber: 1, exerciseId: 'ex1', actualReps: 10, actualWeight: 80 };
      await useTrainingStore.getState().logSet(input);

      const state = useTrainingStore.getState();
      expect(state.activeSession).toEqual(patchedSession);
    });
  });

  describe('finishWorkout', () => {
    it('clears activeSession on success', async () => {
      const session = makeSession();
      useTrainingStore.setState({ activeSession: session });

      const finished: WorkoutSession = { ...session, completedAt: '2024-01-02T10:30:00.000Z' };
      mockFinishSession.mockResolvedValueOnce(finished);

      await useTrainingStore.getState().finishWorkout();

      const state = useTrainingStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('loggedSetCount', () => {
    it('returns the number of sets with completedAt != null', () => {
      const session = makeSession({
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
            completedAt: '2024-01-02T10:05:00.000Z',
          },
          {
            exerciseId: 'ex1',
            exerciseName: 'Bench Press',
            groupId: 'g1',
            isSuperset: false,
            isBodyweight: false,
            setNumber: 2,
            prescribedRepsMin: 8,
            prescribedRepsMax: 12,
            isExtraSet: false,
            actualWeight: null,
            actualReps: null,
            completedAt: null,
          },
        ],
      });
      useTrainingStore.setState({ activeSession: session });

      const count = useTrainingStore.getState().loggedSetCount();

      expect(count).toBe(1);
    });

    it('returns 0 when there is no active session', () => {
      useTrainingStore.setState({ activeSession: null });

      const count = useTrainingStore.getState().loggedSetCount();

      expect(count).toBe(0);
    });
  });

  describe('integration: startWorkout + logSet', () => {
    it('results in activeSession.sets containing exactly one set with completedAt != null and loggedSetCount returning 1', async () => {
      const session = makeSession();
      mockStartSession.mockResolvedValueOnce(session);
      await useTrainingStore.getState().startWorkout(1);

      const patchedSet = { ...session.sets[0], actualReps: 10, actualWeight: 80, completedAt: '2024-01-02T10:05:00.000Z' };
      const patchedSession: WorkoutSession = { ...session, sets: [patchedSet, session.sets[1]] };
      mockPatchSet.mockResolvedValueOnce(patchedSession);

      const input: PatchSetInput = { setNumber: 1, exerciseId: 'ex1', actualReps: 10, actualWeight: 80 };
      await useTrainingStore.getState().logSet(input);

      const state = useTrainingStore.getState();
      const loggedSets = state.activeSession?.sets.filter((s) => s.completedAt !== null) ?? [];
      expect(loggedSets).toHaveLength(1);
      expect(state.loggedSetCount()).toBe(1);
    });
  });

  describe('integration: finishWorkout', () => {
    it('leaves activeSession === null and error === null after a successful finish', async () => {
      const session = makeSession();
      useTrainingStore.setState({ activeSession: session });

      const finished: WorkoutSession = { ...session, completedAt: '2024-01-02T10:30:00.000Z' };
      mockFinishSession.mockResolvedValueOnce(finished);

      await useTrainingStore.getState().finishWorkout();

      const state = useTrainingStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});

// Silence unused mock warnings
void mockFetchMyPlan;
