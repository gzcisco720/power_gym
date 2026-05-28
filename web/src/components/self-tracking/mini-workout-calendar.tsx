'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SelfWorkoutCalendar } from './self-workout-calendar';

type BasePath = '/owner/my-training' | '/trainer/my-training' | '/member/my-training';

interface SelfLog {
  _id: string;
  dayName: string;
  completedAt: string;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface Props {
  basePath: BasePath;
}

export function MiniWorkoutCalendar({ basePath }: Props) {
  const { push } = useRouter();
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [year, setYear] = useState(() => new Date().getFullYear());
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/me/workout-logs?year=${year}&month=${month}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: SelfLog[]) => {
        setLogs(data.filter((l) => l.completedAt !== null));
      })
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [year, month]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[1.4px] font-semibold text-foreground/65">
          Training History
        </span>
        <a
          href={`${basePath}/calendar`}
          className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
        >
          View calendar →
        </a>
      </div>
      <SelfWorkoutCalendar
        logs={logs}
        onSelect={(log) => {
          const date = log.completedAt.split('T')[0];
          push(`${basePath}/calendar?date=${date}`);
        }}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
    </div>
  );
}
