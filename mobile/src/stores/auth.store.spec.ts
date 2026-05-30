import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Mock native modules
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');

// Mock the API client so store tests don't need a real HTTP server
jest.mock('../lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

import { apiClient } from '../lib/api/client';
import { useAuthStore } from './auth.store';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// A minimal valid JWT with a known payload for testing
// Payload: { sub: 'user123', firstName: 'Jane', lastName: 'Doe', role: 'member', trainerId: null }
const VALID_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiJ1c2VyMTIzIiwiZmlyc3ROYW1lIjoiSmFuZSIsImxhc3ROYW1lIjoiRG9lIiwicm9sZSI6Im1lbWJlciIsInRyYWluZXJJZCI6bnVsbH0.' +
  'signature';

const ROTATED_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiJ1c2VyMTIzIiwiZmlyc3ROYW1lIjoiSmFuZSIsImxhc3ROYW1lIjoiRG9lIiwicm9sZSI6Im1lbWJlciIsInRyYWluZXJJZCI6bnVsbH0.' +
  'rotated_signature';

function getStore() {
  return useAuthStore.getState();
}

function resetStore() {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    biometricsEnabled: false,
    isLoading: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useAuthStore', () => {
  describe('login', () => {
    it('on success stores accessToken + user in state and writes raw refresh token to secure store under "refresh_token"', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          accessToken: VALID_ACCESS_TOKEN,
          refreshToken: 'raw-refresh-token',
          user: {
            id: 'user123',
            firstName: 'Jane',
            lastName: 'Doe',
            role: 'member',
            trainerId: null,
          },
        },
      });

      await getStore().login('jane@example.com', 'password123');

      const state = getStore();
      expect(state.accessToken).toBe(VALID_ACCESS_TOKEN);
      expect(state.user).toEqual({
        id: 'user123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'member',
        trainerId: null,
      });
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        'raw-refresh-token',
      );
    });

    it('on 401 leaves accessToken null and surfaces an invalid-credentials error without writing the refresh token', async () => {
      const error = Object.assign(new Error('Unauthorized'), {
        response: { status: 401 },
      });
      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(getStore().login('jane@example.com', 'wrong')).rejects.toThrow();

      const state = getStore();
      expect(state.accessToken).toBeNull();
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('returns false and clears auth state when no refresh token is in secure store', async () => {
      // Pre-populate state as if we were logged in
      useAuthStore.setState({
        accessToken: VALID_ACCESS_TOKEN,
        user: { id: 'user123', firstName: 'Jane', lastName: 'Doe', role: 'member', trainerId: null },
        biometricsEnabled: false,
        isLoading: false,
      });

      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const result = await getStore().refresh();

      expect(result).toBe(false);
      const state = getStore();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('loginWithBiometrics', () => {
    it('calls authenticateAsync, and on success reads refresh_token and calls refresh()', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({ success: true, error: undefined });
      mockSecureStore.getItemAsync.mockResolvedValueOnce('stored-refresh-token');

      // refresh() will call /auth/refresh with the stored token
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          accessToken: ROTATED_ACCESS_TOKEN,
          refreshToken: 'new-refresh-token',
        },
      });
      // Second getItemAsync for userId from old token during refresh
      // (the store reads biometrics_enabled then refresh_token — set up mocks in order)
      mockSecureStore.getItemAsync.mockResolvedValueOnce('stored-refresh-token');

      await getStore().loginWithBiometrics();

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalled();
      // refresh_token was read from secure store
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('setBiometricsEnabled', () => {
    it('writes "true"/"false" to secure store under "biometrics_enabled" and updates state', async () => {
      await getStore().setBiometricsEnabled(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('biometrics_enabled', 'true');
      expect(getStore().biometricsEnabled).toBe(true);

      await getStore().setBiometricsEnabled(false);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('biometrics_enabled', 'false');
      expect(getStore().biometricsEnabled).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears accessToken+user from state and deletes refresh_token from secure store', async () => {
      useAuthStore.setState({
        accessToken: VALID_ACCESS_TOKEN,
        user: { id: 'user123', firstName: 'Jane', lastName: 'Doe', role: 'member', trainerId: null },
        biometricsEnabled: false,
        isLoading: false,
      });

      mockSecureStore.getItemAsync.mockResolvedValueOnce('raw-refresh-token');
      mockApiClient.post.mockResolvedValueOnce({ data: {} });

      await getStore().logout();

      const state = getStore();
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('hydrate', () => {
    it('with biometrics disabled resolves to an unauthenticated state (no biometric prompt)', async () => {
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'biometrics_enabled') return 'false';
        return null;
      });

      await getStore().hydrate();

      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
      const state = getStore();
      expect(state.accessToken).toBeNull();
    });
  });
});
