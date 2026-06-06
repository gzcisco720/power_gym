/**
 * Stage 5 unit tests — SelfSessionDetailScreen
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { sessionId: 'sess1' } }),
}));

const mockFetchSession = jest.fn();

jest.mock('../../stores/self-training.store', () => ({
  useSelfTrainingStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useSelfTrainingStore } from '../../stores/self-training.store';
import { SelfSessionDetail } from '../../types/training';
import { SelfSessionDetailScreen } from './SelfSessionDetailScreen';

const mockUseSelfTrainingStore = useSelfTrainingStore as jest.MockedFunction<typeof useSelfTrainingStore>;

function makeDetail(overrides: Partial<SelfSessionDetail> = {}): SelfSessionDetail {
  return {
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
        actualWeight: 80,
        actualReps: 9,
        completedAt: '2026-06-01T10:10:00.000Z',
      },
      {
        exerciseId: 'ex2',
        exerciseName: 'Overhead Press',
        groupId: 'g2',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 1,
        prescribedRepsMin: 8,
        prescribedRepsMax: 10,
        isExtraSet: false,
        actualWeight: 50,
        actualReps: 8,
        completedAt: '2026-06-01T10:20:00.000Z',
      },
    ],
    rpe: 8,
    note: null,
    ...overrides,
  };
}

function setupStore(session: SelfSessionDetail | null, loading = false) {
  const state = {
    sessions: [],
    selectedSession: session,
    loading,
    error: null,
    fetchSessions: jest.fn(),
    fetchSession: mockFetchSession,
  };

  mockUseSelfTrainingStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSession.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SelfSessionDetailScreen', () => {
  it('renders each exercise grouped with its logged sets showing reps and weight', () => {
    setupStore(makeDetail());

    const { getByTestId, getByText } = render(<SelfSessionDetailScreen />);

    expect(getByTestId('screen-SelfSessionDetail')).toBeTruthy();

    // Both exercise groups should render
    expect(getByTestId('exercise-group-ex1')).toBeTruthy();
    expect(getByTestId('exercise-group-ex2')).toBeTruthy();

    // Exercise names
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('Overhead Press')).toBeTruthy();

    // Set rows with reps and weight visible
    expect(getByTestId('set-row-ex1-1')).toBeTruthy();
    expect(getByTestId('set-row-ex1-2')).toBeTruthy();
    expect(getByTestId('set-row-ex2-1')).toBeTruthy();
  });

  it('shows the completion status and the session note when present', () => {
    const detailWithNote = makeDetail({ rpe: 9, note: 'Great session' });
    setupStore(detailWithNote);

    const { getByTestId, getByText } = render(<SelfSessionDetailScreen />);

    // Completed status badge visible
    expect(getByTestId('session-status-completed')).toBeTruthy();

    // RPE shown
    expect(getByText(/RPE 9/)).toBeTruthy();

    // Note text rendered
    expect(getByText('Great session')).toBeTruthy();
  });
});
