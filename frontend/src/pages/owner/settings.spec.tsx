import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GymInfoTab } from './settings';

vi.mock('@/api/settings', () => ({
  fetchProfile: vi.fn(),
  saveProfile: vi.fn(),
  saveGymInfo: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('GymInfoTab', () => {
  it('Save disabled when not dirty', () => {
    const gymInfo = {
      name: 'Test Gym',
      address: null,
      phone: null,
      email: null,
      website: null,
      hours: null,
      description: null,
      logoUrl: null,
      loginLogoUrl: null,
    };
    render(<GymInfoTab gymInfo={gymInfo} onSave={vi.fn()} />);
    const saveBtn = screen.getByRole('button', { name: /save gym info/i });
    expect(saveBtn).toBeDisabled();
  });
});
