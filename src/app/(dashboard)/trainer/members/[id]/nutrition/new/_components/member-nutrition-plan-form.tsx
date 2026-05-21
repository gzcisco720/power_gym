'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import { MacroPill } from '@/components/nutrition/macro-pill';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';
import { ChevronDown, ChevronRight, X, Trash2 } from 'lucide-react';
import type { IDayType, IMeal, IMealItem } from '@/lib/db/models/nutrition-template.model';
import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';
import type { MacroSnapshot } from '@/lib/nutrition/macros';
import type { PickedFood } from '@/components/nutrition/food-picker';

// ── Types ──────────────────────────────────────────────────────────────────

export interface InitialData {
  name: string;
  dayTypes: IDayType[];
  fromTemplateId?: string;
}

interface Props {
  memberId: string;
  initialData: InitialData | null;
}

interface AddingFor { dayIdx: number; mealIdx: number }

type PendingDelete =
  | { kind: 'day'; dayIdx: number; name: string }
  | { kind: 'meal'; dayIdx: number; mealIdx: number; name: string }
  | { kind: 'item'; dayIdx: number; mealIdx: number; itemIdx: number; name: string };

// ── Helpers ────────────────────────────────────────────────────────────────

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
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function pickedToMealItem(picked: PickedFood): IMealItem {
  const { foodName, quantityG, macros } = picked;
  return {
    foodName, quantityG,
    kcal: macros.kcal, protein: macros.protein, carbs: macros.carbs, fat: macros.fat,
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

function emptyMeal(order: number): IMeal {
  return { name: 'Meal', order, items: [] };
}

// ── Component ──────────────────────────────────────────────────────────────

export function MemberNutritionPlanForm({ memberId, initialData }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? '');
  const [dayTypes, setDayTypes] = useState<IDayType[]>(initialData?.dayTypes ?? []);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [addingFor, setAddingFor] = useState<AddingFor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(initialData?.name ?? '');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptySchedule: ISchedule = useMemo(
    () => ({ weeklyPattern: [], calendarOverrides: [], iterate: true }),
    [],
  );

  const canContinue =
    name.trim().length > 0 &&
    dayTypes.length > 0 &&
    (!saveAsTemplate || templateName.trim().length > 0);

  // ── Day type CRUD ──────────────────────────────────────────────────────

  function addDayType(): void {
    setDayTypes((prev) => [...prev, { name: `Day Type ${prev.length + 1}`, meals: [] }]);
  }

  function removeDayType(dayIdx: number): void {
    setDayTypes((prev) => prev.filter((_, i) => i !== dayIdx));
    setCollapsed((prev) => {
      const next = { ...prev };
      delete next[dayIdx];
      return next;
    });
  }

  function updateDayTypeName(dayIdx: number, value: string): void {
    setDayTypes((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, name: value } : d)));
  }

  // ── Meal CRUD ──────────────────────────────────────────────────────────

  function addMeal(dayIdx: number): void {
    setDayTypes((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, meals: [...d.meals, emptyMeal(d.meals.length)] }
          : d,
      ),
    );
  }

  function removeMeal(dayIdx: number, mealIdx: number): void {
    setDayTypes((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, meals: d.meals.filter((_, j) => j !== mealIdx) }
          : d,
      ),
    );
  }

  function updateMealName(dayIdx: number, mealIdx: number, value: string): void {
    setDayTypes((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              meals: d.meals.map((m, j) => (j === mealIdx ? { ...m, name: value } : m)),
            }
          : d,
      ),
    );
  }

  // ── Item CRUD ──────────────────────────────────────────────────────────

  function addItem(dayIdx: number, mealIdx: number, picked: PickedFood): void {
    const item = pickedToMealItem(picked);
    setDayTypes((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              meals: d.meals.map((m, j) =>
                j === mealIdx ? { ...m, items: [...m.items, item] } : m,
              ),
            }
          : d,
      ),
    );
    setAddingFor(null);
  }

  function removeItem(dayIdx: number, mealIdx: number, itemIdx: number): void {
    setDayTypes((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              meals: d.meals.map((m, j) =>
                j === mealIdx
                  ? { ...m, items: m.items.filter((_, k) => k !== itemIdx) }
                  : m,
              ),
            }
          : d,
      ),
    );
  }

  // ── Delete confirmation ────────────────────────────────────────────────

  function confirmDelete(): void {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'day') removeDayType(pendingDelete.dayIdx);
    else if (pendingDelete.kind === 'meal') removeMeal(pendingDelete.dayIdx, pendingDelete.mealIdx);
    else removeItem(pendingDelete.dayIdx, pendingDelete.mealIdx, pendingDelete.itemIdx);
    setPendingDelete(null);
  }

  // ── Final save (called from ScheduleEditor via onSave) ─────────────────

  async function handleScheduleSave(schedule: ISchedule): Promise<void> {
    setSaving(true);
    try {
      let resolvedTemplateId: string | undefined;
      if (saveAsTemplate) {
        const tplRes = await fetch('/api/nutrition-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: templateName.trim(), description: null, dayTypes }),
        });
        if (!tplRes.ok) {
          toast.error('Failed to save template');
          return;
        }
        const tpl = (await tplRes.json()) as { _id: string };
        resolvedTemplateId = tpl._id;
      }

      const res = await fetch(`/api/members/${memberId}/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          dayTypes,
          schedule,
          ...(resolvedTemplateId && { templateId: resolvedTemplateId }),
          ...(initialData?.fromTemplateId && !resolvedTemplateId && {
            templateId: initialData.fromTemplateId,
          }),
        }),
      });

      if (!res.ok) {
        toast.error('Failed to save plan');
        return;
      }

      toast.success('Plan saved');
      router.push(`/trainer/members/${memberId}/nutrition`);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6 pb-32">
        {/* Plan name */}
        <div className="px-4 sm:px-8 pt-6">
          <Label htmlFor="plan-name" className="text-xs font-medium text-foreground/80">
            Plan Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="plan-name"
            placeholder="Plan name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {/* Day types */}
        <div className="px-4 sm:px-8 space-y-3">
          {dayTypes.map((dt, dayIdx) => {
            const macros = sumDayMacros(dt);
            const isCollapsed = collapsed[dayIdx] ?? false;
            return (
              <div key={dayIdx} className="rounded-xl bg-card ring-1 ring-foreground/10">
                {/* Day type header */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                    onClick={() => setCollapsed((c) => ({ ...c, [dayIdx]: !isCollapsed }))}
                    className="text-foreground/40 hover:text-foreground/70"
                  >
                    {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  <Input
                    value={dt.name}
                    onChange={(e) => updateDayTypeName(dayIdx, e.target.value)}
                    className="h-8 flex-1 text-sm font-semibold"
                    placeholder="Day type name"
                  />
                  <button
                    type="button"
                    aria-label={`Delete day type ${dt.name}`}
                    onClick={() => setPendingDelete({ kind: 'day', dayIdx, name: dt.name })}
                    className="text-foreground/30 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Macro summary */}
                {!isCollapsed && (
                  <div className="px-4 pb-2">
                    <MacroSummaryCard macros={macros} />
                  </div>
                )}

                {/* Meals */}
                {!isCollapsed && (
                  <div className="px-4 pb-3 space-y-3">
                    {dt.meals.map((meal, mealIdx) => {
                      const mealMacros = meal.items.reduce(
                        (acc, it) => ({
                          kcal: acc.kcal + it.kcal,
                          protein: acc.protein + it.protein,
                          carbs: acc.carbs + it.carbs,
                          fat: acc.fat + it.fat,
                        }),
                        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
                      );
                      return (
                        <div key={mealIdx} className="rounded-lg bg-muted/30 border border-foreground/8 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              value={meal.name}
                              onChange={(e) => updateMealName(dayIdx, mealIdx, e.target.value)}
                              className="h-7 flex-1 text-sm"
                              placeholder="Meal name"
                            />
                            <div className="flex gap-2 text-[11px] text-foreground/50 shrink-0">
                              <MacroPill
                                value={Math.round(mealMacros.kcal)}
                                label="kcal"
                                tone="amber"
                              />
                            </div>
                            <button
                              type="button"
                              aria-label={`Delete meal ${meal.name}`}
                              onClick={() => setPendingDelete({ kind: 'meal', dayIdx, mealIdx, name: meal.name })}
                              className="text-foreground/30 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {/* Items */}
                          {meal.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-2 py-1 text-sm">
                              <span className="flex-1 text-foreground/80">{item.foodName}</span>
                              <span className="text-foreground/40 text-xs">{item.quantityG}g</span>
                              <button
                                type="button"
                                aria-label={`Remove ${item.foodName}`}
                                onClick={() => setPendingDelete({ kind: 'item', dayIdx, mealIdx, itemIdx, name: item.foodName })}
                                className="text-foreground/20 hover:text-destructive"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-7 text-xs text-foreground/45 hover:text-foreground/70"
                            onClick={() => setAddingFor({ dayIdx, mealIdx })}
                          >
                            + Add Food
                          </Button>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-foreground/45"
                      onClick={() => addMeal(dayIdx)}
                    >
                      + Add Meal
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-sm"
            onClick={addDayType}
          >
            + Add Day Type
          </Button>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60">
        {/* Save as template row */}
        <div className="flex items-center gap-2.5 mb-3 rounded-lg bg-muted/40 px-3 py-2">
          <input
            type="checkbox"
            id="save-as-template"
            checked={saveAsTemplate}
            onChange={(e) => {
              setSaveAsTemplate(e.target.checked);
              if (e.target.checked) setTemplateName('');
            }}
            aria-label="Save as template"
            className="rounded"
          />
          <label htmlFor="save-as-template" className="text-sm text-foreground/80 cursor-pointer">
            Save as template
          </label>
          {saveAsTemplate && (
            <Input
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-7 flex-1 text-sm ml-2"
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/trainer/members/${memberId}/nutrition`)}
            className="text-sm text-foreground/65 hover:text-foreground/80"
          >
            Cancel
          </button>
          <Button
            disabled={!canContinue}
            onClick={() => setScheduleOpen(true)}
          >
            Continue → Set Schedule
          </Button>
        </div>
      </div>

      {/* Schedule sheet */}
      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Set Schedule</SheetTitle>
            <p className="text-[12px] text-foreground/45 mt-1">
              Configure the weekly pattern. Date overrides can only be added from tomorrow onwards.
            </p>
          </SheetHeader>
          <ScheduleEditor
            dayTypeNames={dayTypes.map((d) => d.name)}
            initialSchedule={emptySchedule}
            mode="create"
            onSave={handleScheduleSave}
          />
          {saving && (
            <p className="mt-4 text-center text-sm text-foreground/45">Saving…</p>
          )}
        </SheetContent>
      </Sheet>

      {/* Food picker */}
      {addingFor && (
        <FoodPickerDialog
          open
          onOpenChange={(isOpen) => { if (!isOpen) setAddingFor(null); }}
          memberId={memberId}
          onSelect={(picked) => addItem(addingFor.dayIdx, addingFor.mealIdx, picked)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete{' '}
              {pendingDelete?.kind === 'day'
                ? 'Day Type'
                : pendingDelete?.kind === 'meal'
                  ? 'Meal'
                  : 'Item'}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/65">
            &ldquo;{pendingDelete?.name}&rdquo; will be permanently removed.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
