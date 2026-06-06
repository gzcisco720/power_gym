/**
 * Stage 8 unit tests — JourneyScreen (timeline view)
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockFetchSummary = jest.fn();
const mockFetchTimeline = jest.fn();
const mockFetchMore = jest.fn();

jest.mock('../../stores/journey.store', () => ({
  useJourneyStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useJourneyStore } from '../../stores/journey.store';
import { JourneySummary, JourneyTimelineItem } from '../../types/journey';
import { JourneyScreen } from './JourneyScreen';

const mockUseJourneyStore = useJourneyStore as jest.MockedFunction<typeof useJourneyStore>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SUMMARY: JourneySummary = {
  workoutStreak: 5,
  recentSessions: [
    { _id: 'sess1', date: '2026-06-04T10:00:00.000Z', dayName: 'Push Day', completedSetCount: 6 },
    { _id: 'sess2', date: '2026-06-03T09:00:00.000Z', dayName: 'Pull Day', completedSetCount: 5 },
  ],
  nutritionDays: [],
  bodyTests: [
    { _id: 'bt1', date: '2026-06-01T08:00:00.000Z', weight: 80.5, bodyFatPct: 15.2 },
  ],
};

const MOCK_ITEMS: JourneyTimelineItem[] = [
  {
    id: 'sess-1',
    type: 'session_completed',
    date: '2026-06-05T10:00:00.000Z',
    dayName: 'Push Day',
    completedSetCount: 8,
  },
  {
    id: 'joined-1',
    type: 'joined',
    date: '2026-01-01T00:00:00.000Z',
  },
];

function setupStore({
  summary = null as JourneySummary | null,
  loading = false,
  items = [] as JourneyTimelineItem[],
  nextCursor = null as string | null,
  loadingMore = false,
} = {}) {
  const state = {
    summary,
    loading,
    error: null,
    items,
    nextCursor,
    loadingMore,
    fetchSummary: mockFetchSummary,
    fetchTimeline: mockFetchTimeline,
    fetchMore: mockFetchMore,
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
  mockFetchTimeline.mockResolvedValue(undefined);
  mockFetchMore.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JourneyScreen', () => {
  describe('on mount', () => {
    it('calls fetchSummary and fetchTimeline exactly once each', () => {
      setupStore({ summary: MOCK_SUMMARY, items: MOCK_ITEMS });

      render(<JourneyScreen />);

      expect(mockFetchSummary).toHaveBeenCalledTimes(1);
      expect(mockFetchTimeline).toHaveBeenCalledTimes(1);
    });
  });

  describe('with timeline items', () => {
    it('renders the timeline list with timeline node items', () => {
      setupStore({ summary: MOCK_SUMMARY, items: MOCK_ITEMS });

      const { getByTestId } = render(<JourneyScreen />);

      expect(getByTestId('journey-timeline-list')).toBeTruthy();
      expect(getByTestId('timeline-node-sess-1')).toBeTruthy();
      expect(getByTestId('timeline-node-joined-1')).toBeTruthy();
    });

    it('renders the summary header when a joined item exists', () => {
      setupStore({ summary: MOCK_SUMMARY, items: MOCK_ITEMS });

      const { getByTestId } = render(<JourneyScreen />);

      expect(getByTestId('journey-summary-header')).toBeTruthy();
    });
  });

  describe('with empty items and summary loaded', () => {
    it('renders journey-empty', () => {
      setupStore({ summary: MOCK_SUMMARY, items: [] });

      const { getByTestId } = render(<JourneyScreen />);

      expect(getByTestId('journey-empty')).toBeTruthy();
    });
  });

  describe('while loading (no items yet)', () => {
    it('renders skeleton rows and not journey-empty', () => {
      setupStore({ loading: true, items: [] });

      const { queryByTestId, getByTestId } = render(<JourneyScreen />);

      expect(getByTestId('screen-Journey')).toBeTruthy();
      expect(queryByTestId('journey-empty')).toBeNull();
      expect(queryByTestId('journey-timeline-list')).toBeNull();
    });
  });
});
