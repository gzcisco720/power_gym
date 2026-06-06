/**
 * Stage 3 unit tests — TrainerWorkoutSessionScreen
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: jest.fn(),
}));

const mockPatchMemberSet = jest.fn();
const mockFinishMemberSession = jest.fn();

jest.mock('../../../stores/training.store', () => ({
  useTrainingStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useRoute } from '@react-navigation/native';
import { useTrainingStore } from '../../../stores/training.store';
import { WorkoutSession, SessionSet } from '../../../types/training';
import { TrainerWorkoutSessionScreen } from '../TrainerWorkoutSessionScreen';

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseTrainingStore = useTrainingStore as jest.MockedFunction<typeof useTrainingStore>;

function makeSet(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
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
    ...overrides,
  };
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    _id: 'sess1',
    memberId: 'mem1',
    memberPlanId: 'plan1',
    dayNumber: 1,
    dayName: 'Day 1 - Push',
    startedAt: '2026-06-04T10:00:00.000Z',
    completedAt: null,
    sets: [
      makeSet({ exerciseId: 'ex1', setNumber: 1 }),
      makeSet({ exerciseId: 'ex1', setNumber: 2 }),
    ],
    ...overrides,
  };
}

function setupStore(memberSession: WorkoutSession | null) {
  const state = {
    memberSession,
    patchMemberSet: mockPatchMemberSet,
    finishMemberSession: mockFinishMemberSession,
  };

  mockUseTrainingStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

function setupRoute(memberId: string, memberName: string) {
  mockUseRoute.mockReturnValue({
    key: 'TrainerWorkoutSession',
    name: 'TrainerWorkoutSession',
    params: { memberId, memberName },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPatchMemberSet.mockResolvedValue(undefined);
  mockFinishMemberSession.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TrainerWorkoutSessionScreen', () => {
  it('renders memberName in the header and one set row per set in memberSession', () => {
    const session = makeSession();
    setupStore(session);
    setupRoute('mem1', 'Alice Smith');

    const { getByTestId, getByText } = render(<TrainerWorkoutSessionScreen />);

    expect(getByTestId('screen-TrainerWorkoutSession')).toBeTruthy();
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(getByTestId('workout-set-ex1-1')).toBeTruthy();
    expect(getByTestId('workout-set-ex1-2')).toBeTruthy();
    expect(getByTestId('set-reps-ex1-1')).toBeTruthy();
    expect(getByTestId('set-weight-ex1-1')).toBeTruthy();
    expect(getByTestId('log-set-ex1-1')).toBeTruthy();
  });

  it('tapping Log on a set calls patchMemberSet with that set\'s exerciseId/setNumber and entered reps/weight', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute('mem1', 'Alice Smith');

    const { getByTestId } = render(<TrainerWorkoutSessionScreen />);

    fireEvent.changeText(getByTestId('set-reps-ex1-1'), '10');
    fireEvent.changeText(getByTestId('set-weight-ex1-1'), '80');

    await act(async () => {
      fireEvent.press(getByTestId('log-set-ex1-1'));
    });

    expect(mockPatchMemberSet).toHaveBeenCalledWith('mem1', {
      exerciseId: 'ex1',
      setNumber: 1,
      actualReps: 10,
      actualWeight: 80,
    });
  });

  it('tapping Finish Workout calls finishMemberSession(memberId) and navigates back', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute('mem1', 'Alice Smith');

    const { getByTestId } = render(<TrainerWorkoutSessionScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('finish-workout-button'));
    });

    expect(mockFinishMemberSession).toHaveBeenCalledWith('mem1');
    expect(mockGoBack).toHaveBeenCalled();
  });
});
