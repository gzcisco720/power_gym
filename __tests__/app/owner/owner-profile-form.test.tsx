/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@/app/(dashboard)/owner/settings/actions', () => ({
  updateOwnerProfileAction: jest.fn(),
}));

import { OwnerProfileForm } from '@/app/(dashboard)/owner/settings/_components/owner-profile-form';
import { updateOwnerProfileAction } from '@/app/(dashboard)/owner/settings/actions';
const mockUpdateOwnerProfileAction = jest.mocked(updateOwnerProfileAction);

const DEFAULT_PROFILE = { phone: null, gymName: null };

describe('OwnerProfileForm', () => {
  beforeEach(() => {
    mockUpdateOwnerProfileAction.mockResolvedValue({ error: '' });
  });

  it('renders phone and gymName fields', () => {
    render(<OwnerProfileForm initialProfile={DEFAULT_PROFILE} />);
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gym name/i)).toBeInTheDocument();
  });

  it('pre-fills gymName when initialProfile has gymName', () => {
    render(<OwnerProfileForm initialProfile={{ ...DEFAULT_PROFILE, gymName: 'Power Gym' }} />);
    expect((screen.getByLabelText(/gym name/i) as HTMLInputElement).value).toBe('Power Gym');
  });

  it('shows error message when action returns error', async () => {
    mockUpdateOwnerProfileAction.mockResolvedValue({ error: 'Save failed' });
    render(<OwnerProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
  });
});
