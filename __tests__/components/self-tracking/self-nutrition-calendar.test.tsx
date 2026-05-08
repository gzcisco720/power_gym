// __tests__/components/self-tracking/self-nutrition-calendar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SelfNutritionCalendar } from '@/components/self-tracking/self-nutrition-calendar';

describe('SelfNutritionCalendar', () => {
  it('highlights days with logs and triggers onSelect with kcal-aware aria-label (in progress)', () => {
    const today = new Date().toISOString().slice(0, 10);
    const sample = [{ date: today, kcal: 2000, dayLabel: 'Freestyle', dayCompleted: false }];
    const onSelect = jest.fn();
    render(<SelfNutritionCalendar entries={sample} onSelect={onSelect} />);

    const dayNum = new Date().getDate();
    const dayBtn = screen.getByRole('button', {
      name: new RegExp(`Day ${dayNum}, 2000 kcal, in progress`, 'i'),
    });
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(sample[0]);
  });

  it('marks day-completed entries with "completed" in aria-label', () => {
    const today = new Date().toISOString().slice(0, 10);
    const sample = [{ date: today, kcal: 1500, dayLabel: 'Freestyle', dayCompleted: true }];
    render(<SelfNutritionCalendar entries={sample} onSelect={jest.fn()} />);
    const dayNum = new Date().getDate();
    const btn = screen.getByRole('button', {
      name: new RegExp(`Day ${dayNum}, 1500 kcal, completed`, 'i'),
    });
    expect(btn).toBeInTheDocument();
  });
});
