import { useEffect, useMemo, useReducer } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { MealSection } from '@/components/nutrition/meal-section';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import type { PickedFood } from '@/components/nutrition/food-picker.types';
import { request } from '@/api/client';
import type { SelfNutritionLog, SelfMeal, SelfMealItem } from '@/api/self-nutrition';
import type { MacroSnapshot } from '@/lib/nutrition/macros';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition/day';

interface Props {
  basePath?: BasePath;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_MEALS: SelfMeal[] = [
  { name: 'Breakfast', order: 0, completed: false, items: [] },
  { name: 'Lunch', order: 1, completed: false, items: [] },
  { name: 'Dinner', order: 2, completed: false, items: [] },
  { name: 'Snack', order: 3, completed: false, items: [] },
];

const OPTIONAL_MACRO_KEYS = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated',
  'polyols', 'cholesterol', 'sodium', 'potassium', 'transFat',
] as const;

function aggregate(meals: SelfMeal[]): MacroSnapshot {
  const totals: MacroSnapshot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) {
    for (const i of m.items) {
      totals.kcal += i.kcal;
      totals.protein += i.protein;
      totals.carbs += i.carbs;
      totals.fat += i.fat;
    }
  }
  return totals;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickedFoodToItem(picked: PickedFood): SelfMealItem {
  const item: SelfMealItem = {
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

interface State {
  date: string;
  log: SelfNutritionLog | null;
  pickerForMeal: number | null;
  submittingComplete: boolean;
}

type Action =
  | { type: 'SET_DATE'; value: string }
  | { type: 'SET_LOG'; value: SelfNutritionLog | null }
  | { type: 'SET_PICKER_FOR_MEAL'; value: number | null }
  | { type: 'SET_SUBMITTING_COMPLETE'; value: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DATE': return { ...state, date: action.value };
    case 'SET_LOG': return { ...state, log: action.value };
    case 'SET_PICKER_FOR_MEAL': return { ...state, pickerForMeal: action.value };
    case 'SET_SUBMITTING_COMPLETE': return { ...state, submittingComplete: action.value };
    default: return state;
  }
}

export function NutritionDayPage({ basePath = '/owner/my-nutrition' }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDate = searchParams.get('date');
  const templateId = searchParams.get('templateId');
  const dayTypeName = searchParams.get('dayTypeName');
  const noNav = searchParams.get('noNav') === '1';

  const today = todayUTC();
  const initialDate = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;

  const [state, dispatch] = useReducer(reducer, {
    date: initialDate,
    log: null,
    pickerForMeal: null,
    submittingComplete: false,
  });
  const { date, log, pickerForMeal, submittingComplete } = state;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await request<SelfNutritionLog | null>(`/api/me/nutrition-logs/${date}`).catch(() => null);

      if (cancelled) return;

      if (res) {
        dispatch({ type: 'SET_LOG', value: res });
        return;
      }

      if (templateId && dayTypeName) {
        try {
          const tpl = await request<{ dayTypes: Array<{ name: string; meals: SelfMeal[] }> }>(
            `/api/nutrition-templates/${templateId}`,
          );
          if (cancelled) return;
          const dayType = tpl.dayTypes.find((dt) => dt.name === dayTypeName);
          if (dayType) {
            dispatch({ type: 'SET_LOG', value: {
              date,
              sourceTemplateId: templateId,
              sourceTemplateDayTypeName: dayTypeName,
              dayLabel: dayTypeName,
              meals: dayType.meals.map((m) => ({ ...m, completed: false })),
              dayCompleted: false,
            } });
            return;
          }
        } catch { /* fallthrough */ }
      }

      dispatch({ type: 'SET_LOG', value: {
        date,
        sourceTemplateId: null,
        sourceTemplateDayTypeName: null,
        dayLabel: 'Freestyle',
        meals: DEFAULT_MEALS,
        dayCompleted: false,
      } });
    }

    void load();
    return () => { cancelled = true; };
  }, [date, templateId, dayTypeName]);

  const macros = useMemo(
    () => (log ? aggregate(log.meals) : { kcal: 0, protein: 0, carbs: 0, fat: 0 }),
    [log],
  );

  async function persist(next: SelfNutritionLog): Promise<void> {
    dispatch({ type: 'SET_LOG', value: next });
    try {
      await request(`/api/me/nutrition-logs/${date}`, {
        method: 'PUT',
        body: JSON.stringify({
          sourceTemplateId: next.sourceTemplateId,
          sourceTemplateDayTypeName: next.sourceTemplateDayTypeName,
          dayLabel: next.dayLabel,
          meals: next.meals,
          dayCompleted: next.dayCompleted,
        }),
      });
    } catch {
      toast.error('Failed to save');
    }
  }

  async function markDayComplete(): Promise<void> {
    if (!log) return;
    dispatch({ type: 'SET_SUBMITTING_COMPLETE', value: true });
    const nextMeals = log.meals.map((m) => ({ ...m, completed: true }));
    await persist({ ...log, meals: nextMeals, dayCompleted: true });
    dispatch({ type: 'SET_SUBMITTING_COMPLETE', value: false });
    toast.success('Day completed!');
  }

  function setDate(next: string): void {
    dispatch({ type: 'SET_DATE', value: next });
    if (!noNav) {
      setSearchParams((p) => { p.set('date', next); return p; }, { replace: false });
    }
  }

  if (!log) return <div className="p-4 text-foreground/65 text-sm">Loading…</div>;

  const nextDate = shiftDate(date, 1);
  const canGoNext = nextDate <= today;
  const isLocked = log.dayCompleted;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
        {noNav ? (
          <div className="w-full flex items-center gap-3">
            <Link
              to={basePath}
              className="text-xs text-foreground/65 hover:text-foreground transition-colors"
            >
              ← Back
            </Link>
            <span className="text-sm font-semibold mx-auto">{date}</span>
          </div>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDate(shiftDate(date, -1))}
            >
              ← {shiftDate(date, -1)}
            </Button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              aria-label={`Open calendar (${date})`}
            >
              {date}
              <ChevronDown className="size-3 text-foreground/65" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDate(nextDate)}
              disabled={!canGoNext}
            >
              {nextDate} →
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 px-4 sm:px-8 py-5 pb-32 max-w-2xl mx-auto w-full space-y-4">
        <MacroSummaryCard macros={macros} />

        <div className="space-y-3" data-testid="meals-list">
          {log.meals.map((m, i) => (
            <MealSection
              key={m.name}
              meal={m}
              locked={isLocked}
              onAddFood={() => dispatch({ type: 'SET_PICKER_FOR_MEAL', value: i })}
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
            if (!o) dispatch({ type: 'SET_PICKER_FOR_MEAL', value: null });
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
            dispatch({ type: 'SET_PICKER_FOR_MEAL', value: null });
            void persist(next);
          }}
        />
      </div>

      {!isLocked && (
        <div className="sticky bottom-0 z-10 border-t border-foreground/10 backdrop-blur-md bg-background/50 px-4 sm:px-8 py-3">
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
            <span className="text-xs text-foreground/65 tabular-nums">
              {Math.round(macros.kcal)} kcal · {log.meals.reduce((s, m) => s + m.items.length, 0)} items
            </span>
            <Button
              onClick={() => void markDayComplete()}
              disabled={submittingComplete}
            >
              {submittingComplete ? 'Saving…' : 'Complete Day'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
