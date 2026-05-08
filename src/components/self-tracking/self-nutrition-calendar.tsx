'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NutritionDayEntry {
  date: string; // 'YYYY-MM-DD'
  kcal: number;
  dayLabel: string;
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

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button
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
          const isSelected = entry && dateStr === selectedDate;
          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => entry && onSelect(entry)}
                disabled={!entry}
                aria-label={`Day ${day}`}
                className={cn(
                  'w-8 h-8 rounded-full text-[11px] flex items-center justify-center transition-colors',
                  entry && isSelected && 'bg-foreground text-background font-bold',
                  entry && !isSelected && 'bg-foreground/10 text-foreground font-semibold hover:bg-foreground/20',
                  !entry && 'text-foreground/40',
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
