import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { useMemberCheckInStore } from '@/stores/memberCheckInStore';
import type { CheckInRecord } from '@/api/check-ins';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDistanceAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

function avgWellnessScore(c: CheckInRecord): number {
  const sum =
    c.sleepQuality +
    c.energy +
    c.recovery +
    (10 - c.stress) +
    (10 - c.fatigue) +
    c.hunger +
    c.digestion;
  return Math.round((sum / 7) * 10) / 10;
}

const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
const DIET_COLOUR: Record<string, string> = {
  yes: 'bg-emerald-400/10 text-emerald-400',
  no: 'bg-red-400/10 text-red-400',
  partial: 'bg-amber-400/10 text-amber-400',
};

export function MemberCheckInHistoryPage() {
  const { checkIns, isLoading, fetchHistory } = useMemberCheckInStore();

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <div>
      <PageHeader
        title="Check-In History"
        subtitle={`${checkIns.length} total check-ins`}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto">
        <Link
          to="/member/check-in"
          className="text-sm text-foreground/65 hover:text-foreground mb-4 inline-block"
        >
          ← Back to dashboard
        </Link>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[52px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : checkIns.length === 0 ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-[15px] font-semibold">No check-ins yet</p>
            <p className="text-[13px] text-foreground/65 mt-1">Submit your first weekly check-in.</p>
            <div className="mt-4">
              <Link
                to="/member/check-in/new"
                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                New Check-In
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
            {checkIns.map((c) => (
              <Link
                key={c._id}
                to={`/member/check-in/${c._id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors last:border-b-0"
              >
                <div className="min-w-[80px]">
                  <div className="text-sm font-medium">{formatDate(c.submittedAt)}</div>
                  <div className="text-[10px] text-foreground/30">
                    {formatDistanceAgo(c.submittedAt)}
                  </div>
                </div>
                <div className="text-xs text-foreground/45">{avgWellnessScore(c)}/10</div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIET_COLOUR[c.stuckToDiet]}`}>
                    {DIET_LABEL[c.stuckToDiet]}
                  </span>
                  {c.weight !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/45">
                      {c.weight} kg
                    </span>
                  )}
                </div>
                <span className="text-foreground/20 text-sm">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
