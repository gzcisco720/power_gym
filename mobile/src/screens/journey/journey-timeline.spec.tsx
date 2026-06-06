/**
 * Stage 8 unit tests — Journey timeline store + components
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../lib/api/journey.api', () => ({
  fetchJourney: jest.fn(),
  fetchJourneyTimeline: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import * as journeyApi from '../../lib/api/journey.api';
import { useJourneyStore } from '../../stores/journey.store';
import {
  JourneyTimelineItem,
  JourneyTimelinePage,
} from '../../types/journey';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockFetchTimeline = journeyApi.fetchJourneyTimeline as jest.MockedFunction<
  typeof journeyApi.fetchJourneyTimeline
>;

const ITEM_SESSION: JourneyTimelineItem = {
  id: 'sess-1',
  type: 'session_completed',
  date: '2026-06-05T10:00:00.000Z',
  dayName: 'Push Day',
  completedSetCount: 8,
};

const ITEM_BODY_TEST: JourneyTimelineItem = {
  id: 'bt-1',
  type: 'body_test',
  date: '2026-06-04T08:00:00.000Z',
  weight: 80.5,
  bodyFatPct: 15.2,
};

const ITEM_STREAK: JourneyTimelineItem = {
  id: 'streak-7',
  type: 'streak_milestone',
  date: '2026-06-03T09:00:00.000Z',
  days: 7,
};

const ITEM_JOINED: JourneyTimelineItem = {
  id: 'joined-1',
  type: 'joined',
  date: '2026-01-01T00:00:00.000Z',
};

const PAGE_1: JourneyTimelinePage = {
  items: [ITEM_SESSION, ITEM_BODY_TEST],
  nextCursor: '2026-06-04T08:00:00.000Z',
};

const PAGE_2: JourneyTimelinePage = {
  items: [ITEM_STREAK, ITEM_JOINED],
  nextCursor: null,
};

function resetStore() {
  useJourneyStore.setState({
    summary: null,
    loading: false,
    error: null,
    items: [],
    nextCursor: null,
    loadingMore: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

// ── Store tests ───────────────────────────────────────────────────────────────

describe('journeyStore > fetchTimeline', () => {
  it('populates items and nextCursor from the first page', async () => {
    mockFetchTimeline.mockResolvedValueOnce(PAGE_1);

    await useJourneyStore.getState().fetchTimeline();

    const state = useJourneyStore.getState();
    expect(state.items).toEqual(PAGE_1.items);
    expect(state.nextCursor).toBe('2026-06-04T08:00:00.000Z');
    expect(state.loading).toBe(false);
  });
});

describe('journeyStore > fetchMore', () => {
  it('appends the next page items and updates nextCursor', async () => {
    // Seed first page state
    useJourneyStore.setState({
      items: PAGE_1.items,
      nextCursor: '2026-06-04T08:00:00.000Z',
      loadingMore: false,
    });

    mockFetchTimeline.mockResolvedValueOnce(PAGE_2);

    await useJourneyStore.getState().fetchMore();

    const state = useJourneyStore.getState();
    expect(state.items).toEqual([...PAGE_1.items, ...PAGE_2.items]);
    expect(state.nextCursor).toBeNull();
    expect(state.loadingMore).toBe(false);
  });

  it('is a no-op when nextCursor is null', async () => {
    useJourneyStore.setState({ items: PAGE_1.items, nextCursor: null });

    await useJourneyStore.getState().fetchMore();

    expect(mockFetchTimeline).not.toHaveBeenCalled();
    expect(useJourneyStore.getState().items).toEqual(PAGE_1.items);
  });
});

// ── Component tests ───────────────────────────────────────────────────────────

import { TimelineNode } from './components/TimelineNode';
import { JourneySummaryHeader } from './components/JourneySummaryHeader';

describe('TimelineNode > renders', () => {
  it('renders the correct label and data for a session_completed item', () => {
    const { getByTestId, getByText } = render(
      <TimelineNode item={ITEM_SESSION} />,
    );

    expect(getByTestId('timeline-node-sess-1')).toBeTruthy();
    expect(getByText('Push Day')).toBeTruthy();
    expect(getByText('8 sets')).toBeTruthy();
  });

  it('renders the streak day count for a streak_milestone item', () => {
    const { getByTestId, getByText } = render(
      <TimelineNode item={ITEM_STREAK} />,
    );

    expect(getByTestId('timeline-node-streak-7')).toBeTruthy();
    expect(getByText('7-day streak')).toBeTruthy();
  });
});

describe('JourneySummaryHeader > renders', () => {
  it('shows total sessions, current streak, total body tests, and member-since date', () => {
    const { getByText } = render(
      <JourneySummaryHeader
        totalSessions={42}
        currentStreak={5}
        totalBodyTests={10}
        memberSince="2026-01-01T00:00:00.000Z"
      />,
    );

    expect(getByText('42')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('10')).toBeTruthy();
    expect(getByText('Jan 2026')).toBeTruthy();
  });
});
