import { cn } from '@/lib/utils';
import type { SessionDto } from './types';

interface Props {
  sessions: SessionDto[];
  heroIsToday: boolean;
}

export function MemberScheduleTimeline({ sessions, heroIsToday }: Props) {
  if (sessions.length === 0) return null;

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
        {heroIsToday ? '接下来' : '即将到来'}
      </div>
      <div>
        {sessions.map((s, i) => {
          const d = new Date(s.date);
          const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const isLast = i === sessions.length - 1;
          return (
            <div key={s._id} className="flex gap-3 items-start">
              <div className="flex flex-col items-center mt-1.5">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    isLast && sessions.length > 1 ? 'bg-primary/50' : 'bg-primary',
                  )}
                />
                {!isLast && (
                  <div className="w-px flex-1 bg-foreground/[.05] mt-1 min-h-[18px]" />
                )}
              </div>
              <div className="pb-3">
                <div className="text-[13px] font-semibold text-foreground">{label}</div>
                <div className="text-[11px] text-foreground/65">
                  {s.startTime} – {s.endTime} · {s.trainerName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
