import { render, screen } from '@testing-library/react';
import { LoginButton } from '@/app/(auth)/login/_components/login-button';

const mockUseFormStatus = jest.fn();
jest.mock('react-dom', () => {
  const actual = jest.requireActual<typeof import('react-dom')>('react-dom');
  return { ...actual, useFormStatus: () => mockUseFormStatus() };
});

describe('LoginButton', () => {
  it('shows "Sign in" and is enabled when not pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: false });
    render(<LoginButton />);
    const btn = screen.getByRole('button', { name: /sign in/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('shows "Signing in…" and is disabled when pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(<LoginButton />);
    const btn = screen.getByRole('button', { name: /signing in/i });
    expect(btn).toBeDisabled();
  });
});
