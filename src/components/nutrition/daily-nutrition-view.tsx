'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MacroSummaryCard } from './macro-summary-card';
import { MealSection } from './meal-section';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import type { MacroSnapshot } from '@/lib/nutrition/macros';

interface DailyLog {
  memberId: string;
  planId: string;
  date: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

interface Props {
  memberId: string;
  initialDate: string;
}

const OPTIONAL_MACRO_KEYS = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated',
  'polyols', 'cholesterol', 'sodium', 'potassium', 'transFat',
] as const;

function aggregateMacros(meals: IDailyLogMeal[]): MacroSnapshot {
  const totals: MacroSnapshot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) {
    for (const i of m.items) {
      totals.kcal += i.kcal;
      totals.protein += i.protein;
      totals.carbs += i.carbs;
      totals.fat += i.fat;
      for (const k of OPTIONAL_MACRO_KEYS) {
        const v = i[k];
        if (typeof v === 'number') {
          totals[k] = (totals[k] ?? 0) + v;
        }
      }
    }
  }
  return totals;
}

function aggregateTargets(meals: IDailyLogMeal[]): { kcal: number; protein: number; carbs: number; fat: number } {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.targetKcal,
      protein: acc.protein + m.targetProtein,
      carbs: acc.carbs + m.targetCarbs,
      fat: acc.fat + m.targetFat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export function DailyNutritionView({ memberId, initialDate }: Props) {
  const [date, setDate] = useState(initialDate);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/members/${memberId}/nutrition/log/${date}`);
      if (cancelled) return;
      const data = res.ok ? ((await res.json()) as DailyLog | null) : null;
      setLog(data);
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [memberId, date]);

  async function persist(next: DailyLog): Promise<void> {
    setLog(next);
    await fetch(`/api/members/${memberId}/nutrition/log/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayTypeName: next.dayTypeName,
        meals: next.meals,
        dayCompleted: next.dayCompleted,
      }),
    });
  }

  function removeItem(mealIdx: number, itemIdx: number): void {
    if (!log) return;
    const meals = log.meals.map((m, i) =>
      i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m,
    );
    void persist({ ...log, meals });
  }

  function toggleComplete(idx: number): void {
    if (!log) return;
    const meals = log.meals.map((m, i) => i === idx ? { ...m, completed: !m.completed } : m);
    void persist({ ...log, meals });
  }

  function addMeal(): void {
    if (!log) return;
    const newMeal: IDailyLogMeal = {
      name: 'New Meal',
      order: log.meals.length,
      completed: false,
      targetKcal: 0,
      targetProtein: 0,
      targetCarbs: 0,
      targetFat: 0,
      items: [],
    };
    void persist({ ...log, meals: [...log.meals, newMeal] });
  }

  function completeDay(): void {
    if (!log) return;
    void persist({ ...log, dayCompleted: true });
  }

  if (loading) return <div>Loading...</div>;
  if (!log) {
    return (
      <Card className="p-6 space-y-3 text-center text-muted-foreground">
        <p>Your trainer hasn&apos;t scheduled today yet.</p>
        <DateNav date={date} onChange={setDate} />
      </Card>
    );
  }

  const actuals = aggregateMacros(log.meals);
  const targets = aggregateTargets(log.meals);

  return (
    <div className="space-y-3">
      <Card className="p-3 flex justify-between items-center">
        <span className="font-medium text-sm">{log.dayTypeName} · {log.date}</span>
        <DateNav date={date} onChange={setDate} />
      </Card>

      <MacroSummaryCard actuals={actuals} targets={targets} />

      {log.meals.map((m, idx) => (
        <MealSection
          key={`${m.name}-${idx}`}
          meal={m}
          locked={log.dayCompleted}
          addFoodHref={`/member/nutrition/add?date=${date}&mealIndex=${idx}`}
          onToggleComplete={() => toggleComplete(idx)}
          onRemoveItem={(i) => removeItem(idx, i)}
        />
      ))}

      {!log.dayCompleted && (
        <Button variant="outline" className="w-full" onClick={addMeal}>
          + Add Meal
        </Button>
      )}

      <Button onClick={completeDay} disabled={log.dayCompleted} className="w-full">
        {log.dayCompleted ? 'Day Completed' : 'Complete Day'}
      </Button>
    </div>
  );
}

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayISO();
  return (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" onClick={() => onChange(shiftDate(date, -1))}>←</Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={date >= today}
      >→</Button>
    </div>
  );
}
