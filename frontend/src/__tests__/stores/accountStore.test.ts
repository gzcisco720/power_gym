import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/account', () => ({
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  changeEmail: vi.fn(),
}));

import * as accountApi from '@/api/account';
import { useAccountStore } from '@/stores/accountStore';

const mockProfile: accountApi.UserProfile = {
  id: 'u1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  mobile: null,
  avatarUrl: null,
  bio: null,
};

beforeEach(() => {
  useAccountStore.setState({
    profile: null,
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('accountStore', () => {
  describe('fetchProfile', () => {
    it('populates the user profile', async () => {
      vi.mocked(accountApi.fetchProfile).mockResolvedValueOnce(mockProfile);

      await useAccountStore.getState().fetchProfile();

      expect(useAccountStore.getState().profile).toEqual(mockProfile);
      expect(useAccountStore.getState().isLoading).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('merges the updated fields into state', async () => {
      useAccountStore.setState({ profile: mockProfile });
      vi.mocked(accountApi.updateProfile).mockResolvedValueOnce(mockProfile);

      await useAccountStore.getState().updateProfile({ firstName: 'Jane' });

      expect(useAccountStore.getState().profile?.firstName).toBe('Jane');
    });
  });

  describe('changePassword', () => {
    it('returns success on 200', async () => {
      vi.mocked(accountApi.changePassword).mockResolvedValueOnce({ success: true });

      const result = await useAccountStore.getState().changePassword('old', 'new123');

      expect(result).toBe(true);
    });
  });

  describe('changeEmail', () => {
    it('updates the stored email on success', async () => {
      useAccountStore.setState({ profile: mockProfile });
      vi.mocked(accountApi.changeEmail).mockResolvedValueOnce({ success: true });

      await useAccountStore.getState().changeEmail('newemail@test.com');

      expect(useAccountStore.getState().profile?.email).toBe('newemail@test.com');
    });
  });

  describe('reset', () => {
    it('clears profile', () => {
      useAccountStore.setState({ profile: mockProfile });

      useAccountStore.getState().reset();

      expect(useAccountStore.getState().profile).toBeNull();
    });
  });
});
