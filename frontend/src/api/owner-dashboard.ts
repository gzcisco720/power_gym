import { request } from './client';

export interface DashboardStats {
  trainerCount: number;
  memberCount: number;
  pendingInviteCount: number;
  expiringSoonCount: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
  sessionsToday: number;
  membersThisMonth: number;
  checkInsThisWeek: number;
  checkInsLastWeek: number;
}

export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

export interface EquipmentItem {
  _id: string;
  name: string;
  status: EquipmentStatus;
  note: string | null;
  nextServiceDate: string | null;
}

export interface EquipmentStatusResult {
  active: number;
  maintenance: number;
  retired: number;
  overdue: number;
  items: EquipmentItem[];
}

export interface TrainerBreakdownRow {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  memberCount: number;
  sessionsThisMonth: number;
}

export interface MemberGrowthBucket {
  label: string;
  newCount: number;
}

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`;

export function fetchStats(): Promise<DashboardStats> {
  return request<DashboardStats>(`${BASE}/owner/stats`);
}

export function fetchEquipmentStatus(): Promise<EquipmentStatusResult> {
  return request<EquipmentStatusResult>(`${BASE}/owner/equipment-status`);
}

export function fetchTrainerBreakdown(): Promise<TrainerBreakdownRow[]> {
  return request<TrainerBreakdownRow[]>(`${BASE}/owner/trainer-breakdown`);
}

export function fetchMemberGrowth(): Promise<MemberGrowthBucket[]> {
  return request<MemberGrowthBucket[]>(`${BASE}/owner/member-growth`);
}
