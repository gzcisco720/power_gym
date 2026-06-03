/**
 * Stage 3 unit tests — MyScheduleScreen
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/scheduled-sessions.store', () => ({
  useScheduledSessionsStore: jest.fn(),
}));

import { useScheduledSessionsStore } from '../../stores/scheduled-sessions.store';
import { MyScheduleScreen } from './MyScheduleScreen';
import { ScheduledSession } from '../../types/scheduled-sessions';

const mockUseStore = useScheduledSessionsStore as jest.MockedFunction<
  typeof useScheduledSessionsStore
>;

function makeSession(overrides: Partial<ScheduledSession> = {}): ScheduledSession {
  return {
    _id: 'sess1',
    date: '2026-07-15T00:00:00.000Z',
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    trainerName: 'Jane Smith',
    serviceTypeName: null,
    isRecurring: false,
    ...overrides,
  };
}

function makeStoreState(
  overrides: Partial<ReturnType<typeof useScheduledSessionsStore>> = {},
): ReturnType<typeof useScheduledSessionsStore> {
  const fetchSessions = jest.fn().mockResolvedValue(undefined);
  const getUpcoming = jest.fn().mockReturnValue([]);
  const getPast = jest.fn().mockReturnValue([]);
  return {
    items: [],
    loading: false,
    error: null,
    fetchSessions,
    getUpcoming,
    getPast,
    ...overrides,
  } as ReturnType<typeof useScheduledSessionsStore>;
}

function setupStoreMock(
  overrides: Partial<ReturnType<typeof useScheduledSessionsStore>> = {},
) {
  const state = makeStoreState(overrides);
  mockUseStore.mockReturnValue(state);
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyScheduleScreen', () => {
  it('calls fetchSessions on mount', () => {
    const state = setupStoreMock();

    render(<MyScheduleScreen />);

    expect(state.fetchSessions).toHaveBeenCalledTimes(1);
  });

  it('renders upcoming empty state when getUpcoming returns []', () => {
    setupStoreMock({
      getUpcoming: jest.fn().mockReturnValue([]),
      getPast: jest.fn().mockReturnValue([]),
    });

    const { getByTestId } = render(<MyScheduleScreen />);

    expect(getByTestId('schedule-upcoming-empty')).toBeTruthy();
  });

  it('renders past empty state when getPast returns []', () => {
    setupStoreMock({
      getUpcoming: jest.fn().mockReturnValue([]),
      getPast: jest.fn().mockReturnValue([]),
    });

    const { getByTestId } = render(<MyScheduleScreen />);

    expect(getByTestId('schedule-past-empty')).toBeTruthy();
  });

  it('renders a SessionCard for each upcoming and each past session', () => {
    const upcoming = [
      makeSession({ _id: 'u1', date: '2026-08-01T00:00:00.000Z' }),
      makeSession({ _id: 'u2', date: '2026-08-02T00:00:00.000Z' }),
    ];
    const past = [
      makeSession({ _id: 'p1', date: '2026-01-01T00:00:00.000Z', status: 'scheduled' }),
    ];

    setupStoreMock({
      getUpcoming: jest.fn().mockReturnValue(upcoming),
      getPast: jest.fn().mockReturnValue(past),
    });

    const { getByTestId, queryByTestId } = render(<MyScheduleScreen />);

    expect(getByTestId('session-card-u1')).toBeTruthy();
    expect(getByTestId('session-card-u2')).toBeTruthy();
    expect(getByTestId('session-card-p1')).toBeTruthy();

    // Upcoming section present, no empty state
    expect(getByTestId('schedule-upcoming-section')).toBeTruthy();
    expect(queryByTestId('schedule-upcoming-empty')).toBeNull();

    // Past section present, no empty state
    expect(getByTestId('schedule-past-section')).toBeTruthy();
    expect(queryByTestId('schedule-past-empty')).toBeNull();
  });

  it('renders skeleton rows when loading', () => {
    setupStoreMock({ loading: true });

    const { queryByTestId, getAllByTestId } = render(<MyScheduleScreen />);

    expect(getAllByTestId('schedule-skeleton-row').length).toBeGreaterThan(0);
    // Sections not rendered while loading
    expect(queryByTestId('schedule-upcoming-section')).toBeNull();
  });
});
