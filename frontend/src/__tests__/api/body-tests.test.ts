import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import {
  fetchBodyTests,
  createBodyTest,
  deleteBodyTest,
  exportBodyTestsCsv,
} from '@/api/body-tests';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/body-tests', () => {
  it('fetchBodyTests calls GET /api/v1/members/:memberId/body-tests', async () => {
    await fetchBodyTests('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1/body-tests');
  });

  it('createBodyTest calls POST /api/v1/members/:memberId/body-tests', async () => {
    await createBodyTest('m1', { protocol: '3site', weight: 75, measurements: { chest: 10, abdominal: 20, thigh: 15 } });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/members/m1/body-tests',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deleteBodyTest calls DELETE /api/v1/members/:memberId/body-tests/:testId', async () => {
    await deleteBodyTest('m1', 'bt1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/members/m1/body-tests/bt1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('exportBodyTestsCsv returns the export URL string', () => {
    const url = exportBodyTestsCsv('m1');
    expect(url).toBe('/api/v1/members/m1/body-tests/export');
  });
});
