import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import { fetchMemberSchedule, createScheduledSession, cancelScheduledSession } from '@/api/schedule';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/schedule', () => {
  it('fetchMemberSchedule calls GET /api/v1/schedule/member/:id', async () => {
    await fetchMemberSchedule('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/schedule/member/m1');
  });

  it('createScheduledSession calls POST /api/v1/schedule with body', async () => {
    await createScheduledSession({ memberIds: ['m1'], date: '2026-06-15', startTime: '09:00', endTime: '10:00' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/schedule',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('cancelScheduledSession calls DELETE /api/v1/schedule/:id', async () => {
    await cancelScheduledSession('ss1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/schedule/ss1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
