import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/nutrition-templates', () => ({
  fetchNutritionTemplates: vi.fn(),
  fetchNutritionTemplateById: vi.fn(),
  createNutritionTemplate: vi.fn(),
  updateNutritionTemplate: vi.fn(),
  deleteNutritionTemplate: vi.fn(),
}));

import { useNutritionTemplatesStore } from './nutritionTemplatesStore';
import * as nutritionApi from '@/api/nutrition-templates';

const mockFetchNutritionTemplateById = vi.mocked(nutritionApi.fetchNutritionTemplateById);

describe('nutritionTemplatesStore', () => {
  beforeEach(() => {
    useNutritionTemplatesStore.setState({
      templates: [],
      currentTemplate: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchOne', () => {
    it('populates editable dayTypes', async () => {
      const template = {
        _id: 'nt1',
        name: 'Bulk Plan',
        description: 'Mass phase nutrition',
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
                ],
              },
            ],
          },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockFetchNutritionTemplateById.mockResolvedValue(template);

      await useNutritionTemplatesStore.getState().fetchOne('nt1');

      const state = useNutritionTemplatesStore.getState();
      expect(state.currentTemplate).not.toBeNull();
      expect(state.currentTemplate!.dayTypes).toHaveLength(1);
      expect(state.currentTemplate!.dayTypes[0].name).toBe('Training Day');
      expect(state.currentTemplate!.dayTypes[0].meals[0].items[0].foodName).toBe('Oats');
    });
  });
});
