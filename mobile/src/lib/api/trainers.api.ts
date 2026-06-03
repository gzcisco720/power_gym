import { apiClient } from './client';
import { TrainerListItem, TrainerDetail } from '../../types/trainers';

export async function fetchTrainers(): Promise<TrainerListItem[]> {
  const response = await apiClient.get<TrainerListItem[]>('/trainers');
  return response.data;
}

export async function fetchTrainerDetail(id: string): Promise<TrainerDetail> {
  const response = await apiClient.get<TrainerDetail>(`/trainers/${id}`);
  return response.data;
}
