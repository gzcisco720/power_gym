import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { WeekCalendarGrid, type SelfCalendarLog } from '@/components/self-tracking/week-calendar-grid';
import { request } from '@/api/client';

type BasePath = '/owner/my-training' | '/trainer/my-training' | '/member/my-training';

interface Props {
  basePath?: BasePath;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function TrainingCalendarPage({ basePath = '/owner/my-training' }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

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
    request<SelfCalendarLog[]>(
      `/api/me/workout-logs/range?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
    )
      .then((data) => { if (!cancelled) setLogs(data); })
      .catch(() => { if (!cancelled) setLogs([]); });
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

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const headerLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Training Calendar" subtitle="Your workout history" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-8 py-3 border-b border-foreground/10 shrink-0">
          <Link
            to={basePath}
            className="text-[12px] text-foreground/65 hover:text-foreground transition-colors mr-1"
          >
            ← Back
          </Link>
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
            onClick={() => setWeekStart(getMonday(new Date()))}
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
            <WeekCalendarGrid
              logs={logs}
              weekStart={weekStart}
              onEventClick={(id) => navigate(`${basePath}/session/${id}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
