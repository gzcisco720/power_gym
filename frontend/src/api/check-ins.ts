import { request } from './client';

const BASE = '/api/v1';

export interface CheckInRecord {
  _id: string;
  memberId: string;
  trainerId: string;
  submittedAt: string;
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
}

export interface CheckInPayload {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
}

export function submitCheckIn(payload: CheckInPayload): Promise<CheckInRecord> {
  return request<CheckInRecord>(`${BASE}/check-ins`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchCheckIns(): Promise<CheckInRecord[]> {
  return request<CheckInRecord[]>(`${BASE}/check-ins`);
}

export function fetchCheckIn(id: string): Promise<CheckInRecord> {
  return request<CheckInRecord>(`${BASE}/check-ins/${id}`);
}
