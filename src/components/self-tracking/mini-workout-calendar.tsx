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
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: SelfLog[]) => {
        if (!cancelled) setLogs(data.filter((l) => l.completedAt !== null));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
          router.push(`${basePath}/calendar?date=${date}`);
        }}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
    </div>
  );
}
