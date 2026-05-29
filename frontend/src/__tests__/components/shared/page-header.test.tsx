import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/shared/page-header';

// Framer Motion reduces to no-op in tests
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    m: {
      ...actual.m,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('PageHeader', () => {
  describe('renders', () => {
    it('shows title text and, when provided, subtitle text', () => {
      render(<PageHeader title="Test Title" subtitle="Test Subtitle" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('does not render subtitle paragraph when not provided', () => {
      render(<PageHeader title="Dashboard" />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('renders actions node when passed', () => {
      render(<PageHeader title="Title" actions={<button>Add</button>} />);
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });
  });
});
