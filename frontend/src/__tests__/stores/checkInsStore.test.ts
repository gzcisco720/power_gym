import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/check-ins', () => ({
  fetchCheckIns: vi.fn(),
  submitCheckIn: vi.fn(),
  fetchConfig: vi.fn(),
}));

import * as checkInsApi from '@/api/check-ins';
import { useCheckInsStore } from '@/stores/checkInsStore';

const mockCheckIn: checkInsApi.CheckIn = {
  _id: 'ci1',
  memberId: 'm1',
  weekStart: '2026-05-25T00:00:00Z',
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 8,
  stuckToDiet: 'yes',
  dietDetails: null,
  wellbeing: null,
  notes: null,
  weight: null,
  waist: null,
  submittedAt: '2026-05-26T08:00:00Z',
};

const mockConfig: checkInsApi.CheckInConfig = { dayOfWeek: 1, reminderTime: '08:00' };

beforeEach(() => {
  useCheckInsStore.setState({
    checkIns: [],
    config: null,
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('checkInsStore', () => {
  describe('fetchCheckIns', () => {
    it('populates the check-ins list', async () => {
      vi.mocked(checkInsApi.fetchCheckIns).mockResolvedValueOnce([mockCheckIn]);

      await useCheckInsStore.getState().fetchCheckIns();

      expect(useCheckInsStore.getState().checkIns).toEqual([mockCheckIn]);
      expect(useCheckInsStore.getState().isLoading).toBe(false);
    });
  });

  describe('fetchConfig', () => {
    it('populates the check-in config (schedule)', async () => {
      vi.mocked(checkInsApi.fetchConfig).mockResolvedValueOnce(mockConfig);

      await useCheckInsStore.getState().fetchConfig();

      expect(useCheckInsStore.getState().config).toEqual(mockConfig);
    });
  });

  describe('submitCheckIn', () => {
    it('appends today\'s check-in and returns success', async () => {
      vi.mocked(checkInsApi.submitCheckIn).mockResolvedValueOnce(mockCheckIn);

      await useCheckInsStore.getState().submitCheckIn({
        sleepQuality: 7, stress: 5, fatigue: 4, hunger: 6,
        recovery: 8, energy: 7, digestion: 8, stuckToDiet: 'yes',
      });

      expect(useCheckInsStore.getState().checkIns).toHaveLength(1);
      expect(useCheckInsStore.getState().checkIns[0]).toEqual(mockCheckIn);
      expect(useCheckInsStore.getState().error).toBeNull();
    });

    it('sets error when a check-in for today already exists', async () => {
      vi.mocked(checkInsApi.submitCheckIn).mockRejectedValueOnce(new Error('Request failed: 409'));

      await useCheckInsStore.getState().submitCheckIn({
        sleepQuality: 7, stress: 5, fatigue: 4, hunger: 6,
        recovery: 8, energy: 7, digestion: 8, stuckToDiet: 'yes',
      });

      expect(useCheckInsStore.getState().error).toBe('already_submitted');
    });
  });
});
