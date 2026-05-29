import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import { fetchCheckIns, submitCheckIn, fetchConfig } from '@/api/check-ins';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/check-ins', () => {
  it('fetchCheckIns calls GET /api/v1/check-ins', async () => {
    await fetchCheckIns();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/check-ins');
  });

  it('submitCheckIn calls POST /api/v1/check-ins', async () => {
    await submitCheckIn({
      sleepQuality: 7, stress: 5, fatigue: 4, hunger: 6,
      recovery: 8, energy: 7, digestion: 8, stuckToDiet: 'yes',
    });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/check-ins',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchConfig returns a static default config', async () => {
    const config = await fetchConfig();
    expect(config).toEqual({ dayOfWeek: 1, reminderTime: '08:00' });
  });
});
