import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

vi.mock('@/api/settings', () => ({
  fetchProfile: vi.fn(),
  saveProfile: vi.fn(),
  saveGymInfo: vi.fn(),
}));

import * as settingsApi from '@/api/settings';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      profile: null,
      gymInfo: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('saveProfile', () => {
    it('patches profile and updates store', async () => {
      const updated = {
        mobile: null,
        address: null,
        dateOfBirth: null,
        avatarUrl: null,
        certifications: [],
        gymInfo: null,
      };
      vi.mocked(settingsApi.saveProfile).mockResolvedValue(updated);

      await useSettingsStore.getState().patchProfile({ mobile: null });

      expect(settingsApi.saveProfile).toHaveBeenCalledWith({ mobile: null });
      expect(useSettingsStore.getState().profile).toEqual(updated);
    });
  });
});
