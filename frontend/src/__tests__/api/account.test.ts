import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import { fetchProfile, updateProfile, changePassword, changeEmail } from '@/api/account';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/account', () => {
  it('fetchProfile calls GET /api/v1/profile', async () => {
    await fetchProfile();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/profile');
  });

  it('updateProfile calls PATCH /api/v1/profile', async () => {
    await updateProfile({ firstName: 'John' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/profile',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('changePassword calls PATCH /api/v1/account/password', async () => {
    await changePassword('old', 'new123');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/account/password',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('changeEmail calls PATCH /api/v1/account/email', async () => {
    await changeEmail('new@test.com');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/account/email',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
