import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/nutrition', () => ({
  fetchNutritionTemplates: vi.fn(),
  createNutritionTemplate: vi.fn(),
  fetchFoods: vi.fn(),
  createFood: vi.fn(),
  searchFoods: vi.fn(),
  fetchMemberNutritionPlan: vi.fn(),
  assignNutritionPlan: vi.fn(),
}));

import * as nutritionApi from '@/api/nutrition';
import { useNutritionStore } from '@/stores/nutritionStore';

const mockTemplate: nutritionApi.NutritionTemplate = {
  _id: 'nt1',
  name: 'Bulk Plan',
  description: null,
  createdBy: 'trainer1',
  dayTypes: [],
};

const mockFood: nutritionApi.Food = {
  _id: 'f1',
  name: 'Chicken Breast',
  brand: null,
  macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  servings: [],
};

const mockMemberPlan: nutritionApi.MemberNutritionPlan = {
  _id: 'mnp1',
  memberId: 'm1',
  nutritionTemplateId: 'nt1',
  nutritionTemplate: mockTemplate,
};

beforeEach(() => {
  useNutritionStore.setState({
    templates: [],
    foods: [],
    foodSearchResults: [],
    memberPlans: {},
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('nutritionStore', () => {
  describe('fetchTemplates', () => {
    it('populates templates', async () => {
      vi.mocked(nutritionApi.fetchNutritionTemplates).mockResolvedValueOnce([mockTemplate]);

      await useNutritionStore.getState().fetchTemplates();

      expect(useNutritionStore.getState().templates).toEqual([mockTemplate]);
    });
  });

  describe('createTemplate', () => {
    it('appends a new template', async () => {
      vi.mocked(nutritionApi.createNutritionTemplate).mockResolvedValueOnce(mockTemplate);

      await useNutritionStore.getState().createTemplate({ name: 'Bulk Plan' });

      expect(useNutritionStore.getState().templates).toEqual([mockTemplate]);
    });
  });

  describe('fetchFoods', () => {
    it('populates foods', async () => {
      vi.mocked(nutritionApi.fetchFoods).mockResolvedValueOnce([mockFood]);

      await useNutritionStore.getState().fetchFoods();

      expect(useNutritionStore.getState().foods).toEqual([mockFood]);
    });
  });

  describe('createFood', () => {
    it('appends a new food', async () => {
      vi.mocked(nutritionApi.createFood).mockResolvedValueOnce(mockFood);

      await useNutritionStore.getState().createFood({ name: 'Chicken Breast' });

      expect(useNutritionStore.getState().foods).toEqual([mockFood]);
    });
  });

  describe('searchFood', () => {
    it('populates external food search results', async () => {
      vi.mocked(nutritionApi.searchFoods).mockResolvedValueOnce([mockFood]);

      await useNutritionStore.getState().searchFood('chicken');

      expect(useNutritionStore.getState().foodSearchResults).toEqual([mockFood]);
    });
  });

  describe('assignPlan', () => {
    it('sets the member nutrition plan', async () => {
      vi.mocked(nutritionApi.assignNutritionPlan).mockResolvedValueOnce(mockMemberPlan);

      await useNutritionStore.getState().assignPlan('m1', 'nt1');

      expect(useNutritionStore.getState().memberPlans['m1']).toEqual(mockMemberPlan);
    });
  });

  describe('fetchMemberPlan', () => {
    it('populates memberPlan for a member id', async () => {
      vi.mocked(nutritionApi.fetchMemberNutritionPlan).mockResolvedValueOnce(mockMemberPlan);

      await useNutritionStore.getState().fetchMemberPlan('m1');

      expect(useNutritionStore.getState().memberPlans['m1']).toEqual(mockMemberPlan);
    });
  });
});
