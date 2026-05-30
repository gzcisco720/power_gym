import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';

vi.mock('@/api/foods', () => ({
  fetchFoods: vi.fn(),
  fetchFoodById: vi.fn(),
  createFood: vi.fn(),
  updateFood: vi.fn(),
  deleteFood: vi.fn(),
}));

import * as foodsApi from '@/api/foods';
import { useFoodsStore } from './foodsStore';

const mockFood = {
  _id: 'food-1',
  name: 'Chicken Breast',
  brand: null as string | null,
  macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  servings: [{ label: '100 g', grams: 100 }],
};

beforeEach(() => {
  useFoodsStore.setState({ foods: [], currentFood: null, isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('foodsStore', () => {
  describe('fetch', () => {
    it('populates foods and clears isLoading on success', async () => {
      vi.mocked(foodsApi.fetchFoods).mockResolvedValue([mockFood]);
      await act(async () => {
        await useFoodsStore.getState().fetch();
      });
      const { foods, isLoading } = useFoodsStore.getState();
      expect(foods).toHaveLength(1);
      expect(foods[0].name).toBe('Chicken Breast');
      expect(isLoading).toBe(false);
    });
  });

  describe('deleteFood', () => {
    it('removes item and shows it gone from list', async () => {
      useFoodsStore.setState({ foods: [mockFood] });
      vi.mocked(foodsApi.deleteFood).mockResolvedValue(undefined);
      await act(async () => {
        await useFoodsStore.getState().remove('food-1');
      });
      const { foods } = useFoodsStore.getState();
      expect(foods).toHaveLength(0);
      expect(foods.find((f) => f._id === 'food-1')).toBeUndefined();
    });
  });
});
