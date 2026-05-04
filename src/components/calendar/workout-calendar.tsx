'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionSummary {
  _id: string;
  dayName: string;
  completedAt: string;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface WorkoutCalendarProps {
  sessions: SessionSummary[];
  onSelectSession: (session: SessionSummary) => void;
  selectedSessionId?: string | null;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Monday = 0
  return { startOffset, daysInMonth };
}

export function WorkoutCalendar({ sessions, onSelectSession, selectedSessionId }: WorkoutCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const sessionsByDay = new Map<number, SessionSummary>();
  for (const s of sessions) {
    const d = new Date(s.completedAt);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      sessionsByDay.set(d.getDate(), s);
    }
  }

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-[#0c0c0c] border border-[#141414] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-[#555] hover:text-[#888] transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-white">{monthName}</span>
        <button onClick={nextMonth} className="text-[#555] hover:text-[#888] transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-[#444] py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const session = sessionsByDay.get(day);
          const isToday = now.getDate() === day && now.getMonth() + 1 === month && now.getFullYear() === year;
          const isSelected = session && session._id === selectedSessionId;

          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => session && onSelectSession(session)}
                disabled={!session}
                className={cn(
                  'w-8 h-8 rounded-full text-[11px] flex items-center justify-center transition-colors',
                  session && isSelected && 'bg-white text-black font-bold',
                  session && !isSelected && 'bg-white/10 text-white font-semibold hover:bg-white/20',
                  !session && isToday && 'border border-[#333] text-[#555]',
                  !session && !isToday && 'text-[#444]',
                )}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
