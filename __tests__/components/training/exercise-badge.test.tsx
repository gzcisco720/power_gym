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

  it('uses theme tokens (no hardcoded hex)', () => {
    const { container } = render(<ExerciseBadge label="A" />);
    const span = container.querySelector('span');
    expect(span?.className ?? '').not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
});
