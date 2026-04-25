import { render, screen } from '@testing-library/react';
import { RegisterForm } from '@/app/(auth)/register/_components/register-form';

// useActionState is not supported in the Jest/jsdom environment; provide a
// minimal shim that lets the component render without crashing.
let mockActionState: [unknown, jest.Mock] = [{ error: '' }, jest.fn()];
jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    useActionState: jest.fn((_action: unknown, initialState: unknown) => {
      return mockActionState[0] !== undefined ? mockActionState : [initialState, jest.fn()];
    }),
  };
});

// useFormStatus lives in react-dom; pending is always false in tests.
jest.mock('react-dom', () => {
  const actual = jest.requireActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    useFormStatus: () => ({ pending: false }),
  };
});

describe('RegisterForm', () => {
  it('renders all form fields', () => {
    render(<RegisterForm isFirstUser={false} />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows invite role message when inviteRole is provided', () => {
    render(<RegisterForm isFirstUser={false} inviteRole="trainer" />);
    expect(screen.getByText(/invited as a/i)).toBeInTheDocument();
    expect(screen.getByText(/trainer/i)).toBeInTheDocument();
  });

  it('shows first-user setup message', () => {
    render(<RegisterForm isFirstUser={true} />);
    expect(screen.getByText(/setting up your gym as owner/i)).toBeInTheDocument();
  });

  it('shows error from action state', () => {
    mockActionState = [{ error: 'Email does not match invite' }, jest.fn()];
    render(<RegisterForm isFirstUser={false} />);
    expect(screen.getByText('Email does not match invite')).toBeInTheDocument();
    mockActionState = [{ error: '' }, jest.fn()];
  });

  it('includes hidden token field', () => {
    const { container } = render(<RegisterForm isFirstUser={false} token="test-token" />);
    const hidden = container.querySelector('input[name="token"]') as HTMLInputElement;
    expect(hidden).toBeTruthy();
    expect(hidden.value).toBe('test-token');
  });
});
