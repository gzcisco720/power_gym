import { render, screen, fireEvent } from '@testing-library/react';
import { DayTabs } from '@/components/training/day-tabs';

describe('DayTabs', () => {
  const days = [
    { dayNumber: 1, name: 'Day 1' },
    { dayNumber: 2, name: 'Push Day' },
  ];

  it('renders one tab per day plus an Add Day button when not readOnly', () => {
    render(<DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={() => {}} />);
    expect(screen.getByRole('tab', { name: /Day 1/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Push Day/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add day/i })).toBeInTheDocument();
  });

  it('marks active tab with aria-selected=true', () => {
    render(<DayTabs days={days} activeIndex={1} onChange={() => {}} onAddDay={() => {}} />);
    expect(screen.getByRole('tab', { name: /Push Day/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Day 1/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with index when a non-active tab is clicked', () => {
    const onChange = jest.fn();
    render(<DayTabs days={days} activeIndex={0} onChange={onChange} onAddDay={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: /Push Day/ }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onAddDay when the add button is clicked', () => {
    const onAddDay = jest.fn();
    render(<DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={onAddDay} />);
    fireEvent.click(screen.getByRole('button', { name: /add day/i }));
    expect(onAddDay).toHaveBeenCalledTimes(1);
  });

  it('hides the Add Day button when readOnly', () => {
    render(<DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={() => {}} readOnly />);
    expect(screen.queryByRole('button', { name: /add day/i })).not.toBeInTheDocument();
  });

  it('uses no hardcoded hex classes', () => {
    const { container } = render(
      <DayTabs days={days} activeIndex={0} onChange={() => {}} onAddDay={() => {}} />,
    );
    expect(container.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/);
  });
});
