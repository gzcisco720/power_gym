import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/member/plan',
}));

import { PageTransition } from '@/components/shared/page-transition';
import { useReducedMotion } from 'framer-motion';

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <div>test content</div>
      </PageTransition>
    );
    expect(screen.getByText('test content')).toBeInTheDocument();
  });

  it('renders children with reduced motion enabled', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    render(
      <PageTransition>
        <div>reduced motion content</div>
      </PageTransition>
    );
    expect(screen.getByText('reduced motion content')).toBeInTheDocument();
  });
});
