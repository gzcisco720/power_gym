import { render, screen } from '@testing-library/react';
import { ActivityStrip } from '@/components/self-tracking/activity-strip';

describe('ActivityStrip', () => {
  it('renders heatmap + month stats in Full state', () => {
    render(
      <ActivityStrip
        state="full"
        last14Days={[true, true, false, true, true, true, false, true, false, true, true, true, false, true]}
        monthStats={{ sessions: 9, sets: 412, avgRpe: 7.4, prs: 3 }}
      />,
    );
    expect(screen.getByText(/9/)).toBeInTheDocument();
    expect(screen.getByText(/sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('renders sparse heatmap + nudge in Light state', () => {
    render(
      <ActivityStrip
        state="light"
        last14Days={[false, false, false, true, false, false, false, false, true, false, false, false, false, false]}
        sessionCount={2}
      />,
    );
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/build a streak/i)).toBeInTheDocument();
  });

  it('renders 3-step onboarding in Empty state', () => {
    render(<ActivityStrip state="empty" />);
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a path/i)).toBeInTheDocument();
    expect(screen.getByText(/log sets/i)).toBeInTheDocument();
    expect(screen.getByText(/mark complete/i)).toBeInTheDocument();
  });
});
