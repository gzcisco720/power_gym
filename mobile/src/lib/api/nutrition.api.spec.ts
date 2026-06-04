jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchMyNutritionPlan,
  fetchToday,
  logFood,
  fetchTodaySummary,
  assignNutritionPlan,
  fetchMemberNutritionHistory,
} from './nutrition.api';
import {
  ActiveNutritionPlan,
  NutritionDailyLog,
  MacroSummary,
  LogFoodInput,
} from '../../types/nutrition';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const MOCK_PLAN: ActiveNutritionPlan = {
  _id: 'plan1',
  name: 'Cut Plan',
  templateId: 'tpl1',
  assignedAt: '2024-01-01T00:00:00.000Z',
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
              quantityG: 80,
              kcal: 300,
              protein: 10,
              carbs: 54,
              fat: 6,
            },
          ],
        },
      ],
    },
  ],
  todayDayTypeName: 'Training Day',
};

const MOCK_LOG: NutritionDailyLog = {
  _id: 'log1',
  memberId: 'mem1',
  planId: 'plan1',
  date: '2024-01-02',
  dayTypeName: 'Training Day',
  meals: [
    {
      name: 'Breakfast',
      order: 1,
      items: [],
    },
  ],
};

const MOCK_SUMMARY: MacroSummary = {
  logged: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  target: { kcal: 300, protein: 10, carbs: 54, fat: 6 },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('nutrition.api', () => {
  describe('fetchMyNutritionPlan', () => {
    it('GETs /nutrition/my-plan and returns the parsed plan', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_PLAN });

      const result = await fetchMyNutritionPlan();

      expect(mockGet).toHaveBeenCalledWith('/nutrition/my-plan');
      expect(result).toEqual(MOCK_PLAN);
    });

    it('returns null when the server responds with null', async () => {
      mockGet.mockResolvedValueOnce({ data: null });

      const result = await fetchMyNutritionPlan();

      expect(result).toBeNull();
    });
  });

  describe('fetchToday', () => {
    it('GETs /nutrition/today and returns the daily log', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_LOG });

      const result = await fetchToday();

      expect(mockGet).toHaveBeenCalledWith('/nutrition/today');
      expect(result).toEqual(MOCK_LOG);
    });
  });

  describe('logFood', () => {
    it('POSTs /nutrition/today/log with the input body and returns the updated log', async () => {
      const input: LogFoodInput = {
        mealName: 'Breakfast',
        foodName: 'Oats',
        quantityG: 80,
        kcal: 300,
        protein: 10,
        carbs: 54,
        fat: 6,
      };
      const updatedLog: NutritionDailyLog = {
        ...MOCK_LOG,
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [{ foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 54, fat: 6 }],
          },
        ],
      };
      mockPost.mockResolvedValueOnce({ data: updatedLog });

      const result = await logFood(input);

      expect(mockPost).toHaveBeenCalledWith('/nutrition/today/log', input);
      expect(result).toEqual(updatedLog);
    });
  });

  describe('fetchTodaySummary', () => {
    it('GETs /nutrition/today/summary and returns logged + target totals', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_SUMMARY });

      const result = await fetchTodaySummary();

      expect(mockGet).toHaveBeenCalledWith('/nutrition/today/summary');
      expect(result).toEqual(MOCK_SUMMARY);
    });
  });

  describe('assignNutritionPlan', () => {
    it('POSTs /nutrition/members/:memberId/assign-plan with {templateId}', async () => {
      mockPost.mockResolvedValueOnce({ data: MOCK_PLAN });

      const result = await assignNutritionPlan('mem1', 'tpl1');

      expect(mockPost).toHaveBeenCalledWith('/nutrition/members/mem1/assign-plan', { templateId: 'tpl1' });
      expect(result).toEqual(MOCK_PLAN);
    });
  });

  describe('fetchMemberNutritionHistory', () => {
    it('GETs /nutrition/members/:memberId/history and returns the logs array', async () => {
      const history: NutritionDailyLog[] = [MOCK_LOG];
      mockGet.mockResolvedValueOnce({ data: history });

      const result = await fetchMemberNutritionHistory('mem1');

      expect(mockGet).toHaveBeenCalledWith('/nutrition/members/mem1/history');
      expect(result).toEqual(history);
    });
  });
});
