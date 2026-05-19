'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MacroSummaryCard } from './macro-summary-card';
import { MealSection } from './meal-section';
import { FoodPickerDialog } from './food-picker-dialog';
import { DayCompleteBar } from '@/components/self-tracking/day-complete-bar';
import { DayCompleteConfirmDialog } from '@/components/self-tracking/day-complete-confirm-dialog';
import { NutritionDayCompleteAnimation } from '@/components/animations/nutrition-day-complete';
import { NutritionPlanCompareDialog, type PlanDayType } from '@/components/nutrition/nutrition-plan-compare-dialog';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import type { IMealItem } from '@/lib/db/models/nutrition-template.model';
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
  forceDayType?: string;
  planDayTypes?: PlanDayType[];
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

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export function DailyNutritionView({ memberId, initialDate, forceDayType, planDayTypes }: Props) {
  const [date, setDate] = useState(initialDate);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingForMealIdx, setAddingForMealIdx] = useState<number | null>(null);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [celebrationMacros, setCelebrationMacros] = useState<{
    proteinG: number;
    carbsG: number;
    fatG: number;
  } | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const url = forceDayType
        ? `/api/members/${memberId}/nutrition/log/${date}?dayTypeName=${encodeURIComponent(forceDayType)}`
        : `/api/members/${memberId}/nutrition/log/${date}`;
      const res = await fetch(url);
      if (cancelled) return;
      const data = res.ok ? ((await res.json()) as DailyLog | null) : null;
      setLog(data);
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [memberId, date, forceDayType]);

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
      items: [],
    };
    void persist({ ...log, meals: [...log.meals, newMeal] });
  }

  function addFood(mealIdx: number, item: IMealItem): void {
    if (!log) return;
    const meals = log.meals.map((m, i) =>
      i === mealIdx ? { ...m, items: [...m.items, item] } : m,
    );
    void persist({ ...log, meals });
  }

  const completedMeals = log ? log.meals.filter((m) => m.completed).length : 0;
  const sealedKcal = log
    ? log.meals
        .filter((m) => m.completed)
        .reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0)
    : 0;

  async function markDayComplete(opts: { markAll: boolean }): Promise<void> {
    if (!log) return;
    setSubmittingComplete(true);
    const nextMeals = opts.markAll
      ? log.meals.map((m) => ({ ...m, completed: true }))
      : log.meals;
    const next = { ...log, meals: nextMeals, dayCompleted: true };
    const completedMacros = aggregateMacros(nextMeals);
    await persist(next);
    setSubmittingComplete(false);
    setConfirmOpen(false);
    setCelebrationMacros({
      proteinG: Math.round(completedMacros.protein),
      carbsG: Math.round(completedMacros.carbs),
      fatG: Math.round(completedMacros.fat),
    });
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

  const dayMacros = aggregateMacros(log.meals);
  const totalItems = log.meals.reduce((s, m) => s + m.items.length, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
        <div>
          <div className="text-base font-bold text-foreground">{log.dayTypeName}</div>
          <div className="text-xs text-foreground/65 mt-0.5">{log.date}</div>
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="flex-1 px-4 sm:px-8 py-5 pb-32 max-w-2xl mx-auto w-full space-y-4">
        <MacroSummaryCard macros={dayMacros} />

        <div className="space-y-3">
          {log.meals.map((m, idx) => (
            <MealSection
              key={`${m.name}-${idx}`}
              meal={m}
              locked={log.dayCompleted}
              onAddFood={() => setAddingForMealIdx(idx)}
              onToggleComplete={() => toggleComplete(idx)}
              onRemoveItem={(i) => removeItem(idx, i)}
            />
          ))}
        </div>

        {!log.dayCompleted && (
          <Button variant="outline" className="w-full" onClick={addMeal}>
            + Add Meal
          </Button>
        )}

        <FoodPickerDialog
          open={addingForMealIdx !== null}
          onOpenChange={(o) => { if (!o) setAddingForMealIdx(null); }}
          memberId={memberId}
          onSelect={(picked) => {
            if (addingForMealIdx === null) return;
            addFood(addingForMealIdx, {
              foodName: picked.foodName,
              quantityG: picked.quantityG,
              ...picked.macros,
            });
            setAddingForMealIdx(null);
          }}
        />
      </div>

      <DayCompleteBar
        dayCompleted={log.dayCompleted}
        kcal={log.dayCompleted ? Math.round(sealedKcal) : Math.round(dayMacros.kcal)}
        totalItems={totalItems}
        onRequestComplete={() => setConfirmOpen(true)}
        submitting={submittingComplete}
      />

      <DayCompleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        totalMeals={log?.meals.length ?? 0}
        completedMeals={completedMeals}
        sealedKcal={Math.round(sealedKcal)}
        totalKcal={Math.round(dayMacros.kcal)}
        onConfirm={markDayComplete}
        submitting={submittingComplete}
      />

      {celebrationMacros && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs mx-4">
            <NutritionDayCompleteAnimation
              proteinG={celebrationMacros.proteinG}
              carbsG={celebrationMacros.carbsG}
              fatG={celebrationMacros.fatG}
              onComplete={() => {
                setCelebrationMacros(null);
                if (planDayTypes && planDayTypes.length > 0) setCompareOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {planDayTypes && planDayTypes.length > 0 && log && (
        <NutritionPlanCompareDialog
          open={compareOpen}
          onOpenChange={setCompareOpen}
          date={date}
          loggedKcal={Math.round(dayMacros.kcal)}
          loggedProtein={Math.round(dayMacros.protein)}
          loggedCarbs={Math.round(dayMacros.carbs)}
          loggedFat={Math.round(dayMacros.fat)}
          planDayTypes={planDayTypes}
        />
      )}
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
