import { request } from './client';

export interface Equipment {
  _id: string;
  name: string;
  status: string;
  brand: string | null;
  quantity: number;
  note: string | null;
  trackCondition: boolean;
}

export interface ConditionReport {
  _id: string;
  equipmentId: string;
  note: string;
  reportedAt: string;
}

export const fetchEquipment = () =>
  request<Equipment[]>('/api/v1/owner/equipment');

export const createEquipment = (data: {
  name: string;
  status?: string;
  brand?: string;
  quantity?: number;
  note?: string;
}) =>
  request<Equipment>('/api/v1/owner/equipment', { method: 'POST', body: JSON.stringify(data) });

export const fetchConditionReports = (equipmentId: string) =>
  request<ConditionReport[]>(`/api/v1/owner/equipment/${equipmentId}/condition-reports`);

export const addConditionReport = (equipmentId: string, data: { note: string }) =>
  request<ConditionReport>(`/api/v1/owner/equipment/${equipmentId}/condition-reports`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteEquipment = (id: string) =>
  request<{ success: boolean }>(`/api/v1/owner/equipment/${id}`, { method: 'DELETE' });
