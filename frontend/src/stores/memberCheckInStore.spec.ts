import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/check-ins', () => ({
  submitCheckIn: vi.fn(),
  fetchCheckIns: vi.fn(),
  fetchCheckIn: vi.fn(),
}));

import { submitCheckIn, fetchCheckIns } from '@/api/check-ins';
import { useMemberCheckInStore } from './memberCheckInStore';

const mockSubmit = submitCheckIn as ReturnType<typeof vi.fn>;
const mockFetchCheckIns = fetchCheckIns as ReturnType<typeof vi.fn>;

const seedCheckIn = {
  _id: 'ci1',
  memberId: 'mem1',
  trainerId: 'tr1',
  submittedAt: '2026-05-01T10:00:00.000Z',
  sleepQuality: 7,
  energy: 8,
  recovery: 6,
  stress: 4,
  fatigue: 3,
  hunger: 5,
  digestion: 7,
  weight: 80,
  waist: 82,
  steps: 8000,
  exerciseMinutes: 60,
  walkRunDistance: 3,
  sleepHours: 7.5,
  dietDetails: 'Good',
  stuckToDiet: 'yes' as const,
  wellbeing: 'Feeling great',
  notes: '',
  photos: [],
};

describe('memberCheckInStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMemberCheckInStore.setState({
      checkIns: [],
      hasThisWeek: false,
      isLoading: false,
      isSubmitting: false,
      error: null,
    });
  });

  describe('submit', () => {
    it('posts a check-in and adds it to history', async () => {
      mockSubmit.mockResolvedValueOnce(seedCheckIn);
      mockFetchCheckIns.mockResolvedValueOnce([seedCheckIn]);

      const payload = {
        sleepQuality: 7,
        energy: 8,
        recovery: 6,
        stress: 4,
        fatigue: 3,
        hunger: 5,
        digestion: 7,
        weight: 80,
        waist: null,
        steps: null,
        exerciseMinutes: null,
        walkRunDistance: null,
        sleepHours: 7.5,
        dietDetails: 'Good',
        stuckToDiet: 'yes' as const,
        wellbeing: '',
        notes: '',
        photos: [],
      };

      await useMemberCheckInStore.getState().submit(payload);

      expect(mockSubmit).toHaveBeenCalledWith(payload);
      const { checkIns } = useMemberCheckInStore.getState();
      expect(checkIns).toHaveLength(1);
      expect(checkIns[0]._id).toBe('ci1');
    });
  });

  describe('fetchHistory', () => {
    it('loads check-ins from API', async () => {
      mockFetchCheckIns.mockResolvedValueOnce([seedCheckIn]);

      await useMemberCheckInStore.getState().fetchHistory();

      const { checkIns, isLoading } = useMemberCheckInStore.getState();
      expect(isLoading).toBe(false);
      expect(checkIns).toHaveLength(1);
    });
  });
});
