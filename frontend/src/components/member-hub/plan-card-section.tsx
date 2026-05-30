import { Link } from 'react-router-dom';
import type { PlanCard } from '@/api/member-hub';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatAssignedDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface PlanCardSectionProps {
  planCard: PlanCard | null;
  planHref: string;
}

export function PlanCardSection({ planCard, planHref }: PlanCardSectionProps) {
  if (!planCard) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/15 bg-card/50 p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/30 mb-1.5">
            Active Plan
          </div>
          <div className="text-sm text-foreground/40">No active training plan</div>
        </div>
        <Link
          to={planHref}
          className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
        >
          Assign Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/[.18] bg-primary/[.08] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-primary-light mb-2">
        Active Plan
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[17px] font-bold text-foreground leading-tight truncate">
            {planCard.name}
          </div>
          <div className="text-[12px] text-foreground/45 mt-1">
            {planCard.days.length} day plan
            <span className="mx-1.5 text-foreground/20" aria-hidden="true">·</span>
            Assigned {formatAssignedDate(planCard.assignedAt)}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={planHref}
            className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Log Workout
          </Link>
          <Link
            to={planHref}
            className="text-[12px] text-foreground/40 hover:text-foreground/65 transition-colors whitespace-nowrap"
          >
            Change Plan
          </Link>
        </div>
      </div>

      {planCard.recentSessions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/[.12]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/35 mb-2">
            Recent Sessions
          </div>
          <div className="space-y-1.5">
            {planCard.recentSessions.map((s) => (
              <div key={`${s.dayName}-${s.completedAt}`} className="flex items-center justify-between">
                <span className="text-[13px] text-foreground/80">{s.dayName}</span>
                <span className="text-[12px] text-foreground/40">{formatSessionDate(s.completedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
