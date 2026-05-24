'use client';

import { useEffect, useReducer } from 'react';
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
  onDateChange?: (date: string) => void;
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

interface DailyNutritionViewState {
  date: string;
  log: DailyLog | null;
  loading: boolean;
  addingForMealIdx: number | null;
  submittingComplete: boolean;
  confirmOpen: boolean;
  celebrationMacros: { proteinG: number; carbsG: number; fatG: number } | null;
  compareOpen: boolean;
}

type DailyNutritionViewAction =
  | { type: 'SET_DATE'; value: string }
  | { type: 'SET_LOG'; value: DailyLog | null }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_ADDING_FOR_MEAL_IDX'; value: number | null }
  | { type: 'SET_SUBMITTING_COMPLETE'; value: boolean }
  | { type: 'SET_CONFIRM_OPEN'; value: boolean }
  | { type: 'SET_CELEBRATION_MACROS'; value: { proteinG: number; carbsG: number; fatG: number } | null }
  | { type: 'SET_COMPARE_OPEN'; value: boolean };

function dailyNutritionViewReducer(state: DailyNutritionViewState, action: DailyNutritionViewAction): DailyNutritionViewState {
  switch (action.type) {
    case 'SET_DATE': return { ...state, date: action.value };
    case 'SET_LOG': return { ...state, log: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SET_ADDING_FOR_MEAL_IDX': return { ...state, addingForMealIdx: action.value };
    case 'SET_SUBMITTING_COMPLETE': return { ...state, submittingComplete: action.value };
    case 'SET_CONFIRM_OPEN': return { ...state, confirmOpen: action.value };
    case 'SET_CELEBRATION_MACROS': return { ...state, celebrationMacros: action.value };
    case 'SET_COMPARE_OPEN': return { ...state, compareOpen: action.value };
    default: return state;
  }
}

export function DailyNutritionView({ memberId, initialDate, forceDayType, planDayTypes, onDateChange }: Props) {
  const [state, dispatch] = useReducer(dailyNutritionViewReducer, {
    date: initialDate, log: null, loading: true, addingForMealIdx: null,
    submittingComplete: false, confirmOpen: false, celebrationMacros: null, compareOpen: false,
  });
  const { date, log, loading, addingForMealIdx, submittingComplete, confirmOpen, celebrationMacros, compareOpen } = state;

  function handleDateChange(next: string): void {
    dispatch({ type: 'SET_DATE', value: next });
    onDateChange?.(next);
  }

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const url = forceDayType
        ? `/api/members/${memberId}/nutrition/log/${date}?dayTypeName=${encodeURIComponent(forceDayType)}`
        : `/api/members/${memberId}/nutrition/log/${date}`;
      const res = await fetch(url, { signal: controller.signal });
      const data = res.ok ? ((await res.json()) as DailyLog | null) : null;
      dispatch({ type: 'SET_LOG', value: data });
      dispatch({ type: 'SET_LOADING', value: false });
    }

    void load().catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [memberId, date, forceDayType]);

  async function persist(next: DailyLog): Promise<void> {
    dispatch({ type: 'SET_LOG', value: next });
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
    dispatch({ type: 'SET_SUBMITTING_COMPLETE', value: true });
    const nextMeals = opts.markAll
      ? log.meals.map((m) => ({ ...m, completed: true }))
      : log.meals;
    const next = { ...log, meals: nextMeals, dayCompleted: true };
    const completedMacros = aggregateMacros(nextMeals);
    await persist(next);
    dispatch({ type: 'SET_SUBMITTING_COMPLETE', value: false });
    dispatch({ type: 'SET_CONFIRM_OPEN', value: false });
    dispatch({ type: 'SET_CELEBRATION_MACROS', value: {
      proteinG: Math.round(completedMacros.protein),
      carbsG: Math.round(completedMacros.carbs),
      fatG: Math.round(completedMacros.fat),
    } });
  }

  if (loading) return <div>Loading…</div>;
  if (!log) {
    return (
      <Card className="p-6 space-y-3 text-center text-muted-foreground">
        <p>Your trainer hasn&apos;t scheduled today yet.</p>
        <DateNav date={date} onChange={handleDateChange} />
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
        <DateNav date={date} onChange={handleDateChange} />
      </div>

      <div className="flex-1 px-4 sm:px-8 py-5 pb-32 max-w-2xl mx-auto w-full space-y-4">
        <MacroSummaryCard macros={dayMacros} />

        <div className="space-y-3">
          {log.meals.map((m, idx) => (
            <MealSection
              key={`${m.name}-${idx}`}
              meal={m}
              locked={log.dayCompleted}
              onAddFood={() => dispatch({ type: 'SET_ADDING_FOR_MEAL_IDX', value: idx })}
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
          onOpenChange={(o) => { if (!o) dispatch({ type: 'SET_ADDING_FOR_MEAL_IDX', value: null }); }}
          memberId={memberId}
          onSelect={(picked) => {
            if (addingForMealIdx === null) return;
            addFood(addingForMealIdx, {
              foodName: picked.foodName,
              quantityG: picked.quantityG,
              ...picked.macros,
            });
            dispatch({ type: 'SET_ADDING_FOR_MEAL_IDX', value: null });
          }}
        />
      </div>

      <DayCompleteBar
        dayCompleted={log.dayCompleted}
        kcal={log.dayCompleted ? Math.round(sealedKcal) : Math.round(dayMacros.kcal)}
        totalItems={totalItems}
        onRequestComplete={() => dispatch({ type: 'SET_CONFIRM_OPEN', value: true })}
        submitting={submittingComplete}
      />

      <DayCompleteConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => dispatch({ type: 'SET_CONFIRM_OPEN', value: v })}
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
                dispatch({ type: 'SET_CELEBRATION_MACROS', value: null });
                if (planDayTypes && planDayTypes.length > 0) dispatch({ type: 'SET_COMPARE_OPEN', value: true });
              }}
            />
          </div>
        </div>
      )}

      {planDayTypes && planDayTypes.length > 0 && log && (
        <NutritionPlanCompareDialog
          open={compareOpen}
          onOpenChange={(v) => dispatch({ type: 'SET_COMPARE_OPEN', value: v })}
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
