import { render, screen } from '@testing-library/react';

jest.mock('@/lib/db/queries/gym-branding', () => ({
  getGymBranding: jest.fn().mockResolvedValue({
    name: 'Iron Club',
    logoUrl: 'https://cdn.example.com/logo.png',
    loginLogoUrl: 'https://cdn.example.com/login-logo.png',
  }),
}));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn().mockResolvedValue(null), signIn: jest.fn() }));
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn().mockImplementation(() => ({ findByEmail: jest.fn() })),
}));
jest.mock('@/lib/auth/middleware-helpers', () => ({ ROLE_DEFAULT_PATH: {} }));
jest.mock('@/app/(auth)/login/_components/login-button', () => ({
  LoginButton: () => <button>Sign in</button>,
}));

import LoginPage from '@/app/(auth)/login/page';

describe('LoginPage branding', () => {
  it('displays dynamic gym name from branding', async () => {
    const Page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Page);
    expect(screen.getByText('Iron Club')).toBeInTheDocument();
  });

  it('renders login logo img when loginLogoUrl is set', async () => {
    const Page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Page);
    expect(screen.getByAltText('Iron Club')).toHaveAttribute('src', 'https://cdn.example.com/login-logo.png');
  });
});
