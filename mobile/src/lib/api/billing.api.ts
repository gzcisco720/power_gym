import { apiClient } from './client';
import { MyBillingResponse, BillingSummaryResponse } from '../../types/billing';

export async function getMySummary(from: string, to: string): Promise<MyBillingResponse> {
  const response = await apiClient.get<MyBillingResponse>('/billing/my', {
    params: { from, to },
  });
  return response.data;
}

export async function getBillingSummary(from: string, to: string): Promise<BillingSummaryResponse> {
  const response = await apiClient.get<BillingSummaryResponse>('/billing/summary', {
    params: { from, to },
  });
  return response.data;
}

export async function getMemberBilling(
  memberId: string,
  from: string,
  to: string,
): Promise<MyBillingResponse> {
  const response = await apiClient.get<MyBillingResponse>(`/billing/members/${memberId}`, {
    params: { from, to },
  });
  return response.data;
}
