import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/plans', () => ({
  fetchPlans: vi.fn(),
  fetchPlanById: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
}));

import { usePlansStore } from './plansStore';
import * as plansApi from '@/api/plans';

const mockFetchPlans = vi.mocked(plansApi.fetchPlans);
const mockCreatePlan = vi.mocked(plansApi.createPlan);

describe('plansStore', () => {
  beforeEach(() => {
    usePlansStore.setState({
      plans: [],
      currentPlan: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('posts new template and adds to list', async () => {
      const newPlan = {
        _id: 'plan1',
        name: 'Test Plan',
        description: null,
        days: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockCreatePlan.mockResolvedValue(newPlan);
      mockFetchPlans.mockResolvedValue([newPlan]);

      await usePlansStore.getState().save({ name: 'Test Plan', description: null, days: [] });

      const state = usePlansStore.getState();
      expect(state.plans).toHaveLength(1);
      expect(state.plans[0]._id).toBe('plan1');
      expect(state.plans[0].name).toBe('Test Plan');
    });
  });
});
