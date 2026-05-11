'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SelfWeekCalendarGrid, type SelfCalendarLog } from './self-week-calendar-grid';

type BasePath = '/owner/my-training' | '/trainer/my-training';

interface Props {
  basePath: BasePath;
  initialDate?: string;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function SelfWorkoutCalendarClient({ basePath, initialDate }: Props) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => {
    if (initialDate) {
      const d = new Date(`${initialDate}T00:00:00`);
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });
  const [logs, setLogs] = useState<SelfCalendarLog[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    fetch(
      `/api/me/workout-logs/range?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
    )
      .then((r) => r.json())
      .then((data: SelfCalendarLog[]) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      });
    return () => {
      cancelled = true;
      setLogs(null);
    };
  }, [weekStart]);

  function prevWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() - 7);
      return n;
    });
  }

  function nextWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() + 7);
      return n;
    });
  }

  function goToday() {
    setWeekStart(getMonday(new Date()));
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const headerLabel = `${weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 sm:px-8 py-3 border-b border-foreground/10 shrink-0">
        <button
          onClick={prevWeek}
          aria-label="Previous week"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={nextWeek}
          aria-label="Next week"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={goToday}
          className="text-[12px] px-2.5 py-1 rounded-md border border-foreground/15 text-foreground/65 hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Today
        </button>
        <span className="text-[13px] text-foreground/65">{headerLabel}</span>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-8 py-4">
        {logs === null ? (
          <div className="text-sm text-foreground/65 py-8 text-center">Loading…</div>
        ) : (
          <SelfWeekCalendarGrid
            logs={logs}
            weekStart={weekStart}
            onEventClick={(id) => router.push(`${basePath}/session/${id}`)}
          />
        )}
      </div>
    </div>
  );
}
