import { render, screen } from '@testing-library/react';
import { RecentSessionsList } from '@/components/self-tracking/recent-sessions-list';

describe('RecentSessionsList', () => {
  it('renders rows in Full state', () => {
    render(
      <RecentSessionsList
        state="full"
        sessions={[
          { id: '1', dateLabel: 'Tue', dayName: 'PPL · Day 2 · Pull', setCount: 8, durationMin: 52, rpe: 8, hasPR: true },
          { id: '2', dateLabel: 'Sun', dayName: 'Freestyle', setCount: 5, durationMin: 35, rpe: 6, hasPR: false },
        ]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByText('PPL · Day 2 · Pull')).toBeInTheDocument();
    expect(screen.getByText('Freestyle')).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('renders rows + hint row in Light state', () => {
    render(
      <RecentSessionsList
        state="light"
        sessions={[
          { id: '1', dateLabel: 'Sat', dayName: 'Freestyle', setCount: 3, durationMin: 32, rpe: 6, hasPR: false },
        ]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByText(/newer sessions will land/i)).toBeInTheDocument();
  });

  it('renders dimmed example + explanation in Empty state', () => {
    render(<RecentSessionsList state="empty" basePath="/trainer/my-training" />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/once you finish/i)).toBeInTheDocument();
  });
});
