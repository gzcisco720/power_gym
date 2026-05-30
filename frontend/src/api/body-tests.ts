import { request, requestVoid } from './client';

export interface BodyTestRecord {
  _id: string;
  date: string;
  protocol: '3site' | '7site' | '9site' | 'other';
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

export interface BodyTestPayload {
  protocol: '3site' | '7site' | '9site' | 'other';
  sex: 'male' | 'female';
  age: number;
  weight: number;
  date: string;
  targetWeight?: number | null;
  targetBodyFatPct?: number | null;
  bodyFatPct?: number;
  chest?: number;
  abdominal?: number;
  thigh?: number;
  tricep?: number;
  suprailiac?: number;
  subscapular?: number;
  midaxillary?: number;
  bicep?: number;
  lumbar?: number;
}

const BASE = '/api/v1';

export async function fetchBodyTests(memberId: string): Promise<BodyTestRecord[]> {
  const data = await request<{ bodyTests: BodyTestRecord[] }>(`${BASE}/members/${memberId}/body-tests`);
  return data.bodyTests;
}

export async function createBodyTest(memberId: string, payload: BodyTestPayload): Promise<BodyTestRecord> {
  return request<BodyTestRecord>(`${BASE}/members/${memberId}/body-tests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteBodyTest(memberId: string, testId: string): Promise<void> {
  return requestVoid(`${BASE}/members/${memberId}/body-tests/${testId}`, { method: 'DELETE' });
}

export function bodyTestExportUrl(memberId: string): string {
  return `${BASE}/members/${memberId}/body-tests/export`;
}
