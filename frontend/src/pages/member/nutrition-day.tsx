import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { MacroPill } from '@/components/nutrition/macro-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { variants } from '@/lib/animations/variants';
import { EmptyState } from '@/components/shared/empty-state';
import type { NutritionMeal } from '@/api/nutrition';

// ── Tiny food-picker dialog (inline, no portal needed for member scope) ─────

interface PickedFood {
  name: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodLogItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodLogMeal {
  name: string;
  items: FoodLogItem[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeMealMacros(items: FoodLogItem[]): { kcal: number; protein: number; carbs: number; fat: number } {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// ── Plan mode component ──────────────────────────────────────────────────────

interface PlanDayTypeMeal {
  name: string;
  items: Array<{ foodId: string; servingGrams: number }>;
}

interface PlanDayType {
  name: string;
  meals: PlanDayTypeMeal[];
}

interface PlanMealSectionProps {
  meal: PlanDayTypeMeal;
}

function PlanMealSection({ meal }: PlanMealSectionProps) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
        {meal.name}
      </div>
      {meal.items.length === 0 ? (
        <EmptyState heading="No items yet" description="This meal has no food entries." />
      ) : (
        <ul className="space-y-1">
          {meal.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground">{item.foodId}</span>
              <span className="text-xs text-foreground/65 shrink-0">{item.servingGrams}g</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Freestyle food-picker dialog ─────────────────────────────────────────────

interface AddFoodDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (food: PickedFood) => void;
}

function AddFoodDialog({ open, onClose, onAdd }: AddFoodDialogProps) {
  const { foods, fetchFoods, foodSearchResults, searchFood } = useNutritionStore();
  const [query, setQuery] = useState('');
  const [quantityG, setQuantityG] = useState('100');

  useEffect(() => {
    if (open && foods.length === 0) {
      void fetchFoods();
    }
  }, [open, foods.length, fetchFoods]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setQuantityG('100');
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(() => {
      void searchFood(query.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchFood]);

  if (!open) return null;

  const displayList = query.trim() ? foodSearchResults : foods;

  function handleSelect(food: typeof foods[number]) {
    const grams = parseFloat(quantityG) || 100;
    const factor = grams / 100;
    onAdd({
      name: food.name,
      quantityG: grams,
      kcal: Math.round(food.macrosPer100g.kcal * factor),
      protein: Math.round(food.macrosPer100g.protein * factor),
      carbs: Math.round(food.macrosPer100g.carbs * factor),
      fat: Math.round(food.macrosPer100g.fat * factor),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-card ring-1 ring-foreground/10 rounded-2xl p-5 w-full max-w-sm mx-4 mb-4 sm:mb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-foreground">Add Food</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close food picker"
            className="text-foreground/65 hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search foods…"
            aria-label="Search foods"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg bg-input px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center gap-2">
            <label
              htmlFor="food-qty-g"
              className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 shrink-0"
            >
              Qty (g)
            </label>
            <input
              id="food-qty-g"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={quantityG}
              onChange={(e) => setQuantityG(e.target.value)}
              className="w-20 rounded-lg bg-input px-3 py-1.5 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {displayList.length === 0 ? (
              <EmptyState heading="No foods found" description="Try a different search term." />
            ) : (
              displayList.map((food) => (
                <button
                  key={food._id}
                  type="button"
                  onClick={() => handleSelect(food)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <span className="text-sm text-foreground">{food.name}</span>
                  <span className="text-xs text-foreground/65 shrink-0 ml-2">
                    {food.macrosPer100g.kcal} kcal/100g
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Freestyle meal section ───────────────────────────────────────────────────

interface FreestyleMealSectionProps {
  meal: FoodLogMeal;
  onAddFood: () => void;
  onRemoveItem: (itemIdx: number) => void;
}

function FreestyleMealSection({ meal, onAddFood, onRemoveItem }: FreestyleMealSectionProps) {
  const macros = computeMealMacros(meal.items);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          {meal.name}
        </div>
        {meal.items.length > 0 && (
          <div className="flex gap-1.5">
            <MacroPill tone="emerald" label="P" value={Math.round(macros.protein)} />
            <MacroPill tone="amber" label="C" value={Math.round(macros.carbs)} />
            <MacroPill tone="pink" label="F" value={Math.round(macros.fat)} />
          </div>
        )}
      </div>
      {meal.items.length === 0 ? (
        <EmptyState heading="No entries yet" description="Log your food for the day." />
      ) : (
        <ul className="space-y-1 mb-2">
          {meal.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-foreground truncate block">{item.foodName}</span>
                <span className="text-[10px] text-foreground/65">
                  {item.quantityG}g · {item.kcal} kcal
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(i)}
                aria-label={`Remove ${item.foodName}`}
                className="shrink-0 text-foreground/40 hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onAddFood}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="size-3.5" />
        Add food
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function MemberNutritionDayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { memberPlans, fetchMemberPlan, isLoading } = useNutritionStore();
  const reducedMotion = useReducedMotion();

  const rawDate = searchParams.get('date');
  const mode = searchParams.get('mode') === 'free' ? 'free' : 'plan';
  const today = todayISO();
  const date = rawDate && rawDate <= today ? rawDate : today;

  const memberId = user?.id ?? '';
  const memberPlan = memberPlans[memberId];
  const isPlanLoading = isLoading && !(memberId in memberPlans);

  // Freestyle state
  const [freestyleMeals, setFreestyleMeals] = useState<FoodLogMeal[]>([
    { name: 'Meal 1', items: [] },
  ]);
  const [addingForMealIdx, setAddingForMealIdx] = useState<number | null>(null);

  useEffect(() => {
    if (memberId && !(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchMemberPlan]);

  function handleDateShift(days: number) {
    const next = shiftDate(date, days);
    navigate(`/member/nutrition/day?date=${next}&mode=${mode}`, { replace: true });
  }

  function addFreestyleFood(mealIdx: number, food: PickedFood) {
    setFreestyleMeals((prev) =>
      prev.map((meal, i) =>
        i === mealIdx
          ? {
              ...meal,
              items: [
                ...meal.items,
                {
                  foodName: food.name,
                  quantityG: food.quantityG,
                  kcal: food.kcal,
                  protein: food.protein,
                  carbs: food.carbs,
                  fat: food.fat,
                },
              ],
            }
          : meal,
      ),
    );
  }

  function removeFreestyleItem(mealIdx: number, itemIdx: number) {
    setFreestyleMeals((prev) =>
      prev.map((meal, i) =>
        i === mealIdx
          ? { ...meal, items: meal.items.filter((_, j) => j !== itemIdx) }
          : meal,
      ),
    );
  }

  function addFreestyleMeal() {
    setFreestyleMeals((prev) => [
      ...prev,
      { name: `Meal ${prev.length + 1}`, items: [] },
    ]);
  }

  // Compute total macros for freestyle
  const totalMacros = freestyleMeals.reduce(
    (acc, meal) => {
      const m = computeMealMacros(meal.items);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const containerVariant = reducedMotion ? {} : variants.staggerContainer;
  const itemVariant = reducedMotion ? {} : variants.staggerItem;

  // ── Plan mode ──────────────────────────────────────────────────────────────
  if (mode === 'plan') {
    // Find today's day type from the plan — use first day type if no schedule matching
    const dayType: PlanDayType | null = memberPlan?.nutritionTemplate.dayTypes[0] ?? null;

    return (
      <LazyMotion features={domAnimation}>
        <div className="flex flex-col min-h-screen">
          <PageHeader
            title={dayType?.name ?? 'My Plan'}
            subtitle={date}
            actions={
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDateShift(-1)}
                  aria-label="Previous day"
                  className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors text-foreground/65 hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDateShift(1)}
                  aria-label="Next day"
                  disabled={date >= today}
                  className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors text-foreground/65 hover:text-foreground disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            }
          />

          <div className="flex-1 px-4 sm:px-8 py-5 max-w-2xl mx-auto w-full">
            {isPlanLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[80px] rounded-xl" />
                ))}
              </div>
            ) : !dayType ? (
              <EmptyState
                heading="No nutrition plan"
                description="No nutrition plan assigned for this day. Ask your trainer."
              />
            ) : (
              <m.div
                className="space-y-3"
                variants={containerVariant}
                initial="hidden"
                animate="visible"
              >
                {dayType.meals.map((meal: NutritionMeal, i: number) => (
                  <m.div key={i} variants={itemVariant}>
                    <PlanMealSection meal={meal} />
                  </m.div>
                ))}
              </m.div>
            )}
          </div>
        </div>
      </LazyMotion>
    );
  }

  // ── Freestyle mode ─────────────────────────────────────────────────────────
  const hasItems = freestyleMeals.some((m) => m.items.length > 0);

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col min-h-screen">
        <PageHeader
          title="Freestyle"
          subtitle={date}
          actions={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleDateShift(-1)}
                aria-label="Previous day"
                className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors text-foreground/65 hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDateShift(1)}
                aria-label="Next day"
                disabled={date >= today}
                className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors text-foreground/65 hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          }
        />

        <div className="flex-1 px-4 sm:px-8 py-5 pb-32 max-w-2xl mx-auto w-full space-y-4">
          {/* Macro summary */}
          {hasItems && (
            <m.div
              className="flex items-center gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3"
              variants={variants.fadeSlideUp}
              initial="hidden"
              animate="visible"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mr-auto">
                Today's Total
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {Math.round(totalMacros.kcal)} kcal
              </span>
              <MacroPill tone="emerald" label="P" value={Math.round(totalMacros.protein)} />
              <MacroPill tone="amber" label="C" value={Math.round(totalMacros.carbs)} />
              <MacroPill tone="pink" label="F" value={Math.round(totalMacros.fat)} />
            </m.div>
          )}

          {/* Meal sections */}
          <m.div
            className="space-y-3"
            variants={containerVariant}
            initial="hidden"
            animate="visible"
          >
            {freestyleMeals.map((meal, i) => (
              <m.div key={i} variants={itemVariant}>
                <FreestyleMealSection
                  meal={meal}
                  onAddFood={() => setAddingForMealIdx(i)}
                  onRemoveItem={(itemIdx) => removeFreestyleItem(i, itemIdx)}
                />
              </m.div>
            ))}
          </m.div>

          <Button variant="outline" className="w-full" onClick={addFreestyleMeal}>
            + Add Meal
          </Button>

          {/* Food picker dialog */}
          <AddFoodDialog
            open={addingForMealIdx !== null}
            onClose={() => setAddingForMealIdx(null)}
            onAdd={(food) => {
              if (addingForMealIdx === null) return;
              addFreestyleFood(addingForMealIdx, food);
              setAddingForMealIdx(null);
            }}
          />
        </div>
      </div>
    </LazyMotion>
  );
}
