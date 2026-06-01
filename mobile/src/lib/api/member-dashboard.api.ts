import { apiClient } from './client';
import { MemberDashboardResponse } from '../../types/dashboard';

export async function getMemberDashboard(exercise?: string): Promise<MemberDashboardResponse> {
  const params = exercise ? { exercise } : undefined;
  const response = await apiClient.get<MemberDashboardResponse>('/dashboard/member', { params });
  return response.data;
}
