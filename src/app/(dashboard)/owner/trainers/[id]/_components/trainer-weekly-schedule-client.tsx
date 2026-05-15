'use client';

interface DayBucket {
  label: string;
  count: number;
  isToday: boolean;
}

interface Props {
  days: DayBucket[];
  total: number;
}

export function TrainerWeeklyScheduleClient({ days, total }: Props) {
  const max = Math.max(...days.map((d) => d.count), 1);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-foreground/40 text-sm">
        No sessions scheduled this week
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 items-end h-16">
        {days.map((day) => {
          const heightPct = day.count === 0 ? 0 : Math.max(12, Math.round((day.count / max) * 100));
          return (
            <div key={day.label} className="flex flex-col items-center gap-1 flex-1">
              <span className={`text-[10px] font-bold tabular-nums ${day.count === 0 ? 'text-foreground/20' : day.isToday ? 'text-primary-light' : 'text-foreground/60'}`}>
                {day.count > 0 ? day.count : ''}
              </span>
              <div className="w-full bg-white/[.04] rounded-sm overflow-hidden" style={{ height: 36 }}>
                {day.count > 0 && (
                  <div
                    className={`w-full rounded-sm transition-all ${day.isToday ? 'bg-primary' : 'bg-primary/35'}`}
                    style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                  />
                )}
              </div>
              <span className={`text-[9px] font-medium ${day.isToday ? 'text-primary-light' : 'text-foreground/25'}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[9px] text-foreground/30 text-right">
        {total} session{total !== 1 ? 's' : ''} total this week
      </div>
    </div>
  );
}
