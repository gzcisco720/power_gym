import { act, renderHook } from '@testing-library/react-native';

jest.mock('../../src/lib/api/body-tests.api', () => ({
  fetchMyBodyTests: jest.fn(),
  createBodyTest: jest.fn(),
  deleteBodyTest: jest.fn(),
}));

import * as bodyTestsApi from '../../src/lib/api/body-tests.api';
import { useBodyTestsStore } from '../../src/stores/body-tests.store';
import { BodyTest } from '../../src/types/body-tests';

const mockFetchMyBodyTests = bodyTestsApi.fetchMyBodyTests as jest.MockedFunction<
  typeof bodyTestsApi.fetchMyBodyTests
>;

function makeBodyTest(overrides: Partial<BodyTest> = {}): BodyTest {
  return {
    _id: 'bt-1',
    memberId: 'member-1',
    trainerId: null,
    date: '2026-06-03',
    age: 30,
    sex: 'male',
    weight: 80,
    protocol: '3site',
    chest: 10,
    abdominal: 20,
    thigh: 15,
    tricep: null,
    subscapular: null,
    suprailiac: null,
    midaxillary: null,
    bicep: null,
    lumbar: null,
    bodyFatPct: 16.2,
    fatMassKg: 12.96,
    leanMassKg: 67.04,
    targetWeight: null,
    targetBodyFatPct: null,
    createdAt: '2026-06-03T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  useBodyTestsStore.setState({ items: [], loading: false, error: null });
  jest.clearAllMocks();
});

describe('useBodyTestsStore', () => {
  describe('fetchMyBodyTests', () => {
    it('sets items and clears loading on success', async () => {
      const bodyTest = makeBodyTest();
      mockFetchMyBodyTests.mockResolvedValueOnce([bodyTest]);

      const { result } = renderHook(() => useBodyTestsStore());

      await act(async () => {
        await result.current.fetchMyBodyTests();
      });

      expect(result.current.items).toEqual([bodyTest]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets error and clears loading on failure', async () => {
      mockFetchMyBodyTests.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBodyTestsStore());

      await act(async () => {
        await result.current.fetchMyBodyTests();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('addItem', () => {
    it('prepends the new test to items', () => {
      const existing = makeBodyTest({ _id: 'bt-old' });
      useBodyTestsStore.setState({ items: [existing] });

      const { result } = renderHook(() => useBodyTestsStore());
      const newItem = makeBodyTest({ _id: 'bt-new' });

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.items[0]).toEqual(newItem);
      expect(result.current.items[1]).toEqual(existing);
      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes the test whose _id matches', () => {
      const a = makeBodyTest({ _id: 'bt-a' });
      const b = makeBodyTest({ _id: 'bt-b' });
      const c = makeBodyTest({ _id: 'bt-c' });
      useBodyTestsStore.setState({ items: [a, b, c] });

      const { result } = renderHook(() => useBodyTestsStore());

      act(() => {
        result.current.removeItem('bt-b');
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items.map((i) => i._id)).toEqual(['bt-a', 'bt-c']);
    });
  });
});
