/**
 * Stage 12 unit tests — JourneyScreen milestone row
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/journey.store', () => ({
  useJourneyStore: jest.fn(),
}));

import { useJourneyStore } from '../../../stores/journey.store';
import { JourneySummary, JourneyTimelineItem } from '../../../types/journey';
import { JourneyScreen } from '../JourneyScreen';

const mockUseJourneyStore = useJourneyStore as jest.MockedFunction<typeof useJourneyStore>;

const MOCK_SUMMARY: JourneySummary = {
  workoutStreak: 3,
  recentSessions: [],
  nutritionDays: [],
  bodyTests: [],
};

const MILESTONE_ITEM: JourneyTimelineItem = {
  id: 'bt-milestone-1',
  type: 'body_test',
  date: '2026-06-01T08:00:00.000Z',
  testNumber: 3,
  weight: 78.0,
  bodyFatPct: 13.5,
  leanMassKg: 67.5,
  fatMassKg: 10.5,
  deltaBodyFatPct: -1.7,
  deltaWeight: -2.5,
  milestone: {
    emoji: '🏆',
    title: 'Body Fat Champion',
    tags: [{ label: 'New Low', color: 'gold' }],
    photos: [],
  },
};

function setupStore(items: JourneyTimelineItem[], summary: JourneySummary | null = MOCK_SUMMARY) {
  const state = {
    summary,
    loading: false,
    error: null,
    items,
    nextCursor: null,
    loadingMore: false,
    fetchSummary: jest.fn().mockResolvedValue(undefined),
    fetchTimeline: jest.fn().mockResolvedValue(undefined),
    fetchMore: jest.fn().mockResolvedValue(undefined),
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
});

describe('JourneyScreen', () => {
  describe('milestone row', () => {
    it('renders correct icon and label', () => {
      setupStore([MILESTONE_ITEM]);

      const { getByText } = render(<JourneyScreen />);

      // The milestone emoji and title must be visible
      expect(getByText('🏆')).toBeTruthy();
      expect(getByText('Body Fat Champion')).toBeTruthy();
      // The milestone tag must be visible
      expect(getByText('New Low')).toBeTruthy();
    });
  });
});
