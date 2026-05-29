import { request } from './client';

export interface ScheduledSession {
  _id: string;
  trainerId: string;
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export const fetchMemberSchedule = (memberId: string) =>
  request<ScheduledSession[]>(`/api/v1/schedule/member/${memberId}`);

export const createScheduledSession = (data: {
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
}) =>
  request<ScheduledSession>('/api/v1/schedule', { method: 'POST', body: JSON.stringify(data) });

export const cancelScheduledSession = (id: string) =>
  request<{ success: boolean }>(`/api/v1/schedule/${id}`, { method: 'DELETE' });
