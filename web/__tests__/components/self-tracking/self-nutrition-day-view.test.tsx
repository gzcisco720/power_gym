import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

describe('SelfNutritionDayView', () => {
  beforeEach(() => {
    let putBody: unknown = null;
    global.fetch = jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') {
        putBody = JSON.parse(init.body ?? '{}');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ _id: 'log1' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [
            { name: 'Breakfast', order: 0, completed: true, items: [{ foodName: 'A', quantityG: 100, kcal: 100, protein: 0, carbs: 0, fat: 0 }] },
            { name: 'Lunch', order: 1, completed: false, items: [{ foodName: 'B', quantityG: 100, kcal: 200, protein: 0, carbs: 0, fat: 0 }] },
          ],
          dayCompleted: false,
        }),
      });
    });
    (global as unknown as { __putBody: () => unknown }).__putBody = () => putBody;
  });

  it('Mark day complete opens confirm dialog (does not PUT directly)', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    const btn = await waitFor(() => screen.getByRole('button', { name: /mark day complete/i }));
    fireEvent.click(btn);
    expect(await screen.findByRole('heading', { name: /mark today as complete/i })).toBeInTheDocument();
    const body = (global as unknown as { __putBody: () => unknown }).__putBody();
    expect(body).toBeNull();
  });

  it('Submit completed only sends current meals + dayCompleted: true', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    fireEvent.click(await waitFor(() => screen.getByRole('button', { name: /mark day complete/i })));
    fireEvent.click(await screen.findByRole('button', { name: /submit completed only/i }));
    await waitFor(() => {
      const body = (global as unknown as { __putBody: () => { dayCompleted: boolean; meals: { completed: boolean }[] } }).__putBody();
      expect(body.dayCompleted).toBe(true);
      expect(body.meals[0].completed).toBe(true);
      expect(body.meals[1].completed).toBe(false);
    });
  });

  it('Mark all & submit flips every meal to completed: true and submits', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    fireEvent.click(await waitFor(() => screen.getByRole('button', { name: /mark day complete/i })));
    fireEvent.click(await screen.findByRole('button', { name: /mark all & submit/i }));
    await waitFor(() => {
      const body = (global as unknown as { __putBody: () => { dayCompleted: boolean; meals: { completed: boolean }[] } }).__putBody();
      expect(body.dayCompleted).toBe(true);
      expect(body.meals.every((m) => m.completed === true)).toBe(true);
    });
  });

  it('shows "Day completed" disabled when dayCompleted is true on initial load', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [],
          dayCompleted: true,
        }),
      });
    });
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    const btn = await waitFor(() => screen.getByRole('button', { name: /day completed/i }));
    expect(btn).toBeDisabled();
  });

  it('disables next-day arrow when next date would be in the future', async () => {
    const today = new Date().toISOString().slice(0, 10);
    render(<SelfNutritionDayView initialDate={today} />);
    await waitFor(() => screen.getByRole('button', { name: /mark day complete/i }));
    const nextBtns = screen.getAllByRole('button').filter((b) => /→/.test(b.textContent ?? ''));
    expect(nextBtns.length).toBeGreaterThan(0);
    expect(nextBtns[0]).toBeDisabled();
  });

  it('locks meal section actions when dayCompleted is true', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [
            { name: 'Breakfast', order: 0, completed: true, items: [{ foodName: 'Egg', quantityG: 100, kcal: 150, protein: 12, carbs: 1, fat: 10 }] },
          ],
          dayCompleted: true,
        }),
      });
    });
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    await waitFor(() => screen.getByRole('button', { name: /day completed/i }));
    // Add Food button is rendered but disabled
    const addBtn = screen.getByRole('button', { name: /add food/i });
    expect(addBtn).toBeDisabled();
    // Per-meal complete toggle is also disabled
    const mealCompleteBtns = screen.getAllByRole('button').filter((b) => /^completed$|^complete$/i.test(b.textContent ?? ''));
    if (mealCompleteBtns.length > 0) {
      mealCompleteBtns.forEach((btn) => expect(btn).toBeDisabled());
    }
  });
});
