jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from './client';
import { searchFoods, createFood } from './foods.api';
import { Food, CreateFoodDto } from '../../types/nutrition-templates';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const MOCK_FOOD: Food = {
  _id: 'food1',
  name: 'Chicken Breast',
  brand: null,
  macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  servings: [],
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('foods.api', () => {
  describe('searchFoods', () => {
    it('GETs /foods with q and limit query params and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_FOOD] });

      const result = await searchFoods('chick', 5);

      expect(mockGet).toHaveBeenCalledWith('/foods', { params: { q: 'chick', limit: 5 } });
      expect(result).toEqual([MOCK_FOOD]);
    });
  });

  describe('createFood', () => {
    it('POSTs /foods with the dto and returns the created food', async () => {
      const dto: CreateFoodDto = {
        name: 'Chicken Breast',
        brand: null,
        macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
        servings: [],
      };
      mockPost.mockResolvedValueOnce({ data: MOCK_FOOD });

      const result = await createFood(dto);

      expect(mockPost).toHaveBeenCalledWith('/foods', dto);
      expect(result).toEqual(MOCK_FOOD);
    });
  });
});
