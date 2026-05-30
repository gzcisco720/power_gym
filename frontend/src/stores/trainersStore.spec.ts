import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/trainers', () => ({
  fetchTrainers: vi.fn(),
  fetchTrainerById: vi.fn(),
  fetchTrainerMembers: vi.fn(),
  fetchTrainerPlans: vi.fn(),
  fetchTrainerNutritionPlans: vi.fn(),
}));

import { useTrainersStore } from './trainersStore';
import * as trainersApi from '@/api/trainers';

const mockFetchTrainerById = vi.mocked(trainersApi.fetchTrainerById);
const mockFetchTrainerMembers = vi.mocked(trainersApi.fetchTrainerMembers);
const mockFetchTrainerPlans = vi.mocked(trainersApi.fetchTrainerPlans);
const mockFetchTrainerNutritionPlans = vi.mocked(trainersApi.fetchTrainerNutritionPlans);

describe('trainersStore', () => {
  beforeEach(() => {
    useTrainersStore.setState({
      trainers: [],
      trainerDetail: null,
      trainerMembers: [],
      trainerPlans: [],
      trainerNutritionPlans: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('fetchTrainerDetail', () => {
    it('populates trainer + members + plans', async () => {
      const detail = {
        _id: 't1',
        name: 'Test Trainer',
        email: 'trainer@test.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        memberCount: 2,
        sessionsThisMonth: 5,
        templateCount: 3,
      };
      const members = [
        {
          _id: 'm1',
          name: 'Alice',
          email: 'alice@test.com',
          trainerId: 't1',
          streak: 3,
          sessionsThisMonth: 4,
          status: 'active' as const,
        },
      ];
      const plans = [
        { _id: 'p1', name: 'Plan A', daysCount: 3, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      const nutritionPlans = [
        { _id: 'np1', name: 'Nutrition A', dayTypesCount: 2, createdAt: '2024-01-01T00:00:00.000Z' },
      ];

      mockFetchTrainerById.mockResolvedValue(detail);
      mockFetchTrainerMembers.mockResolvedValue(members);
      mockFetchTrainerPlans.mockResolvedValue(plans);
      mockFetchTrainerNutritionPlans.mockResolvedValue(nutritionPlans);

      await useTrainersStore.getState().fetchTrainerDetail('t1');

      const state = useTrainersStore.getState();
      expect(state.trainerDetail).toEqual(detail);
      expect(state.trainerMembers).toEqual(members);
      expect(state.trainerPlans).toEqual(plans);
      expect(state.trainerNutritionPlans).toEqual(nutritionPlans);
      expect(state.isLoading).toBe(false);
    });
  });
});
