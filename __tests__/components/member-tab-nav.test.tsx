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

  it('renders all 5 tabs', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}`);
    render(<MemberTabNav memberId={memberId} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Body Tests')).toBeInTheDocument();
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('highlights Overview tab when on hub root', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}`);
    render(<MemberTabNav memberId={memberId} />);

    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink?.className).toContain('text-white');
  });

  it('does not highlight Overview tab when on a sub-route', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}/plan`);
    render(<MemberTabNav memberId={memberId} />);

    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink?.className).not.toContain('text-white');
  });

  it('highlights Plan tab when on plan route', () => {
    mockUsePathname.mockReturnValue(`/trainer/members/${memberId}/plan`);
    render(<MemberTabNav memberId={memberId} />);

    const planLink = screen.getByText('Plan').closest('a');
    expect(planLink?.className).toContain('text-white');
  });
});
