'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelfLogSummary {
  _id: string;
  dayName: string;
  completedAt: string;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface Props {
  logs: SelfLogSummary[];
  onSelect: (log: SelfLogSummary) => void;
  selectedId?: string | null;
  onMonthChange?: (year: number, month: number) => void;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  return { startOffset, daysInMonth };
}

export function SelfWorkoutCalendar({ logs, onSelect, selectedId, onMonthChange }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const logsByDay = useMemo(() => {
    const map = new Map<number, SelfLogSummary>();
    for (const l of logs) {
      const d = new Date(l.completedAt);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        map.set(d.getDate(), l);
      }
    }
    return map;
  }, [logs, year, month]);

  function shiftMonth(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setYear(ny);
    setMonth(nm);
    onMonthChange?.(ny, nm);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = now.getDate();

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => shiftMonth(-1)} className="cursor-pointer text-foreground/65 hover:text-foreground transition-colors" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button type="button" onClick={() => shiftMonth(1)} className="cursor-pointer text-foreground/65 hover:text-foreground transition-colors" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-foreground/65 py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const log = logsByDay.get(day);
          const isToday = isCurrentMonth && day === todayDay;
          const isSelected = log && log._id === selectedId;
          const ariaLabel = log
            ? `Day ${day}, ${log.dayName}`
            : `Day ${day}`;

          return (
            <div key={day} className="flex justify-center">
              <button
                type="button"
                onClick={() => log && onSelect(log)}
                disabled={!log}
                aria-label={ariaLabel}
                className={cn(
                  'w-9 h-11 rounded-md text-[11px] flex flex-col items-center justify-center gap-1 transition-colors',
                  isSelected && 'bg-foreground text-background font-bold',
                  !isSelected && log && 'text-foreground hover:bg-foreground/10',
                  !log && 'text-foreground/40',
                  isToday && !isSelected && 'ring-1 ring-foreground/25',
                )}
              >
                <span className="leading-none">{day}</span>
                {log && (
                  <span className={cn(
                    'h-1 w-1 rounded-full',
                    isSelected ? 'bg-background/80' : 'bg-emerald-500',
                  )} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
