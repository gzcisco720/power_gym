'use client';

import { Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 backdrop-blur-sm border-b border-foreground/10">
      <Tabs
        value={String(activeIndex)}
        onValueChange={(v) => onChange(Number(v))}
        className="flex-1 min-w-0"
      >
        <TabsList
          variant="line"
          aria-label="Training days"
          className="h-9 w-full justify-start overflow-x-auto"
        >
          {days.map((d, idx) => (
            <TabsTrigger key={d.dayNumber} value={String(idx)}>
              {d.name?.trim() || `Day ${d.dayNumber}`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {!readOnly && (
        <button
          type="button"
          aria-label="Add day"
          onClick={onAddDay}
          className="inline-flex items-center gap-1 py-1.5 px-2 text-xs text-foreground/65 hover:text-foreground transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Add Day
        </button>
      )}
    </div>
  );
}
