import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/stores/ownerDashboardStore', () => ({
  useOwnerDashboardStore: vi.fn(),
}));

import { useOwnerDashboardStore } from '@/stores/ownerDashboardStore';
import { DashboardStats } from '@/components/owner/dashboard-stats';

const mockStats = {
  trainerCount: 3,
  memberCount: 7,
  pendingInviteCount: 2,
  sessionsThisMonth: 15,
};

// The store is used with selectors: useOwnerDashboardStore((s) => s.stats)
// We need to mock the selector-calling pattern
function mockStoreWith(state: { stats: typeof mockStats | null; isLoading: boolean; error: string | null }) {
  vi.mocked(useOwnerDashboardStore).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selector?: (s: any) => any) => {
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardStats', () => {
  it('renders four stat values from store data', () => {
    mockStoreWith({ stats: mockStats, isLoading: false, error: null });

    render(
      <MemoryRouter>
        <DashboardStats />
      </MemoryRouter>,
    );

    // Trainers
    expect(screen.getByText('3')).toBeInTheDocument();
    // Members
    expect(screen.getByText('7')).toBeInTheDocument();
    // Sessions / Month
    expect(screen.getByText('15')).toBeInTheDocument();
    // Pending Invites
    expect(screen.getByText('2')).toBeInTheDocument();

    // Labels
    expect(screen.getByText('Trainers')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Sessions / Month')).toBeInTheDocument();
    expect(screen.getByText('Pending Invites')).toBeInTheDocument();
  });

  it('renders skeleton when isLoading is true', () => {
    mockStoreWith({ stats: null, isLoading: true, error: null });

    const { container } = render(
      <MemoryRouter>
        <DashboardStats />
      </MemoryRouter>,
    );

    // Should render skeleton elements when loading
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
