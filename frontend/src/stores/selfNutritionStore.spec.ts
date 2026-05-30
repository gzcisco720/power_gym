import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/self-nutrition', () => ({
  fetchDay: vi.fn(),
  upsertDay: vi.fn(),
  fetchRecentLogs: vi.fn(),
}));

import { useSelfNutritionStore } from './selfNutritionStore';
import * as selfNutritionApi from '@/api/self-nutrition';

const mockFetchDay = vi.mocked(selfNutritionApi.fetchDay);

describe('selfNutritionStore', () => {
  beforeEach(() => {
    useSelfNutritionStore.setState({
      dayLog: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchDay', () => {
    it('populates meals for the date', async () => {
      const dayLog = {
        date: '2024-01-15',
        sourceTemplateId: null,
        sourceTemplateDayTypeName: null,
        dayLabel: 'Freestyle',
        dayCompleted: false,
        meals: [
          {
            name: 'Breakfast',
            order: 0,
            completed: false,
            items: [
              {
                foodName: 'Oats',
                quantityG: 100,
                kcal: 380,
                protein: 13,
                carbs: 67,
                fat: 7,
              },
            ],
          },
          {
            name: 'Lunch',
            order: 1,
            completed: false,
            items: [],
          },
        ],
      };

      mockFetchDay.mockResolvedValue(dayLog);

      await useSelfNutritionStore.getState().fetchDay('2024-01-15');

      const state = useSelfNutritionStore.getState();
      expect(state.dayLog).not.toBeNull();
      expect(state.dayLog?.date).toBe('2024-01-15');
      expect(state.dayLog?.meals).toHaveLength(2);
      expect(state.dayLog?.meals[0].name).toBe('Breakfast');
      expect(state.dayLog?.meals[0].items).toHaveLength(1);
      expect(state.isLoading).toBe(false);
    });
  });
});
