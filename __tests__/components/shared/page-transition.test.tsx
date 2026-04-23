import { render, screen } from '@testing-library/react';
import { PageTransition } from '@/components/shared/page-transition';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/member/plan',
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <div>test content</div>
      </PageTransition>
    );
    expect(screen.getByText('test content')).toBeInTheDocument();
  });
});
