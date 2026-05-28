/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => {
  const MockLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

import { usePathname } from 'next/navigation';
import { MemberTabNav } from '@/components/shared/member-tab-nav';

const mockUsePathname = jest.mocked(usePathname);

describe('MemberTabNav', () => {
  const memberId = 'mem123';
  const basePath = `/trainer/members/${memberId}`;

  it('renders all tabs', () => {
    mockUsePathname.mockReturnValue(basePath);
    render(<MemberTabNav basePath={basePath} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Body Tests')).toBeInTheDocument();
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
  });

  it('highlights Overview tab when on hub root', () => {
    mockUsePathname.mockReturnValue(basePath);
    render(<MemberTabNav basePath={basePath} />);

    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink?.className).toContain('text-primary-light');
  });

  it('does not highlight Overview tab when on a sub-route', () => {
    mockUsePathname.mockReturnValue(`${basePath}/plan`);
    render(<MemberTabNav basePath={basePath} />);

    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink?.className).not.toContain('text-primary-light');
  });

  it('highlights Plan tab when on plan route', () => {
    mockUsePathname.mockReturnValue(`${basePath}/plan`);
    render(<MemberTabNav basePath={basePath} />);

    const planLink = screen.getByText('Plan').closest('a');
    expect(planLink?.className).toContain('text-primary-light');
  });
});
