import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

// Mock authStore
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from '@/stores/authStore';
import { RequireAuth, RequireRole } from '@/router/guards';

const mockUseAuthStore = vi.mocked(useAuthStore) as unknown as ReturnType<typeof vi.fn>;

function renderWithRouter(routes: Parameters<typeof createMemoryRouter>[0], initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RequireAuth', () => {
  it("renders FullPageSpinner when status is 'idle'", () => {
    mockUseAuthStore.mockImplementation((selector: (s: { status: string }) => unknown) =>
      selector({ status: 'idle' }),
    );

    renderWithRouter([
      {
        element: <RequireAuth />,
        children: [{ path: '/', element: <div>Protected Content</div> }],
      },
    ]);

    // Spinner should be present, not the protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it("renders FullPageSpinner when status is 'loading'", () => {
    mockUseAuthStore.mockImplementation((selector: (s: { status: string }) => unknown) =>
      selector({ status: 'loading' }),
    );

    renderWithRouter([
      {
        element: <RequireAuth />,
        children: [{ path: '/', element: <div>Protected Content</div> }],
      },
    ]);

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it("redirects to /login when status is 'unauthenticated'", () => {
    mockUseAuthStore.mockImplementation((selector: (s: { status: string }) => unknown) =>
      selector({ status: 'unauthenticated' }),
    );

    renderWithRouter([
      {
        element: <RequireAuth />,
        children: [{ path: '/', element: <div>Protected Content</div> }],
      },
      { path: '/login', element: <div>Login Page</div> },
    ]);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it("renders <Outlet /> when status is 'authenticated'", () => {
    mockUseAuthStore.mockImplementation((selector: (s: { status: string }) => unknown) =>
      selector({ status: 'authenticated' }),
    );

    renderWithRouter([
      {
        element: <RequireAuth />,
        children: [{ path: '/', element: <div>Protected Content</div> }],
      },
    ]);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  it("renders <Outlet /> when user.role is in the allowed roles", () => {
    mockUseAuthStore.mockImplementation(
      (selector: (s: { user: { role: string } }) => unknown) =>
        selector({ user: { role: 'owner' } }),
    );

    renderWithRouter([
      {
        element: <RequireRole roles={['owner', 'trainer']} />,
        children: [{ path: '/', element: <div>Owner Content</div> }],
      },
    ]);

    expect(screen.getByText('Owner Content')).toBeInTheDocument();
  });

  it("redirects to / when user.role is not allowed", () => {
    mockUseAuthStore.mockImplementation(
      (selector: (s: { user: { role: string } }) => unknown) =>
        selector({ user: { role: 'member' } }),
    );

    renderWithRouter(
      [
        {
          element: <RequireRole roles={['owner']} />,
          children: [{ path: '/owner', element: <div>Owner Only</div> }],
        },
        { path: '/', element: <div>Home Page</div> },
      ],
      '/owner',
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Owner Only')).not.toBeInTheDocument();
  });
});
