import { request, requestVoid } from './client';

const BASE = '/api/v1';

export interface InviteListItem {
  _id: string;
  token: string;
  role: 'trainer' | 'member';
  recipientEmail: string;
  expiresAt: string;
  usedAt: string | null;
  trainerId: string | null;
}

export interface CreateInvitePayload {
  email: string;
  role: 'trainer' | 'member';
  trainerId?: string;
}

export interface CreateInviteResult {
  inviteUrl: string;
}

export function fetchInvites(): Promise<InviteListItem[]> {
  return request<InviteListItem[]>(`${BASE}/owner/invites`);
}

export function createInvite(payload: CreateInvitePayload): Promise<CreateInviteResult> {
  return request<CreateInviteResult>(`${BASE}/owner/invites`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function revokeInvite(id: string): Promise<void> {
  return requestVoid(`${BASE}/owner/invites/${id}`, { method: 'DELETE' });
}

export function resendInvite(id: string): Promise<{ inviteUrl: string }> {
  return request<{ inviteUrl: string }>(`${BASE}/owner/invites/${id}/resend`, { method: 'POST' });
}
