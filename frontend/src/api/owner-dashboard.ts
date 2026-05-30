import { request } from './client';

export interface DashboardStats {
  trainerCount: number;
  memberCount: number;
  pendingInviteCount: number;
  sessionsThisMonth: number;
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

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`;

export function fetchStats(): Promise<DashboardStats> {
  return request<DashboardStats>(`${BASE}/owner/stats`);
}

export function fetchEquipmentStatus(): Promise<EquipmentStatusResult> {
  return request<EquipmentStatusResult>(`${BASE}/owner/equipment-status`);
}
