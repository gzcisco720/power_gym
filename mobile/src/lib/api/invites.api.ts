import { apiClient } from './client';
import { Invite, CreateInviteDto, TrainerOption } from '../../types/invites';

export async function fetchInvites(): Promise<Invite[]> {
  const response = await apiClient.get<Invite[]>('/invites');
  return response.data;
}

export async function fetchTrainerOptions(): Promise<TrainerOption[]> {
  const response = await apiClient.get<TrainerOption[]>('/invites/trainers');
  return response.data;
}

export async function createInvite(dto: CreateInviteDto): Promise<Invite> {
  const response = await apiClient.post<Invite>('/invites', dto);
  return response.data;
}

export async function revokeInvite(id: string): Promise<void> {
  await apiClient.delete(`/invites/${id}`);
}
