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
      // GET
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [],
          dayCompleted: false,
        }),
      });
    });
    (global as unknown as { __putBody: () => unknown }).__putBody = () => putBody;
  });

  it('Mark day complete posts dayCompleted: true', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    const btn = await waitFor(() => screen.getByRole('button', { name: /mark day complete/i }));
    fireEvent.click(btn);
    await waitFor(() => {
      const body = (global as unknown as { __putBody: () => { dayCompleted: boolean } }).__putBody();
      expect(body.dayCompleted).toBe(true);
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
});
