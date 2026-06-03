export interface BillingLine {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTypeName: string;
  price: number;
  currency: string;
}

export interface MyBillingResponse {
  memberId: string;
  from: string;
  to: string;
  total: number;
  count: number;
  currency: string;
  lines: BillingLine[];
}

export interface MemberSummary {
  memberId: string;
  name: string;
  trainerName: string;
  sessionsCount: number;
  totalAmount: number;
  currency: string;
}

export interface BillingSummaryResponse {
  members: MemberSummary[];
  grandTotal: number;
  currency: string;
}

export interface BillingPeriod {
  from: Date;
  to: Date;
  label: string;
}
