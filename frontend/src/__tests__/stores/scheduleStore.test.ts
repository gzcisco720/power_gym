import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/schedule', () => ({
  fetchMemberSchedule: vi.fn(),
  createScheduledSession: vi.fn(),
  cancelScheduledSession: vi.fn(),
}));

import * as scheduleApi from '@/api/schedule';
import { useScheduleStore } from '@/stores/scheduleStore';

const mockSession: scheduleApi.ScheduledSession = {
  _id: 'ss1',
  trainerId: 't1',
  memberIds: ['m1'],
  date: '2026-06-15',
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled',
};

beforeEach(() => {
  useScheduleStore.setState({ sessions: [], isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('scheduleStore', () => {
  describe('fetchSchedule', () => {
    it('populates scheduled sessions', async () => {
      vi.mocked(scheduleApi.fetchMemberSchedule).mockResolvedValueOnce([mockSession]);

      await useScheduleStore.getState().fetchSchedule('m1');

      expect(useScheduleStore.getState().sessions).toEqual([mockSession]);
    });
  });

  describe('createSession', () => {
    it('appends the new scheduled session', async () => {
      useScheduleStore.setState({ sessions: [] });
      vi.mocked(scheduleApi.createScheduledSession).mockResolvedValueOnce(mockSession);

      await useScheduleStore.getState().createSession({
        memberIds: ['m1'],
        date: '2026-06-15',
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(useScheduleStore.getState().sessions).toEqual([mockSession]);
    });
  });

  describe('deleteSession', () => {
    it('removes the session by id', async () => {
      useScheduleStore.setState({ sessions: [mockSession] });
      vi.mocked(scheduleApi.cancelScheduledSession).mockResolvedValueOnce({ success: true });

      await useScheduleStore.getState().deleteSession('ss1');

      expect(useScheduleStore.getState().sessions).toHaveLength(0);
    });
  });
});
