/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@/app/(dashboard)/member/settings/actions', () => ({
  updateMemberProfileAction: jest.fn(),
}));

import { MemberProfileForm } from '@/app/(dashboard)/member/settings/_components/member-profile-form';
import { updateMemberProfileAction } from '@/app/(dashboard)/member/settings/actions';
const mockUpdateMemberProfileAction = jest.mocked(updateMemberProfileAction);

const DEFAULT_PROFILE = {
  phone: null,
  sex: null as 'male' | 'female' | null,
  dateOfBirth: null as string | null,
  height: null as number | null,
  fitnessGoal: null as string | null,
  fitnessLevel: null as string | null,
};

describe('MemberProfileForm', () => {
  beforeEach(() => {
    mockUpdateMemberProfileAction.mockResolvedValue({ error: '' });
  });

  it('renders all profile fields', () => {
    render(<MemberProfileForm initialProfile={DEFAULT_PROFILE} />);
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
  });

  it('calls action when form is submitted', async () => {
    render(<MemberProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mockUpdateMemberProfileAction).toHaveBeenCalled());
  });

  it('shows error message when action returns error', async () => {
    mockUpdateMemberProfileAction.mockResolvedValue({ error: 'Save failed' });
    render(<MemberProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
  });

  it('pre-fills height field when initialProfile has height', () => {
    render(<MemberProfileForm initialProfile={{ ...DEFAULT_PROFILE, height: 170 }} />);
    expect((screen.getByLabelText(/height/i) as HTMLInputElement).value).toBe('170');
  });
});
