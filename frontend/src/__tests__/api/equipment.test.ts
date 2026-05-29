import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import { fetchEquipment, createEquipment, fetchConditionReports, addConditionReport } from '@/api/equipment';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/equipment', () => {
  it('fetchEquipment calls GET /api/v1/owner/equipment', async () => {
    await fetchEquipment();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/owner/equipment');
  });

  it('createEquipment calls POST /api/v1/owner/equipment with body', async () => {
    await createEquipment({ name: 'Barbell' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/owner/equipment',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchConditionReports calls GET /api/v1/owner/equipment/:id/condition-reports', async () => {
    await fetchConditionReports('eq1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/owner/equipment/eq1/condition-reports');
  });

  it('addConditionReport calls POST /api/v1/owner/equipment/:id/condition-reports with body', async () => {
    await addConditionReport('eq1', { note: 'Good condition' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/owner/equipment/eq1/condition-reports',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
