import type { WorkoutSession } from '@/api/training';

interface Props {
  sessions: WorkoutSession[];
  today?: Date;
}

/** Returns midnight UTC for the given date (strips hours/minutes/seconds). */
function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function ActivityStrip({ sessions, today = new Date() }: Props) {
  const todayMs = utcDayStart(today);

  // Build 14-day boolean array (index 0 = 13 days ago, index 13 = today)
  const last14Days: boolean[] = Array.from({ length: 14 }, (_, i) => {
    const daysBack = 13 - i;
    const dayStartMs = todayMs - daysBack * 86_400_000;
    const dayEndMs = dayStartMs + 86_400_000;
    return sessions.some((s) => {
      if (!s.completedAt) return false;
      const t = new Date(s.completedAt).getTime();
      return t >= dayStartMs && t < dayEndMs;
    });
  });

  const filledCount = last14Days.filter(Boolean).length;

  // Count completed sessions this month (UTC)
  const monthStartMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1);
  const sessionCount = sessions.filter((s) => {
    if (!s.completedAt) return false;
    return new Date(s.completedAt).getTime() >= monthStartMs;
  }).length;

  if (filledCount === 0) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
              Last 14 days
            </span>
            <div className="flex gap-[3px]">
              {last14Days.map((_, i) => (
                <div
                  key={i}
                  data-dot="empty"
                  className="size-3 rounded-[3px] bg-foreground/5"
                />
              ))}
            </div>
          </div>
          <div className="text-[11px] text-foreground/65">
            Build a streak. Log today.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
          Last 14 days
        </span>
        <div className="flex gap-[3px]">
          {last14Days.map((on, i) => (
            <div
              key={i}
              data-dot={on ? 'filled' : 'empty'}
              className={`size-3 rounded-[3px] ${on ? 'bg-emerald-500/65' : 'bg-foreground/5'}`}
            />
          ))}
        </div>
      </div>
      <div className="text-[11px] tabular-nums text-foreground/65">
        <span className="text-foreground font-semibold">{sessionCount}</span>{' '}
        <span>sessions this month</span>
      </div>
    </div>
  );
}
