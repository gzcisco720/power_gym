import { create } from 'zustand';
import {
  fetchProfile,
  saveProfile,
  saveGymInfo,
} from '@/api/settings';
import type { UserProfile, GymInfo, ProfilePayload } from '@/api/settings';

export type { UserProfile, GymInfo };

interface SettingsState {
  profile: UserProfile | null;
  gymInfo: GymInfo | null;
  isLoading: boolean;
  error: string | null;

  fetchProfileData: () => Promise<void>;
  patchProfile: (payload: ProfilePayload) => Promise<void>;
  patchGymInfo: (payload: GymInfo) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  profile: null,
  gymInfo: null,
  isLoading: false,
  error: null,

  fetchProfileData: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await fetchProfile();
      set({ profile, gymInfo: profile?.gymInfo ?? null, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  patchProfile: async (payload: ProfilePayload) => {
    const updated = await saveProfile(payload);
    set({ profile: updated });
  },

  patchGymInfo: async (payload: GymInfo) => {
    await saveGymInfo(payload);
    set({ gymInfo: payload });
  },
}));
