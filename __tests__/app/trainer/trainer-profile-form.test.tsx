/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/app/(dashboard)/trainer/settings/actions', () => ({
  updateTrainerProfileAction: jest.fn(),
}));

jest.mock('@/components/settings/avatar-upload', () => ({
  AvatarUpload: () => <div data-testid="avatar-upload" />,
}));

import { TrainerProfileTab } from '@/app/(dashboard)/trainer/settings/_components/profile-tab';

const DEFAULT_PROPS = {
  firstName: 'John',
  lastName: 'Smith',
  mobile: null,
  address: null,
  dateOfBirth: null,
  avatarUrl: null,
  bio: null,
  specializations: [] as string[],
  certifications: [] as string[],
};

describe('TrainerProfileTab', () => {
  it('renders mobile, bio, specializations, and certifications fields', () => {
    render(<TrainerProfileTab {...DEFAULT_PROPS} />);
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specializations/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/certifications/i)).toBeInTheDocument();
  });

  it('pre-fills bio when provided', () => {
    render(<TrainerProfileTab {...DEFAULT_PROPS} bio="NSCA-CPT" />);
    expect((screen.getByLabelText(/bio/i) as HTMLTextAreaElement).value).toBe('NSCA-CPT');
  });

  it('pre-fills specializations as comma-separated string', () => {
    render(<TrainerProfileTab {...DEFAULT_PROPS} specializations={['strength', 'rehabilitation']} />);
    expect((screen.getByLabelText(/specializations/i) as HTMLInputElement).value).toBe('strength, rehabilitation');
  });

  it('renders save button', () => {
    render(<TrainerProfileTab {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });
});
