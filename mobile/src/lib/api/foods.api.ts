import { apiClient } from './client';
import { Food, CreateFoodDto } from '../../types/nutrition-templates';

export async function searchFoods(q: string, limit = 20): Promise<Food[]> {
  const response = await apiClient.get<Food[]>('/foods', { params: { q, limit } });
  return response.data;
}

export async function createFood(dto: CreateFoodDto): Promise<Food> {
  const response = await apiClient.post<Food>('/foods', dto);
  return response.data;
}
