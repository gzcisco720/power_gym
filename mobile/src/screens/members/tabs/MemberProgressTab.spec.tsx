import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemberProgressTab } from './MemberProgressTab';
import { MemberProgress, ExerciseSessionHistory } from '../../../types/member-progress';

// Mock the store
jest.mock('../../../stores/member-progress.store');
import { useMemberProgressStore } from '../../../stores/member-progress.store';

const mockUseMemberProgressStore = useMemberProgressStore as jest.MockedFunction<
  typeof useMemberProgressStore
>;

function makeProgress(overrides: Partial<MemberProgress> = {}): MemberProgress {
  return {
    heatmapDates: [],
    exercises: [],
    ...overrides,
  };
}

function makeHistory(exerciseId: string, overrides: Partial<ExerciseSessionHistory> = {}): ExerciseSessionHistory {
  return {
    exerciseId,
    exerciseName: 'Back Squat',
    sessions: [
      {
        sessionId: 'sess1',
        date: '2026-06-01',
        sets: [{ setNumber: 1, weight: 100, reps: 5 }],
        estimatedOneRepMax: 117,
      },
    ],
    ...overrides,
  };
}

function buildStoreMock(overrides: {
  progressByMember?: Record<string, MemberProgress>;
  historyByExercise?: Record<string, ExerciseSessionHistory>;
  loadingProgress?: boolean;
  loadingHistory?: boolean;
  fetchProgress?: jest.Mock;
  fetchExerciseHistory?: jest.Mock;
}) {
  const defaults = {
    progressByMember: {},
    historyByExercise: {},
    loadingProgress: false,
    loadingHistory: false,
    error: null,
    fetchProgress: jest.fn().mockResolvedValue(undefined),
    fetchExerciseHistory: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  mockUseMemberProgressStore.mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(defaults);
    }
    return defaults;
  });

  return defaults;
}

describe('MemberProgressTab', () => {
  const MEMBER_ID = 'mem1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an emerald heatmap cell for every date in heatmapDates and a muted cell otherwise', () => {
    const heatmapDate = '2026-06-01';
    const otherDate = '2026-05-31';

    buildStoreMock({
      progressByMember: {
        [MEMBER_ID]: makeProgress({ heatmapDates: [heatmapDate] }),
      },
    });

    const { getByTestId } = render(<MemberProgressTab memberId={MEMBER_ID} />);

    const emeraldCell = getByTestId(`progress-heatmap-cell-${heatmapDate}`);
    expect(emeraldCell).toBeTruthy();
    // The emerald cell should have emerald class
    const emeraldProps = emeraldCell.props;
    expect(JSON.stringify(emeraldProps.className)).toContain('emerald');

    // The other date cell should exist and be muted
    const mutedCell = getByTestId(`progress-heatmap-cell-${otherDate}`);
    expect(mutedCell).toBeTruthy();
    const mutedProps = mutedCell.props;
    expect(JSON.stringify(mutedProps.className)).not.toContain('emerald');
  });

  it('renders one exercise pill per exercise in the store', () => {
    buildStoreMock({
      progressByMember: {
        [MEMBER_ID]: makeProgress({
          exercises: [
            { exerciseId: 'ex1', exerciseName: 'Back Squat' },
            { exerciseId: 'ex2', exerciseName: 'Bench Press' },
          ],
        }),
      },
    });

    const { getByTestId } = render(<MemberProgressTab memberId={MEMBER_ID} />);

    expect(getByTestId('progress-exercise-pill-ex1')).toBeTruthy();
    expect(getByTestId('progress-exercise-pill-ex2')).toBeTruthy();
  });

  it('tapping an exercise pill calls fetchExerciseHistory with memberId and that exerciseId', () => {
    const fetchExerciseHistory = jest.fn().mockResolvedValue(undefined);

    buildStoreMock({
      progressByMember: {
        [MEMBER_ID]: makeProgress({
          exercises: [{ exerciseId: 'ex1', exerciseName: 'Back Squat' }],
        }),
      },
      fetchExerciseHistory,
    });

    const { getByTestId } = render(<MemberProgressTab memberId={MEMBER_ID} />);

    fireEvent.press(getByTestId('progress-exercise-pill-ex1'));

    expect(fetchExerciseHistory).toHaveBeenCalledWith(MEMBER_ID, 'ex1');
  });

  it('renders session history cards with the Est. 1RM value from the store once an exercise is selected', () => {
    const fetchExerciseHistory = jest.fn().mockResolvedValue(undefined);

    buildStoreMock({
      progressByMember: {
        [MEMBER_ID]: makeProgress({
          exercises: [{ exerciseId: 'ex1', exerciseName: 'Back Squat' }],
        }),
      },
      historyByExercise: {
        [`${MEMBER_ID}:ex1`]: makeHistory('ex1'),
      },
      fetchExerciseHistory,
    });

    const { getByTestId, getByText } = render(<MemberProgressTab memberId={MEMBER_ID} />);

    fireEvent.press(getByTestId('progress-exercise-pill-ex1'));

    expect(getByTestId('progress-history-session-sess1')).toBeTruthy();
    expect(getByText('Est. 1RM 117 kg')).toBeTruthy();
  });

  it('shows the empty state when the member has no completed sessions', () => {
    buildStoreMock({
      progressByMember: {
        [MEMBER_ID]: makeProgress({ heatmapDates: [], exercises: [] }),
      },
    });

    const { getByTestId } = render(<MemberProgressTab memberId={MEMBER_ID} />);

    expect(getByTestId('progress-empty-state')).toBeTruthy();
  });
});
