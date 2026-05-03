import { render, screen } from '@testing-library/react';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';

describe('ExerciseThumbnail', () => {
  it('renders an img tag when imageUrl is provided', () => {
    render(<ExerciseThumbnail imageUrl="https://example.com/img.jpg" name="Squat" size={40} />);
    const img = screen.getByRole('img', { name: 'Squat' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('renders a placeholder when imageUrl is null', () => {
    render(<ExerciseThumbnail imageUrl={null} name="Squat" size={40} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(document.querySelector('[data-testid="thumbnail-placeholder"]')).toBeInTheDocument();
  });
});
