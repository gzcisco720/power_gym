import { useEffect, useReducer, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { request } from '@/api/client';
import { PageHeader } from '@/components/shared/page-header';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionEntry {
  _id: string;
  date: string;
  serviceTypeName: string;
  trainerName: string;
  fee: number;
  currency: string;
}

interface MemberBillingData {
  sessions: SessionEntry[];
  totalAmount: number;
  currency: string;
}

// ─── Period nav ───────────────────────────────────────────────────────────────

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
    setMonth(newMonth);
    setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }

  function next() {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={prev}
        className="p-1 rounded hover:bg-muted transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4 text-foreground/65" />
      </button>
      <span className="text-sm font-medium text-foreground min-w-[100px] text-center">
        {period.label}
      </span>
      <button
        type="button"
        onClick={next}
        className="p-1 rounded hover:bg-muted transition-colors"
        aria-label="Next month"
      >
        <ChevronRight className="size-4 text-foreground/65" />
      </button>
    </div>
  );
}

// ─── State ────────────────────────────────────────────────────────────────────

interface BillingState {
  data: MemberBillingData | null;
  isLoading: boolean;
}

type BillingAction =
  | { type: 'LOADED'; data: MemberBillingData }
  | { type: 'SET_LOADING' };

function billingReducer(state: BillingState, action: BillingAction): BillingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true };
    case 'LOADED':
      return { data: action.data, isLoading: false };
    default:
      return state;
  }
}

// ─── MemberBillingPage ────────────────────────────────────────────────────────

const BASE = '/api/v1';

async function fetchMemberBilling(
  memberId: string,
  from: string,
  to: string,
): Promise<MemberBillingData> {
  return request<MemberBillingData>(
    `${BASE}/billing/member/${memberId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export function MemberBillingPage() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<BillingPeriod>(() => {
    const now = new Date();
    return getMonthPeriod(now.getFullYear(), now.getMonth());
  });
  const [state, dispatch] = useReducer(billingReducer, { data: null, isLoading: true });

  useEffect(() => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING' });
    fetchMemberBilling(user.id, period.from.toISOString(), period.to.toISOString())
      .then((data) => dispatch({ type: 'LOADED', data }))
      .catch(() => dispatch({ type: 'LOADED', data: { sessions: [], totalAmount: 0, currency: 'USD' } }));
  }, [user, period]);

  return (
    <div>
      <PageHeader
        title="My Billing"
        subtitle="Sessions completed and amounts due"
        actions={
          <BillingPeriodNav
            onChange={(p) => {
              dispatch({ type: 'SET_LOADING' });
              setPeriod(p);
            }}
          />
        }
      />

      <div className="px-4 sm:px-8 py-7">
        {state.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : state.data && state.data.sessions.length > 0 ? (
          <div>
            <div className="space-y-1.5">
              {state.data.sessions.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.serviceTypeName}</p>
                    <p className="text-xs text-foreground/65">
                      {new Date(s.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {s.trainerName}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary-light shrink-0 ml-4">
                    {s.currency} {s.fee.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-foreground/[.06]">
              <span className="text-sm text-foreground/65 mr-3">Total</span>
              <span className="text-base font-bold text-primary-light">
                {state.data.currency} {state.data.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/65 py-8 text-center">
            No completed sessions with a service type in this period.
          </p>
        )}
      </div>
    </div>
  );
}
