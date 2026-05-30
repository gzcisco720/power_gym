/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/app/(dashboard)/owner/settings/actions', () => ({
  updateOwnerProfileAction: jest.fn(),
  updateGymInfoAction: jest.fn(),
}));

jest.mock('@/components/settings/avatar-upload', () => ({
  AvatarUpload: () => <div data-testid="avatar-upload" />,
}));

import { OwnerProfileTab } from '@/app/(dashboard)/owner/settings/_components/profile-tab';

const DEFAULT_PROPS = {
  firstName: 'Owner',
  lastName: 'User',
  mobile: null,
  address: null,
  dateOfBirth: null,
  avatarUrl: null,
  certifications: [] as string[],
};

describe('OwnerProfileTab', () => {
  it('renders mobile, address, and certifications fields', () => {
    render(<OwnerProfileTab {...DEFAULT_PROPS} />);
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/certifications/i)).toBeInTheDocument();
  });

  it('pre-fills certifications as comma-separated string', () => {
    render(<OwnerProfileTab {...DEFAULT_PROPS} certifications={['NSCA-CPT', 'ACE']} />);
    expect((screen.getByLabelText(/certifications/i) as HTMLInputElement).value).toBe('NSCA-CPT, ACE');
  });

  it('renders save button', () => {
    render(<OwnerProfileTab {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });
});
