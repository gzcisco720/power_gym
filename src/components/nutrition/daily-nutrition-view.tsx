'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MealCard } from './meal-card';
import { FoodAddSheet, type AddedMealItem } from './food-add-sheet';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

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

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export function DailyNutritionView({ memberId, initialDate }: Props): JSX.Element {
  const [date, setDate] = useState(initialDate);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetMealIdx, setSheetMealIdx] = useState<number | null>(null);

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

  function addFood(idx: number, item: AddedMealItem): void {
    if (!log) return;
    const meals = log.meals.map((m, i) => i === idx ? { ...m, items: [...m.items, item] } : m);
    void persist({ ...log, meals });
  }

  function removeItem(mealIdx: number, itemIdx: number): void {
    if (!log) return;
    const meals = log.meals.map((m, i) => i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m);
    void persist({ ...log, meals });
  }

  function toggleComplete(idx: number): void {
    if (!log) return;
    const meals = log.meals.map((m, i) => i === idx ? { ...m, completed: !m.completed } : m);
    void persist({ ...log, meals });
  }

  function completeDay(): void {
    if (!log) return;
    void persist({ ...log, dayCompleted: true });
  }

  if (loading) return <div>Loading...</div>;
  if (!log) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Your trainer hasn&apos;t scheduled today yet.
        <DateNav date={date} onChange={setDate} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 flex justify-between items-center">
        <span className="font-medium text-sm">{log.date} · {log.dayTypeName}</span>
        <DateNav date={date} onChange={setDate} />
      </Card>
      {log.meals.map((m, idx) => (
        <MealCard
          key={`${m.name}-${idx}`}
          meal={m}
          locked={log.dayCompleted}
          onAddFood={() => setSheetMealIdx(idx)}
          onToggleComplete={() => toggleComplete(idx)}
          onRemoveItem={(i) => removeItem(idx, i)}
        />
      ))}
      <Button onClick={completeDay} disabled={log.dayCompleted} className="w-full">
        {log.dayCompleted ? 'Day Completed' : 'Complete Day'}
      </Button>
      <FoodAddSheet
        open={sheetMealIdx !== null}
        onOpenChange={(o) => !o && setSheetMealIdx(null)}
        onAdd={(item) => sheetMealIdx !== null && addFood(sheetMealIdx, item)}
      />
    </div>
  );
}

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }): JSX.Element {
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
