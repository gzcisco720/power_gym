import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

// Mock the auth API module
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}));

import * as authApi from '@/api/auth';

const mockUser = { id: '1', email: 'test@example.com', role: 'owner' as const, name: 'Test User' };
const mockAuthResponse = { access_token: 'token123', user: mockUser };

beforeEach(() => {
  useAuthStore.setState({ status: 'idle', accessToken: null, user: null });
  vi.clearAllMocks();
});

describe('authStore', () => {
  describe('login', () => {
    it('stores accessToken in memory and sets status authenticated on success', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce(mockAuthResponse);

      await useAuthStore.getState().login('test@example.com', 'password');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('token123');
      expect(state.status).toBe('authenticated');
    });

    it('sets user (id, email, role, name) from the login response', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce(mockAuthResponse);

      await useAuthStore.getState().login('test@example.com', 'password');

      const { user } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
    });

    it('leaves status unauthenticated and throws on 401 invalid credentials', async () => {
      vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Invalid email or password.'));

      await expect(useAuthStore.getState().login('bad@example.com', 'wrong')).rejects.toThrow(
        'Invalid email or password.',
      );

      const state = useAuthStore.getState();
      expect(state.status).toBe('idle');
      expect(state.accessToken).toBeNull();
    });
  });

  describe('initAuth', () => {
    it('on success sets status authenticated and populates accessToken and user', async () => {
      vi.mocked(authApi.refresh).mockResolvedValueOnce(mockAuthResponse);

      await useAuthStore.getState().initAuth();

      const state = useAuthStore.getState();
      expect(state.status).toBe('authenticated');
      expect(state.accessToken).toBe('token123');
      expect(state.user).toEqual(mockUser);
    });

    it('on refresh failure sets status unauthenticated and clears accessToken', async () => {
      vi.mocked(authApi.refresh).mockRejectedValueOnce(new Error('Refresh failed'));

      await useAuthStore.getState().initAuth();

      const state = useAuthStore.getState();
      expect(state.status).toBe('unauthenticated');
      expect(state.accessToken).toBeNull();
    });

    it('sets status loading while the refresh request is in flight', async () => {
      let resolveRefresh!: (value: typeof mockAuthResponse) => void;
      const pendingPromise = new Promise<typeof mockAuthResponse>((resolve) => {
        resolveRefresh = resolve;
      });
      vi.mocked(authApi.refresh).mockReturnValueOnce(pendingPromise);

      const initPromise = useAuthStore.getState().initAuth();

      // Status should be 'loading' while the promise is pending
      expect(useAuthStore.getState().status).toBe('loading');

      resolveRefresh(mockAuthResponse);
      await initPromise;

      expect(useAuthStore.getState().status).toBe('authenticated');
    });
  });

  describe('refresh', () => {
    it('returns the new access token string and stores it on success', async () => {
      vi.mocked(authApi.refresh).mockResolvedValueOnce(mockAuthResponse);

      const token = await useAuthStore.getState().refresh();

      expect(token).toBe('token123');
      expect(useAuthStore.getState().accessToken).toBe('token123');
      expect(useAuthStore.getState().status).toBe('authenticated');
    });

    it('returns null and sets status unauthenticated on failure', async () => {
      vi.mocked(authApi.refresh).mockRejectedValueOnce(new Error('Refresh failed'));

      const token = await useAuthStore.getState().refresh();

      expect(token).toBeNull();
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });

  describe('logout', () => {
    it('posts /api/v1/auth/logout then clears accessToken and user and sets status unauthenticated', async () => {
      vi.mocked(authApi.logout).mockResolvedValueOnce(undefined);
      // Set some initial state
      useAuthStore.setState({ status: 'authenticated', accessToken: 'token123', user: mockUser });

      await useAuthStore.getState().logout();

      expect(authApi.logout).toHaveBeenCalledOnce();
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.status).toBe('unauthenticated');
    });
  });
});
