jest.mock('../lib/api/check-in-schedule.api', () => ({
  fetchCheckInSchedule: jest.fn(),
  updateCheckInSchedule: jest.fn(),
}));

import * as scheduleApi from '../lib/api/check-in-schedule.api';
import { useCheckInScheduleStore } from './check-in-schedule.store';

const mockFetchSchedule = scheduleApi.fetchCheckInSchedule as jest.MockedFunction<
  typeof scheduleApi.fetchCheckInSchedule
>;

describe('check-in-schedule.store', () => {
  beforeEach(() => {
    useCheckInScheduleStore.setState({ schedule: null, loading: false, error: null });
    jest.clearAllMocks();
  });

  describe('fetchSchedule', () => {
    it('populates schedule and clears loading on success', async () => {
      const mockSchedule = { dayOfWeek: 1, hour: 9, minute: 0, active: true };
      mockFetchSchedule.mockResolvedValueOnce(mockSchedule);

      await useCheckInScheduleStore.getState().fetchSchedule('mem1');

      const state = useCheckInScheduleStore.getState();
      expect(state.schedule).toEqual(mockSchedule);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets schedule to null and clears loading when API returns null (no config)', async () => {
      mockFetchSchedule.mockResolvedValueOnce(null);

      await useCheckInScheduleStore.getState().fetchSchedule('mem1');

      const state = useCheckInScheduleStore.getState();
      expect(state.schedule).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('sets error and clears loading on failure', async () => {
      mockFetchSchedule.mockRejectedValueOnce(new Error('Network error'));

      await useCheckInScheduleStore.getState().fetchSchedule('mem1');

      const state = useCheckInScheduleStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });
});
