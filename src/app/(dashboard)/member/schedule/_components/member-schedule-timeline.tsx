'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SessionDto } from './types';

const WINDOW_DAYS = 14;

interface Props {
  sessions: SessionDto[];
  heroIsToday: boolean;
}

export function MemberScheduleTimeline({ sessions, heroIsToday }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (sessions.length === 0) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + WINDOW_DAYS);

  const initial = sessions.filter((s) => new Date(s.date) <= cutoff);
  const extra = sessions.filter((s) => new Date(s.date) > cutoff);
  const visible = showAll ? sessions : initial;
  const hiddenCount = extra.length;

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
        {heroIsToday ? 'Coming Up' : 'Upcoming'}
      </div>
      <div>
        {visible.map((s, i) => {
          const d = new Date(s.date);
          const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const isLast = i === visible.length - 1 && (showAll || hiddenCount === 0);
          return (
            <div key={s._id} className="flex gap-3 items-start">
              <div className="flex flex-col items-center mt-1.5">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    isLast && visible.length > 1 ? 'bg-primary/50' : 'bg-primary',
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
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[12px] text-foreground/65 hover:text-foreground/80 transition-colors cursor-pointer mt-1"
        >
          ▸ Load more ({hiddenCount} more)
        </button>
      )}
    </div>
  );
}
