import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/schedule', () => ({
  fetchSessions: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  cancelSession: vi.fn(),
  fetchCalendarParticipants: vi.fn(),
}));

import { useScheduleStore } from './scheduleStore';
import * as scheduleApi from '@/api/schedule';

const mockFetchSessions = vi.mocked(scheduleApi.fetchSessions);

const makeSession = (id: string): scheduleApi.CalendarSession => ({
  _id: id,
  seriesId: null,
  trainerId: 'trainer1',
  memberIds: ['member1'],
  date: '2024-06-15',
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled',
  serviceTypeId: null,
  customServiceName: null,
  customFee: null,
  reminderSentAt: null,
});

describe('scheduleStore', () => {
  beforeEach(() => {
    useScheduleStore.setState({
      sessions: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchRange', () => {
    it('populates calendar sessions', async () => {
      const sessions = [makeSession('sess1'), makeSession('sess2')];
      mockFetchSessions.mockResolvedValue(sessions);

      await useScheduleStore.getState().fetchRange('2024-06-10T00:00:00Z', '2024-06-16T23:59:59Z');

      const state = useScheduleStore.getState();
      expect(state.sessions).toHaveLength(2);
      expect(state.sessions[0]._id).toBe('sess1');
      expect(state.sessions[1]._id).toBe('sess2');
      expect(state.isLoading).toBe(false);
    });
  });
});
