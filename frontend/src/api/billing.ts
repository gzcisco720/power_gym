import { request } from './client';

export interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  note: string | null;
  isActive: boolean;
  createdBy: string;
}

export interface BillingLine {
  _id: string;
  memberId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  pricePerSession: number;
  sessionDate: string;
  notes?: string;
}

export const fetchActiveServiceTypes = () =>
  request<{ serviceTypes: ServiceType[] }>('/api/v1/service-types/active');

export const createServiceType = (data: {
  name: string;
  durationMin: number;
  pricePerSession: number;
  note?: string;
}) =>
  request<{ serviceType: ServiceType }>('/api/v1/service-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteServiceType = (id: string) =>
  request<{ success: boolean }>(`/api/v1/service-types/${id}`, { method: 'DELETE' });

export const fetchMemberBilling = (memberId: string, from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request<{ transactions: BillingLine[] }>(`/api/v1/billing/member/${memberId}?${params}`);
};
