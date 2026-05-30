'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BillingPeriodNav, type BillingPeriod } from './billing-period-nav';

interface MemberBilling {
  memberId: string;
  name: string;
  trainerName: string;
  sessionsCount: number;
  totalAmount: number;
  currency: string;
}

interface SummaryData {
  members: MemberBilling[];
  grandTotal: number;
  currency: string;
}

interface BillingSummaryClientProps {
  userRole: 'owner' | 'trainer';
  memberHubBase: string;
}

function initialPeriod(): BillingPeriod {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    label: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
  };
}

interface FetchState {
  data: SummaryData | null;
  loading: boolean;
}

export function BillingSummaryClient({ userRole, memberHubBase }: BillingSummaryClientProps) {
  const { push } = useRouter();
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [period, setPeriod] = useState<BillingPeriod>(initialPeriod);
  const [fetchState, setFetchState] = useState<FetchState>({ data: null, loading: true });

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();
    const from = period.from.toISOString();
    const to = period.to.toISOString();
    fetch(`/api/billing?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<SummaryData>;
      })
      .then((json) => {
        setFetchState({ data: json ?? null, loading: false });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setFetchState((s) => ({ ...s, loading: false }));
        }
      });
    return () => controller.abort();
  }, [period]);

  function handlePeriodChange(p: BillingPeriod) {
    setFetchState((s) => ({ ...s, loading: true }));
    setPeriod(p);
  }

  const { data, loading } = fetchState;

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Billing</h1>
          <p className="text-xs text-foreground/65 mt-0.5">Completed sessions with a service type</p>
        </div>
        <BillingPeriodNav onChange={handlePeriodChange} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : data && data.members.length > 0 ? (
        <div>
          <div className={`grid gap-3 px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold ${userRole === 'owner' ? 'grid-cols-[1fr_80px_90px_80px]' : 'grid-cols-[1fr_90px_80px]'}`}>
            <span>Member</span>
            {userRole === 'owner' && <span>Trainer</span>}
            <span>Sessions</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="space-y-1.5">
            {data.members.map((m) => (
              <button
                type="button"
                key={m.memberId}
                className={`grid gap-3 items-center px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all cursor-pointer text-left w-full ${userRole === 'owner' ? 'grid-cols-[1fr_80px_90px_80px]' : 'grid-cols-[1fr_90px_80px]'}`}
                onClick={() => push(`${memberHubBase}/${m.memberId}/billing`)}
              >
                <span className="text-sm font-medium text-foreground">{m.name}</span>
                {userRole === 'owner' && <span className="text-xs text-foreground/65">{m.trainerName}</span>}
                <span className="text-xs text-foreground/65">{m.sessionsCount} sessions</span>
                <span className="text-sm font-semibold text-primary-light text-right">{m.currency} {(m.totalAmount ?? 0).toLocaleString()}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-foreground/[.06]">
            <span className="text-sm text-foreground/65 mr-3">Total</span>
            <span className="text-base font-bold text-primary-light">{data.currency} {data.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/65 py-8 text-center">No completed sessions with a service type in this period.</p>
      )}
    </div>
  );
}
