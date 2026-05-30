// Mock expo-secure-store before imports
jest.mock('expo-secure-store');
// Mock the auth store to avoid circular dependency
jest.mock('../../stores/auth.store', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

import MockAdapter from 'axios-mock-adapter';
import { useAuthStore } from '../../stores/auth.store';

// Import after mocks are set up
import { apiClient } from './client';

const mockGetState = useAuthStore.getState as jest.Mock;

describe('apiClient', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('interceptor', () => {
    it('on a 401 calls refresh once, retries the original request with the new access token, and queues concurrent 401s behind the single refresh call', async () => {
      const refreshMock = jest.fn().mockResolvedValue(true);
      const logoutMock = jest.fn().mockResolvedValue(undefined);

      mockGetState.mockReturnValue({
        accessToken: 'old-token',
        refresh: refreshMock,
        logout: logoutMock,
      });

      let callCount = 0;

      mock.onGet('/protected').reply(() => {
        callCount++;
        // First two calls (concurrent) return 401; retry calls return 200
        if (callCount <= 2) {
          return [401, { message: 'Unauthorized' }];
        }
        return [200, { data: 'ok' }];
      });

      // After refresh, update the store to return the new token
      refreshMock.mockImplementation(async () => {
        mockGetState.mockReturnValue({
          accessToken: 'new-token',
          refresh: refreshMock,
          logout: logoutMock,
        });
        return true;
      });

      // Fire two concurrent requests that will both get 401
      const [res1, res2] = await Promise.all([
        apiClient.get('/protected'),
        apiClient.get('/protected'),
      ]);

      // Both should succeed after the single refresh
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // refresh should only be called once (single-flight)
      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(logoutMock).not.toHaveBeenCalled();
    });

    it('when refresh fails, calls logout and does not retry', async () => {
      const refreshMock = jest.fn().mockResolvedValue(false);
      const logoutMock = jest.fn().mockResolvedValue(undefined);

      mockGetState.mockReturnValue({
        accessToken: 'old-token',
        refresh: refreshMock,
        logout: logoutMock,
      });

      mock.onGet('/protected').reply(401, { message: 'Unauthorized' });

      await expect(apiClient.get('/protected')).rejects.toThrow();

      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
