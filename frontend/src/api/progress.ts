import { request } from './client';

export interface OneRepMaxTrendPoint {
  exerciseName: string;
  estimatedOneRM: number;
  achievedAt: string;
}

export const fetchProgress = (memberId: string) =>
  request<{ oneRepMaxTrend: OneRepMaxTrendPoint[] }>(`/api/v1/progress/${memberId}`);
