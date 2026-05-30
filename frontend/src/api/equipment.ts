import { request, requestVoid } from './client';

const BASE = '/api/v1';

export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

export interface EquipmentItem {
  _id: string;
  name: string;
  status: EquipmentStatus;
  brand: string | null;
  quantity: number;
  images: string[];
  note: string | null;
  trackCondition: boolean;
  nextServiceDate: string | null;
}

export interface EquipmentPayload {
  name: string;
  status?: EquipmentStatus;
  brand?: string | null;
  quantity?: number;
  images?: string[];
  note?: string | null;
  trackCondition?: boolean;
  nextServiceDate?: string | null;
}

export interface ConditionReport {
  _id: string;
  note: string;
  reportedAt: string;
}

export function fetchEquipment(): Promise<EquipmentItem[]> {
  return request<EquipmentItem[]>(`${BASE}/owner/equipment`);
}

export function fetchEquipmentById(id: string): Promise<EquipmentItem> {
  return request<EquipmentItem>(`${BASE}/owner/equipment/${id}`);
}

export function createEquipment(payload: EquipmentPayload): Promise<EquipmentItem> {
  return request<EquipmentItem>(`${BASE}/owner/equipment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEquipment(id: string, payload: Partial<EquipmentPayload>): Promise<EquipmentItem> {
  return request<EquipmentItem>(`${BASE}/owner/equipment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteEquipmentItem(id: string): Promise<void> {
  return requestVoid(`${BASE}/owner/equipment/${id}`, { method: 'DELETE' });
}

export function fetchConditionReports(id: string): Promise<ConditionReport[]> {
  return request<ConditionReport[]>(`${BASE}/owner/equipment/${id}/condition-reports`);
}

export function addConditionReport(id: string, note: string): Promise<ConditionReport> {
  return request<ConditionReport>(`${BASE}/owner/equipment/${id}/condition-reports`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}
