import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/shared/empty-state';

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
  };
});

describe('EmptyState', () => {
  describe('renders', () => {
    it('shows heading, description, and action node', () => {
      render(
        <EmptyState
          heading="No Items Yet"
          description="Add your first item to get started."
          action={<button>Add Item</button>}
        />,
      );
      expect(screen.getByText('No Items Yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first item to get started.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });

    it('renders without action node', () => {
      render(
        <EmptyState heading="Empty" description="Nothing here." />,
      );
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });
  });
});
