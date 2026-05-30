import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NutritionTemplateForm } from './nutrition-template-form';

// Minimal mock for FoodPickerDialog (avoids hitting API in tests)
vi.mock('./food-picker-dialog', () => ({
  FoodPickerDialog: () => null,
}));

describe('NutritionTemplateForm', () => {
  it('computes day-type macro totals from items', () => {
    const initialData = {
      name: 'Test Plan',
      description: null,
      dayTypes: [
        {
          name: 'Training Day',
          meals: [
            {
              name: 'Breakfast',
              order: 1,
              items: [
                {
                  foodName: 'Oats',
                  quantityG: 100,
                  kcal: 390,
                  protein: 13,
                  carbs: 66,
                  fat: 7,
                },
                {
                  foodName: 'Egg',
                  quantityG: 50,
                  kcal: 80,
                  protein: 6,
                  carbs: 1,
                  fat: 5,
                },
              ],
            },
          ],
        },
      ],
    };

    render(
      <MemoryRouter>
        <NutritionTemplateForm
          initialData={initialData}
          onSubmit={() => Promise.resolve()}
        />
      </MemoryRouter>,
    );

    // The MacroSummaryCard renders kcal total: 390 + 80 = 470
    // It renders the total inside a span with "kcal" label next to it
    const kcalValues = screen.getAllByText('470');
    expect(kcalValues.length).toBeGreaterThan(0);
  });
});
