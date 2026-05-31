import { create } from 'zustand';
import { getProfile, updateProfile, ProfileData, UpdateProfileDto } from '../lib/api/profile.api';
import { useAuthStore } from './auth.store';

interface ProfileState {
  profile: ProfileData | null;
  isLoading: boolean;
  fetchProfile(): Promise<void>;
  saveProfile(dto: UpdateProfileDto): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,

  async fetchProfile(): Promise<void> {
    set({ isLoading: true });
    try {
      const data = await getProfile();
      set({ profile: data });
    } finally {
      set({ isLoading: false });
    }
  },

  async saveProfile(dto: UpdateProfileDto): Promise<void> {
    const data = await updateProfile(dto);
    set({ profile: data });

    // Sync name + avatar back to auth store so drawer footer reflects changes
    const { firstName, lastName } = data;
    const authState = useAuthStore.getState();
    if (authState.user) {
      useAuthStore.setState({
        user: { ...authState.user, firstName, lastName },
      });
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { apiClient } = await import('../lib/api/client');
    await apiClient.patch('/users/me/password', { currentPassword, newPassword });
  },
}));
