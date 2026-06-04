/**
 * Stage 3 unit tests — MealCard
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { DailyLogMeal } from '../../../types/nutrition';
import { MealCard } from './MealCard';

function makeMeal(overrides: Partial<DailyLogMeal> = {}): DailyLogMeal {
  return {
    name: 'Breakfast',
    order: 1,
    items: [
      {
        foodName: 'Oats',
        quantityG: 80,
        kcal: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MealCard', () => {
  it('log-food-button has an accessibilityLabel and navigates to LogFood with the meal name', () => {
    const meal = makeMeal({ name: 'Breakfast', order: 1 });

    const { getByTestId } = render(<MealCard meal={meal} />);

    const card = getByTestId('meal-card-1');
    expect(card).toBeTruthy();

    const logFoodBtn = getByTestId('log-food-button');
    expect(logFoodBtn.props.accessibilityLabel).toBeTruthy();

    fireEvent.press(logFoodBtn);

    expect(mockNavigate).toHaveBeenCalledWith('LogFood', { mealName: 'Breakfast' });
  });
});
