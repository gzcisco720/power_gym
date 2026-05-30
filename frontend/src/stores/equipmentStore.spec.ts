import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';

vi.mock('@/api/equipment', () => ({
  fetchEquipment: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  fetchConditionReports: vi.fn(),
  addConditionReport: vi.fn(),
}));

import * as equipmentApi from '@/api/equipment';
import { useEquipmentStore } from './equipmentStore';

const mockItem = {
  _id: 'eq-1',
  name: 'Treadmill',
  status: 'active' as const,
  brand: 'Life Fitness' as string | null,
  quantity: 2,
  images: [] as string[],
  note: null as string | null,
  trackCondition: true,
  nextServiceDate: null as string | null,
};

beforeEach(() => {
  useEquipmentStore.setState({ items: [], isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('equipmentStore', () => {
  describe('fetch', () => {
    it('populates items on success', async () => {
      vi.mocked(equipmentApi.fetchEquipment).mockResolvedValue([mockItem]);
      await act(async () => {
        await useEquipmentStore.getState().fetch();
      });
      expect(useEquipmentStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('reflects new status in list', async () => {
      useEquipmentStore.setState({ items: [mockItem] });
      const updated = { ...mockItem, status: 'maintenance' as const };
      vi.mocked(equipmentApi.updateEquipment).mockResolvedValue(updated);
      await act(async () => {
        await useEquipmentStore.getState().update('eq-1', { status: 'maintenance' });
      });
      const { items } = useEquipmentStore.getState();
      expect(items[0].status).toBe('maintenance');
    });
  });
});
