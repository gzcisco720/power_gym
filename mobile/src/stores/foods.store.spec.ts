jest.mock('../lib/api/foods.api', () => ({
  searchFoods: jest.fn(),
  createFood: jest.fn(),
  updateFood: jest.fn(),
  deleteFood: jest.fn(),
}));

import * as foodsApi from '../lib/api/foods.api';
import { useFoodsStore } from './foods.store';
import { Food } from '../types/nutrition-templates';

const mockSearchFoods = foodsApi.searchFoods as jest.MockedFunction<typeof foodsApi.searchFoods>;
const mockCreateFood = foodsApi.createFood as jest.MockedFunction<typeof foodsApi.createFood>;
const mockUpdateFood = foodsApi.updateFood as jest.MockedFunction<typeof foodsApi.updateFood>;
const mockDeleteFood = foodsApi.deleteFood as jest.MockedFunction<typeof foodsApi.deleteFood>;

const MOCK_FOOD_1: Food = {
  _id: 'food1',
  name: 'Chicken Breast',
  brand: null,
  macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  servings: [],
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const MOCK_FOOD_2: Food = {
  _id: 'food2',
  name: 'Chicken Thigh',
  brand: null,
  macrosPer100g: { kcal: 209, protein: 26, carbs: 0, fat: 11 },
  servings: [],
  createdBy: 'user1',
  createdAt: '2024-01-02T00:00:00.000Z',
};

function resetStore() {
  useFoodsStore.setState({ results: [], loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useFoodsStore', () => {
  describe('search', () => {
    it('populates results and clears loading; debounced caller passes q through', async () => {
      mockSearchFoods.mockResolvedValueOnce([MOCK_FOOD_1, MOCK_FOOD_2]);

      await useFoodsStore.getState().search('chick');

      expect(mockSearchFoods).toHaveBeenCalledWith('chick', 20);
      const state = useFoodsStore.getState();
      expect(state.results).toEqual([MOCK_FOOD_1, MOCK_FOOD_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the api rejects', async () => {
      mockSearchFoods.mockRejectedValueOnce(new Error('Network error'));

      await useFoodsStore.getState().search('chick');

      const state = useFoodsStore.getState();
      expect(state.results).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('addResult', () => {
    it('prepends the new food to results', () => {
      useFoodsStore.setState({ results: [MOCK_FOOD_2] });

      useFoodsStore.getState().addResult(MOCK_FOOD_1);

      const state = useFoodsStore.getState();
      expect(state.results[0]).toEqual(MOCK_FOOD_1);
      expect(state.results[1]).toEqual(MOCK_FOOD_2);
      expect(state.results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('replaces the matching food in results by _id and clears loading on success', async () => {
      const updated: Food = { ...MOCK_FOOD_1, name: 'Updated Chicken' };
      useFoodsStore.setState({ results: [MOCK_FOOD_1, MOCK_FOOD_2] });
      mockUpdateFood.mockResolvedValueOnce(updated);

      await useFoodsStore.getState().update('food1', { name: 'Updated Chicken' });

      const state = useFoodsStore.getState();
      expect(mockUpdateFood).toHaveBeenCalledWith('food1', { name: 'Updated Chicken' });
      expect(state.results[0]).toEqual(updated);
      expect(state.results[1]).toEqual(MOCK_FOOD_2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the api rejects', async () => {
      useFoodsStore.setState({ results: [MOCK_FOOD_1] });
      mockUpdateFood.mockRejectedValueOnce(new Error('Update failed'));

      await useFoodsStore.getState().update('food1', { name: 'Bad' });

      const state = useFoodsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Update failed');
      // results unchanged
      expect(state.results).toEqual([MOCK_FOOD_1]);
    });
  });

  describe('remove', () => {
    it('filters the deleted food out of results on success', async () => {
      useFoodsStore.setState({ results: [MOCK_FOOD_1, MOCK_FOOD_2] });
      mockDeleteFood.mockResolvedValueOnce(undefined);

      await useFoodsStore.getState().remove('food1');

      const state = useFoodsStore.getState();
      expect(mockDeleteFood).toHaveBeenCalledWith('food1');
      expect(state.results).toEqual([MOCK_FOOD_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears loading when the api rejects', async () => {
      useFoodsStore.setState({ results: [MOCK_FOOD_1, MOCK_FOOD_2] });
      mockDeleteFood.mockRejectedValueOnce(new Error('Delete failed'));

      await useFoodsStore.getState().remove('food1');

      const state = useFoodsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Delete failed');
      // results unchanged
      expect(state.results).toEqual([MOCK_FOOD_1, MOCK_FOOD_2]);
    });
  });
});

// Silence unused mock warnings
void mockCreateFood;
void mockUpdateFood;
void mockDeleteFood;
