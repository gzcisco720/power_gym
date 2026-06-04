/**
 * Stage 3 unit tests — WorkoutSessionScreen
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

const mockLogSet = jest.fn();
const mockFinishWorkout = jest.fn();

jest.mock('../../stores/training.store', () => ({
  useTrainingStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useRoute } from '@react-navigation/native';
import { useTrainingStore } from '../../stores/training.store';
import { WorkoutSession, SessionSet } from '../../types/training';
import { WorkoutSessionScreen } from './WorkoutSessionScreen';

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

function setupStore(session: WorkoutSession) {
  const state = {
    plan: null,
    activeSession: session,
    loading: false,
    error: null,
    fetchPlan: jest.fn(),
    startWorkout: jest.fn(),
    logSet: mockLogSet,
    finishWorkout: mockFinishWorkout,
    loggedSetCount: jest.fn().mockReturnValue(0),
  };

  mockUseTrainingStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

function setupRoute(session: WorkoutSession) {
  mockUseRoute.mockReturnValue({
    key: 'WorkoutSession',
    name: 'WorkoutSession',
    params: { session },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLogSet.mockResolvedValue(undefined);
  mockFinishWorkout.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkoutSessionScreen', () => {
  it('renders a set row per prescribed set with reps and weight inputs', () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);

    const { getByTestId } = render(<WorkoutSessionScreen />);

    expect(getByTestId('screen-WorkoutSession')).toBeTruthy();
    expect(getByTestId('workout-set-ex1-1')).toBeTruthy();
    expect(getByTestId('workout-set-ex1-2')).toBeTruthy();
    expect(getByTestId('set-reps-ex1-1')).toBeTruthy();
    expect(getByTestId('set-weight-ex1-1')).toBeTruthy();
    expect(getByTestId('log-set-ex1-1')).toBeTruthy();
  });

  it('weight input is absent for a bodyweight exercise set', () => {
    const session = makeSession({
      sets: [makeSet({ exerciseId: 'bw1', isBodyweight: true, setNumber: 1 })],
    });
    setupStore(session);
    setupRoute(session);

    const { getByTestId, queryByTestId } = render(<WorkoutSessionScreen />);

    expect(getByTestId('set-reps-bw1-1')).toBeTruthy();
    expect(queryByTestId('set-weight-bw1-1')).toBeNull();
  });

  it('tapping log-set calls logSet with the entered reps and weight', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);

    const { getByTestId } = render(<WorkoutSessionScreen />);

    fireEvent.changeText(getByTestId('set-reps-ex1-1'), '10');
    fireEvent.changeText(getByTestId('set-weight-ex1-1'), '80');

    await act(async () => {
      fireEvent.press(getByTestId('log-set-ex1-1'));
    });

    expect(mockLogSet).toHaveBeenCalledWith({
      exerciseId: 'ex1',
      setNumber: 1,
      actualReps: 10,
      actualWeight: 80,
    });
  });

  it('tapping finish-workout-button calls finishWorkout and navigates back', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);

    const { getByTestId } = render(<WorkoutSessionScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('finish-workout-button'));
    });

    expect(mockFinishWorkout).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
