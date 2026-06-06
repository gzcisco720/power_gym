import { act, renderHook } from '@testing-library/react-native';

jest.mock('../../src/lib/api/training.api', () => ({
  fetchMyPlan: jest.fn(),
  startSession: jest.fn(),
  patchSet: jest.fn(),
  finishSession: jest.fn(),
  assignPlan: jest.fn(),
  fetchMemberHistory: jest.fn(),
  fetchMemberPlan: jest.fn(),
  startMemberSession: jest.fn(),
  patchMemberSet: jest.fn(),
  finishMemberSession: jest.fn(),
}));

import * as trainingApi from '../../src/lib/api/training.api';
import { useTrainingStore } from '../../src/stores/training.store';
import { ActivePlan, WorkoutSession } from '../../src/types/training';

const mockFetchMemberPlan = trainingApi.fetchMemberPlan as jest.MockedFunction<
  typeof trainingApi.fetchMemberPlan
>;
const mockStartMemberSession = trainingApi.startMemberSession as jest.MockedFunction<
  typeof trainingApi.startMemberSession
>;
const mockPatchMemberSet = trainingApi.patchMemberSet as jest.MockedFunction<
  typeof trainingApi.patchMemberSet
>;
const mockFinishMemberSession = trainingApi.finishMemberSession as jest.MockedFunction<
  typeof trainingApi.finishMemberSession
>;

function makePlan(overrides: Partial<ActivePlan> = {}): ActivePlan {
  return {
    _id: 'plan-1',
    name: 'Strength Plan',
    templateId: 'tmpl-1',
    assignedAt: '2026-06-01T00:00:00.000Z',
    days: [
      {
        dayNumber: 1,
        name: 'Day 1',
        exercises: [],
      },
    ],
    ...overrides,
  };
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    _id: 'session-1',
    memberId: 'member-1',
    memberPlanId: 'plan-1',
    dayNumber: 1,
    dayName: 'Day 1',
    startedAt: '2026-06-06T10:00:00.000Z',
    completedAt: null,
    sets: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Squat',
        groupId: 'group-1',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 1,
        prescribedRepsMin: 8,
        prescribedRepsMax: 10,
        isExtraSet: false,
        actualWeight: null,
        actualReps: null,
        completedAt: null,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  useTrainingStore.setState({
    plan: null,
    activeSession: null,
    memberSession: null,
    loading: false,
    error: null,
  });
  jest.clearAllMocks();
});

describe('useTrainingStore', () => {
  describe('fetchMemberPlan', () => {
    it('calls fetchMemberPlan(memberId) API and returns the resolved plan', async () => {
      const plan = makePlan();
      mockFetchMemberPlan.mockResolvedValueOnce(plan);

      const { result } = renderHook(() => useTrainingStore());

      let returned: ActivePlan | null = null;
      await act(async () => {
        returned = await result.current.fetchMemberPlan('member-1');
      });

      expect(mockFetchMemberPlan).toHaveBeenCalledWith('member-1');
      expect(returned).toEqual(plan);
    });

    it('returns null when the member has no active plan', async () => {
      mockFetchMemberPlan.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useTrainingStore());

      let returned: ActivePlan | null | undefined = undefined;
      await act(async () => {
        returned = await result.current.fetchMemberPlan('member-1');
      });

      expect(returned).toBeNull();
    });
  });

  describe('startMemberSession', () => {
    it('stores returned session in memberSession', async () => {
      const session = makeSession();
      mockStartMemberSession.mockResolvedValueOnce(session);

      const { result } = renderHook(() => useTrainingStore());

      await act(async () => {
        await result.current.startMemberSession('member-1', 1);
      });

      expect(result.current.memberSession).toEqual(session);
    });

    it('returns the started session', async () => {
      const session = makeSession();
      mockStartMemberSession.mockResolvedValueOnce(session);

      const { result } = renderHook(() => useTrainingStore());

      let returned: WorkoutSession | null = null;
      await act(async () => {
        returned = await result.current.startMemberSession('member-1', 1);
      });

      expect(returned).toEqual(session);
    });
  });

  describe('patchMemberSet', () => {
    it('sends input against current memberSession id and replaces memberSession with API response', async () => {
      const session = makeSession();
      const updatedSession = makeSession({
        sets: [{ ...session.sets[0], actualReps: 9, actualWeight: 100, completedAt: '2026-06-06T10:05:00.000Z' }],
      });
      useTrainingStore.setState({ memberSession: session });
      mockPatchMemberSet.mockResolvedValueOnce(updatedSession);

      const { result } = renderHook(() => useTrainingStore());

      await act(async () => {
        await result.current.patchMemberSet('member-1', {
          setNumber: 1,
          exerciseId: 'ex-1',
          actualReps: 9,
          actualWeight: 100,
        });
      });

      expect(mockPatchMemberSet).toHaveBeenCalledWith('member-1', 'session-1', {
        setNumber: 1,
        exerciseId: 'ex-1',
        actualReps: 9,
        actualWeight: 100,
      });
      expect(result.current.memberSession).toEqual(updatedSession);
    });

    it('does nothing when memberSession is null', async () => {
      useTrainingStore.setState({ memberSession: null });

      const { result } = renderHook(() => useTrainingStore());

      await act(async () => {
        await result.current.patchMemberSet('member-1', {
          setNumber: 1,
          exerciseId: 'ex-1',
          actualReps: 9,
          actualWeight: 100,
        });
      });

      expect(mockPatchMemberSet).not.toHaveBeenCalled();
      expect(result.current.memberSession).toBeNull();
    });
  });

  describe('finishMemberSession', () => {
    it('calls finishMemberSession API and clears memberSession to null', async () => {
      const session = makeSession();
      const finishedSession = makeSession({ completedAt: '2026-06-06T10:30:00.000Z' });
      useTrainingStore.setState({ memberSession: session });
      mockFinishMemberSession.mockResolvedValueOnce(finishedSession);

      const { result } = renderHook(() => useTrainingStore());

      await act(async () => {
        await result.current.finishMemberSession('member-1');
      });

      expect(mockFinishMemberSession).toHaveBeenCalledWith('member-1', 'session-1');
      expect(result.current.memberSession).toBeNull();
    });
  });

  describe('integration: start → patch → finish sequence', () => {
    it('after the full sequence memberSession is null and finishMemberSession API was called once with the started session id', async () => {
      const session = makeSession({ _id: 'session-seq-1' });
      const updatedSession = makeSession({
        _id: 'session-seq-1',
        sets: [{ ...session.sets[0], actualReps: 8, actualWeight: 80, completedAt: '2026-06-06T10:05:00.000Z' }],
      });
      const finishedSession = makeSession({ _id: 'session-seq-1', completedAt: '2026-06-06T10:30:00.000Z' });

      mockStartMemberSession.mockResolvedValueOnce(session);
      mockPatchMemberSet.mockResolvedValueOnce(updatedSession);
      mockFinishMemberSession.mockResolvedValueOnce(finishedSession);

      const { result } = renderHook(() => useTrainingStore());

      await act(async () => {
        await result.current.startMemberSession('member-1', 1);
        await result.current.patchMemberSet('member-1', {
          setNumber: 1,
          exerciseId: 'ex-1',
          actualReps: 8,
          actualWeight: 80,
        });
        await result.current.finishMemberSession('member-1');
      });

      expect(result.current.memberSession).toBeNull();
      expect(mockFinishMemberSession).toHaveBeenCalledTimes(1);
      expect(mockFinishMemberSession).toHaveBeenCalledWith('member-1', 'session-seq-1');
    });
  });

  describe('trainer-log state isolation', () => {
    it('running startMemberSession then finishMemberSession leaves activeSession untouched (stays null)', async () => {
      const session = makeSession();
      const finishedSession = makeSession({ completedAt: '2026-06-06T10:30:00.000Z' });

      mockStartMemberSession.mockResolvedValueOnce(session);
      mockFinishMemberSession.mockResolvedValueOnce(finishedSession);

      const { result } = renderHook(() => useTrainingStore());

      expect(result.current.activeSession).toBeNull();

      await act(async () => {
        await result.current.startMemberSession('member-1', 1);
        await result.current.finishMemberSession('member-1');
      });

      expect(result.current.activeSession).toBeNull();
    });
  });
});
