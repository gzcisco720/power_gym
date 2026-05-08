'use client';

import { useEffect, useState, type ReactElement } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
} from '@/components/ui/popover';
import { SelfWorkoutCalendar } from './self-workout-calendar';

interface SelfLog {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface Props {
  trigger: ReactElement;
  onSelectLog: (logId: string) => void;
}

export function WorkoutCalendarPopover({ trigger, onSelectLog }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      {open && (
        <PopoverPortal>
          <PopoverPositioner align="end">
            <PopoverPopup className="w-[296px] p-0">
              <WorkoutCalendarBody
                onSelect={(logId) => {
                  setOpen(false);
                  onSelectLog(logId);
                }}
              />
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      )}
    </Popover>
  );
}

interface BodyProps {
  onSelect: (logId: string) => void;
}

function WorkoutCalendarBody({ onSelect }: BodyProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: SelfLog[]) => {
        if (cancelled) return;
        setLogs(data.filter((l) => l.completedAt !== null));
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // SelfWorkoutCalendar expects logs.completedAt to be a string (non-null);
  // the filter above guarantees that, so the cast is safe at the boundary.
  const filtered = logs as Array<SelfLog & { completedAt: string }>;

  return (
    <SelfWorkoutCalendar
      logs={filtered}
      onSelect={(l) => onSelect(l._id)}
      onMonthChange={(y, m) => {
        setYear(y);
        setMonth(m);
      }}
    />
  );
}
