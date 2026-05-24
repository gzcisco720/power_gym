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
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [year, setYear] = useState(() => new Date().getFullYear());
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const selfRes = await fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`, { signal: controller.signal });
      const selfData: RawSelfLog[] = selfRes.ok ? await selfRes.json() : [];

      let planData: RawPlanLog[] = [];
      if (memberId) {
        const planRes = await fetch(`/api/me/nutrition-daily-logs?year=${year}&month=${month}`, { signal: controller.signal });
        planData = planRes.ok ? await planRes.json() : [];
      }

      setEntries(mergeEntries(selfData.map(selfLogToEntry), planData.map(planLogToEntry)));
    }

    void load().catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
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
