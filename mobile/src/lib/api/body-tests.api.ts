import { apiClient } from './client';
import { BodyTest, CreateBodyTestDto } from '../../types/body-tests';

export async function fetchMyBodyTests(): Promise<BodyTest[]> {
  const response = await apiClient.get<BodyTest[]>('/body-tests/me');
  return response.data;
}

export async function createBodyTest(dto: CreateBodyTestDto): Promise<BodyTest> {
  const response = await apiClient.post<BodyTest>('/body-tests', dto);
  return response.data;
}

export async function deleteBodyTest(id: string): Promise<void> {
  await apiClient.delete(`/body-tests/${id}`);
}
