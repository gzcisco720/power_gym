import { render, screen } from '@testing-library/react';
import { ThisWeekCard } from '@/app/(dashboard)/member/check-in/_components/this-week-card';
import type { HeatmapCell } from '@/lib/check-in-stats';

const cells: HeatmapCell[] = Array.from({ length: 30 }, (_, i) => ({
  weekStart: new Date(Date.now() - (29 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
  hasCheckIn: i < 26,
  avgWellness: i < 26 ? 6.5 : null,
  isCurrentWeek: i === 29,
}));

describe('ThisWeekCard', () => {
  it('shows submit button when not submitted', () => {
    render(<ThisWeekCard hasThisWeek={false} heatmap={cells} />);
    expect(screen.getByRole('link', { name: /Submit This Week/i })).toBeInTheDocument();
  });

  it('shows submitted state when already done', () => {
    render(<ThisWeekCard hasThisWeek={true} heatmap={cells} submittedDate="10 May" avgWellness={6.7} />);
    expect(screen.getByText(/Submitted this week/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Submit/i })).not.toBeInTheDocument();
  });

  it('renders 30 heatmap cells', () => {
    const { container } = render(<ThisWeekCard hasThisWeek={false} heatmap={cells} />);
    const heatCells = container.querySelectorAll('[data-heatmap-cell]');
    expect(heatCells).toHaveLength(30);
  });
});
