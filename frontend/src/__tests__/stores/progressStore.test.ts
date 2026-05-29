import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/progress', () => ({
  fetchProgress: vi.fn(),
}));

import * as progressApi from '@/api/progress';
import { useProgressStore } from '@/stores/progressStore';

const mockTrendPoint: progressApi.OneRepMaxTrendPoint = {
  exerciseName: 'Bench Press',
  estimatedOneRM: 120,
  achievedAt: '2026-05-01T00:00:00Z',
};

beforeEach(() => {
  useProgressStore.setState({
    trend: {},
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('progressStore', () => {
  describe('fetchTrend', () => {
    it('populates 1RM trend data for a member id', async () => {
      vi.mocked(progressApi.fetchProgress).mockResolvedValueOnce({
        oneRepMaxTrend: [mockTrendPoint],
      });

      await useProgressStore.getState().fetchTrend('m1');

      expect(useProgressStore.getState().trend['m1']).toEqual([mockTrendPoint]);
      expect(useProgressStore.getState().isLoading).toBe(false);
    });

    it('sets error and clears isLoading on failure', async () => {
      vi.mocked(progressApi.fetchProgress).mockRejectedValueOnce(new Error('Network error'));

      await useProgressStore.getState().fetchTrend('m1');

      expect(useProgressStore.getState().error).toBeTruthy();
      expect(useProgressStore.getState().isLoading).toBe(false);
    });
  });
});
