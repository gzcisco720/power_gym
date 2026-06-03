import { apiClient } from './client';
import { Member, MemberOverview } from '../../types/members';
import { BodyTest } from '../../types/body-tests';
import { Injury, Medication } from '../../types/health';

export async function fetchMembers(): Promise<Member[]> {
  const response = await apiClient.get<Member[]>('/members');
  return response.data;
}

export async function fetchMemberOverview(id: string): Promise<MemberOverview> {
  const response = await apiClient.get<MemberOverview>(`/members/${id}/overview`);
  return response.data;
}

export async function fetchMemberBodyTests(id: string): Promise<BodyTest[]> {
  const response = await apiClient.get<BodyTest[]>(`/members/${id}/body-tests`);
  return response.data;
}

export async function fetchMemberInjuries(id: string): Promise<Injury[]> {
  const response = await apiClient.get<Injury[]>(`/members/${id}/injuries`);
  return response.data;
}

export async function fetchMemberMedications(id: string): Promise<Medication[]> {
  const response = await apiClient.get<Medication[]>(`/members/${id}/medications`);
  return response.data;
}
