import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
  m: {
    div: ({
      children,
      className,
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard/member/plan'),
}));

import { PageTransition } from '@/components/shared/page-transition';
import { usePathname } from 'next/navigation';

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <div>test content</div>
      </PageTransition>
    );
    expect(screen.getByText('test content')).toBeInTheDocument();
  });

  it('renders children at a different pathname', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/trainer/members');
    render(
      <PageTransition>
        <div>trainer content</div>
      </PageTransition>
    );
    expect(screen.getByText('trainer content')).toBeInTheDocument();
  });
});
