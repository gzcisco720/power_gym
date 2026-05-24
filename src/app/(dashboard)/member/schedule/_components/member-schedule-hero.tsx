import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import type { SessionDto } from './types';
import { daysUntil } from './member-schedule-hero.utils';

interface Props {
  session: SessionDto | null;
}

export function MemberScheduleHero({ session }: Props) {
  if (!session) {
    return (
      <EmptyState
        heading="No upcoming sessions"
        description="Your trainer hasn't scheduled any sessions yet."
      />
    );
  }

  const days = daysUntil(session.date);
  const isToday = days === 0;
  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const groupLabel = session.memberCount > 1 ? `Group (${session.memberCount})` : '1-on-1';

  return (
    <div
      className={cn(
        'rounded-xl p-4 bg-primary/[.07]',
        isToday ? 'ring-1 ring-primary/40' : 'ring-1 ring-primary/[.16]',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-light">
          {isToday ? "Today's Session" : 'Next Session'}
        </span>
        <span
          className={cn(
            'text-[11px] rounded px-2 py-0.5',
            isToday
              ? 'bg-primary/[.20] text-primary-light font-semibold'
              : 'bg-primary/[.12] text-primary-light',
          )}
        >
          {isToday ? 'Today' : `in ${days} day${days === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="text-[18px] font-bold text-foreground">{dateLabel}</div>
      <div className="text-[13px] text-foreground/65 mt-1">
        {session.startTime} – {session.endTime}
      </div>
      <div className="text-[12px] text-foreground/65 mt-1">
        {session.trainerName} · {groupLabel}
      </div>
      {session.isRecurring && (
        <span className="inline-block mt-3 text-[10px] bg-primary/[.12] text-primary-light rounded px-2 py-0.5 border border-primary/[.16]">
          ↺ Recurring
        </span>
      )}
    </div>
  );
}
