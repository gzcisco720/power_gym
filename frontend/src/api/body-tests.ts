import { request } from './client';

export interface BodyTest {
  _id: string;
  memberId: string;
  protocol: string;
  weight: number;
  chest: number | null;
  abdominal: number | null;
  thigh: number | null;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  date: string;
}

export interface CreateBodyTestData {
  protocol: string;
  weight: number;
  date?: string;
  sex?: string;
  age?: number;
  chest?: number;
  abdominal?: number;
  thigh?: number;
  tricep?: number;
  subscapular?: number;
  suprailiac?: number;
  midaxillary?: number;
  bicep?: number;
  lumbar?: number;
}

export const fetchBodyTests = (memberId: string) =>
  request<BodyTest[]>(`/api/v1/members/${memberId}/body-tests`);

export const createBodyTest = (memberId: string, data: CreateBodyTestData) =>
  request<BodyTest>(`/api/v1/members/${memberId}/body-tests`, {
    method: 'POST',
    body: JSON.stringify({ date: new Date().toISOString(), ...data }),
  });

export const deleteBodyTest = (memberId: string, testId: string) =>
  request<{ success: boolean }>(`/api/v1/members/${memberId}/body-tests/${testId}`, { method: 'DELETE' });

export const exportBodyTestsCsv = (memberId: string): string =>
  `/api/v1/members/${memberId}/body-tests/export`;
