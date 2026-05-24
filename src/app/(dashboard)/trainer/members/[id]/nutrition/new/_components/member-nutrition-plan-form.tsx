'use client';

import { useMemo, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberHub } from '../../../_components/member-hub-provider';
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
import type { PickedFood } from '@/components/nutrition/food-picker.types';

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

// ── Reducer ────────────────────────────────────────────────────────────────

interface MemberNutritionPlanFormState {
  name: string;
  dayTypes: IDayType[];
  collapsed: Record<number, boolean>;
  addingFor: AddingFor | null;
  pendingDelete: PendingDelete | null;
  saveAsTemplate: boolean;
  templateName: string;
  scheduleOpen: boolean;
  saving: boolean;
}

type MemberNutritionPlanFormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DAY_TYPES'; value: IDayType[] }
  | { type: 'SET_COLLAPSED'; value: Record<number, boolean> }
  | { type: 'SET_ADDING_FOR'; value: AddingFor | null }
  | { type: 'SET_PENDING_DELETE'; value: PendingDelete | null }
  | { type: 'SET_SAVE_AS_TEMPLATE'; value: boolean }
  | { type: 'SET_TEMPLATE_NAME'; value: string }
  | { type: 'SET_SCHEDULE_OPEN'; value: boolean }
  | { type: 'SET_SAVING'; value: boolean };

function memberNutritionPlanFormReducer(state: MemberNutritionPlanFormState, action: MemberNutritionPlanFormAction): MemberNutritionPlanFormState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_DAY_TYPES': return { ...state, dayTypes: action.value };
    case 'SET_COLLAPSED': return { ...state, collapsed: action.value };
    case 'SET_ADDING_FOR': return { ...state, addingFor: action.value };
    case 'SET_PENDING_DELETE': return { ...state, pendingDelete: action.value };
    case 'SET_SAVE_AS_TEMPLATE': return { ...state, saveAsTemplate: action.value };
    case 'SET_TEMPLATE_NAME': return { ...state, templateName: action.value };
    case 'SET_SCHEDULE_OPEN': return { ...state, scheduleOpen: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    default: return state;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function MemberNutritionPlanForm({ memberId, initialData }: Props) {
  const { push } = useRouter();
  const { basePath } = useMemberHub();
  const [state, dispatch] = useReducer(memberNutritionPlanFormReducer, {
    name: initialData?.name ?? '',
    dayTypes: initialData?.dayTypes ?? [],
    collapsed: {},
    addingFor: null,
    pendingDelete: null,
    saveAsTemplate: false,
    templateName: initialData?.name ?? '',
    scheduleOpen: false,
    saving: false,
  });
  const { name, dayTypes, collapsed, addingFor, pendingDelete, saveAsTemplate, templateName, scheduleOpen, saving } = state;

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
    dispatch({ type: 'SET_DAY_TYPES', value: [...dayTypes, { name: `Day Type ${dayTypes.length + 1}`, meals: [] }] });
  }

  function removeDayType(dayIdx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.filter((_, i) => i !== dayIdx) });
    const next: Record<number, boolean> = {};
    for (const [k, v] of Object.entries(collapsed)) {
      const idx = Number(k);
      if (idx < dayIdx) next[idx] = v;
      else if (idx > dayIdx) next[idx - 1] = v;
    }
    dispatch({ type: 'SET_COLLAPSED', value: next });
  }

  function updateDayTypeName(dayIdx: number, value: string): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((d, i) => (i === dayIdx ? { ...d, name: value } : d)) });
  }

  // ── Meal CRUD ──────────────────────────────────────────────────────────

  function addMeal(dayIdx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((d, i) =>
      i === dayIdx ? { ...d, meals: [...d.meals, emptyMeal(d.meals.length)] } : d,
    ) });
  }

  function removeMeal(dayIdx: number, mealIdx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((d, i) =>
      i === dayIdx ? { ...d, meals: d.meals.filter((_, j) => j !== mealIdx) } : d,
    ) });
  }

  function updateMealName(dayIdx: number, mealIdx: number, value: string): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((d, i) =>
      i === dayIdx
        ? { ...d, meals: d.meals.map((m, j) => (j === mealIdx ? { ...m, name: value } : m)) }
        : d,
    ) });
  }

  // ── Item CRUD ──────────────────────────────────────────────────────────

  function addItem(dayIdx: number, mealIdx: number, picked: PickedFood): void {
    const item = pickedToMealItem(picked);
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((d, i) =>
      i === dayIdx
        ? { ...d, meals: d.meals.map((m, j) => j === mealIdx ? { ...m, items: [...m.items, item] } : m) }
        : d,
    ) });
    dispatch({ type: 'SET_ADDING_FOR', value: null });
  }

  function removeItem(dayIdx: number, mealIdx: number, itemIdx: number): void {
    dispatch({ type: 'SET_DAY_TYPES', value: dayTypes.map((d, i) =>
      i === dayIdx
        ? { ...d, meals: d.meals.map((m, j) => j === mealIdx ? { ...m, items: m.items.filter((_, k) => k !== itemIdx) } : m) }
        : d,
    ) });
  }

  // ── Delete confirmation ────────────────────────────────────────────────

  function confirmDelete(): void {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'day') removeDayType(pendingDelete.dayIdx);
    else if (pendingDelete.kind === 'meal') removeMeal(pendingDelete.dayIdx, pendingDelete.mealIdx);
    else removeItem(pendingDelete.dayIdx, pendingDelete.mealIdx, pendingDelete.itemIdx);
    dispatch({ type: 'SET_PENDING_DELETE', value: null });
  }

  // ── Final save (called from ScheduleEditor via onSave) ─────────────────

  async function handleScheduleSave(schedule: ISchedule): Promise<void> {
    dispatch({ type: 'SET_SAVING', value: true });
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
      push(`${basePath}/nutrition`);
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
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
            onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
            className="mt-1.5"
          />
        </div>

        {/* Day types */}
        <div className="px-4 sm:px-8 space-y-3">
          {/* oxlint-disable-next-line react-doctor/no-array-index-key */}
        {dayTypes.map((dt, dayIdx) => {
            const macros = sumDayMacros(dt);
            const isCollapsed = collapsed[dayIdx] ?? false;
            return (
              <div key={dayIdx /* no stable id on day types — index is intentional */} className="rounded-xl bg-card ring-1 ring-foreground/10">
                {/* Day type header */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                    onClick={() => dispatch({ type: 'SET_COLLAPSED', value: { ...collapsed, [dayIdx]: !isCollapsed } })}
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
                    onClick={() => dispatch({ type: 'SET_PENDING_DELETE', value: { kind: 'day', dayIdx, name: dt.name } })}
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
                        <div key={`meal-${dayIdx}-${mealIdx}`} className="rounded-lg bg-muted/30 border border-foreground/8 p-3">
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
                              onClick={() => dispatch({ type: 'SET_PENDING_DELETE', value: { kind: 'meal', dayIdx, mealIdx, name: meal.name } })}
                              className="text-foreground/30 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {/* Items */}
                          {meal.items.map((item, itemIdx) => (
                            <div key={`item-${dayIdx}-${mealIdx}-${itemIdx}`} className="flex items-center gap-2 py-1 text-sm">
                              <span className="flex-1 text-foreground/80">{item.foodName}</span>
                              <span className="text-foreground/40 text-xs">{item.quantityG}g</span>
                              <button
                                type="button"
                                aria-label={`Remove ${item.foodName}`}
                                onClick={() => dispatch({ type: 'SET_PENDING_DELETE', value: { kind: 'item', dayIdx, mealIdx, itemIdx, name: item.foodName } })}
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
                            onClick={() => dispatch({ type: 'SET_ADDING_FOR', value: { dayIdx, mealIdx } })}
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
              dispatch({ type: 'SET_SAVE_AS_TEMPLATE', value: e.target.checked });
              if (e.target.checked) dispatch({ type: 'SET_TEMPLATE_NAME', value: '' });
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
              onChange={(e) => dispatch({ type: 'SET_TEMPLATE_NAME', value: e.target.value })}
              className="h-7 flex-1 text-sm ml-2"
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => push(`${basePath}/nutrition`)}
            className="text-sm text-foreground/65 hover:text-foreground/80"
          >
            Cancel
          </button>
          <Button
            disabled={!canContinue}
            onClick={() => dispatch({ type: 'SET_SCHEDULE_OPEN', value: true })}
          >
            Continue → Set Schedule
          </Button>
        </div>
      </div>

      {/* Schedule sheet */}
      <Sheet open={scheduleOpen} onOpenChange={(open) => { if (!saving) dispatch({ type: 'SET_SCHEDULE_OPEN', value: open }); }}>
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
          onOpenChange={(isOpen) => { if (!isOpen) dispatch({ type: 'SET_ADDING_FOR', value: null }); }}
          memberId={memberId}
          onSelect={(picked) => addItem(addingFor.dayIdx, addingFor.mealIdx, picked)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) dispatch({ type: 'SET_PENDING_DELETE', value: null }); }}>
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
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_PENDING_DELETE', value: null })}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
