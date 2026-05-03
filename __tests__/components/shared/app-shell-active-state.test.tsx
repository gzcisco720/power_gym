import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/shared/app-shell';

let mockPathname = '/owner';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn() }),
}));

describe('AppShell active state — owner Dashboard exact match', () => {
  it('marks Dashboard active when on /owner', () => {
    mockPathname = '/owner';
    render(
      <AppShell role="owner" userName="Owner User">
        <div />
      </AppShell>
    );
    const dashboardLinks = screen.getAllByRole('link', { name: 'Dashboard' });
    dashboardLinks.forEach((link) => {
      expect(link).toHaveClass('bg-white');
    });
  });

  it('does NOT mark Dashboard active when on /owner/members', () => {
    mockPathname = '/owner/members';
    render(
      <AppShell role="owner" userName="Owner User">
        <div />
      </AppShell>
    );
    const dashboardLinks = screen.getAllByRole('link', { name: 'Dashboard' });
    dashboardLinks.forEach((link) => {
      expect(link).not.toHaveClass('bg-white');
    });
    const membersLinks = screen.getAllByRole('link', { name: 'Members' });
    membersLinks.forEach((link) => {
      expect(link).toHaveClass('bg-white');
    });
  });

  it('does NOT mark Dashboard active when on /owner/trainers', () => {
    mockPathname = '/owner/trainers';
    render(
      <AppShell role="owner" userName="Owner User">
        <div />
      </AppShell>
    );
    const dashboardLinks = screen.getAllByRole('link', { name: 'Dashboard' });
    dashboardLinks.forEach((link) => {
      expect(link).not.toHaveClass('bg-white');
    });
  });
});
