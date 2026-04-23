import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/shared/app-shell';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/member/plan',
}));

describe('AppShell', () => {
  it('renders member navigation groups', () => {
    render(
      <AppShell role="member" userName="Eric Gong">
        <div>page content</div>
      </AppShell>
    );
    expect(screen.getByText('My Plan')).toBeInTheDocument();
    expect(screen.getByText('Personal Bests')).toBeInTheDocument();
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
    expect(screen.getByText('Body Tests')).toBeInTheDocument();
    expect(screen.queryByText('Plan Templates')).not.toBeInTheDocument();
  });

  it('renders trainer navigation', () => {
    render(
      <AppShell role="trainer" userName="John Smith">
        <div>content</div>
      </AppShell>
    );
    expect(screen.getByText('Plan Templates')).toBeInTheDocument();
    expect(screen.getByText('Nutrition Templates')).toBeInTheDocument();
    expect(screen.queryByText('My Plan')).not.toBeInTheDocument();
  });

  it('renders user initials in avatar', () => {
    render(
      <AppShell role="member" userName="Eric Gong">
        <div>content</div>
      </AppShell>
    );
    expect(screen.getAllByText('EG').length).toBeGreaterThan(0);
  });

  it('renders page children', () => {
    render(
      <AppShell role="member" userName="Eric Gong">
        <div>my page content</div>
      </AppShell>
    );
    expect(screen.getByText('my page content')).toBeInTheDocument();
  });
});
