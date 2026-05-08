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
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((logs: RawLog[]) => {
        if (cancelled) return;
        setEntries(
          logs.map((l) => ({
            date: l.date,
            dayLabel: l.dayLabel,
            dayCompleted: l.dayCompleted,
            kcal: l.meals
              .filter((m) => m.completed)
              .flatMap((m) => m.items)
              .reduce((s, it) => s + it.kcal, 0),
          })),
        );
      });
    return () => {
      cancelled = true;
    };
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
