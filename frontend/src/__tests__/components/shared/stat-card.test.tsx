import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/shared/stat-card';

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

describe('StatCard', () => {
  describe('renders', () => {
    it('shows label, value, and unit suffix', () => {
      render(<StatCard label="Body Weight" value="42" unit="kg" />);
      // Label is uppercase via CSS, but DOM text is the raw value
      expect(screen.getByText('Body Weight')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
    });
  });

  describe('accentColor', () => {
    it('applies success surface class when accentColor="success"', () => {
      const { container } = render(
        <StatCard label="Active Members" value="10" accentColor="success" />,
      );
      expect(container.firstChild).toHaveClass('bg-emerald-500/10');
    });

    it('applies primary surface class when accentColor="primary"', () => {
      const { container } = render(
        <StatCard label="Total" value="5" accentColor="primary" />,
      );
      expect(container.firstChild).toHaveClass('bg-primary/10');
    });

    it('applies achievement surface class when accentColor="achievement"', () => {
      const { container } = render(
        <StatCard label="Awards" value="3" accentColor="achievement" />,
      );
      expect(container.firstChild).toHaveClass('bg-amber-500/10');
    });
  });
});
