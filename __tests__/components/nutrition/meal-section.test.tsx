import { render, screen, fireEvent } from '@testing-library/react';
import { MealSection } from '@/components/nutrition/meal-section';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

const meal: IDailyLogMeal = {
  name: 'Breakfast',
  order: 0,
  completed: false,
  targetKcal: 500,
  targetProtein: 30,
  targetCarbs: 40,
  targetFat: 25,
  items: [
    { foodName: 'Egg', quantityG: 200, kcal: 280, protein: 24, carbs: 0, fat: 20 },
    { foodName: 'Bread', quantityG: 68, kcal: 232, protein: 8.5, carbs: 45, fat: 2 },
  ],
};

const noTargetMeal: IDailyLogMeal = {
  ...meal,
  targetKcal: 0,
  targetProtein: 0,
  targetCarbs: 0,
  targetFat: 0,
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

  it('renders progress bar values when targets are set', () => {
    render(
      <MealSection
        meal={meal}
        locked={false}
        addFoodHref="/x"
        onToggleComplete={() => {}}
        onRemoveItem={() => {}}
      />,
    );
    // Targets: 500/30/40/25. Actuals from items: 512/32.5/45/22 → display as "512/500" etc.
    expect(screen.getByText(/512\/500/)).toBeInTheDocument();
  });

  it('hides progress bars when all targets are 0', () => {
    render(
      <MealSection
        meal={noTargetMeal}
        locked={false}
        addFoodHref="/x"
        onToggleComplete={() => {}}
        onRemoveItem={() => {}}
      />,
    );
    expect(screen.queryByText(/\/0kcal/)).not.toBeInTheDocument();
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
});
