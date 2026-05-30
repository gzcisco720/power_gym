import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Single-flight refresh state
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null): void {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

apiClient.interceptors.request.use((config) => {
  // Lazily import to avoid circular dependency at module load time
  const { useAuthStore } = require('../../stores/auth.store') as {
    useAuthStore: { getState: () => { accessToken: string | null } };
  };
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error);
    }

    const { useAuthStore } = require('../../stores/auth.store') as {
      useAuthStore: {
        getState: () => {
          accessToken: string | null;
          refresh: () => Promise<boolean>;
          logout: () => Promise<void>;
        };
      };
    };

    if (isRefreshing) {
      // Queue this request behind the in-progress refresh
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest._retried = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retried = true;
    isRefreshing = true;

    try {
      const { refresh, logout } = useAuthStore.getState();
      const success = await refresh();

      if (!success) {
        flushQueue(null);
        await logout();
        return Promise.reject(error);
      }

      const { accessToken: newToken } = useAuthStore.getState();
      flushQueue(newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } finally {
      isRefreshing = false;
    }
  },
);
