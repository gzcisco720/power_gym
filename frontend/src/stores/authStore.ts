import { create } from 'zustand';
import { login as apiLogin, logout as apiLogout, refresh as apiRefresh } from '@/api/auth';

type Role = 'owner' | 'trainer' | 'member';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  accessToken: null,
  user: null,

  login: async (email, password) => {
    const data = await apiLogin(email, password); // throws on 401
    set({ status: 'authenticated', accessToken: data.access_token, user: data.user });
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    set({ status: 'unauthenticated', accessToken: null, user: null });
  },

  refresh: async () => {
    try {
      const data = await apiRefresh();
      set({ status: 'authenticated', accessToken: data.access_token, user: data.user });
      return data.access_token;
    } catch {
      set({ status: 'unauthenticated', accessToken: null, user: null });
      return null;
    }
  },

  initAuth: async () => {
    if (get().status === 'loading' || get().status === 'authenticated') return;
    set({ status: 'loading' });
    await get().refresh(); // sets status to 'authenticated' or 'unauthenticated'
  },
}));
