'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SessionDto } from './types';

interface Props {
  sessions: SessionDto[];
  defaultOpen?: boolean;
}

export function MemberScheduleHistory({ sessions, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (sessions.length === 0) return null;

  return (
    <div className="pt-3 border-t border-foreground/[.06]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-foreground/65 hover:text-foreground/80 transition-colors cursor-pointer"
      >
        {open ? '▾ Hide history' : `▸ Show history (${sessions.length})`}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {sessions.map((s) => {
            const d = new Date(s.date);
            const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const isCancelled = s.status === 'cancelled';
            return (
              <div key={s._id} className="flex gap-3 items-start opacity-50">
                <div className="mt-1.5 shrink-0">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isCancelled ? 'bg-destructive/30' : 'bg-foreground/30',
                    )}
                  />
                </div>
                <div>
                  <div className="text-[13px] text-foreground">{label}</div>
                  <div
                    className={cn(
                      'text-[11px]',
                      isCancelled ? 'text-destructive/60' : 'text-foreground/65',
                    )}
                  >
                    {isCancelled
                      ? 'Cancelled'
                      : `${s.startTime} – ${s.endTime} · ${s.trainerName}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
