import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from '@/app/(auth)/register/_components/register-form';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
});

test('submits JSON to /api/auth/register and redirects to /login on success', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true }),
  });

  render(<RegisterForm isFirstUser={false} />);

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'TestPass123!' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@test.com', password: 'TestPass123!', token: undefined }),
    });
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

test('displays error message on failure', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Email does not match invite' }),
  });

  render(<RegisterForm isFirstUser={false} />);

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'TestPass123!' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => {
    expect(screen.getByText('Email does not match invite')).toBeInTheDocument();
  });
});
