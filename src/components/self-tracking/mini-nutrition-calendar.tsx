'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition';

interface RawSelfLog {
  date: string;
  dayLabel: string;
  dayCompleted: boolean;
  meals: { completed: boolean; items: { kcal: number }[] }[];
}

interface RawPlanLog {
  date: string;
  dayTypeName: string;
  dayCompleted: boolean;
  meals: { completed: boolean; items: { kcal: number }[] }[];
}

interface Props {
  basePath: BasePath;
  memberId?: string; // member only — triggers fetching plan-based logs too
}

function selfLogToEntry(l: RawSelfLog): NutritionDayEntry {
  return {
    date: l.date,
    kcal: l.meals.filter((m) => m.completed).reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0),
    dayLabel: l.dayLabel,
    dayCompleted: l.dayCompleted,
  };
}

function planLogToEntry(l: RawPlanLog): NutritionDayEntry {
  return {
    date: l.date,
    kcal: l.meals.filter((m) => m.completed).reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0),
    dayLabel: l.dayTypeName,
    dayCompleted: l.dayCompleted,
  };
}

function mergeEntries(self: NutritionDayEntry[], plan: NutritionDayEntry[]): NutritionDayEntry[] {
  const map = new Map<string, NutritionDayEntry>();
  for (const e of plan) map.set(e.date, e);
  // Freestyle logs override plan logs for same date (more specific user action)
  for (const e of self) map.set(e.date, e);
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function MiniNutritionCalendar({ basePath, memberId }: Props) {
  const { push } = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const selfRes = await fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`);
      const selfData: RawSelfLog[] = selfRes.ok ? await selfRes.json() : [];

      let planData: RawPlanLog[] = [];
      if (memberId) {
        const planRes = await fetch(`/api/me/nutrition-daily-logs?year=${year}&month=${month}`);
        planData = planRes.ok ? await planRes.json() : [];
      }

      if (!cancelled) {
        setEntries(mergeEntries(selfData.map(selfLogToEntry), planData.map(planLogToEntry)));
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [year, month, memberId]);

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
        onSelect={(entry) => push(dayPath(entry.date))}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      />
    </div>
  );
}
