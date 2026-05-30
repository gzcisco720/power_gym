import { request, requestVoid } from './client';

export interface UserProfile {
  mobile: string | null;
  address: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  certifications: string[];
  gymInfo: GymInfo | null;
}

export interface GymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  logoUrl: string | null;
  loginLogoUrl: string | null;
}

export interface ProfilePayload {
  mobile?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  certifications?: string[];
  gymInfo?: GymInfo | null;
}

const BASE = '/api/v1';

export async function fetchProfile(): Promise<UserProfile> {
  return request<UserProfile>(`${BASE}/profile`);
}

export async function saveProfile(payload: ProfilePayload): Promise<UserProfile> {
  return request<UserProfile>(`${BASE}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function saveGymInfo(payload: GymInfo): Promise<void> {
  return requestVoid(`${BASE}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ gymInfo: payload }),
  });
}
