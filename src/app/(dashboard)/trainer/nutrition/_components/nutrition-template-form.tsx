'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import { ChevronDown, ChevronRight, X, Trash2 } from 'lucide-react';
import type { IDayType, IMealItem } from '@/lib/db/models/nutrition-template.model';
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
}

interface AddingFor {
  dayIdx: number;
  mealIdx: number;
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

// ---------------------------------------------------------------------------
// NutritionTemplateForm
// ---------------------------------------------------------------------------

export function NutritionTemplateForm({ initialData, onSubmit }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dayTypes, setDayTypes] = useState<IDayType[]>(initialData?.dayTypes ?? []);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [addingFor, setAddingFor] = useState<AddingFor | null>(null);
  const [saving, setSaving] = useState(false);

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
      <form onSubmit={handleSubmit} className="space-y-4 pb-8">
        {/* Plan meta */}
        <Card className="p-3 space-y-2">
          <div>
            <Label htmlFor="tpl-name" className="text-xs text-muted-foreground mb-1 block">
              Plan Name
            </Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Off Season Bulk"
            />
          </div>
          <div>
            <Label htmlFor="tpl-desc" className="text-xs text-muted-foreground mb-1 block">
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
              {/* Day type header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(dayIdx)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
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
                  className="h-7 flex-1 border-0 bg-transparent px-0 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Day type name"
                  aria-label="Day type name"
                />
                <button
                  type="button"
                  onClick={() => removeDayType(dayIdx)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove day type"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Day type body — collapsible */}
              {!isCollapsed && (
                <div className="divide-y divide-border/50">
                  {/* Macro summary */}
                  <div className="px-3 py-3">
                    <MacroSummaryCard macros={macros} />
                  </div>

                  {/* Meals */}
                  {dayType.meals.map((meal, mealIdx) => (
                    <div key={mealIdx} className="px-3 py-3 space-y-2">
                      {/* Meal header */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={meal.name}
                          onChange={(e) => updateMealName(dayIdx, mealIdx, e.target.value)}
                          className="h-7 flex-1 border-0 bg-transparent px-0 text-sm font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                          placeholder="Meal name"
                          aria-label="Meal name"
                        />
                        <button
                          type="button"
                          onClick={() => removeMeal(dayIdx, mealIdx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove meal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Food items */}
                      {meal.items.length > 0 && (
                        <ul className="divide-y divide-border/30 text-xs">
                          {meal.items.map((item, itemIdx) => (
                            <li
                              key={itemIdx}
                              className="flex items-center justify-between py-1.5 gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-medium truncate block">{item.foodName}</span>
                                <span className="text-muted-foreground">{item.quantityG}g</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-muted-foreground tabular-nums">
                                  {item.kcal.toFixed(0)}&thinsp;kcal
                                  &nbsp;·&nbsp;
                                  <span className="text-emerald-400">{item.protein.toFixed(1)}P</span>
                                  &nbsp;·&nbsp;
                                  <span className="text-amber-400">{item.carbs.toFixed(1)}C</span>
                                  &nbsp;·&nbsp;
                                  <span className="text-pink-400">{item.fat.toFixed(1)}F</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeItem(dayIdx, mealIdx, itemIdx)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  aria-label={`Remove ${item.foodName}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Add food button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary hover:text-primary"
                        onClick={() => setAddingFor({ dayIdx, mealIdx })}
                      >
                        + Add Food
                      </Button>
                    </div>
                  ))}

                  {/* Add meal */}
                  <div className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => addMeal(dayIdx)}
                    >
                      + Add Meal
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* Add day type */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addDayType}
        >
          + Add Day Type
        </Button>

        {/* Save */}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
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
    </>
  );
}
