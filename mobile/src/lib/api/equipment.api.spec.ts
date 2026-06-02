jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  fetchConditionReports,
  createConditionReport,
  getUploadSignature,
} from './equipment.api';
import { EquipmentItem, ConditionReport, UploadConfig } from '../../types/equipment';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

const MOCK_ITEM: EquipmentItem = {
  _id: 'eq1',
  name: 'Treadmill',
  quantity: 1,
  status: 'active',
  trackCondition: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_REPORT: ConditionReport = {
  _id: 'cr1',
  equipmentId: 'eq1',
  note: 'Belt worn',
  reportedAt: '2024-01-02T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('equipmentApi', () => {
  describe('fetchEquipment', () => {
    it('GETs /equipment and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_ITEM] });

      const result = await fetchEquipment();

      expect(mockGet).toHaveBeenCalledWith('/equipment');
      expect(result).toEqual([MOCK_ITEM]);
    });
  });

  describe('createEquipment', () => {
    it('POSTs /equipment with the dto and returns created item', async () => {
      const dto = { name: 'Treadmill' };
      mockPost.mockResolvedValueOnce({ data: MOCK_ITEM });

      const result = await createEquipment(dto);

      expect(mockPost).toHaveBeenCalledWith('/equipment', dto);
      expect(result).toEqual(MOCK_ITEM);
    });
  });

  describe('updateEquipment', () => {
    it('PATCHes /equipment/:id with dto and returns updated item', async () => {
      const dto = { status: 'maintenance' as const };
      mockPatch.mockResolvedValueOnce({ data: { ...MOCK_ITEM, status: 'maintenance' } });

      const result = await updateEquipment('eq1', dto);

      expect(mockPatch).toHaveBeenCalledWith('/equipment/eq1', dto);
      expect(result.status).toBe('maintenance');
    });
  });

  describe('deleteEquipment', () => {
    it('DELETEs /equipment/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await deleteEquipment('eq1');

      expect(mockDelete).toHaveBeenCalledWith('/equipment/eq1');
    });
  });

  describe('fetchConditionReports', () => {
    it('GETs /equipment/:id/condition-reports and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_REPORT] });

      const result = await fetchConditionReports('eq1');

      expect(mockGet).toHaveBeenCalledWith('/equipment/eq1/condition-reports');
      expect(result).toEqual([MOCK_REPORT]);
    });
  });

  describe('createConditionReport', () => {
    it('POSTs /equipment/:id/condition-reports with { note } and returns the report', async () => {
      mockPost.mockResolvedValueOnce({ data: MOCK_REPORT });

      const result = await createConditionReport('eq1', 'Belt worn');

      expect(mockPost).toHaveBeenCalledWith('/equipment/eq1/condition-reports', {
        note: 'Belt worn',
      });
      expect(result).toEqual(MOCK_REPORT);
    });
  });

  describe('getUploadSignature', () => {
    it('POSTs /equipment/upload-signature and returns response.data', async () => {
      const mockConfig: UploadConfig = {
        provider: 'local',
        uploadUrl: '/equipment/upload',
        folder: 'equipment',
      };
      mockPost.mockResolvedValueOnce({ data: mockConfig });

      const result = await getUploadSignature();

      expect(mockPost).toHaveBeenCalledWith('/equipment/upload-signature');
      expect(result).toEqual(mockConfig);
    });
  });
});
