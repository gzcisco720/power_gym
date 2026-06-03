import { act, renderHook } from '@testing-library/react-native';

jest.mock('../../src/lib/api/check-ins.api', () => ({
  fetchCheckIns: jest.fn(),
  createCheckIn: jest.fn(),
  getCheckInUploadSignature: jest.fn(),
}));

import * as checkInsApi from '../../src/lib/api/check-ins.api';
import { useCheckInsStore } from '../../src/stores/check-ins.store';
import { CheckIn } from '../../src/types/check-ins';

const mockFetchCheckIns = checkInsApi.fetchCheckIns as jest.MockedFunction<
  typeof checkInsApi.fetchCheckIns
>;

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    _id: 'ci-1',
    memberId: 'member-1',
    trainerId: 'trainer-1',
    submittedAt: new Date().toISOString(),
    sleepQuality: 7,
    stress: 5,
    fatigue: 4,
    hunger: 6,
    recovery: 8,
    energy: 7,
    digestion: 6,
    weight: null,
    waist: null,
    steps: null,
    exerciseMinutes: null,
    walkRunDistance: null,
    sleepHours: null,
    stuckToDiet: 'yes',
    dietDetails: null,
    wellbeing: null,
    notes: null,
    photos: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Get the Monday 00:00:00 of the current week in local time */
function getThisWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
  return monday;
}

beforeEach(() => {
  // Reset store state between tests
  useCheckInsStore.setState({ items: [], loading: false, error: null });
  jest.clearAllMocks();
});

describe('useCheckInsStore', () => {
  describe('fetchCheckIns', () => {
    it('populates items and clears loading on success', async () => {
      const checkIn = makeCheckIn();
      mockFetchCheckIns.mockResolvedValueOnce([checkIn]);

      const { result } = renderHook(() => useCheckInsStore());

      await act(async () => {
        await result.current.fetchCheckIns();
      });

      expect(result.current.items).toEqual([checkIn]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets error and clears loading on failure', async () => {
      mockFetchCheckIns.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCheckInsStore());

      await act(async () => {
        await result.current.fetchCheckIns();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('addItem', () => {
    it('prepends the new check-in to items', () => {
      const existing = makeCheckIn({ _id: 'ci-old' });
      useCheckInsStore.setState({ items: [existing] });

      const { result } = renderHook(() => useCheckInsStore());
      const newItem = makeCheckIn({ _id: 'ci-new' });

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.items[0]).toEqual(newItem);
      expect(result.current.items[1]).toEqual(existing);
      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('hasCheckedInThisWeek', () => {
    it('returns true when items[0].submittedAt is within the current week', () => {
      // Use a time just after Monday this week
      const monday = getThisWeekMonday();
      const submittedAt = new Date(monday.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour after Monday
      useCheckInsStore.setState({ items: [makeCheckIn({ submittedAt })] });

      const { result } = renderHook(() => useCheckInsStore());
      expect(result.current.hasCheckedInThisWeek()).toBe(true);
    });

    it('returns false when items is empty', () => {
      useCheckInsStore.setState({ items: [] });

      const { result } = renderHook(() => useCheckInsStore());
      expect(result.current.hasCheckedInThisWeek()).toBe(false);
    });

    it('returns false when items[0].submittedAt is before this week\'s Monday', () => {
      // Use a time clearly in the past (one full week ago)
      const monday = getThisWeekMonday();
      const lastWeek = new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      useCheckInsStore.setState({ items: [makeCheckIn({ submittedAt: lastWeek })] });

      const { result } = renderHook(() => useCheckInsStore());
      expect(result.current.hasCheckedInThisWeek()).toBe(false);
    });
  });

  describe('integration sequences', () => {
    it('fetch populates list, then addItem makes hasCheckedInThisWeek return true for a current-week item', async () => {
      const monday = getThisWeekMonday();
      const submittedAt = new Date(monday.getTime() + 2 * 60 * 60 * 1000).toISOString();
      const fetchedItem = makeCheckIn({ _id: 'ci-fetched', submittedAt });
      mockFetchCheckIns.mockResolvedValueOnce([fetchedItem]);

      const { result } = renderHook(() => useCheckInsStore());

      await act(async () => {
        await result.current.fetchCheckIns();
      });

      expect(result.current.items).toHaveLength(1);

      const newItem = makeCheckIn({ _id: 'ci-new', submittedAt: new Date().toISOString() });
      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.hasCheckedInThisWeek()).toBe(true);
    });

    it('after fetchCheckIns resolving an empty array, items is [] and hasCheckedInThisWeek is false', async () => {
      mockFetchCheckIns.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useCheckInsStore());

      await act(async () => {
        await result.current.fetchCheckIns();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.hasCheckedInThisWeek()).toBe(false);
    });
  });
});
