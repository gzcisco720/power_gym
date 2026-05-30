import { create } from 'zustand';
import * as ExpoSecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { jwtDecode } from 'jwt-decode';
import { apiClient } from '../lib/api/client';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'trainer' | 'member';
  trainerId: string | null;
}

interface AccessTokenPayload {
  sub: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'trainer' | 'member';
  trainerId: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  biometricsEnabled: boolean;
  isLoading: boolean;

  login(email: string, password: string): Promise<void>;
  loginWithBiometrics(): Promise<void>;
  refresh(): Promise<boolean>;
  logout(): Promise<void>;
  setBiometricsEnabled(enabled: boolean): Promise<void>;
  hydrate(): Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  biometricsEnabled: false,
  isLoading: false,

  async login(email: string, password: string): Promise<void> {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', { email, password });

    const { accessToken, refreshToken, user } = response.data;

    await ExpoSecureStore.setItemAsync('refresh_token', refreshToken);

    set({ accessToken, user });
  },

  async loginWithBiometrics(): Promise<void> {
    const result = await LocalAuthentication.authenticateAsync();
    if (!result.success) {
      throw new Error('Biometric authentication failed');
    }

    const success = await get().refresh();
    if (!success) {
      throw new Error('Session refresh failed after biometric authentication');
    }
  },

  async refresh(): Promise<boolean> {
    const storedToken = await ExpoSecureStore.getItemAsync('refresh_token');
    if (!storedToken) {
      set({ accessToken: null, user: null });
      return false;
    }

    try {
      // Get userId from in-memory access token if available, otherwise skip userId
      // The server will accept a refresh even without userId when the token is valid
      const currentAccessToken = get().accessToken;
      let userId: string | undefined;
      if (currentAccessToken) {
        const payload = jwtDecode<AccessTokenPayload>(currentAccessToken);
        userId = payload.sub;
      }

      const response = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/refresh', { userId, refreshToken: storedToken });

      const { accessToken, refreshToken } = response.data;

      await ExpoSecureStore.setItemAsync('refresh_token', refreshToken);

      const newPayload = jwtDecode<AccessTokenPayload>(accessToken);
      const user: User = {
        id: newPayload.sub,
        firstName: newPayload.firstName,
        lastName: newPayload.lastName,
        role: newPayload.role,
        trainerId: newPayload.trainerId,
      };

      set({ accessToken, user });
      return true;
    } catch {
      set({ accessToken: null, user: null });
      return false;
    }
  },

  async logout(): Promise<void> {
    const { accessToken } = get();
    const storedToken = await ExpoSecureStore.getItemAsync('refresh_token');

    if (accessToken && storedToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken: storedToken });
      } catch {
        // Best-effort — clear local state regardless
      }
    }

    await ExpoSecureStore.deleteItemAsync('refresh_token');
    set({ accessToken: null, user: null });
  },

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await ExpoSecureStore.setItemAsync('biometrics_enabled', enabled ? 'true' : 'false');
    set({ biometricsEnabled: enabled });
  },

  async hydrate(): Promise<void> {
    const biometricsValue = await ExpoSecureStore.getItemAsync('biometrics_enabled');
    const biometricsEnabled = biometricsValue === 'true';

    if (!biometricsEnabled) {
      set({ biometricsEnabled: false });
      return;
    }

    set({ biometricsEnabled: true });

    const result = await LocalAuthentication.authenticateAsync();
    if (!result.success) {
      return;
    }

    await get().refresh();
  },
}));
