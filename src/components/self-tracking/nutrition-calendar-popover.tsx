'use client';

import { useEffect, useState, type ReactElement } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
} from '@/components/ui/popover';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';

interface RawLog {
  date: string;
  dayLabel: string;
  dayCompleted: boolean;
  meals: { completed: boolean; items: { kcal: number }[] }[];
}

interface Props {
  trigger: ReactElement;
  onSelect: (date: string) => void;
  selectedDate?: string;
}

export function NutritionCalendarPopover({ trigger, onSelect, selectedDate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      {open && (
        <PopoverPortal>
          <PopoverPositioner align="end">
            <PopoverPopup className="w-[296px] p-0">
              <NutritionCalendarBody
                onSelect={(date) => {
                  setOpen(false);
                  onSelect(date);
                }}
                selectedDate={selectedDate}
              />
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      )}
    </Popover>
  );
}

interface BodyProps {
  onSelect: (date: string) => void;
  selectedDate?: string;
}

function NutritionCalendarBody({ onSelect, selectedDate }: BodyProps) {
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [year, setYear] = useState(() => new Date().getFullYear());
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((logs: RawLog[]) => {
        setEntries(
          logs.map((l) => ({
            date: l.date,
            dayLabel: l.dayLabel,
            dayCompleted: l.dayCompleted,
            kcal: l.meals
              .flatMap((m) => m.completed ? m.items : [])
              .reduce((s, it) => s + it.kcal, 0),
          })),
        );
      })
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [year, month]);

  return (
    <SelfNutritionCalendar
      entries={entries}
      onSelect={(e) => onSelect(e.date)}
      selectedDate={selectedDate}
      onMonthChange={(y, m) => {
        setYear(y);
        setMonth(m);
      }}
    />
  );
}
