import { apiClient } from './client';
import { OwnerDashboardResponse } from '../../types/dashboard';

export async function getOwnerDashboard(): Promise<OwnerDashboardResponse> {
  const response = await apiClient.get<OwnerDashboardResponse>('/dashboard/owner');
  return response.data;
}
