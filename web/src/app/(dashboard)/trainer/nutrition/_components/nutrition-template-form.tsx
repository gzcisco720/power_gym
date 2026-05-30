'use client';

import { useMemo, useReducer } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import { MacroPill } from '@/components/nutrition/macro-pill';
import { ChevronDown, ChevronRight, X, Trash2 } from 'lucide-react';
import type { IDayType, IMeal, IMealItem } from '@/lib/db/models/nutrition-template.model';
import type { MacroSnapshot } from '@/lib/nutrition/macros';
import type { PickedFood } from '@/components/nutrition/food-picker.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}

interface Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
}

interface AddingFor {
  dayIdx: number;
  mealIdx: number;
}

type PendingDelete =
  | { kind: 'day'; dayIdx: number; name: string }
  | { kind: 'meal'; dayIdx: number; mealIdx: number; name: string }
  | { kind: 'item'; dayIdx: number; mealIdx: number; itemIdx: number; name: string };

interface CoreMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumDayMacros(dayType: IDayType): MacroSnapshot {
  const items = dayType.meals.flatMap((m) => m.items);
  return items.reduce<MacroSnapshot>(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
      fiber: (acc.fiber ?? 0) + (it.fiber ?? 0),
      sugar: (acc.sugar ?? 0) + (it.sugar ?? 0),
      salt: (acc.salt ?? 0) + (it.salt ?? 0),
      saturated: (acc.saturated ?? 0) + (it.saturated ?? 0),
      polyunsaturated: (acc.polyunsaturated ?? 0) + (it.polyunsaturated ?? 0),
      monounsaturated: (acc.monounsaturated ?? 0) + (it.monounsaturated ?? 0),
      polyols: (acc.polyols ?? 0) + (it.polyols ?? 0),
      cholesterol: (acc.cholesterol ?? 0) + (it.cholesterol ?? 0),
      sodium: (acc.sodium ?? 0) + (it.sodium ?? 0),
      potassium: (acc.potassium ?? 0) + (it.potassium ?? 0),
      transFat: (acc.transFat ?? 0) + (it.transFat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function pickedToMealItem(picked: PickedFood): IMealItem {
  const { foodName, quantityG, macros } = picked;
  return {
    foodName,
    quantityG,
    kcal: macros.kcal,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    ...(macros.fiber !== undefined && { fiber: macros.fiber }),
    ...(macros.sugar !== undefined && { sugar: macros.sugar }),
    ...(macros.salt !== undefined && { salt: macros.salt }),
    ...(macros.saturated !== undefined && { saturated: macros.saturated }),
    ...(macros.polyunsaturated !== undefined && { polyunsaturated: macros.polyunsaturated }),
    ...(macros.monounsaturated !== undefined && { monounsaturated: macros.monounsaturated }),
    ...(macros.polyols !== undefined && { polyols: macros.polyols }),
    ...(macros.cholesterol !== undefined && { cholesterol: macros.cholesterol }),
    ...(macros.sodium !== undefined && { sodium: macros.sodium }),
    ...(macros.potassium !== undefined && { potassium: macros.potassium }),
    ...(macros.transFat !== undefined && { transFat: macros.transFat }),
  };
}

function emptyMeal(order: number) {
  return { name: 'Meal', order, items: [] as IMealItem[] };
}

function sumMealMacros(meal: IMeal): CoreMacros {
  return meal.items.reduce<CoreMacros>(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// ---------------------------------------------------------------------------
// NutritionTemplateForm
// ---------------------------------------------------------------------------

interface NutritionTemplateFormState {
  name: string;
  description: string;
  dayTypes: IDayType[];
  collapsed: Record<number, boolean>;
  addingFor: AddingFor | null;
  pendingDelete: PendingDelete | null;
  saving: boolean;
}

type NutritionTemplateFormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SET_DAY_TYPES'; value: IDayType[] }
  | { type: 'SET_COLLAPSED'; value: Record<number, boolean> }
  | { type: 'SET_ADDING_FOR'; value: AddingFor | null }
  | { type: 'SET_PENDING_DELETE'; value: PendingDelete | null }
  | { type: 'SET_SAVING'; value: boolean };

function nutritionTemplateFormReducer(state: NutritionTemplateFormState, action: NutritionTemplateFormAction): NutritionTemplateFormState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_DESCRIPTION': return { ...state, description: action.value };
    case 'SET_DAY_TYPES': return { ...state, dayTypes: action.value };
    case 'SET_COLLAPSED': return { ...state, collapsed: action.value };
    case 'SET_ADDING_FOR': return { ...state, addingFor: action.value };
    case 'SET_PENDING_DELETE': return { ...state, pendingDelete: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    default: return state;
  }
}

export function NutritionTemplateForm({ initialData, onSubmit, onCancel }: Props) {
  const [state, dispatch] = useReducer(nutritionTemplateFormReducer, {
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    dayTypes: initialData?.dayTypes ?? [],
    collapsed: {},
    addingFor: null,
    pendingDelete: null,
    saving: false,
  });
  const { name, description, dayTypes, collapsed, addingFor, pendingDelete, saving } = state;

  // Dirty tracking — disable Save when nothing has changed
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        dayTypes: initialData?.dayTypes ?? [],
      }),
    [initialData],
  );
  const isDirty = useMemo(
    () => JSON.stringify({ name, description, dayTypes }) !== initialSnapshot,
    [name, description, dayTypes, initialSnapshot],
  );

  function confirmDelete(): void {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'day') {
      removeDayType(pendingDelete.dayIdx);
    } else if (pendingDelete.kind === 'meal') {
      removeMeal(pendingDelete.dayIdx, pendingDelete.mealIdx);
    } else {
      removeItem(pendingDelete.dayIdx, pendingDelete.mealIdx, pendingDelete.itemIdx);
    }
    dispatch({ type: 'SET_PENDING_DELETE', value: null });
  }

  // ---- Day type operations ------------------------------------------------

  function addDayType(): void {
    const idx = dayTypes.length;
    dispatch({ type: 'SET_DAY_TYPES', value: [...dayTypes, { name: 'Training Day', meals: [] }] });
    dispatch({ type: 'SET_COLLAPSED', value: { ...collapsed, [idx]: false } });
  }

  function removeDayType(idx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.filter((_, i) => i !== idx) });
  }

  function updateDayName(idx: number, newName: string): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((day, i) => (i === idx ? { ...day, name: newName } : day)) });
  }

  function toggleCollapsed(idx: number): void {
    dispatch({ type: 'SET_COLLAPSED', value: { ...collapsed, [idx]: !collapsed[idx] } });
  }

  // ---- Meal operations ----------------------------------------------------

  function addMeal(dayIdx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((day, i) => {
      if (i !== dayIdx) return day;
      return { ...day, meals: [...day.meals, emptyMeal(day.meals.length + 1)] };
    }) });
  }

  function removeMeal(dayIdx: number, mealIdx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((day, i) => {
      if (i !== dayIdx) return day;
      return { ...day, meals: day.meals.filter((_, j) => j !== mealIdx) };
    }) });
  }

  function updateMealName(dayIdx: number, mealIdx: number, newName: string): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((day, i) => {
      if (i !== dayIdx) return day;
      return { ...day, meals: day.meals.map((m, j) => (j === mealIdx ? { ...m, name: newName } : m)) };
    }) });
  }

  // ---- Food operations ----------------------------------------------------

  function removeItem(dayIdx: number, mealIdx: number, itemIdx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((day, i) => {
      if (i !== dayIdx) return day;
      return {
        ...day,
        meals: day.meals.map((m, j) => {
          if (j !== mealIdx) return m;
          return { ...m, items: m.items.filter((_, k) => k !== itemIdx) };
        }),
      };
    }) });
  }

  function handleFoodPicked(picked: PickedFood): void {
    if (addingFor === null) return;
    const { dayIdx, mealIdx } = addingFor;
    const newItem = pickedToMealItem(picked);
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((day, i) => {
      if (i !== dayIdx) return day;
      return {
        ...day,
        meals: day.meals.map((m, j) => {
          if (j !== mealIdx) return m;
          return { ...m, items: [...m.items, newItem] };
        }),
      };
    }) });
    dispatch({ type: 'SET_ADDING_FOR', value: null });
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      await onSubmit({ name, description: description || null, dayTypes });
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 pb-24 max-w-3xl mx-auto">
        {/* Plan meta */}
        <Card className="p-4 space-y-3">
          <div>
            <Label
              htmlFor="tpl-name"
              className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block font-semibold"
            >
              Plan Name
            </Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
              required
              placeholder="e.g. Off Season Bulk"
              className="text-base font-semibold"
            />
          </div>
          <div>
            <Label
              htmlFor="tpl-desc"
              className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block font-semibold"
            >
              Description
            </Label>
            <Textarea
              id="tpl-desc"
              value={description ?? ''}
              onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', value: e.target.value })}
              rows={2}
              placeholder="Optional notes about this plan…"
            />
          </div>
        </Card>

        {/* Day types — rendered inline */}
        {dayTypes.map((dayType, dayIdx) => {
          const isCollapsed = collapsed[dayIdx] ?? false;
          const macros = sumDayMacros(dayType);
          return (
            // oxlint-disable-next-line react-doctor/no-array-index-key
            <Card key={dayIdx /* no stable id on IDayType — index is intentional */} className="overflow-hidden">
              {/* Day type header — bold, distinct background */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/50">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(dayIdx)}
                  className="p-1 -m-1 rounded cursor-pointer text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label={isCollapsed ? 'Expand day type' : 'Collapse day type'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
                <Input
                  value={dayType.name}
                  onChange={(e) => updateDayName(dayIdx, e.target.value)}
                  className="h-8 flex-1 border-0 bg-transparent px-1 text-base font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Day type name"
                  aria-label="Day type name"
                />
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: 'SET_PENDING_DELETE', value: { kind: 'day', dayIdx, name: dayType.name || 'this day type' } })
                  }
                  className="p-1.5 rounded-md cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  aria-label="Remove day type"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {/* Day type body — collapsible */}
              {!isCollapsed && (
                <div className="divide-y divide-border/50">
                  {/* Macro summary */}
                  <div className="px-4 py-3">
                    <MacroSummaryCard macros={macros} />
                  </div>

                  {/* Meals */}
                  {dayType.meals.map((meal, mealIdx) => {
                    const mealMacros = sumMealMacros(meal);
                    return (
                      <div key={`meal-${dayIdx}-${mealIdx}`} className="px-4 py-3 space-y-2">
                        {/* Meal header — small caps section style + per-meal totals */}
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-primary shrink-0" />
                          <Input
                            value={meal.name}
                            onChange={(e) => updateMealName(dayIdx, mealIdx, e.target.value)}
                            className="h-7 flex-1 border-0 bg-transparent px-0 text-sm font-semibold tracking-wide text-foreground/85 focus:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="Meal name"
                            aria-label="Meal name"
                          />
                          <div
                            className="flex items-center gap-2 shrink-0 text-sm tabular-nums"
                            aria-label="Meal totals"
                          >
                            <span className="font-semibold">
                              {mealMacros.kcal.toFixed(0)}
                              <span className="text-foreground/65 font-normal ml-1 text-xs">kcal</span>
                            </span>
                            <div className="hidden sm:flex items-center gap-1 text-xs">
                              <MacroPill value={mealMacros.protein} label="P" tone="emerald" />
                              <MacroPill value={mealMacros.carbs} label="C" tone="amber" />
                              <MacroPill value={mealMacros.fat} label="F" tone="pink" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              dispatch({ type: 'SET_PENDING_DELETE', value: {
                                kind: 'meal',
                                dayIdx,
                                mealIdx,
                                name: meal.name || 'this meal',
                              } })
                            }
                            className="p-1.5 rounded-md cursor-pointer text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                            aria-label="Remove meal"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* Food items */}
                        {meal.items.length > 0 && (
                          <ul className="space-y-0.5">
                            {meal.items.map((item, itemIdx) => (
                              <li
                                key={`item-${dayIdx}-${mealIdx}-${itemIdx}`}
                                className="group flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{item.foodName}</div>
                                  <div className="text-xs text-foreground/65 tabular-nums">
                                    {item.quantityG} g
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-sm tabular-nums">
                                  <span className="font-semibold">
                                    {item.kcal.toFixed(0)}
                                    <span className="text-foreground/65 font-normal ml-1 text-xs">kcal</span>
                                  </span>
                                  <div className="hidden sm:flex items-center gap-1 text-xs">
                                    <MacroPill value={item.protein} label="P" tone="emerald" />
                                    <MacroPill value={item.carbs} label="C" tone="amber" />
                                    <MacroPill value={item.fat} label="F" tone="pink" />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    dispatch({ type: 'SET_PENDING_DELETE', value: {
                                      kind: 'item',
                                      dayIdx,
                                      mealIdx,
                                      itemIdx,
                                      name: item.foodName,
                                    } })
                                  }
                                  className="p-1.5 rounded-md cursor-pointer text-muted-foreground/40 group-hover:text-muted-foreground hover:!bg-destructive/10 hover:!text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                  aria-label={`Remove ${item.foodName}`}
                                >
                                  <X className="size-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Add food button — dashed ghost */}
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'SET_ADDING_FOR', value: { dayIdx, mealIdx } })}
                          className="w-full py-1.5 text-xs font-medium cursor-pointer text-muted-foreground border border-dashed border-muted-foreground/30 rounded-md hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          + Add Food
                        </button>
                      </div>
                    );
                  })}

                  {/* Add meal — dashed ghost */}
                  <div className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => addMeal(dayIdx)}
                      className="w-full py-1.5 text-xs font-medium cursor-pointer text-muted-foreground border border-dashed border-muted-foreground/30 rounded-md hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      + Add Meal
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* Add day type — bigger dashed CTA */}
        <button
          type="button"
          onClick={addDayType}
          className="w-full py-3 text-sm font-medium cursor-pointer text-muted-foreground border-2 border-dashed border-muted-foreground/30 rounded-md hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          + Add Day Type
        </button>

        <div className="sticky bottom-0 z-10 flex flex-col gap-2 py-2 backdrop-blur-md bg-background/50">
          <Button type="submit" className="w-full" disabled={saving || !isDirty}>
            {saving ? 'Saving…' : 'Save Plan'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="w-full border-foreground/20 hover:border-foreground/40 hover:bg-muted"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Food picker dialog — outside form to avoid nested form issues */}
      <FoodPickerDialog
        open={addingFor !== null}
        onOpenChange={(o) => {
          if (!o) dispatch({ type: 'SET_ADDING_FOR', value: null });
        }}
        memberId={null}
        onSelect={handleFoodPicked}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) dispatch({ type: 'SET_PENDING_DELETE', value: null });
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{deleteDialogTitle(pendingDelete)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteDialogMessage(pendingDelete)}
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => dispatch({ type: 'SET_PENDING_DELETE', value: null })}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function deleteDialogTitle(pending: PendingDelete | null): string {
  if (!pending) return '';
  if (pending.kind === 'day') return 'Delete day type?';
  if (pending.kind === 'meal') return 'Delete meal?';
  return 'Remove food?';
}

function deleteDialogMessage(pending: PendingDelete | null): string {
  if (!pending) return '';
  if (pending.kind === 'day') {
    return `"${pending.name}" and all its meals will be removed. This cannot be undone until you save.`;
  }
  if (pending.kind === 'meal') {
    return `"${pending.name}" and all its food items will be removed.`;
  }
  return `"${pending.name}" will be removed from this meal.`;
}
