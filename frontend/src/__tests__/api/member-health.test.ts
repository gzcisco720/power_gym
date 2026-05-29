import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import {
  fetchInjuries,
  createInjury,
  fetchMedicalHistory,
  fetchMedications,
} from '@/api/member-health';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/member-health', () => {
  it('fetchInjuries calls GET /api/v1/members/:memberId/injuries', async () => {
    await fetchInjuries('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1/injuries');
  });

  it('createInjury calls POST /api/v1/members/:memberId/injuries', async () => {
    await createInjury('m1', { description: 'Knee pain', injuryDate: '2026-01-01' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/members/m1/injuries',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchMedicalHistory calls GET /api/v1/members/:memberId/medical-history', async () => {
    await fetchMedicalHistory('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1/medical-history');
  });

  it('fetchMedications calls GET /api/v1/members/:memberId/medications', async () => {
    await fetchMedications('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1/medications');
  });
});
