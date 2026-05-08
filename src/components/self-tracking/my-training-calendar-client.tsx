'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfWorkoutCalendar } from './self-workout-calendar';
import { SessionDetailPanel } from '@/components/calendar/session-detail-panel';

interface SetSummary {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

interface SelfLog {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  note: string | null;
  sets: SetSummary[];
}

interface Props {
  backHref: string;
}

export function MyTrainingCalendarClient({ backHref }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);
  const [selected, setSelected] = useState<SelfLog | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d: SelfLog[]) => {
        if (!cancelled) setLogs(d);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // SessionDetailPanel expects imageUrl on each set; ISelfWorkoutSet has none.
  // Backfill imageUrl: null when adapting.
  const detailShape = selected
    ? {
        _id: selected._id,
        dayName: selected.dayName,
        startedAt: selected.startedAt,
        completedAt: selected.completedAt,
        rpe: selected.rpe,
        memberNote: selected.note,
        sets: selected.sets.map((s) => ({ ...s, imageUrl: null })),
      }
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Training Calendar"
        actions={
          <Link
            href={backHref}
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
        <SelfWorkoutCalendar
          logs={logs.filter((l) => l.completedAt !== null) as (SelfLog & { completedAt: string })[]}
          onSelect={(l) => setSelected(l as SelfLog)}
          selectedId={selected?._id}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        {detailShape && <SessionDetailPanel session={detailShape} />}
      </div>
    </div>
  );
}
