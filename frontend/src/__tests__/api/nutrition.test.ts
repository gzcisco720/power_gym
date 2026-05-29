import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
}));

import { request } from '@/api/client';
import {
  fetchNutritionTemplates,
  createNutritionTemplate,
  fetchFoods,
  createFood,
  searchFoods,
  fetchMemberNutritionPlan,
  assignNutritionPlan,
} from '@/api/nutrition';

const mockRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
});

describe('api/nutrition', () => {
  it('fetchNutritionTemplates calls GET /api/v1/nutrition-templates', async () => {
    await fetchNutritionTemplates();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/nutrition-templates');
  });

  it('createNutritionTemplate calls POST /api/v1/nutrition-templates', async () => {
    await createNutritionTemplate({ name: 'Template A' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/nutrition-templates',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchFoods calls GET /api/v1/foods without query', async () => {
    await fetchFoods();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/foods');
  });

  it('fetchFoods calls GET /api/v1/foods?q= with query', async () => {
    await fetchFoods('chicken');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/foods?q=chicken');
  });

  it('createFood calls POST /api/v1/foods', async () => {
    await createFood({ name: 'Chicken' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/foods',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('searchFoods calls GET /api/v1/food-search?q=', async () => {
    await searchFoods('apple');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/food-search?q=apple');
  });

  it('fetchMemberNutritionPlan calls GET /api/v1/members/:memberId/nutrition', async () => {
    await fetchMemberNutritionPlan('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1/nutrition');
  });

  it('assignNutritionPlan calls PUT /api/v1/members/:memberId/nutrition', async () => {
    await assignNutritionPlan('m1', 'nt1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/members/m1/nutrition',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
