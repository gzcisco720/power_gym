export type Protocol = '3site' | '7site' | '9site' | 'other';
export type Sex = 'male' | 'female';

export interface BodyTest {
  _id: string;
  memberId: string;
  trainerId: string | null;
  date: string; // ISO date string
  age: number;
  sex: Sex;
  weight: number;
  protocol: Protocol;
  tricep: number | null;
  chest: number | null;
  subscapular: number | null;
  abdominal: number | null;
  suprailiac: number | null;
  thigh: number | null;
  midaxillary: number | null;
  bicep: number | null;
  lumbar: number | null;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
  createdAt: string;
}

export interface CreateBodyTestDto {
  date: string;
  age: number;
  sex: Sex;
  weight: number;
  protocol: Protocol;
  tricep?: number;
  chest?: number;
  subscapular?: number;
  abdominal?: number;
  suprailiac?: number;
  thigh?: number;
  midaxillary?: number;
  bicep?: number;
  lumbar?: number;
  bodyFatPct?: number; // required when protocol='other'
  targetWeight?: number;
  targetBodyFatPct?: number;
}

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  '3site': '3-Site · Jackson-Pollock',
  '7site': '7-Site · Jackson-Pollock',
  '9site': '9-Site · Parrillo',
  other: 'Manual Entry',
};
