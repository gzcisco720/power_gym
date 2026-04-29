/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@/app/(dashboard)/trainer/settings/actions', () => ({
  updateTrainerProfileAction: jest.fn(),
}));

import { TrainerProfileForm } from '@/app/(dashboard)/trainer/settings/_components/trainer-profile-form';
import { updateTrainerProfileAction } from '@/app/(dashboard)/trainer/settings/actions';
const mockUpdateTrainerProfileAction = jest.mocked(updateTrainerProfileAction);

const DEFAULT_PROFILE = { phone: null, bio: null, specializations: [] as string[] };

describe('TrainerProfileForm', () => {
  beforeEach(() => {
    mockUpdateTrainerProfileAction.mockResolvedValue({ error: '' });
  });

  it('renders phone, bio, and specializations fields', () => {
    render(<TrainerProfileForm initialProfile={DEFAULT_PROFILE} />);
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specializations/i)).toBeInTheDocument();
  });

  it('pre-fills bio when initialProfile has bio', () => {
    render(<TrainerProfileForm initialProfile={{ ...DEFAULT_PROFILE, bio: 'NSCA-CPT' }} />);
    expect((screen.getByLabelText(/bio/i) as HTMLTextAreaElement).value).toBe('NSCA-CPT');
  });

  it('shows error message when action returns error', async () => {
    mockUpdateTrainerProfileAction.mockResolvedValue({ error: 'Network error' });
    render(<TrainerProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });
});
