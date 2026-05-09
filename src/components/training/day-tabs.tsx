'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DaySummary {
  dayNumber: number;
  name: string;
}

interface Props {
  days: DaySummary[];
  activeIndex: number;
  onChange: (index: number) => void;
  onAddDay: () => void;
  readOnly?: boolean;
}

export function DayTabs({ days, activeIndex, onChange, onAddDay, readOnly = false }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Training days"
      className="sticky top-0 z-10 flex items-center gap-4 overflow-x-auto bg-background/95 backdrop-blur-sm border-b border-foreground/10 px-1 -mx-1"
    >
      {days.map((d, idx) => {
        const active = idx === activeIndex;
        const showName = d.name && d.name !== `Day ${d.dayNumber}`;
        return (
          <button
            key={d.dayNumber}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(idx)}
            className={cn(
              'whitespace-nowrap py-2.5 text-sm transition-colors border-b-2 -mb-px',
              active
                ? 'text-foreground border-foreground font-semibold'
                : 'text-foreground/65 border-transparent hover:text-foreground',
            )}
          >
            Day {d.dayNumber}
            {showName ? ` ${d.name}` : ''}
          </button>
        );
      })}
      {!readOnly && (
        <button
          type="button"
          aria-label="Add day"
          onClick={onAddDay}
          className="ml-auto inline-flex items-center gap-1 py-2 text-xs text-foreground/65 hover:text-foreground transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Add Day
        </button>
      )}
    </div>
  );
}
