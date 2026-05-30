import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '@/api/client';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition';

interface RawSelfLog {
  date: string;
  dayLabel: string;
  dayCompleted: boolean;
  meals: { completed: boolean; items: { kcal: number }[] }[];
}

interface Props {
  basePath: BasePath;
}

function selfLogToEntry(l: RawSelfLog): NutritionDayEntry {
  return {
    date: l.date,
    kcal: l.meals
      .filter((m) => m.completed)
      .reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0),
    dayLabel: l.dayLabel,
    dayCompleted: l.dayCompleted,
  };
}

export function MiniNutritionCalendar({ basePath }: Props) {
  const navigate = useNavigate();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    request<RawSelfLog[]>(`/api/me/nutrition-logs?year=${year}&month=${month}`)
      .then((data) => {
        if (!cancelled) setEntries(data.map(selfLogToEntry));
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [year, month]);

  function dayPath(date: string): string {
    if (basePath === '/member/nutrition') return `/member/nutrition/day?date=${date}`;
    return `${basePath}/day?date=${date}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[1.4px] font-semibold text-foreground/65">
          Nutrition History
        </span>
      </div>
      <SelfNutritionCalendar
        entries={entries}
        onSelect={(entry) => navigate(dayPath(entry.date))}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
    </div>
  );
}
