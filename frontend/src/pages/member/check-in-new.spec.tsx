import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/stores/memberCheckInStore', () => ({
  useMemberCheckInStore: (selector: (s: unknown) => unknown) =>
    selector({
      submit: vi.fn(),
      isSubmitting: false,
      error: null,
    }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: 'mem1', name: 'Test', role: 'member', email: 'member@test.com' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CheckInForm } from './check-in-new';

describe('CheckInForm', () => {
  it('validates required fields before submit — all wellness sliders default to 5 so submit is enabled', () => {
    render(
      <MemoryRouter>
        <CheckInForm alreadySubmitted={false} />
      </MemoryRouter>
    );
    const submitBtn = screen.getByRole('button', { name: /submit check-in/i });
    // Should be enabled since all required fields (sliders) have defaults
    expect(submitBtn).not.toBeDisabled();
  });

  it('shows already-submitted state when alreadySubmitted is true', () => {
    render(
      <MemoryRouter>
        <CheckInForm alreadySubmitted={true} />
      </MemoryRouter>
    );
    expect(screen.getByText(/already submitted/i)).toBeInTheDocument();
  });
});
