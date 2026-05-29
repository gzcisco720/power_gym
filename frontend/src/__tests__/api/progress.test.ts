import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import { fetchProgress } from '@/api/progress';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/progress', () => {
  it('fetchProgress calls GET /api/v1/progress/:memberId', async () => {
    await fetchProgress('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/progress/m1');
  });
});
