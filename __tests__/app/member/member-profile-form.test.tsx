/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/app/(dashboard)/member/settings/actions', () => ({
  updateMemberProfileAction: jest.fn(),
}));

jest.mock('@/components/settings/avatar-upload', () => ({
  AvatarUpload: () => <div data-testid="avatar-upload" />,
}));

import { MemberProfileTab } from '@/app/(dashboard)/member/settings/_components/profile-tab';

const DEFAULT_PROPS = {
  firstName: 'Eric',
  lastName: 'Gong',
  mobile: null,
  address: null,
  dateOfBirth: null,
  avatarUrl: null,
  sex: null as 'male' | 'female' | null,
  fitnessGoal: null,
  fitnessLevel: null,
};

describe('MemberProfileTab', () => {
  it('renders name, mobile, address, sex, fitness fields', () => {
    render(<MemberProfileTab {...DEFAULT_PROPS} />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fitness goal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fitness level/i)).toBeInTheDocument();
  });

  it('pre-fills firstName and lastName', () => {
    render(<MemberProfileTab {...DEFAULT_PROPS} firstName="Alice" lastName="Smith" />);
    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('Alice');
    expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe('Smith');
  });

  it('renders save button', () => {
    render(<MemberProfileTab {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });
});
