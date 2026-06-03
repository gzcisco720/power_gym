import { apiClient } from './client';
import { Exercise, CreateExerciseDto } from '../../types/training-templates';

export async function searchExercises(q: string): Promise<Exercise[]> {
  const response = await apiClient.get<Exercise[]>('/exercises', { params: { q } });
  return response.data;
}

export async function createExercise(dto: CreateExerciseDto): Promise<Exercise> {
  const response = await apiClient.post<Exercise>('/exercises', dto);
  return response.data;
}
