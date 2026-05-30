import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/member-hub', () => ({
  fetchMemberNutritionPlan: vi.fn(),
}));

import { fetchMemberNutritionPlan } from '@/api/member-hub';
import { useMemberNutritionStore } from './memberNutritionStore';

const mockFetchPlan = fetchMemberNutritionPlan as ReturnType<typeof vi.fn>;

const seedPlan = {
  _id: 'plan1',
  name: 'Test Nutrition Plan',
  assignedAt: '2026-01-01T00:00:00.000Z',
  dayTypes: [
    {
      name: 'Training Day',
      meals: [
        {
          name: 'Breakfast',
          order: 0,
          items: [
            { foodName: 'Oats', quantityG: 100, kcal: 370, protein: 13, carbs: 66, fat: 7 },
          ],
        },
      ],
    },
  ],
  schedule: { iterating: false, weeklyPattern: [], calendarOverrides: [] },
};

describe('memberNutritionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMemberNutritionStore.setState({
      activePlan: null,
      isLoading: false,
      error: null,
    });
  });

  describe('fetchDay', () => {
    it('populates the active plan', async () => {
      mockFetchPlan.mockResolvedValueOnce(seedPlan);

      await useMemberNutritionStore.getState().fetchActivePlan('mem1');

      const { activePlan, isLoading, error } = useMemberNutritionStore.getState();
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
      expect(activePlan).not.toBeNull();
      expect(activePlan!._id).toBe('plan1');
      expect(activePlan!.dayTypes).toHaveLength(1);
    });
  });
});
