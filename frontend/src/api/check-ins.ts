import { request } from './client';

export interface CheckIn {
  _id: string;
  memberId: string;
  weekStart: string;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  stuckToDiet: 'yes' | 'no' | 'partial';
  dietDetails: string | null;
  wellbeing: string | null;
  notes: string | null;
  weight: number | null;
  waist: number | null;
  submittedAt: string;
}

export interface CheckInConfig {
  dayOfWeek: number; // 0=Sun
  reminderTime: string;
}

export type SubmitCheckInData = {
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  stuckToDiet: 'yes' | 'no' | 'partial';
  dietDetails?: string | null;
  wellbeing?: string | null;
  notes?: string | null;
  weight?: number | null;
  waist?: number | null;
  steps?: number | null;
  exerciseMinutes?: number | null;
  sleepHours?: number | null;
};

export const fetchCheckIns = () => request<CheckIn[]>('/api/v1/check-ins');

export const submitCheckIn = (data: SubmitCheckInData) =>
  request<CheckIn>('/api/v1/check-ins', { method: 'POST', body: JSON.stringify(data) });

// No /check-in-config endpoint for members — return a static default
export const fetchConfig = () =>
  Promise.resolve<CheckInConfig>({ dayOfWeek: 1, reminderTime: '08:00' });
