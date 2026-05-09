import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionCalendarPopover } from '@/components/self-tracking/nutrition-calendar-popover';

// Use the runner's local date — `toISOString().slice(0,10)` returns UTC,
// which can fall on a different calendar day than `getDate()` near midnight.
const _now = new Date();
const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

describe('NutritionCalendarPopover', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          date: today,
          dayLabel: 'Freestyle',
          dayCompleted: false,
          meals: [
            // sealed (1500): meal completed
            { completed: true, items: [{ kcal: 1500 }] },
            // not sealed (200): meal not completed
            { completed: false, items: [{ kcal: 200 }] },
          ],
        },
      ]),
    });
  });

  it('shows sealed-only kcal in calendar marker (excludes incomplete-meal items)', async () => {
    const onSelect = jest.fn();
    render(
      <NutritionCalendarPopover
        onSelect={onSelect}
        trigger={<button>Open</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dayNum = new Date().getDate();
    // 1500 kcal expected (sealed only), not 1700 (all)
    const dayBtn = await waitFor(() =>
      screen.getByRole('button', {
        name: new RegExp(`Day ${dayNum}, 1500 kcal, in progress`, 'i'),
      }),
    );
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(today);
  });
});
