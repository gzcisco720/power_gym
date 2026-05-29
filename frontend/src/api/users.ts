import { request } from './client';

export interface Member {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'member';
  trainerId: string | null;
  trainerName?: string;
  createdAt: string;
}

export interface Trainer {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'trainer';
  createdAt: string;
}

export interface Invite {
  _id: string;
  token: string;
  role: string;
  recipientEmail: string;
  expiresAt: string;
  usedAt: string | null;
  trainerId: string | null;
  invitedBy: string;
}

export interface OwnerStats {
  memberCount: number;
  trainerCount: number;
  pendingInviteCount: number;
  membersByMonth: { label: string; newCount: number }[];
}

export const fetchOwnerMembers = (trainerId?: string) =>
  request<Member[]>(`/api/v1/owner/members${trainerId ? `?trainerId=${trainerId}` : ''}`);

export const fetchOwnerTrainers = () =>
  request<Trainer[]>('/api/v1/owner/trainers');

export const assignTrainer = (memberId: string, trainerId: string) =>
  request<Member>(`/api/v1/owner/members/${memberId}/trainer`, {
    method: 'PATCH',
    body: JSON.stringify({ trainerId }),
  });

export const fetchOwnerStats = () =>
  request<OwnerStats>('/api/v1/owner/stats');

export const fetchOwnerInvites = () =>
  request<Invite[]>('/api/v1/owner/invites');

export const createInvite = (data: { recipientEmail: string; role: string; trainerId?: string }) =>
  request<{ token: string }>('/api/v1/invites', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const revokeOwnerInvite = (id: string) =>
  request<{ success: boolean }>(`/api/v1/owner/invites/${id}`, { method: 'DELETE' });

export const fetchMembers = (trainerId?: string) =>
  request<Member[]>(`/api/v1/members${trainerId ? `?trainerId=${trainerId}` : ''}`);

export const fetchMember = (id: string) =>
  request<Member>(`/api/v1/members/${id}`);
