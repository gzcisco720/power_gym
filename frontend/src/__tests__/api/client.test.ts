import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the authStore
vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

import { useAuthStore } from '@/stores/authStore';
import { request } from '@/api/client';

const mockGetState = vi.mocked(useAuthStore.getState);

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('apiClient', () => {
  describe('request', () => {
    it("attaches 'Authorization: Bearer <accessToken>' from authStore", async () => {
      mockGetState.mockReturnValue({
        accessToken: 'mytoken',
        refresh: vi.fn(),
        logout: vi.fn(),
        status: 'authenticated',
        user: null,
        login: vi.fn(),
        initAuth: vi.fn(),
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(makeResponse({ data: 'ok' }));

      await request('/api/v1/some-endpoint');

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      const headers = (options as RequestInit).headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer mytoken');
    });

    it('on 401 calls authStore.refresh once then retries the request exactly once with the new token', async () => {
      const mockRefresh = vi.fn().mockResolvedValue('newtoken');
      const mockLogout = vi.fn();
      mockGetState.mockReturnValue({
        accessToken: 'oldtoken',
        refresh: mockRefresh,
        logout: mockLogout,
        status: 'authenticated',
        user: null,
        login: vi.fn(),
        initAuth: vi.fn(),
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeResponse({}, 401))
        .mockResolvedValueOnce(makeResponse({ data: 'ok' }));

      await request('/api/v1/some-endpoint');

      expect(mockRefresh).toHaveBeenCalledOnce();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const [, retryOptions] = vi.mocked(global.fetch).mock.calls[1];
      const retryHeaders = (retryOptions as RequestInit).headers as Record<string, string>;
      expect(retryHeaders['Authorization']).toBe('Bearer newtoken');
    });

    it('when refresh returns null throws Session expired without calling logout (no second retry)', async () => {
      const mockRefresh = vi.fn().mockResolvedValue(null);
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      mockGetState.mockReturnValue({
        accessToken: 'oldtoken',
        refresh: mockRefresh,
        logout: mockLogout,
        status: 'authenticated',
        user: null,
        login: vi.fn(),
        initAuth: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce(makeResponse({}, 401));

      await expect(request('/api/v1/some-endpoint')).rejects.toThrow('Session expired');
      expect(mockRefresh).toHaveBeenCalledOnce();
      expect(mockLogout).not.toHaveBeenCalled();
      // Only 1 fetch call — no retry
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('passes a non-401 response through unchanged (no refresh attempt)', async () => {
      const mockRefresh = vi.fn();
      mockGetState.mockReturnValue({
        accessToken: 'mytoken',
        refresh: mockRefresh,
        logout: vi.fn(),
        status: 'authenticated',
        user: null,
        login: vi.fn(),
        initAuth: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce(makeResponse({ result: 'data' }, 200));

      const result = await request<{ result: string }>('/api/v1/some-endpoint');

      expect(result).toEqual({ result: 'data' });
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
