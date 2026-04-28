'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

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

function SessionRow({ s }: { s: SessionDto }) {
  const d = new Date(s.date);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[14px] font-semibold text-white">
          {label} · {s.startTime}–{s.endTime}
          {s.isRecurring && <span className="ml-1 text-[11px] text-blue-400">🔄</span>}
        </div>
        <div className="text-[12px] text-[#888] mt-0.5">
          {s.trainerName}{s.memberCount > 1 ? ` · Group (${s.memberCount})` : ''}
        </div>
      </div>
      {s.status === 'cancelled' && (
        <span className="text-[11px] text-red-400 uppercase tracking-wide">Cancelled</span>
      )}
    </Card>
  );
}

export function MemberScheduleList({ upcoming, history }: MemberScheduleListProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="px-4 sm:px-8 py-7 space-y-3">
      {upcoming.length === 0 && <p className="text-[#888] text-sm">No upcoming sessions.</p>}
      {upcoming.map((s) => <SessionRow key={s._id} s={s} />)}

      {history.length > 0 && (
        <div className="mt-6">
          <button
            className="text-[12px] text-[#888] hover:text-[#aaa] transition-colors"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? '▾ Hide history' : `▸ Show history (${history.length})`}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3 opacity-60">
              {history.map((s) => <SessionRow key={s._id} s={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
