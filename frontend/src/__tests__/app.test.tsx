import { render, screen } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';

// Mock initAuth to prevent real fetch calls
const mockInitAuth = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { initAuth: () => Promise<void>; status: string }) => unknown) =>
    selector({ initAuth: mockInitAuth, status: 'loading' }),
  ),
}));

// Mock the router module so createBrowserRouter doesn't run in jsdom
vi.mock('@/router', () => ({
  router: {},
}));

// Mock RouterProvider to just render a placeholder
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    RouterProvider: () => <div data-testid="router" />,
  };
});

describe('App', () => {
  it('renders RouterProvider', () => {
    render(<App />);
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });
});
