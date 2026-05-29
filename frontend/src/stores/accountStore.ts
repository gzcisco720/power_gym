import { create } from 'zustand';
import * as api from '@/api/account';

interface AccountState {
  profile: api.UserProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<api.UserProfile>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  changeEmail: (email: string) => Promise<void>;
  reset: () => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.fetchProfile();
      set({ profile, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  updateProfile: async (data) => {
    await api.updateProfile(data);
    // Merge the submitted fields into current profile state
    set((s) => ({
      profile: s.profile ? { ...s.profile, ...data } : s.profile,
    }));
  },

  changePassword: async (currentPassword, newPassword) => {
    const result = await api.changePassword(currentPassword, newPassword);
    return result.success;
  },

  changeEmail: async (email) => {
    await api.changeEmail(email);
    set((s) => ({
      profile: s.profile ? { ...s.profile, email } : null,
    }));
  },

  reset: () => {
    set({ profile: null, error: null });
  },
}));
