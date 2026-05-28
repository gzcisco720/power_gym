export interface BillingSession {
  _id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  serviceType: { _id: string; name: string; pricePerSession: number; currency: string } | null;
}

export interface BillingLine {
  sessionId: string;
  date: Date;
  startTime: string;
  endTime: string;
  serviceTypeName: string;
  price: number;
  currency: string;
}

export interface BillingResult {
  total: number;
  count: number;
  currency: string;
  lines: BillingLine[];
}

export function calculateMemberBilling(sessions: BillingSession[], now: Date): BillingResult {
  const lines: BillingLine[] = [];

  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    if (!s.serviceType) continue;
    if (s.date >= now) continue;

    lines.push({
      sessionId: s._id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      serviceTypeName: s.serviceType.name,
      price: s.serviceType.pricePerSession,
      currency: s.serviceType.currency,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.price, 0);
  const currency = lines[0]?.currency ?? 'AUD';

  return { total, count: lines.length, currency, lines };
}
