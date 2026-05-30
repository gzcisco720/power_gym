import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '@/api/client';
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
  const navigate = useNavigate();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    request<SelfLog[]>(`/api/me/workout-logs?year=${year}&month=${month}`)
      .then((data) => {
        if (!cancelled) setLogs(data.filter((l) => l.completedAt !== null));
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
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
          navigate(`${basePath}/calendar?date=${date}`);
        }}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
    </div>
  );
}
