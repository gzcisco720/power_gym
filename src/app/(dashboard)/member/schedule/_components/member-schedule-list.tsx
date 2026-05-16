'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SessionDto {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  trainerName: string;
  memberCount: number;
  status: 'scheduled' | 'cancelled';
  isRecurring: boolean;
}

interface MemberScheduleListProps {
  upcoming: SessionDto[];
  history: SessionDto[];
}

function SessionRow({ s, muted }: { s: SessionDto; muted?: boolean }) {
  const d = new Date(s.date);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div
      className={cn(
        'bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl px-4 py-3 flex items-center justify-between gap-3',
        muted && 'opacity-50',
      )}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-foreground truncate">
          {label} · {s.startTime}–{s.endTime}
          {s.isRecurring && <span className="ml-2 text-[10px] text-primary-light">↺ recurring</span>}
        </div>
        <div className="text-[11px] text-foreground/65 mt-0.5">
          {s.trainerName}{s.memberCount > 1 ? ` · Group (${s.memberCount})` : ''}
        </div>
      </div>
      {s.status === 'cancelled' && (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[.06em] text-destructive">
          Cancelled
        </span>
      )}
    </div>
  );
}

export function MemberScheduleList({ upcoming, history }: MemberScheduleListProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="px-4 sm:px-8 py-6 space-y-3">
      {upcoming.length === 0 && (
        <p className="text-[12px] text-foreground/65 py-4">No upcoming sessions.</p>
      )}
      {upcoming.map((s) => <SessionRow key={s._id} s={s} />)}

      {history.length > 0 && (
        <div className="pt-2">
          <button
            className="text-[12px] text-foreground/65 hover:text-foreground/80 transition-colors"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? '▾ Hide history' : `▸ Show history (${history.length})`}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.map((s) => <SessionRow key={s._id} s={s} muted />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
