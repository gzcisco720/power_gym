import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/member-portal', () => ({
  fetchJourney: vi.fn(),
}));

import { useMemberJourneyStore } from './memberJourneyStore';
import { fetchJourney } from '@/api/member-portal';

const mockFetch = vi.mocked(fetchJourney);

beforeEach(() => {
  useMemberJourneyStore.setState({ items: [], summary: null, isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('memberJourneyStore', () => {
  it('fetch > populates milestone timeline', async () => {
    mockFetch.mockResolvedValueOnce({
      items: [
        {
          bodyTest: {
            id: 'bt1',
            date: '2025-01-01T00:00:00.000Z',
            testNumber: 1,
            bodyFatPct: 18,
            weight: 80,
            leanMassKg: 65.6,
            fatMassKg: 14.4,
            deltaBodyFatPct: null,
            deltaWeight: null,
          },
          checkInPhoto: null,
          milestone: null,
        },
      ],
      nextCursor: null,
      summary: {
        totalTests: 1,
        firstTestDate: '2025-01-01T00:00:00.000Z',
        firstBodyFatPct: 18,
        firstWeight: 80,
        firstLeanMassKg: 65.6,
        latestBodyFatPct: 18,
        latestWeight: 80,
        latestLeanMassKg: 65.6,
        leanMassDeltaKg: 0,
      },
    });

    const store = useMemberJourneyStore.getState();
    await store.fetch('user-123');

    const state = useMemberJourneyStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].bodyTest.id).toBe('bt1');
    expect(state.summary).not.toBeNull();
    expect(state.summary?.totalTests).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith('user-123', undefined);
  });
});
