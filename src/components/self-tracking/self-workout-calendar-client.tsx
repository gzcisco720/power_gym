'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SelfWeekCalendarGrid, type SelfCalendarLog } from './self-week-calendar-grid';

type BasePath = '/owner/my-training' | '/trainer/my-training' | '/member/plan' | '/member/my-training';

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
  const { push } = useRouter();
  const [weekStart, setWeekStart] = useState(() => {
    if (initialDate) {
      const d = new Date(`${initialDate}T00:00:00`);
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });
  const [logs, setLogs] = useState<SelfCalendarLog[] | null>(null);

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect, react-doctor/no-cascading-set-state
  useEffect(() => {
    const controller = new AbortController();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const apiUrl =
      basePath === '/member/plan'
        ? `/api/sessions?memberId=me&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
        : `/api/me/workout-logs/range?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`;
    fetch(apiUrl, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: SelfCalendarLog[]) => {
        setLogs(data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') setLogs([]);
      });
    return () => {
      controller.abort();
      setLogs(null);
    };
  }, [weekStart, basePath]);

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
        <a
          href={basePath}
          className="text-[12px] text-foreground/65 hover:text-foreground transition-colors mr-1"
        >
          {basePath === '/member/plan' ? '← Back to Plan' : '← Back'}
        </a>
        <button
          type="button"
          onClick={prevWeek}
          aria-label="Previous week"
          className="inline-flex size-7 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={nextWeek}
          aria-label="Next week"
          className="inline-flex size-7 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
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
            onEventClick={(id) => push(`${basePath}/session/${id}`)}
          />
        )}
      </div>
    </div>
  );
}
