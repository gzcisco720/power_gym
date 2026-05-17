import { render, screen } from '@testing-library/react';
import { AchievementCards } from '@/app/(dashboard)/member/check-in/_components/achievement-cards';
import type { Achievements } from '@/lib/check-in-stats';

const full: Achievements = {
  weightLost: 9.0,
  weightFirst: 87.0,
  weightLatest: 78.0,
  currentStreak: 26,
  totalCheckIns: 26,
  dietStreak: 4,
};

describe('AchievementCards', () => {
  it('renders all three cards when data present', () => {
    render(<AchievementCards achievements={full} />);
    expect(screen.getByText('Lost 9 kg')).toBeInTheDocument();
    expect(screen.getByText('26-week streak')).toBeInTheDocument();
    expect(screen.getByText('4 on-track in a row')).toBeInTheDocument();
  });

  it('hides weight card when no weight loss', () => {
    render(<AchievementCards achievements={{ ...full, weightLost: null }} />);
    expect(screen.queryByText(/Lost .* kg/)).not.toBeInTheDocument();
  });

  it('hides diet card when dietStreak < 2', () => {
    render(<AchievementCards achievements={{ ...full, dietStreak: 1 }} />);
    expect(screen.queryByText(/on-track in a row/)).not.toBeInTheDocument();
  });

  it('hides streak card when streak < 2', () => {
    render(<AchievementCards achievements={{ ...full, currentStreak: 1 }} />);
    expect(screen.queryByText(/week streak/)).not.toBeInTheDocument();
  });
});
