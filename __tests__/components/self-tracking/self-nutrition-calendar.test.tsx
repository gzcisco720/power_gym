// __tests__/components/self-tracking/self-nutrition-calendar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SelfNutritionCalendar } from '@/components/self-tracking/self-nutrition-calendar';

describe('SelfNutritionCalendar', () => {
  it('highlights days with logs and triggers onSelect with kcal-aware aria-label (in progress)', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sample = [{ date: today, kcal: 2000, dayLabel: 'Freestyle', dayCompleted: false }];
    const onSelect = jest.fn();
    render(<SelfNutritionCalendar entries={sample} onSelect={onSelect} />);

    const dayNum = now.getDate();
    const dayBtn = screen.getByRole('button', {
      name: new RegExp(`Day ${dayNum}, 2000 kcal, in progress`, 'i'),
    });
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(sample[0]);
  });

  it('marks day-completed entries with "completed" in aria-label', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sample = [{ date: today, kcal: 1500, dayLabel: 'Freestyle', dayCompleted: true }];
    render(<SelfNutritionCalendar entries={sample} onSelect={jest.fn()} />);
    const dayNum = now.getDate();
    const btn = screen.getByRole('button', {
      name: new RegExp(`Day ${dayNum}, 1500 kcal, completed`, 'i'),
    });
    expect(btn).toBeInTheDocument();
  });

  it('disables future-date cells even when an entry exists for that future date', () => {
    // Tomorrow in local time — almost always still in the same calendar month.
    // Must use local-date math: the calendar grid renders by local Year/Month/Date
    // and UTC tomorrow can collide with local today across timezones.
    const future = new Date();
    future.setDate(future.getDate() + 1);
    const futureDate = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    const sample = [{ date: futureDate, kcal: 1500, dayLabel: 'Freestyle', dayCompleted: false }];
    const onSelect = jest.fn();
    render(<SelfNutritionCalendar entries={sample} onSelect={onSelect} />);

    const futureDay = future.getDate();
    // Future cells should render with the simple `Day {N}` label (no kcal/status info), and be disabled.
    const candidates = [
      ...screen.queryAllByRole('button', { name: new RegExp(`^Day ${futureDay}$`, 'i') }),
      ...screen.queryAllByRole('button', { name: new RegExp(`Day ${futureDay},`, 'i') }),
    ];
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach((btn) => expect(btn).toBeDisabled());
  });
});
