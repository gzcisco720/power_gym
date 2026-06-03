jest.mock('../lib/api/scheduled-sessions.api', () => ({
  fetchMySessions: jest.fn(),
}));

import * as scheduledSessionsApi from '../lib/api/scheduled-sessions.api';
import { useScheduledSessionsStore } from './scheduled-sessions.store';
import { ScheduledSession } from '../types/scheduled-sessions';

const mockFetchMySessions = scheduledSessionsApi.fetchMySessions as jest.MockedFunction<
  typeof scheduledSessionsApi.fetchMySessions
>;

// Fixed reference point: 2026-06-03T12:00:00.000Z
const NOW = new Date('2026-06-03T12:00:00.000Z');

// Future scheduled session
const FUTURE_SCHEDULED: ScheduledSession = {
  _id: 'sess-future-1',
  date: '2026-06-10T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled',
  trainerName: 'John Doe',
  serviceTypeName: 'Personal Training',
  isRecurring: false,
};

// Another future scheduled session (later)
const FUTURE_SCHEDULED_2: ScheduledSession = {
  _id: 'sess-future-2',
  date: '2026-06-15T00:00:00.000Z',
  startTime: '10:00',
  endTime: '11:00',
  status: 'scheduled',
  trainerName: 'Jane Smith',
  serviceTypeName: null,
  isRecurring: true,
};

// Past scheduled session
const PAST_SCHEDULED: ScheduledSession = {
  _id: 'sess-past-1',
  date: '2026-05-20T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled',
  trainerName: 'John Doe',
  serviceTypeName: 'Personal Training',
  isRecurring: false,
};

// Another past session (older)
const PAST_SCHEDULED_2: ScheduledSession = {
  _id: 'sess-past-2',
  date: '2026-05-10T00:00:00.000Z',
  startTime: '11:00',
  endTime: '12:00',
  status: 'scheduled',
  trainerName: 'Jane Smith',
  serviceTypeName: null,
  isRecurring: false,
};

// Future but cancelled — should appear in Past per plan spec
const FUTURE_CANCELLED: ScheduledSession = {
  _id: 'sess-cancelled-future',
  date: '2026-06-20T00:00:00.000Z',
  startTime: '14:00',
  endTime: '15:00',
  status: 'cancelled',
  trainerName: 'John Doe',
  serviceTypeName: null,
  isRecurring: false,
};

const ALL_SESSIONS = [
  FUTURE_SCHEDULED,
  FUTURE_SCHEDULED_2,
  PAST_SCHEDULED,
  PAST_SCHEDULED_2,
  FUTURE_CANCELLED,
];

function resetStore() {
  useScheduledSessionsStore.setState({
    items: [],
    loading: false,
    error: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useScheduledSessionsStore', () => {
  describe('fetchSessions', () => {
    it('populates items and clears loading on success', async () => {
      mockFetchMySessions.mockResolvedValueOnce([FUTURE_SCHEDULED, PAST_SCHEDULED]);

      await useScheduledSessionsStore.getState().fetchSessions();

      const state = useScheduledSessionsStore.getState();
      expect(state.items).toEqual([FUTURE_SCHEDULED, PAST_SCHEDULED]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error message and clears loading on failure', async () => {
      mockFetchMySessions.mockRejectedValueOnce(new Error('Network error'));

      await useScheduledSessionsStore.getState().fetchSessions();

      const state = useScheduledSessionsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
      expect(state.items).toEqual([]);
    });
  });

  describe('getUpcoming', () => {
    it('returns only future scheduled sessions sorted ascending by date', () => {
      useScheduledSessionsStore.setState({ items: ALL_SESSIONS });

      const upcoming = useScheduledSessionsStore.getState().getUpcoming(NOW);

      // Only FUTURE_SCHEDULED and FUTURE_SCHEDULED_2 qualify (future + status=scheduled)
      expect(upcoming.map((s) => s._id)).toEqual(['sess-future-1', 'sess-future-2']);
    });

    it('excludes past sessions and cancelled sessions', () => {
      useScheduledSessionsStore.setState({ items: ALL_SESSIONS });

      const upcoming = useScheduledSessionsStore.getState().getUpcoming(NOW);

      const ids = upcoming.map((s) => s._id);
      expect(ids).not.toContain('sess-past-1');
      expect(ids).not.toContain('sess-past-2');
      expect(ids).not.toContain('sess-cancelled-future');
    });

    it('returns an empty array when no sessions exist', () => {
      useScheduledSessionsStore.setState({ items: [] });

      const upcoming = useScheduledSessionsStore.getState().getUpcoming(NOW);

      expect(upcoming).toEqual([]);
    });
  });

  describe('getPast', () => {
    it('returns past or cancelled sessions sorted descending by date', () => {
      useScheduledSessionsStore.setState({ items: ALL_SESSIONS });

      const past = useScheduledSessionsStore.getState().getPast(NOW);

      // PAST_SCHEDULED (May 20), PAST_SCHEDULED_2 (May 10), FUTURE_CANCELLED qualify
      // sorted desc: FUTURE_CANCELLED (Jun 20), PAST_SCHEDULED (May 20), PAST_SCHEDULED_2 (May 10)
      expect(past.map((s) => s._id)).toEqual([
        'sess-cancelled-future',
        'sess-past-1',
        'sess-past-2',
      ]);
    });

    it('includes a cancelled future session in past', () => {
      useScheduledSessionsStore.setState({ items: [FUTURE_SCHEDULED, FUTURE_CANCELLED] });

      const past = useScheduledSessionsStore.getState().getPast(NOW);

      expect(past.map((s) => s._id)).toContain('sess-cancelled-future');
      expect(past.map((s) => s._id)).not.toContain('sess-future-1');
    });

    it('returns an empty array when no sessions exist', () => {
      useScheduledSessionsStore.setState({ items: [] });

      const past = useScheduledSessionsStore.getState().getPast(NOW);

      expect(past).toEqual([]);
    });
  });
});

describe('useScheduledSessionsStore integration', () => {
  it('store + API together: fetchSessions followed by getUpcoming/getPast partitions the fixture correctly', async () => {
    mockFetchMySessions.mockResolvedValueOnce(ALL_SESSIONS);

    await useScheduledSessionsStore.getState().fetchSessions();

    const state = useScheduledSessionsStore.getState();
    const upcoming = state.getUpcoming(NOW);
    const past = state.getPast(NOW);

    expect(upcoming.map((s) => s._id)).toEqual(['sess-future-1', 'sess-future-2']);
    expect(past.map((s) => s._id)).toEqual([
      'sess-cancelled-future',
      'sess-past-1',
      'sess-past-2',
    ]);
  });
});
