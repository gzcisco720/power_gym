import { act, fireEvent, render, screen } from '@testing-library/react';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';

describe('ExerciseThumbnail', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('does not show popup before 150ms delay elapses', () => {
    jest.useFakeTimers();
    render(<ExerciseThumbnail imageUrl="https://example.com/img.jpg" name="Squat" size={40} />);
    const wrapper = screen.getByRole('img', { name: 'Squat' }).closest('div')!;
    fireEvent.mouseEnter(wrapper);
    act(() => { jest.advanceTimersByTime(100); });
    expect(screen.queryByTestId('hover-popup')).toBeNull();
  });

  it('shows popup after 150ms when imageUrl is set', () => {
    jest.useFakeTimers();
    render(<ExerciseThumbnail imageUrl="https://example.com/img.jpg" name="Squat" size={40} />);
    const wrapper = screen.getByRole('img', { name: 'Squat' }).closest('div')!;
    fireEvent.mouseEnter(wrapper);
    act(() => { jest.advanceTimersByTime(150); });
    expect(screen.getByTestId('hover-popup')).toBeInTheDocument();
    // popup contains its own img
    expect(screen.getAllByRole('img', { name: 'Squat' })).toHaveLength(2);
  });

  it('cancels popup when mouse leaves before 150ms', () => {
    jest.useFakeTimers();
    render(<ExerciseThumbnail imageUrl="https://example.com/img.jpg" name="Squat" size={40} />);
    const wrapper = screen.getByRole('img', { name: 'Squat' }).closest('div')!;
    fireEvent.mouseEnter(wrapper);
    act(() => { jest.advanceTimersByTime(100); });
    fireEvent.mouseLeave(wrapper);
    act(() => { jest.advanceTimersByTime(200); }); // remainder — should still not show
    expect(screen.queryByTestId('hover-popup')).toBeNull();
  });

  it('hides popup when mouse leaves after popup is visible', () => {
    jest.useFakeTimers();
    render(<ExerciseThumbnail imageUrl="https://example.com/img.jpg" name="Squat" size={40} />);
    const wrapper = screen.getByRole('img', { name: 'Squat' }).closest('div')!;
    fireEvent.mouseEnter(wrapper);
    act(() => { jest.advanceTimersByTime(150); });
    expect(screen.getByTestId('hover-popup')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByTestId('hover-popup')).toBeNull();
  });

  it('does not show popup on hover when imageUrl is null', () => {
    jest.useFakeTimers();
    render(<ExerciseThumbnail imageUrl={null} name="Squat" size={40} />);
    const placeholder = screen.getByTestId('thumbnail-placeholder');
    fireEvent.mouseEnter(placeholder);
    act(() => { jest.advanceTimersByTime(150); });
    expect(screen.queryByTestId('hover-popup')).toBeNull();
  });
});
