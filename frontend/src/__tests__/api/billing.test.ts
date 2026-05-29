import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import { fetchActiveServiceTypes, createServiceType, deleteServiceType, fetchMemberBilling } from '@/api/billing';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/billing', () => {
  it('fetchActiveServiceTypes calls GET /api/v1/service-types/active', async () => {
    await fetchActiveServiceTypes();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/service-types/active');
  });

  it('createServiceType calls POST /api/v1/service-types with body', async () => {
    await createServiceType({ name: 'PT', durationMin: 60, pricePerSession: 100 });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/service-types',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deleteServiceType calls DELETE /api/v1/service-types/:id', async () => {
    await deleteServiceType('st1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/service-types/st1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('fetchMemberBilling calls GET /api/v1/billing/member/:id', async () => {
    await fetchMemberBilling('m1');
    expect(mockRequest).toHaveBeenCalledWith(expect.stringContaining('/api/v1/billing/member/m1'));
  });
});
