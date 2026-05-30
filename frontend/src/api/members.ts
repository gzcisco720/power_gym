import { request, requestVoid } from './client';

const BASE = '/api/v1';

export interface MemberListItem {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  createdAt: string;
}

export function fetchMembers(trainerId?: string): Promise<MemberListItem[]> {
  const qs = trainerId ? `?trainerId=${encodeURIComponent(trainerId)}` : '';
  return request<MemberListItem[]>(`${BASE}/owner/members${qs}`);
}

/** Returns members assigned to the currently authenticated trainer. */
export function fetchTrainerMembers(): Promise<MemberListItem[]> {
  return request<MemberListItem[]>(`${BASE}/members`);
}

export function reassignTrainer(memberId: string, trainerId: string | null): Promise<void> {
  return requestVoid(`${BASE}/owner/members/${memberId}/trainer`, {
    method: 'PATCH',
    body: JSON.stringify({ trainerId }),
  });
}
