/**
 * Stage 3 unit tests — JourneyScreen
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockFetchSummary = jest.fn();

jest.mock('../../stores/journey.store', () => ({
  useJourneyStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useJourneyStore } from '../../stores/journey.store';
import { JourneySummary } from '../../types/journey';
import { JourneyScreen } from './JourneyScreen';

const mockUseJourneyStore = useJourneyStore as jest.MockedFunction<typeof useJourneyStore>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SUMMARY: JourneySummary = {
  workoutStreak: 5,
  recentSessions: [
    { _id: 'sess1', date: '2026-06-04T10:00:00.000Z', dayName: 'Push Day', completedSetCount: 6 },
    { _id: 'sess2', date: '2026-06-03T09:00:00.000Z', dayName: 'Pull Day', completedSetCount: 5 },
  ],
  nutritionDays: [
    { date: '2026-05-29', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-05-30', logged: true, loggedKcal: 2100, targetKcal: 2000, targetMet: true },
    { date: '2026-05-31', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-06-01', logged: true, loggedKcal: 1800, targetKcal: 2000, targetMet: false },
    { date: '2026-06-02', logged: true, loggedKcal: 2050, targetKcal: 2000, targetMet: true },
    { date: '2026-06-03', logged: true, loggedKcal: 2200, targetKcal: 2000, targetMet: true },
    { date: '2026-06-04', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
  ],
  bodyTests: [
    { _id: 'bt1', date: '2026-06-01T08:00:00.000Z', weight: 80.5, bodyFatPct: 15.2 },
  ],
};

const EMPTY_SUMMARY: JourneySummary = {
  workoutStreak: 0,
  recentSessions: [],
  nutritionDays: [
    { date: '2026-05-29', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-05-30', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-05-31', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-06-01', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-06-02', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-06-03', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-06-04', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
  ],
  bodyTests: [],
};

function setupStore(summary: JourneySummary | null, loading = false) {
  const state = {
    summary,
    loading,
    error: null,
    fetchSummary: mockFetchSummary,
  };

  mockUseJourneyStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSummary.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JourneyScreen', () => {
  describe('on mount', () => {
    it('calls fetchSummary exactly once', () => {
      setupStore(MOCK_SUMMARY);

      render(<JourneyScreen />);

      expect(mockFetchSummary).toHaveBeenCalledTimes(1);
    });
  });

  describe('with summary', () => {
    it('renders journey-streak showing the streak number', () => {
      setupStore(MOCK_SUMMARY);

      const { getByTestId, getByText } = render(<JourneyScreen />);

      expect(getByTestId('journey-streak')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
    });

    it('renders one journey-session-{id} per recentSession and shows its dayName + completedSetCount', () => {
      setupStore(MOCK_SUMMARY);

      const { getByTestId, getByText } = render(<JourneyScreen />);

      expect(getByTestId('journey-session-sess1')).toBeTruthy();
      expect(getByTestId('journey-session-sess2')).toBeTruthy();
      expect(getByText('Push Day')).toBeTruthy();
      expect(getByText('6 sets')).toBeTruthy();
      expect(getByText('Pull Day')).toBeTruthy();
      expect(getByText('5 sets')).toBeTruthy();
    });

    it('renders 7 journey-nutrition-day-{date} rows and marks targetMet days distinctly from un-logged days', () => {
      setupStore(MOCK_SUMMARY);

      const { getByTestId, getAllByText } = render(<JourneyScreen />);

      // All 7 nutrition day rows rendered
      expect(getByTestId('journey-nutrition-day-2026-05-29')).toBeTruthy();
      expect(getByTestId('journey-nutrition-day-2026-05-30')).toBeTruthy();
      expect(getByTestId('journey-nutrition-day-2026-05-31')).toBeTruthy();
      expect(getByTestId('journey-nutrition-day-2026-06-01')).toBeTruthy();
      expect(getByTestId('journey-nutrition-day-2026-06-02')).toBeTruthy();
      expect(getByTestId('journey-nutrition-day-2026-06-03')).toBeTruthy();
      expect(getByTestId('journey-nutrition-day-2026-06-04')).toBeTruthy();

      // targetMet days show a tick / "Met" label, un-logged days do not
      const metLabels = getAllByText('Met');
      expect(metLabels.length).toBe(3); // dates: 05-30, 06-02, 06-03
    });

    it('renders one journey-body-test-{id} per body test showing weight and bodyFatPct', () => {
      setupStore(MOCK_SUMMARY);

      const { getByTestId, getByText } = render(<JourneyScreen />);

      expect(getByTestId('journey-body-test-bt1')).toBeTruthy();
      expect(getByText('80.5 kg')).toBeTruthy();
      expect(getByText('15.2%')).toBeTruthy();
    });
  });

  describe('with all-empty summary (streak 0, no sessions/tests, no logged days)', () => {
    it('renders journey-empty', () => {
      setupStore(EMPTY_SUMMARY);

      const { getByTestId } = render(<JourneyScreen />);

      expect(getByTestId('journey-empty')).toBeTruthy();
    });
  });

  describe('while loading', () => {
    it('renders skeleton rows and not journey-empty', () => {
      setupStore(null, true);

      const { queryByTestId, getByTestId } = render(<JourneyScreen />);

      // Root screen should exist
      expect(getByTestId('screen-Journey')).toBeTruthy();
      // journey-empty should NOT be shown while loading
      expect(queryByTestId('journey-empty')).toBeNull();
      // journey-streak should NOT be shown while loading
      expect(queryByTestId('journey-streak')).toBeNull();
    });
  });
});
