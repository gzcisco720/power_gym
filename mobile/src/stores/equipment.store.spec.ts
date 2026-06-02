// Mock the API module before importing the store
jest.mock('../lib/api/equipment.api', () => ({
  fetchEquipment: jest.fn(),
  createEquipment: jest.fn(),
  updateEquipment: jest.fn(),
  deleteEquipment: jest.fn(),
  fetchConditionReports: jest.fn(),
  createConditionReport: jest.fn(),
  getUploadSignature: jest.fn(),
}));

import * as equipmentApi from '../lib/api/equipment.api';
import { useEquipmentStore } from './equipment.store';
import { EquipmentItem } from '../types/equipment';

const mockFetchEquipment = equipmentApi.fetchEquipment as jest.MockedFunction<
  typeof equipmentApi.fetchEquipment
>;
const mockCreateEquipment = equipmentApi.createEquipment as jest.MockedFunction<
  typeof equipmentApi.createEquipment
>;
const mockUpdateEquipment = equipmentApi.updateEquipment as jest.MockedFunction<
  typeof equipmentApi.updateEquipment
>;
const mockDeleteEquipment = equipmentApi.deleteEquipment as jest.MockedFunction<
  typeof equipmentApi.deleteEquipment
>;

const MOCK_ITEM_1: EquipmentItem = {
  _id: 'eq1',
  name: 'Treadmill',
  quantity: 1,
  status: 'active',
  trackCondition: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_ITEM_2: EquipmentItem = {
  _id: 'eq2',
  name: 'Barbell',
  quantity: 5,
  status: 'maintenance',
  trackCondition: true,
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

function resetStore() {
  useEquipmentStore.setState({ items: [], filter: 'all', loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useEquipmentStore', () => {
  describe('fetchEquipment', () => {
    it('populates items and sets loading false on success', async () => {
      mockFetchEquipment.mockResolvedValueOnce([MOCK_ITEM_1, MOCK_ITEM_2]);

      await useEquipmentStore.getState().fetchEquipment();

      const state = useEquipmentStore.getState();
      expect(state.items).toEqual([MOCK_ITEM_1, MOCK_ITEM_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('leaves items empty and sets error on failure', async () => {
      mockFetchEquipment.mockRejectedValueOnce(new Error('Network error'));

      await useEquipmentStore.getState().fetchEquipment();

      const state = useEquipmentStore.getState();
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addItem', () => {
    it('prepends the new item to items', () => {
      useEquipmentStore.setState({ items: [MOCK_ITEM_2] });

      useEquipmentStore.getState().addItem(MOCK_ITEM_1);

      const state = useEquipmentStore.getState();
      expect(state.items[0]).toEqual(MOCK_ITEM_1);
      expect(state.items[1]).toEqual(MOCK_ITEM_2);
      expect(state.items).toHaveLength(2);
    });
  });

  describe('updateItem', () => {
    it('replaces the matching item by _id', () => {
      useEquipmentStore.setState({ items: [MOCK_ITEM_1, MOCK_ITEM_2] });
      const updated = { ...MOCK_ITEM_1, name: 'Updated Treadmill', status: 'maintenance' as const };

      useEquipmentStore.getState().updateItem(updated);

      const state = useEquipmentStore.getState();
      expect(state.items[0]).toEqual(updated);
      expect(state.items[1]).toEqual(MOCK_ITEM_2);
    });
  });

  describe('removeItem', () => {
    it('removes the item with the given _id', () => {
      useEquipmentStore.setState({ items: [MOCK_ITEM_1, MOCK_ITEM_2] });

      useEquipmentStore.getState().removeItem('eq1');

      const state = useEquipmentStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(MOCK_ITEM_2);
    });
  });

  describe('setFilter', () => {
    it('updates filter value', () => {
      expect(useEquipmentStore.getState().filter).toBe('all');

      useEquipmentStore.getState().setFilter('active');

      expect(useEquipmentStore.getState().filter).toBe('active');
    });
  });
});

describe('useEquipmentStore integration (mocked apiClient, real store↔api wiring)', () => {
  it('fetchEquipment with 2-item list → store items.length === 2', async () => {
    mockFetchEquipment.mockResolvedValueOnce([MOCK_ITEM_1, MOCK_ITEM_2]);

    await useEquipmentStore.getState().fetchEquipment();

    expect(useEquipmentStore.getState().items).toHaveLength(2);
  });

  it('fetchEquipment on rejection → store error is non-empty string and items is []', async () => {
    mockFetchEquipment.mockRejectedValueOnce(new Error('Server down'));

    await useEquipmentStore.getState().fetchEquipment();

    const state = useEquipmentStore.getState();
    expect(state.error).toBeTruthy();
    expect(typeof state.error).toBe('string');
    expect(state.items).toEqual([]);
  });
});

// Silence unused import warnings for mocks not used in every test
void mockCreateEquipment;
void mockUpdateEquipment;
void mockDeleteEquipment;
