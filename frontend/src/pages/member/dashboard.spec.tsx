import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/stores/memberDashboardStore', () => ({
  useMemberDashboardStore: (selector: (s: unknown) => unknown) =>
    selector({
      dashboard: {
        kpis: {
          sessionsThisMonth: 7,
          activeStreak: 4,
          weightKg: '82.5',
          weightDelta: null,
          weightImproved: false,
          bfPct: '19.0',
          bfDelta: null,
          bfImproved: false,
          topPrName: 'Squat',
          topPrKg: '120.0',
          isNewPr: true,
        },
        upcomingSessions: [],
        nutritionToday: null,
        activePlan: null,
      },
      isLoading: false,
      error: null,
      fetch: vi.fn(),
    }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: 'mem1', name: 'Test Member', role: 'member', email: 'member@test.com' } }),
}));

import { MemberDashboardPage } from './dashboard';

describe('MemberKpiStrip', () => {
  it('renders seeded KPI values', () => {
    render(
      <MemoryRouter>
        <MemberDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('82.5')).toBeInTheDocument();
    expect(screen.getByText('19.0')).toBeInTheDocument();
    expect(screen.getByText('120.0')).toBeInTheDocument();
  });
});
