jest.mock('../lib/api/scheduled-sessions.api', () => ({
  fetchMySessions: jest.fn(),
  fetchStaffSessions: jest.fn(),
  createSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
}));

import * as scheduledSessionsApi from '../lib/api/scheduled-sessions.api';
import { useCalendarStore } from './calendar.store';
import { StaffSession } from '../types/scheduled-sessions';

const mockFetchStaffSessions =
  scheduledSessionsApi.fetchStaffSessions as jest.MockedFunction<
    typeof scheduledSessionsApi.fetchStaffSessions
  >;
const mockCreateSession =
  scheduledSessionsApi.createSession as jest.MockedFunction<
    typeof scheduledSessionsApi.createSession
  >;
const mockUpdateSession =
  scheduledSessionsApi.updateSession as jest.MockedFunction<
    typeof scheduledSessionsApi.updateSession
  >;
const mockDeleteSession =
  scheduledSessionsApi.deleteSession as jest.MockedFunction<
    typeof scheduledSessionsApi.deleteSession
  >;

const SESSION_A: StaffSession = {
  _id: 'sess-a',
  date: '2026-06-10T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled',
  trainerId: 'trainer1',
  trainerName: 'John Doe',
  memberIds: ['m1'],
  memberNames: ['Alice'],
  serviceTypeId: 'st1',
  serviceTypeName: 'PT',
  customServiceName: null,
  seriesId: null,
  isRecurring: false,
};

const SESSION_B: StaffSession = {
  _id: 'sess-b',
  date: '2026-06-10T00:00:00.000Z',
  startTime: '11:00',
  endTime: '12:00',
  status: 'scheduled',
  trainerId: 'trainer1',
  trainerName: 'John Doe',
  memberIds: ['m2'],
  memberNames: ['Bob'],
  serviceTypeId: null,
  serviceTypeName: null,
  customServiceName: 'Custom',
  seriesId: 'series1',
  isRecurring: true,
};

const SESSION_C: StaffSession = {
  _id: 'sess-c',
  date: '2026-06-11T00:00:00.000Z',
  startTime: '14:00',
  endTime: '15:00',
  status: 'scheduled',
  trainerId: 'trainer1',
  trainerName: 'John Doe',
  memberIds: ['m1'],
  memberNames: ['Alice'],
  serviceTypeId: null,
  serviceTypeName: null,
  customServiceName: null,
  seriesId: null,
  isRecurring: false,
};

function resetStore() {
  useCalendarStore.setState({ items: [], loading: false, error: null, range: 'upcoming' });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useCalendarStore', () => {
  describe('fetch', () => {
    it('populates items and clears loading on success', async () => {
      mockFetchStaffSessions.mockResolvedValueOnce([SESSION_A, SESSION_C]);

      await useCalendarStore.getState().fetch('upcoming');

      const state = useCalendarStore.getState();
      expect(state.items).toEqual([SESSION_A, SESSION_C]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.range).toBe('upcoming');
    });

    it('sets error and clears loading on failure', async () => {
      mockFetchStaffSessions.mockRejectedValueOnce(new Error('Network error'));

      await useCalendarStore.getState().fetch('upcoming');

      const state = useCalendarStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
      expect(state.items).toEqual([]);
    });

    it('uses stored range when called without argument', async () => {
      useCalendarStore.setState({ range: 'past' });
      mockFetchStaffSessions.mockResolvedValueOnce([SESSION_A]);

      await useCalendarStore.getState().fetch();

      expect(mockFetchStaffSessions).toHaveBeenCalledWith('past');
    });
  });

  describe('groupedByDay', () => {
    it('groups sessions under day headers sorted ascending by date', () => {
      useCalendarStore.setState({ items: [SESSION_C, SESSION_A, SESSION_B] });

      const groups = useCalendarStore.getState().groupedByDay();

      expect(groups).toHaveLength(2);
      expect(groups[0].isoDate).toBe('2026-06-10');
      expect(groups[0].sessions).toHaveLength(2);
      expect(groups[0].sessions.map((s) => s._id)).toEqual(['sess-a', 'sess-b']);
      expect(groups[1].isoDate).toBe('2026-06-11');
      expect(groups[1].sessions).toHaveLength(1);
    });

    it('returns an empty array when items is empty', () => {
      useCalendarStore.setState({ items: [] });

      const groups = useCalendarStore.getState().groupedByDay();

      expect(groups).toEqual([]);
    });

    it('includes a dateLabel string for each group', () => {
      useCalendarStore.setState({ items: [SESSION_A] });

      const groups = useCalendarStore.getState().groupedByDay();

      expect(typeof groups[0].dateLabel).toBe('string');
      expect(groups[0].dateLabel.length).toBeGreaterThan(0);
    });
  });

  describe('create', () => {
    it('calls api.createSession then re-fetches current range', async () => {
      const dto = {
        date: '2026-06-20',
        startTime: '10:00',
        endTime: '11:00',
        memberIds: ['m1'],
      };
      mockCreateSession.mockResolvedValueOnce(SESSION_A);
      mockFetchStaffSessions.mockResolvedValueOnce([SESSION_A]);

      await useCalendarStore.getState().create(dto);

      expect(mockCreateSession).toHaveBeenCalledWith(dto);
      expect(mockFetchStaffSessions).toHaveBeenCalledWith(
        useCalendarStore.getState().range,
      );
    });

    it('rejection surfaces as error string and leaves items unchanged', async () => {
      useCalendarStore.setState({ items: [SESSION_C] });
      mockCreateSession.mockRejectedValueOnce(new Error('Server error'));

      await useCalendarStore.getState().create({
        date: '2026-06-20',
        startTime: '10:00',
        endTime: '11:00',
        memberIds: ['m1'],
      });

      const state = useCalendarStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.items).toEqual([SESSION_C]);
    });
  });

  describe('update', () => {
    it('calls api.updateSession then re-fetches current range', async () => {
      const dto = { startTime: '10:30', scope: 'single' as const };
      mockUpdateSession.mockResolvedValueOnce({ ...SESSION_A, startTime: '10:30' });
      mockFetchStaffSessions.mockResolvedValueOnce([{ ...SESSION_A, startTime: '10:30' }]);

      await useCalendarStore.getState().update('sess-a', dto);

      expect(mockUpdateSession).toHaveBeenCalledWith('sess-a', dto);
      expect(mockFetchStaffSessions).toHaveBeenCalledWith(
        useCalendarStore.getState().range,
      );
    });
  });

  describe('remove', () => {
    it('calls api.deleteSession with scope then re-fetches', async () => {
      mockDeleteSession.mockResolvedValueOnce(undefined);
      mockFetchStaffSessions.mockResolvedValueOnce([SESSION_C]);

      await useCalendarStore.getState().remove('sess-a', 'single');

      expect(mockDeleteSession).toHaveBeenCalledWith('sess-a', 'single');
      expect(mockFetchStaffSessions).toHaveBeenCalledWith(
        useCalendarStore.getState().range,
      );
    });
  });
});

describe('useCalendarStore integration (mocked api, real store wiring)', () => {
  it('fetch("upcoming") then groupedByDay() returns groups with sessions on same isoDate', async () => {
    mockFetchStaffSessions.mockResolvedValueOnce([SESSION_A, SESSION_B, SESSION_C]);

    await useCalendarStore.getState().fetch('upcoming');

    const groups = useCalendarStore.getState().groupedByDay();
    expect(groups.length).toBeGreaterThanOrEqual(1);
    for (const group of groups) {
      for (const session of group.sessions) {
        expect(session.date.startsWith(group.isoDate)).toBe(true);
      }
    }
  });

  it('create() rejection surfaces as error string and leaves items unchanged', async () => {
    mockFetchStaffSessions.mockResolvedValueOnce([SESSION_C]);
    await useCalendarStore.getState().fetch('upcoming');

    mockCreateSession.mockRejectedValueOnce(new Error('Conflict'));

    await useCalendarStore.getState().create({
      date: '2026-06-20',
      startTime: '10:00',
      endTime: '11:00',
      memberIds: [],
    });

    const state = useCalendarStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.items).toEqual([SESSION_C]);
  });
});
