/**
 * Stage 3 + Stage 7 unit tests — WorkoutSessionScreen
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
const mockAddSet = jest.fn();
const mockDeleteSet = jest.fn();

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
    addSet: mockAddSet,
    deleteSet: mockDeleteSet,
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
  mockAddSet.mockResolvedValue(undefined);
  mockDeleteSet.mockResolvedValue(undefined);
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

  it('tapping finish-workout-button opens the RPE sheet', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);

    const { getByTestId } = render(<WorkoutSessionScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('finish-workout-button'));
    });

    expect(getByTestId('rpe-sheet')).toBeTruthy();
    // finishWorkout not called yet — user must confirm RPE first
    expect(mockFinishWorkout).not.toHaveBeenCalled();
  });

  it('confirming RPE calls finishWorkout with the selected rpe and navigates back', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);

    const { getByTestId } = render(<WorkoutSessionScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('finish-workout-button'));
    });

    fireEvent.press(getByTestId('rpe-button-8'));

    await act(async () => {
      fireEvent.press(getByTestId('rpe-confirm-button'));
    });

    expect(mockFinishWorkout).toHaveBeenCalledWith(8);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('each exercise group shows an Add Set button that calls addSet', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);

    const { getByTestId } = render(<WorkoutSessionScreen />);

    expect(getByTestId('add-set-ex1')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('add-set-ex1'));
    });

    expect(mockAddSet).toHaveBeenCalledWith(session._id, 'ex1');
  });

  it('extra set rows show a delete button that calls deleteSet', async () => {
    const session = makeSession({
      sets: [
        makeSet({ exerciseId: 'ex1', setNumber: 1, isExtraSet: false }),
        makeSet({ exerciseId: 'ex1', setNumber: 2, isExtraSet: true }),
      ],
    });
    setupStore(session);
    setupRoute(session);

    const { getByTestId, queryByTestId } = render(<WorkoutSessionScreen />);

    // prescribed set has no delete button
    expect(queryByTestId('delete-set-ex1-1')).toBeNull();
    // extra set has delete button
    expect(getByTestId('delete-set-ex1-2')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('delete-set-ex1-2'));
    });

    expect(mockDeleteSet).toHaveBeenCalledWith(session._id, 'ex1', 2);
  });

  it('shows the elapsed timer in the header', () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);

    const { getByTestId } = render(<WorkoutSessionScreen />);

    expect(getByTestId('elapsed-timer')).toBeTruthy();
  });


  // Stage 10
  it('set complete > marks set done and calls log handler', async () => {
    const session = makeSession();
    setupStore(session);
    setupRoute(session);
    const { getByTestId } = render(<WorkoutSessionScreen />);
    fireEvent.changeText(getByTestId('set-reps-ex1-1'), '10');
    fireEvent.changeText(getByTestId('set-weight-ex1-1'), '80');
    await act(async () => { fireEvent.press(getByTestId('log-set-ex1-1')); });
    expect(mockLogSet).toHaveBeenCalledWith({ exerciseId: 'ex1', setNumber: 1, actualReps: 10, actualWeight: 80 });
  });
});
