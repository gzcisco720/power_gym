import { render, screen, fireEvent } from '@testing-library/react';
import { MealSection } from '@/components/nutrition/meal-section';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

const meal: IDailyLogMeal = {
  name: 'Breakfast',
  order: 0,
  completed: false,
  items: [
    { foodName: 'Egg', quantityG: 200, kcal: 280, protein: 24, carbs: 0, fat: 20 },
    { foodName: 'Bread', quantityG: 68, kcal: 232, protein: 8.5, carbs: 45, fat: 2 },
  ],
};

describe('MealSection', () => {
  it('renders meal name and items', () => {
    render(
      <MealSection
        meal={meal}
        locked={false}
        addFoodHref="/x"
        onToggleComplete={() => {}}
        onRemoveItem={() => {}}
      />,
    );
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Egg')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  it('renders aggregate meal total in header', () => {
    render(
      <MealSection
        meal={meal}
        locked={false}
        addFoodHref="/x"
        onToggleComplete={() => {}}
        onRemoveItem={() => {}}
      />,
    );
    // Sum: 512kcal, 32.5P, 45C, 22F
    expect(screen.getByText(/512kcal/)).toBeInTheDocument();
  });

  it('+ Add Food link points to addFoodHref', () => {
    render(
      <MealSection
        meal={meal}
        locked={false}
        addFoodHref="/member/nutrition/add?date=2026-05-06&mealIndex=0"
        onToggleComplete={() => {}}
        onRemoveItem={() => {}}
      />,
    );
    const link = screen.getByRole('link', { name: /Add Food/i });
    expect(link).toHaveAttribute('href', '/member/nutrition/add?date=2026-05-06&mealIndex=0');
  });

  it('Complete button toggles', () => {
    const onToggle = jest.fn();
    render(
      <MealSection
        meal={meal}
        locked={false}
        addFoodHref="/x"
        onToggleComplete={onToggle}
        onRemoveItem={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Complete/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('hides remove buttons when locked', () => {
    render(
      <MealSection
        meal={meal}
        locked={true}
        addFoodHref="/x"
        onToggleComplete={() => {}}
        onRemoveItem={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    const emptyMeal: IDailyLogMeal = { ...meal, items: [] };
    render(
      <MealSection
        meal={emptyMeal}
        locked={false}
        addFoodHref="/x"
        onToggleComplete={() => {}}
        onRemoveItem={() => {}}
      />,
    );
    expect(screen.getByText(/No items/)).toBeInTheDocument();
  });
});
