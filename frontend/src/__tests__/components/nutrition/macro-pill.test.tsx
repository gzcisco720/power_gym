import { render, screen } from '@testing-library/react';
import { MacroPill } from '@/components/nutrition/macro-pill';

describe('MacroPill', () => {
  describe('renders', () => {
    it('formats protein tone as emerald with value and unit', () => {
      const { container } = render(
        <MacroPill value={150} label="g" tone="emerald" />,
      );
      // Value text present
      expect(screen.getByText('150')).toBeInTheDocument();
      // Unit label present
      expect(screen.getByText('g')).toBeInTheDocument();
      // Root element has emerald text class
      expect(container.firstChild).toHaveClass('text-emerald-300');
    });

    it('formats carbs tone as amber', () => {
      const { container } = render(
        <MacroPill value={200} label="g" tone="amber" />,
      );
      expect(container.firstChild).toHaveClass('text-amber-300');
    });

    it('formats fat tone as pink', () => {
      const { container } = render(
        <MacroPill value={60} label="g" tone="pink" />,
      );
      expect(container.firstChild).toHaveClass('text-pink-300');
    });
  });
});
