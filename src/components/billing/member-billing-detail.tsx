'use client';

import { useState, useEffect } from 'react';
import { BillingPeriodNav, type BillingPeriod } from './billing-period-nav';

interface BillingLine {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTypeName: string;
  price: number;
  currency: string;
}

interface BillingData {
  total: number;
  count: number;
  currency: string;
  lines: BillingLine[];
}

interface MemberBillingDetailProps {
  memberId: string;
}

function initialPeriod(): BillingPeriod {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    label: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
  };
}

export function MemberBillingDetail({ memberId }: MemberBillingDetailProps) {
  const [period, setPeriod] = useState<BillingPeriod>(initialPeriod);
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const from = period.from.toISOString();
    const to = period.to.toISOString();
    fetch(`/api/billing/member/${memberId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<BillingData>;
      })
      .then((json) => {
        setData(json ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [memberId, period]);

  function handlePeriodChange(p: BillingPeriod) {
    setLoading(true);
    setPeriod(p);
  }

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="flex items-center justify-between mb-6">
        <BillingPeriodNav onChange={handlePeriodChange} />
        {data && !loading && (
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-light">{data.currency} {data.total.toLocaleString()}</div>
            <div className="text-xs text-foreground/65 mt-0.5">{data.count} sessions completed</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : data && data.lines.length > 0 ? (
        <div className="space-y-0">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
            <span>Session</span><span>Amount</span>
          </div>
          {data.lines.map((line) => {
            const d = new Date(line.date);
            const dateLabel = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', weekday: 'short' });
            return (
              <div key={line.sessionId} className="grid grid-cols-[1fr_auto] gap-4 items-center px-3 py-2.5 border-b border-foreground/[.05] last:border-0">
                <div>
                  <span className="text-sm text-foreground/80">{dateLabel}</span>
                  <span className="text-xs text-foreground/65 ml-2">{line.startTime}–{line.endTime}</span>
                  <span className="text-xs text-foreground/65 ml-2">{line.serviceTypeName}</span>
                </div>
                <span className="text-sm font-semibold text-primary-light">{line.currency} {line.price.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-foreground/65 py-8 text-center">No completed sessions with a service type in this period.</p>
      )}
    </div>
  );
}
