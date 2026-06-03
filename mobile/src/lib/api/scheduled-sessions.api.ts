import { apiClient } from './client';
import { ScheduledSession } from '../../types/scheduled-sessions';

export async function fetchMySessions(): Promise<ScheduledSession[]> {
  const response = await apiClient.get<ScheduledSession[]>('/scheduled-sessions/my');
  return response.data;
}
