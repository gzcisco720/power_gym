import { request } from './client';

export interface MemberBilling {
  memberId: string;
  name: string;
  trainerName: string;
  sessionsCount: number;
  totalAmount: number;
  currency: string;
}

export interface BillingSummary {
  members: MemberBilling[];
  grandTotal: number;
  currency: string;
}

const BASE = '/api/v1';

export async function fetchBilling(from: string, to: string): Promise<BillingSummary> {
  return request<BillingSummary>(
    `${BASE}/billing?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}
