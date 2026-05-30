import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemberProfileTab } from './settings';

vi.mock('@/api/settings', () => ({
  fetchProfile: vi.fn(),
  saveProfile: vi.fn(),
}));
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    profile: null,
    isLoading: false,
    fetchProfileData: vi.fn(),
    patchProfile: vi.fn(),
  })),
}));
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((sel: (s: { user: { email: string; name: string } | null }) => unknown) =>
    sel({ user: { email: 'member@test.com', name: 'Member User' } }),
  ),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('ProfileTab', () => {
  it('Save disabled when not dirty', () => {
    render(
      <MemberProfileTab
        initialProfile={{
          mobile: null,
          address: null,
          dateOfBirth: null,
          avatarUrl: null,
          certifications: [],
          gymInfo: null,
        }}
        currentEmail="member@test.com"
        firstName="Test"
        lastName="Member"
        onSave={vi.fn()}
      />,
    );
    const saveBtn = screen.getByRole('button', { name: /save profile/i });
    expect(saveBtn).toBeDisabled();
  });
});
