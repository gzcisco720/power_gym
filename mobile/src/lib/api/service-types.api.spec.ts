jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchServiceTypes,
  createServiceType,
  updateServiceType,
} from './service-types.api';
import { ServiceType } from '../../types/service-types';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;

const MOCK_SERVICE: ServiceType = {
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('service-types.api', () => {
  describe('fetchServiceTypes', () => {
    it('GETs /service-types and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_SERVICE] });

      const result = await fetchServiceTypes();

      expect(mockGet).toHaveBeenCalledWith('/service-types');
      expect(result).toEqual([MOCK_SERVICE]);
    });
  });

  describe('createServiceType', () => {
    it('POSTs /service-types with the dto and returns the created ServiceType', async () => {
      const dto = { name: 'PT Session', durationMin: 60, pricePerSession: 80 };
      mockPost.mockResolvedValueOnce({ data: MOCK_SERVICE });

      const result = await createServiceType(dto);

      expect(mockPost).toHaveBeenCalledWith('/service-types', dto);
      expect(result).toEqual(MOCK_SERVICE);
    });
  });

  describe('updateServiceType', () => {
    it('PATCHes /service-types/:id with the dto and returns the updated ServiceType', async () => {
      const dto = { isActive: false };
      const updated = { ...MOCK_SERVICE, isActive: false };
      mockPatch.mockResolvedValueOnce({ data: updated });

      const result = await updateServiceType('st1', dto);

      expect(mockPatch).toHaveBeenCalledWith('/service-types/st1', dto);
      expect(result).toEqual(updated);
    });
  });
});
