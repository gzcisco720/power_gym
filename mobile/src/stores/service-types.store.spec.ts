// Mock the API module before importing the store
jest.mock('../lib/api/service-types.api', () => ({
  fetchServiceTypes: jest.fn(),
  createServiceType: jest.fn(),
  updateServiceType: jest.fn(),
}));

import * as serviceTypesApi from '../lib/api/service-types.api';
import { useServiceTypesStore } from './service-types.store';
import { ServiceType } from '../types/service-types';

const mockFetchServiceTypes = serviceTypesApi.fetchServiceTypes as jest.MockedFunction<
  typeof serviceTypesApi.fetchServiceTypes
>;

const MOCK_ITEM_1: ServiceType = {
  _id: 'st1',
  name: 'PT Session',
  durationMin: 60,
  pricePerSession: 80,
  currency: 'AUD',
  note: null,
  isActive: true,
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_ITEM_2: ServiceType = {
  _id: 'st2',
  name: 'Group Class',
  durationMin: 45,
  pricePerSession: 30,
  currency: 'AUD',
  note: 'Morning only',
  isActive: false,
  createdBy: 'user1',
  createdAt: '2024-01-02T00:00:00.000Z',
};

function resetStore() {
  useServiceTypesStore.setState({ items: [], filter: 'all', loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useServiceTypesStore', () => {
  describe('fetchServiceTypes', () => {
    it('populates items and sets loading false on success', async () => {
      mockFetchServiceTypes.mockResolvedValueOnce([MOCK_ITEM_1, MOCK_ITEM_2]);

      await useServiceTypesStore.getState().fetchServiceTypes();

      const state = useServiceTypesStore.getState();
      expect(state.items).toEqual([MOCK_ITEM_1, MOCK_ITEM_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error message and loading false when api rejects', async () => {
      mockFetchServiceTypes.mockRejectedValueOnce(new Error('Network error'));

      await useServiceTypesStore.getState().fetchServiceTypes();

      const state = useServiceTypesStore.getState();
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addItem', () => {
    it('prepends the new item to items', () => {
      useServiceTypesStore.setState({ items: [MOCK_ITEM_2] });

      useServiceTypesStore.getState().addItem(MOCK_ITEM_1);

      const state = useServiceTypesStore.getState();
      expect(state.items[0]).toEqual(MOCK_ITEM_1);
      expect(state.items[1]).toEqual(MOCK_ITEM_2);
      expect(state.items).toHaveLength(2);
    });
  });

  describe('updateItem', () => {
    it('replaces the item with matching _id and leaves others unchanged', () => {
      useServiceTypesStore.setState({ items: [MOCK_ITEM_1, MOCK_ITEM_2] });
      const updated = { ...MOCK_ITEM_1, name: 'Updated PT Session' };

      useServiceTypesStore.getState().updateItem(updated);

      const state = useServiceTypesStore.getState();
      expect(state.items[0]).toEqual(updated);
      expect(state.items[1]).toEqual(MOCK_ITEM_2);
    });
  });

  describe('setFilter', () => {
    it('updates filter to the given tab', () => {
      expect(useServiceTypesStore.getState().filter).toBe('all');

      useServiceTypesStore.getState().setFilter('inactive');

      expect(useServiceTypesStore.getState().filter).toBe('inactive');
    });
  });
});

describe('useServiceTypesStore integration (mocked api, real store wiring)', () => {
  it('fetchServiceTypes calls service-types.api.fetchServiceTypes exactly once and stores its resolved array', async () => {
    mockFetchServiceTypes.mockResolvedValueOnce([MOCK_ITEM_1, MOCK_ITEM_2]);

    await useServiceTypesStore.getState().fetchServiceTypes();

    expect(mockFetchServiceTypes).toHaveBeenCalledTimes(1);
    expect(useServiceTypesStore.getState().items).toEqual([MOCK_ITEM_1, MOCK_ITEM_2]);
  });

  it('after addItem then setFilter("inactive"), items contains the new item and filter is "inactive"', () => {
    useServiceTypesStore.getState().addItem(MOCK_ITEM_2);
    useServiceTypesStore.getState().setFilter('inactive');

    const state = useServiceTypesStore.getState();
    expect(state.items).toContainEqual(MOCK_ITEM_2);
    expect(state.filter).toBe('inactive');
  });
});
