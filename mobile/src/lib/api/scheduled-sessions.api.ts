import { apiClient } from './client';
import {
  ScheduledSession,
  StaffSession,
  CreateSessionInput,
  UpdateSessionInput,
} from '../../types/scheduled-sessions';

export async function fetchMySessions(): Promise<ScheduledSession[]> {
  const response = await apiClient.get<ScheduledSession[]>('/scheduled-sessions/my');
  return response.data;
}

export async function fetchStaffSessions(
  range: 'upcoming' | 'past',
): Promise<StaffSession[]> {
  const response = await apiClient.get<StaffSession[]>('/scheduled-sessions', {
    params: { range },
  });
  return response.data;
}

export async function createSession(dto: CreateSessionInput): Promise<StaffSession> {
  const response = await apiClient.post<StaffSession>('/scheduled-sessions', dto);
  return response.data;
}

export async function updateSession(
  id: string,
  dto: UpdateSessionInput,
): Promise<StaffSession> {
  const response = await apiClient.patch<StaffSession>(`/scheduled-sessions/${id}`, dto);
  return response.data;
}

export async function deleteSession(
  id: string,
  scope: 'single' | 'series',
): Promise<void> {
  await apiClient.delete(`/scheduled-sessions/${id}`, { params: { scope } });
}
