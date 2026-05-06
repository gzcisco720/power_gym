'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import { ChevronDown, ChevronRight, X, Trash2 } from 'lucide-react';
import type { IDayType, IMeal, IMealItem } from '@/lib/db/models/nutrition-template.model';
import type { MacroSnapshot } from '@/lib/nutrition/macros';
import type { PickedFood } from '@/components/nutrition/food-picker';

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

type MacroTone = 'emerald' | 'amber' | 'pink';

const MACRO_PILL_STYLES: Record<MacroTone, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  pink: 'bg-pink-500/15 text-pink-300',
};

function MacroPill({ value, label, tone }: { value: number; label: string; tone: MacroTone }) {
  return (
    <span
      className={`inline-flex items-baseline px-1.5 py-0.5 rounded font-semibold tabular-nums ${MACRO_PILL_STYLES[tone]}`}
    >
      {value.toFixed(0)}
      <span className="opacity-70 font-normal ml-0.5">{label}</span>
    </span>
  );
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

export function NutritionTemplateForm({ initialData, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dayTypes, setDayTypes] = useState<IDayType[]>(initialData?.dayTypes ?? []);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [addingFor, setAddingFor] = useState<AddingFor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [saving, setSaving] = useState(false);

  function confirmDelete(): void {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'day') {
      removeDayType(pendingDelete.dayIdx);
    } else if (pendingDelete.kind === 'meal') {
      removeMeal(pendingDelete.dayIdx, pendingDelete.mealIdx);
    } else {
      removeItem(pendingDelete.dayIdx, pendingDelete.mealIdx, pendingDelete.itemIdx);
    }
    setPendingDelete(null);
  }

  // ---- Day type operations ------------------------------------------------

  function addDayType(): void {
    const idx = dayTypes.length;
    setDayTypes((d) => [...d, { name: 'Training Day', meals: [] }]);
    setCollapsed((c) => ({ ...c, [idx]: false }));
  }

  function removeDayType(idx: number): void {
    setDayTypes((d) => d.filter((_, i) => i !== idx));
  }

  function updateDayName(idx: number, newName: string): void {
    setDayTypes((d) => d.map((day, i) => (i === idx ? { ...day, name: newName } : day)));
  }

  function toggleCollapsed(idx: number): void {
    setCollapsed((c) => ({ ...c, [idx]: !c[idx] }));
  }

  // ---- Meal operations ----------------------------------------------------

  function addMeal(dayIdx: number): void {
    setDayTypes((d) =>
      d.map((day, i) => {
        if (i !== dayIdx) return day;
        return { ...day, meals: [...day.meals, emptyMeal(day.meals.length + 1)] };
      }),
    );
  }

  function removeMeal(dayIdx: number, mealIdx: number): void {
    setDayTypes((d) =>
      d.map((day, i) => {
        if (i !== dayIdx) return day;
        return { ...day, meals: day.meals.filter((_, j) => j !== mealIdx) };
      }),
    );
  }

  function updateMealName(dayIdx: number, mealIdx: number, newName: string): void {
    setDayTypes((d) =>
      d.map((day, i) => {
        if (i !== dayIdx) return day;
        return {
          ...day,
          meals: day.meals.map((m, j) => (j === mealIdx ? { ...m, name: newName } : m)),
        };
      }),
    );
  }

  // ---- Food operations ----------------------------------------------------

  function removeItem(dayIdx: number, mealIdx: number, itemIdx: number): void {
    setDayTypes((d) =>
      d.map((day, i) => {
        if (i !== dayIdx) return day;
        return {
          ...day,
          meals: day.meals.map((m, j) => {
            if (j !== mealIdx) return m;
            return { ...m, items: m.items.filter((_, k) => k !== itemIdx) };
          }),
        };
      }),
    );
  }

  function handleFoodPicked(picked: PickedFood): void {
    if (addingFor === null) return;
    const { dayIdx, mealIdx } = addingFor;
    const newItem = pickedToMealItem(picked);
    setDayTypes((d) =>
      d.map((day, i) => {
        if (i !== dayIdx) return day;
        return {
          ...day,
          meals: day.meals.map((m, j) => {
            if (j !== mealIdx) return m;
            return { ...m, items: [...m.items, newItem] };
          }),
        };
      }),
    );
    setAddingFor(null);
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name, description: description || null, dayTypes });
    } finally {
      setSaving(false);
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
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
            <Card key={dayIdx} className="overflow-hidden">
              {/* Day type header — bold, distinct background */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/50">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(dayIdx)}
                  className="p-1 -m-1 rounded cursor-pointer text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label={isCollapsed ? 'Expand day type' : 'Collapse day type'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
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
                    setPendingDelete({ kind: 'day', dayIdx, name: dayType.name || 'this day type' })
                  }
                  className="p-1.5 rounded-md cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  aria-label="Remove day type"
                >
                  <Trash2 className="h-4 w-4" />
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
                      <div key={mealIdx} className="px-4 py-3 space-y-2">
                        {/* Meal header — small caps section style + per-meal totals */}
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
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
                              setPendingDelete({
                                kind: 'meal',
                                dayIdx,
                                mealIdx,
                                name: meal.name || 'this meal',
                              })
                            }
                            className="p-1.5 rounded-md cursor-pointer text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                            aria-label="Remove meal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Food items */}
                        {meal.items.length > 0 && (
                          <ul className="space-y-0.5">
                            {meal.items.map((item, itemIdx) => (
                              <li
                                key={itemIdx}
                                className="group flex items-center gap-3 px-2 py-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
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
                                    setPendingDelete({
                                      kind: 'item',
                                      dayIdx,
                                      mealIdx,
                                      itemIdx,
                                      name: item.foodName,
                                    })
                                  }
                                  className="p-1.5 rounded-md cursor-pointer text-muted-foreground/40 group-hover:text-muted-foreground hover:!bg-destructive/10 hover:!text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                  aria-label={`Remove ${item.foodName}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Add food button — dashed ghost */}
                        <button
                          type="button"
                          onClick={() => setAddingFor({ dayIdx, mealIdx })}
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

        {/* Sticky save bar */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex gap-2 z-10">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 sm:flex-none sm:min-w-32"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save Plan'}
          </Button>
        </div>
      </form>

      {/* Food picker dialog — outside form to avoid nested form issues */}
      <FoodPickerDialog
        open={addingFor !== null}
        onOpenChange={(o) => {
          if (!o) setAddingFor(null);
        }}
        memberId={null}
        onSelect={handleFoodPicked}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
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
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
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
