import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/equipment', () => ({
  fetchEquipment: vi.fn(),
  createEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  fetchConditionReports: vi.fn(),
  addConditionReport: vi.fn(),
}));

import * as equipmentApi from '@/api/equipment';
import { useEquipmentStore } from '@/stores/equipmentStore';

const mockEquipment: equipmentApi.Equipment = {
  _id: 'eq1',
  name: 'Barbell',
  status: 'good',
  brand: null,
  quantity: 2,
  note: null,
  trackCondition: false,
};

const mockReport: equipmentApi.ConditionReport = {
  _id: 'cr1',
  equipmentId: 'eq1',
  note: 'Good condition',
  reportedAt: '2026-06-01T00:00:00Z',
};

beforeEach(() => {
  useEquipmentStore.setState({ equipment: [], conditionReports: {}, isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('equipmentStore', () => {
  describe('fetchEquipment', () => {
    it('populates equipment list', async () => {
      vi.mocked(equipmentApi.fetchEquipment).mockResolvedValueOnce([mockEquipment]);

      await useEquipmentStore.getState().fetchEquipment();

      expect(useEquipmentStore.getState().equipment).toEqual([mockEquipment]);
    });
  });

  describe('createEquipment', () => {
    it('appends a new equipment item', async () => {
      useEquipmentStore.setState({ equipment: [mockEquipment] });
      const newItem: equipmentApi.Equipment = { ...mockEquipment, _id: 'eq2', name: 'Dumbbell' };
      vi.mocked(equipmentApi.createEquipment).mockResolvedValueOnce(newItem);

      await useEquipmentStore.getState().createEquipment({ name: 'Dumbbell' });

      const items = useEquipmentStore.getState().equipment;
      expect(items).toHaveLength(2);
      expect(items[1]).toEqual(newItem);
    });
  });

  describe('deleteEquipment', () => {
    it('calls API then removes equipment by id', async () => {
      useEquipmentStore.setState({ equipment: [mockEquipment] });
      vi.mocked(equipmentApi.deleteEquipment).mockResolvedValueOnce({ success: true });

      await useEquipmentStore.getState().deleteEquipment('eq1');

      expect(equipmentApi.deleteEquipment).toHaveBeenCalledWith('eq1');
      expect(useEquipmentStore.getState().equipment).toHaveLength(0);
    });
  });

  describe('addConditionReport', () => {
    it('appends a report to the targeted equipment item', async () => {
      useEquipmentStore.setState({ conditionReports: { eq1: [] } });
      vi.mocked(equipmentApi.addConditionReport).mockResolvedValueOnce(mockReport);

      await useEquipmentStore.getState().addConditionReport('eq1', { note: 'Good condition' });

      const reports = useEquipmentStore.getState().conditionReports['eq1'];
      expect(reports).toEqual([mockReport]);
    });
  });
});
