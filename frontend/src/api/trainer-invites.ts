import { request, requestVoid } from './client';

const BASE = '/api/v1';

export interface TrainerInviteListItem {
  _id: string;
  token: string;
  recipientEmail: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface CreateTrainerInvitePayload {
  email: string;
}

export function fetchTrainerInvites(): Promise<TrainerInviteListItem[]> {
  return request<TrainerInviteListItem[]>(`${BASE}/trainer/invites`);
}

export function createTrainerInvite(
  payload: CreateTrainerInvitePayload,
): Promise<{ inviteUrl: string }> {
  return request<{ inviteUrl: string }>(`${BASE}/trainer/invites`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, role: 'member' }),
  });
}

export function revokeTrainerInvite(id: string): Promise<void> {
  return requestVoid(`${BASE}/trainer/invites/${id}`, { method: 'DELETE' });
}

export function resendTrainerInvite(id: string): Promise<{ inviteUrl: string }> {
  return request<{ inviteUrl: string }>(`${BASE}/trainer/invites/${id}/resend`, {
    method: 'POST',
  });
}
