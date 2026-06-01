import { apiClient } from './client';
import { TrainerDashboardResponse } from '../../types/dashboard';

export async function getTrainerDashboard(): Promise<TrainerDashboardResponse> {
  const response = await apiClient.get<TrainerDashboardResponse>('/dashboard/trainer');
  return response.data;
}
