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
    <div className="flex items-center justify-between gap-2">
      <Tabs
        value={String(activeIndex)}
        onValueChange={(v) => onChange(Number(v))}
        className="min-w-0"
      >
        <TabsList
          aria-label="Training days"
          className="h-9 max-w-full ring-1 ring-foreground/10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((d, idx) => (
            <TabsTrigger
              key={d.dayNumber}
              value={String(idx)}
              className="px-3 text-sm data-[state=active]:bg-foreground/10 dark:data-active:bg-foreground/10 data-active:text-foreground data-active:shadow-none"
            >
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
          className="inline-flex items-center gap-1 py-1.5 px-2 text-xs text-foreground/65 hover:text-foreground transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="size-3.5" /> Add Day
        </button>
      )}
    </div>
  );
}
