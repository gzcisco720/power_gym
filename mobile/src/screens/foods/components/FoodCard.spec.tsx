import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FoodCard } from './FoodCard';
import { Food } from '../../../types/nutrition-templates';

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    _id: 'food1',
    name: 'Chicken Breast',
    brand: 'FreshFarm',
    macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    servings: [],
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('FoodCard', () => {
  it('renders name, brand, and kcal/protein/carbs/fat from macrosPer100g', () => {
    const food = makeFood();
    const { getByText } = render(
      <FoodCard food={food} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Chicken Breast')).toBeTruthy();
    expect(getByText('FreshFarm')).toBeTruthy();
    expect(getByText('165 kcal')).toBeTruthy();
    expect(getByText('31g P')).toBeTruthy();
    expect(getByText('0g C')).toBeTruthy();
    expect(getByText('3.6g F')).toBeTruthy();
  });

  it('renders name without brand when brand is null', () => {
    const food = makeFood({ brand: null });
    const { getByText, queryByText } = render(
      <FoodCard food={food} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Chicken Breast')).toBeTruthy();
    expect(queryByText('FreshFarm')).toBeNull();
  });

  it('has the correct testID on the card and delete button', () => {
    const food = makeFood({ _id: 'abc123' });
    const { getByTestId } = render(
      <FoodCard food={food} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByTestId('food-card-abc123')).toBeTruthy();
    expect(getByTestId('food-delete-abc123')).toBeTruthy();
  });

  it('calls onPress when the card is pressed', () => {
    const onPress = jest.fn();
    const food = makeFood();
    const { getByTestId } = render(
      <FoodCard food={food} onPress={onPress} onDelete={jest.fn()} />,
    );
    fireEvent.press(getByTestId('food-card-food1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is pressed', () => {
    const onDelete = jest.fn();
    const food = makeFood();
    const { getByTestId } = render(
      <FoodCard food={food} onPress={jest.fn()} onDelete={onDelete} />,
    );
    fireEvent.press(getByTestId('food-delete-food1'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
