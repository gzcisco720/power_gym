import { render, screen, fireEvent } from '@testing-library/react';
import { SelfNutritionCalendar } from '@/components/self-tracking/self-nutrition-calendar';

const sample = [
  { date: new Date().toISOString().slice(0, 10), kcal: 2000, dayLabel: 'Freestyle' },
];

describe('SelfNutritionCalendar', () => {
  it('highlights days with logs and triggers onSelect', () => {
    const onSelect = jest.fn();
    render(<SelfNutritionCalendar entries={sample} onSelect={onSelect} />);
    const today = new Date().getDate();
    const dayBtn = screen.getByRole('button', { name: new RegExp(`^Day ${today}$`) });
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(sample[0]);
  });
});
