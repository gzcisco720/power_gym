// __tests__/components/self-tracking/nutrition-calendar-popover.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionCalendarPopover } from '@/components/self-tracking/nutrition-calendar-popover';

const today = new Date().toISOString().slice(0, 10);

describe('NutritionCalendarPopover', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { date: today, dayLabel: 'Freestyle', dayCompleted: false, meals: [{ items: [{ kcal: 1500 }] }] },
      ]),
    });
  });

  it('opens popover when trigger is clicked and fires onSelect with a date string', async () => {
    const onSelect = jest.fn();
    render(
      <NutritionCalendarPopover
        onSelect={onSelect}
        trigger={<button>Open</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dayNum = new Date().getDate();
    const dayBtn = await waitFor(() =>
      screen.getByRole('button', {
        name: new RegExp(`Day ${dayNum}, 1500 kcal, in progress`, 'i'),
      }),
    );
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(today);
  });
});
