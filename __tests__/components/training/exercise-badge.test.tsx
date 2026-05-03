import { render, screen } from '@testing-library/react';
import { ExerciseBadge } from '@/components/training/exercise-badge';

describe('ExerciseBadge', () => {
  it('renders the label text', () => {
    render(<ExerciseBadge label="A" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders superset label with number suffix', () => {
    render(<ExerciseBadge label="D1" />);
    expect(screen.getByText('D1')).toBeInTheDocument();
  });
});
