import { request } from './client';

export interface Injury {
  _id: string;
  memberId: string;
  title: string;
  status: string;
  recordedAt: string;
  bodyPart: string | null;
  trainerNotes: string | null;
  resolvedAt: string | null;
}

export interface Medication {
  _id: string;
  memberId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
}

export interface MedicalHistory {
  memberId: string;
  conditions: string[];
  allergies: string[];
  notes: string | null;
}

export const fetchInjuries = (memberId: string) =>
  request<Injury[]>(`/api/v1/members/${memberId}/injuries`);

export const createInjury = (
  memberId: string,
  data: { title: string; bodyPart?: string; trainerNotes?: string; recordedAt?: string },
) =>
  request<Injury>(`/api/v1/members/${memberId}/injuries`, { method: 'POST', body: JSON.stringify(data) });

export const fetchMedicalHistory = (memberId: string) =>
  request<MedicalHistory>(`/api/v1/members/${memberId}/medical-history`);

export const fetchMedications = (memberId: string) =>
  request<Medication[]>(`/api/v1/members/${memberId}/medications`);
