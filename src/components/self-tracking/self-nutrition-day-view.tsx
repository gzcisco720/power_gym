'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { MealSection } from '@/components/nutrition/meal-section';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import type { ISelfMeal, ISelfMealItem } from '@/lib/db/models/self-nutrition-log.model';
import type { MacroSnapshot } from '@/lib/nutrition/macros';
import type { PickedFood } from '@/components/nutrition/food-picker';

const OPTIONAL_MACRO_KEYS = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated',
  'polyols', 'cholesterol', 'sodium', 'potassium', 'transFat',
] as const;

const DEFAULT_MEALS: ISelfMeal[] = [
  { name: 'Breakfast', order: 0, completed: false, items: [] },
  { name: 'Lunch', order: 1, completed: false, items: [] },
  { name: 'Dinner', order: 2, completed: false, items: [] },
  { name: 'Snack', order: 3, completed: false, items: [] },
];

interface SelfNutritionLog {
  date: string;
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

interface Props {
  initialDate: string;
  readOnly?: boolean;
}

function aggregate(meals: ISelfMeal[]): MacroSnapshot {
  const totals: MacroSnapshot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) {
    for (const i of m.items) {
      totals.kcal += i.kcal;
      totals.protein += i.protein;
      totals.carbs += i.carbs;
      totals.fat += i.fat;
      for (const k of OPTIONAL_MACRO_KEYS) {
        const v = i[k];
        if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v;
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

function pickedFoodToItem(picked: PickedFood): ISelfMealItem {
  const item: ISelfMealItem = {
    foodName: picked.foodName,
    quantityG: picked.quantityG,
    kcal: picked.macros.kcal,
    protein: picked.macros.protein,
    carbs: picked.macros.carbs,
    fat: picked.macros.fat,
  };
  for (const k of OPTIONAL_MACRO_KEYS) {
    const v = picked.macros[k];
    if (typeof v === 'number') item[k] = v;
  }
  return item;
}

export function SelfNutritionDayView({ initialDate, readOnly = false }: Props) {
  const [date, setDate] = useState(initialDate);
  const [log, setLog] = useState<SelfNutritionLog | null>(null);
  const [pickerForMeal, setPickerForMeal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const res = await fetch(`/api/me/nutrition-logs/${date}`);
      if (cancelled) return;
      const data = res.ok ? ((await res.json()) as SelfNutritionLog | null) : null;
      setLog(
        data ?? {
          date,
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: DEFAULT_MEALS,
          dayCompleted: false,
        },
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const macros = useMemo(
    () => (log ? aggregate(log.meals) : { kcal: 0, protein: 0, carbs: 0, fat: 0 }),
    [log],
  );

  async function persist(next: SelfNutritionLog): Promise<void> {
    setLog(next);
    if (readOnly) return;
    await fetch(`/api/me/nutrition-logs/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceTemplateId: next.sourceTemplateId,
        sourceTemplateDayTypeName: next.sourceTemplateDayTypeName,
        dayLabel: next.dayLabel,
        meals: next.meals,
        dayCompleted: next.dayCompleted,
      }),
    });
  }

  if (!log) return <div className="p-4 text-foreground/65 text-sm">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(shiftDate(date, -1))}
          disabled={readOnly}
        >
          ← {shiftDate(date, -1)}
        </Button>
        <span className="text-sm font-semibold">{date}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={readOnly}
        >
          {shiftDate(date, 1)} →
        </Button>
      </div>

      <MacroSummaryCard macros={macros} />

      <div className="space-y-3">
        {log.meals.map((m, i) => (
          <MealSection
            key={i}
            meal={m as unknown as IDailyLogMeal}
            locked={readOnly}
            onAddFood={() => setPickerForMeal(i)}
            onToggleComplete={() => {
              const next: SelfNutritionLog = {
                ...log,
                meals: log.meals.map((mm, j) =>
                  j === i ? { ...mm, completed: !mm.completed } : mm,
                ),
              };
              void persist(next);
            }}
            onRemoveItem={(itemIdx) => {
              const next: SelfNutritionLog = {
                ...log,
                meals: log.meals.map((mm, j) =>
                  j === i ? { ...mm, items: mm.items.filter((_, k) => k !== itemIdx) } : mm,
                ),
              };
              void persist(next);
            }}
          />
        ))}
      </div>

      <FoodPickerDialog
        open={pickerForMeal !== null}
        onOpenChange={(o) => {
          if (!o) setPickerForMeal(null);
        }}
        memberId={null}
        onSelect={(picked) => {
          if (pickerForMeal === null) return;
          const item = pickedFoodToItem(picked);
          const next: SelfNutritionLog = {
            ...log,
            meals: log.meals.map((mm, j) =>
              j === pickerForMeal ? { ...mm, items: [...mm.items, item] } : mm,
            ),
          };
          setPickerForMeal(null);
          void persist(next);
        }}
      />
    </div>
  );
}
