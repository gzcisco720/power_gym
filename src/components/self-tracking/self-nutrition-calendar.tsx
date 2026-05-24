// src/components/self-tracking/self-nutrition-calendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NutritionDayEntry {
  date: string; // 'YYYY-MM-DD'
  kcal: number;
  dayLabel: string;
  dayCompleted: boolean;
}

interface Props {
  entries: NutritionDayEntry[];
  onSelect: (entry: NutritionDayEntry) => void;
  selectedDate?: string;
  onMonthChange?: (year: number, month: number) => void;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  return { startOffset: (firstDay + 6) % 7, daysInMonth };
}

export function SelfNutritionCalendar({ entries, onSelect, selectedDate, onMonthChange }: Props) {
  const now = new Date();
  // Use local date — `toISOString()` is UTC and can disagree with the
  // calendar grid (which is built from `getFullYear/Month/Date`) near midnight.
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const entriesByDay = useMemo(() => {
    const map = new Map<number, NutritionDayEntry>();
    for (const e of entries) {
      const [y, m, d] = e.date.split('-').map(Number);
      if (y === year && m === month) map.set(d, e);
    }
    return map;
  }, [entries, year, month]);

  function shift(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setYear(ny);
    setMonth(nm);
    onMonthChange?.(ny, nm);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDay = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
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
          const entry = entriesByDay.get(day);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isFuture = dateStr > todayISO;
          const canSelect = entry !== undefined && !isFuture;
          const isSelected = canSelect && dateStr === selectedDate;
          const isToday = isCurrentMonth && day === todayDay;
          const status = entry ? (entry.dayCompleted ? 'completed' : 'in progress') : null;
          const ariaLabel = entry && !isFuture
            ? `Day ${day}, ${entry.kcal} kcal, ${status}`
            : `Day ${day}`;

          return (
            <div key={day} className="flex justify-center">
              <button
                type="button"
                onClick={() => canSelect && onSelect(entry)}
                disabled={!canSelect}
                aria-label={ariaLabel}
                className={cn(
                  'w-9 h-11 rounded-md text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors',
                  isSelected && 'bg-foreground text-background font-bold',
                  !isSelected && canSelect && 'text-foreground hover:bg-foreground/10',
                  !canSelect && 'text-foreground/40',
                  isToday && !isSelected && 'ring-1 ring-foreground/25',
                )}
              >
                <span className="leading-none">{day}</span>
                {entry && !isFuture && (
                  <span className={cn(
                    'text-[9px] tabular-nums leading-none',
                    isSelected ? 'text-background/80' :
                      entry.dayCompleted ? 'text-emerald-300' : 'text-emerald-300/70',
                  )}>
                    {entry.kcal}
                  </span>
                )}
                {entry && !isFuture && (
                  <span className={cn(
                    'h-1 w-1 rounded-full',
                    isSelected ? 'bg-background/80' :
                      entry.dayCompleted ? 'bg-emerald-500' : 'bg-emerald-500/40',
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
