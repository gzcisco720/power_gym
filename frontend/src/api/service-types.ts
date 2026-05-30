import { request, requestVoid } from './client';

export interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  note: string | null;
  isActive: boolean;
}

export interface ServiceTypePayload {
  name: string;
  durationMin: number;
  pricePerSession: number;
  note: string | null;
}

const BASE = '/api/v1';

export async function fetchServiceTypes(): Promise<ServiceType[]> {
  const data = await request<{ serviceTypes: ServiceType[] }>(`${BASE}/service-types`);
  return data.serviceTypes;
}

export async function fetchActiveServiceTypes(): Promise<ServiceType[]> {
  const data = await request<{ serviceTypes: ServiceType[] }>(`${BASE}/service-types/active`);
  return data.serviceTypes;
}

export async function createServiceType(payload: ServiceTypePayload): Promise<ServiceType> {
  return request<ServiceType>(`${BASE}/service-types`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateServiceType(
  id: string,
  payload: Partial<ServiceTypePayload & { isActive: boolean }>,
): Promise<ServiceType> {
  return request<ServiceType>(`${BASE}/service-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteServiceType(id: string): Promise<void> {
  return requestVoid(`${BASE}/service-types/${id}`, { method: 'DELETE' });
}
