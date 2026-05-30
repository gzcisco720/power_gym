import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchBilling } from '@/api/billing';
import type { BillingSummary } from '@/api/billing';
import { PageHeader } from '@/components/shared/page-header';

interface BillingPeriod {
  from: Date;
  to: Date;
  label: string;
}

function getMonthPeriod(year: number, month: number): BillingPeriod {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  return { from, to, label };
}

function BillingPeriodNav({ onChange }: { onChange: (period: BillingPeriod) => void }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const period = getMonthPeriod(year, month);

  function prev() {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth); setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }
  function next() {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth); setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={prev} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Previous month">
        <ChevronLeft className="size-4 text-foreground/65" />
      </button>
      <span className="text-sm font-medium text-foreground min-w-[100px] text-center">{period.label}</span>
      <button type="button" onClick={next} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Next month">
        <ChevronRight className="size-4 text-foreground/65" />
      </button>
    </div>
  );
}

export function OwnerBillingPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<BillingPeriod>(() => {
    const now = new Date();
    return getMonthPeriod(now.getFullYear(), now.getMonth());
  });
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchBilling(period.from.toISOString(), period.to.toISOString())
      .then((d) => { setData(d); setLoading(false); })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') setLoading(false);
      });
    return () => controller.abort();
  }, [period]);

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Completed sessions with a service type"
        actions={<BillingPeriodNav onChange={(p) => { setLoading(true); setPeriod(p); }} />}
      />

      <div className="px-4 sm:px-8 py-7">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : data && data.members.length > 0 ? (
          <div>
            <div className="grid gap-3 px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold grid-cols-[1fr_80px_90px_80px]">
              <span>Member</span>
              <span>Trainer</span>
              <span>Sessions</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="space-y-1.5">
              {data.members.map((m) => (
                <button
                  type="button"
                  key={m.memberId}
                  className="grid gap-3 items-center px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all cursor-pointer text-left w-full grid-cols-[1fr_80px_90px_80px]"
                  onClick={() => void navigate(`/owner/members/${m.memberId}/billing`)}
                >
                  <span className="text-sm font-medium text-foreground">{m.name}</span>
                  <span className="text-xs text-foreground/65">{m.trainerName}</span>
                  <span className="text-xs text-foreground/65">{m.sessionsCount} sessions</span>
                  <span className="text-sm font-semibold text-primary-light text-right">
                    {m.currency} {(m.totalAmount ?? 0).toLocaleString()}
                  </span>
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
    </div>
  );
}
