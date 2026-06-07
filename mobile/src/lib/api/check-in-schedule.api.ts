import { apiClient } from './client';

export interface CheckInSchedule {
  dayOfWeek: number; // 0-6
  hour: number;      // 0-23
  minute: number;    // 0-59
  active: boolean;
}

export interface UpdateCheckInScheduleDto {
  dayOfWeek: number;
  hour: number;
  minute?: number;
  active: boolean;
}

export async function fetchCheckInSchedule(memberId: string): Promise<CheckInSchedule | null> {
  const response = await apiClient.get<CheckInSchedule | null>(`/check-ins/members/${memberId}/schedule`);
  return response.data;
}

export async function updateCheckInSchedule(
  memberId: string,
  dto: UpdateCheckInScheduleDto,
): Promise<CheckInSchedule> {
  const response = await apiClient.put<CheckInSchedule>(`/check-ins/members/${memberId}/schedule`, dto);
  return response.data;
}
