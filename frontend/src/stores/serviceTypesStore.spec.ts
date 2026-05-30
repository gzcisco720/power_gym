import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useServiceTypesStore } from './serviceTypesStore';

vi.mock('@/api/service-types', () => ({
  fetchServiceTypes: vi.fn(),
  createServiceType: vi.fn(),
  updateServiceType: vi.fn(),
}));

import * as serviceTypesApi from '@/api/service-types';

describe('serviceTypesStore', () => {
  beforeEach(() => {
    useServiceTypesStore.setState({ serviceTypes: [], isLoading: false, error: null });
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('adds a service type to the list', async () => {
      const created = {
        _id: 'st1',
        name: '1hr PT',
        durationMin: 60,
        pricePerSession: 100,
        currency: 'AUD',
        note: null,
        isActive: true,
      };
      vi.mocked(serviceTypesApi.createServiceType).mockResolvedValue(created);

      await useServiceTypesStore.getState().create({
        name: '1hr PT',
        durationMin: 60,
        pricePerSession: 100,
        note: null,
      });

      expect(serviceTypesApi.createServiceType).toHaveBeenCalled();
      expect(useServiceTypesStore.getState().serviceTypes).toContainEqual(created);
    });
  });
});
