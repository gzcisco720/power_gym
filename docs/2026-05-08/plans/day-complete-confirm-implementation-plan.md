# Day Complete Confirm + Future Date Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a confirm dialog before "Mark day complete" with three states (all ✓ / partial ✓ / no ✓), switch calendar marker kcal from "all logged" to "sealed only" (completed-meal items), and prevent editing future dates across three entry points.

**Architecture:** New `<DayCompleteConfirmDialog>` component triggered from `<DayCompleteBar>`. `SelfNutritionDayView` owns the dialog state and the `markDayComplete(opts: { markAll: boolean })` action. `NutritionCalendarPopover`'s kcal aggregation switches to filter-by-meal-completed. Future-date guards added in three places: page-level URL validation, day-view next-day button, and calendar-cell future-date disable.

**Tech Stack:** Next.js 15 App Router, React 19, `@base-ui/react` (dialog primitive), TailwindCSS, Jest + React Testing Library, Playwright, lucide-react icons.

**Spec:** [day-complete-confirm-design.md](./day-complete-confirm-design.md)

---

## Conventions

- Test command: `pnpm test --testPathPatterns=<pattern>` (plural)
- Lint: `pnpm lint`
- Build: `pnpm build`
- Project rules: NO `any`/`unknown` in production; theme tokens (no hex); ESLint forbids synchronous `setState` in effect bodies
- Commit style: `feat(self-tracking):`, `refactor(self-tracking):`, `fix(self-tracking):`, `test(self-tracking):`

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `src/components/self-tracking/day-complete-confirm-dialog.tsx` | Confirm dialog with 3 internal states (all/partial/none meals ✓) |
| `__tests__/components/self-tracking/day-complete-confirm-dialog.test.tsx` | New tests for dialog three-state behavior + cancel |

### Modified

| Path | Change |
|---|---|
| `src/components/self-tracking/day-complete-bar.tsx` | `onMarkComplete` → `onRequestComplete`; same shape, but caller now opens a dialog instead of submitting directly |
| `src/components/self-tracking/self-nutrition-day-view.tsx` | Owns dialog state; `markDayComplete(opts)` becomes `markAll`-aware; sealed-kcal helper; next-day button future-disable |
| `src/components/self-tracking/self-nutrition-calendar.tsx` | Future-date cells disabled regardless of entry presence |
| `src/components/self-tracking/nutrition-calendar-popover.tsx` | `RawLog` adds `meals[].completed`; kcal computed sealed-only |
| `src/app/(dashboard)/owner/my-nutrition/page.tsx` | URL `?date` validation rejects future dates → fallback today |
| `src/app/(dashboard)/trainer/my-nutrition/page.tsx` | Same |
| `__tests__/components/self-tracking/self-nutrition-day-view.test.tsx` | Mark-complete test now goes through dialog |
| `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx` | Add "future-date is disabled" test |
| `__tests__/components/self-tracking/nutrition-calendar-popover.test.tsx` | Mock log shape adds `meals[].completed` |
| `e2e/self-tracking/owner-nutrition-day.spec.ts` | mark-complete E2E goes through dialog |

---

## Stage 1 — DayCompleteConfirmDialog component

### Task 1.1: Implement dialog + 4 tests

**Files:**
- Create: `src/components/self-tracking/day-complete-confirm-dialog.tsx`
- Create: `__tests__/components/self-tracking/day-complete-confirm-dialog.test.tsx`

- [ ] **Step 1.1.1: Write the failing tests**

```tsx
// __tests__/components/self-tracking/day-complete-confirm-dialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DayCompleteConfirmDialog } from '@/components/self-tracking/day-complete-confirm-dialog';

describe('DayCompleteConfirmDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    onConfirm: jest.fn(),
    submitting: false,
  };

  beforeEach(() => {
    baseProps.onOpenChange = jest.fn();
    baseProps.onConfirm = jest.fn();
  });

  it('state A — all meals completed: shows Submit + Cancel', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={4}
        sealedKcal={2000}
        totalKcal={2000}
      />,
    );
    expect(screen.getByRole('button', { name: /^submit$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit completed only/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark all/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    expect(baseProps.onConfirm).toHaveBeenCalledWith({ markAll: false });
  });

  it('state B — partial: shows Mark all + Submit completed only + Cancel', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={3}
        sealedKcal={1800}
        totalKcal={2000}
      />,
    );
    const markAllBtn = screen.getByRole('button', { name: /mark all & submit/i });
    const submitOnlyBtn = screen.getByRole('button', { name: /submit completed only/i });
    expect(markAllBtn).toBeInTheDocument();
    expect(submitOnlyBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();

    fireEvent.click(markAllBtn);
    expect(baseProps.onConfirm).toHaveBeenCalledWith({ markAll: true });

    fireEvent.click(submitOnlyBtn);
    expect(baseProps.onConfirm).toHaveBeenCalledWith({ markAll: false });
  });

  it('state C — no meals completed: shows Mark all + Cancel only', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={0}
        sealedKcal={0}
        totalKcal={2000}
      />,
    );
    expect(screen.getByRole('button', { name: /mark all & submit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit completed only/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('Cancel calls onOpenChange(false) and not onConfirm', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={2}
        sealedKcal={900}
        totalKcal={2000}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 1.1.2: Run, expect FAIL**

```bash
pnpm test --testPathPatterns=day-complete-confirm-dialog
```
Expected: FAIL — module not found.

- [ ] **Step 1.1.3: Implement the dialog**

```tsx
// src/components/self-tracking/day-complete-confirm-dialog.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalMeals: number;
  completedMeals: number;
  sealedKcal: number;
  totalKcal: number;
  onConfirm: (opts: { markAll: boolean }) => void | Promise<void>;
  submitting: boolean;
}

export function DayCompleteConfirmDialog({
  open,
  onOpenChange,
  totalMeals,
  completedMeals,
  sealedKcal,
  totalKcal,
  onConfirm,
  submitting,
}: Props) {
  const allCompleted = totalMeals > 0 && completedMeals === totalMeals;
  const noneCompleted = completedMeals === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark today as complete?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-foreground/80">
          {allCompleted && (
            <p>
              {totalKcal} kcal across {totalMeals} {totalMeals === 1 ? 'meal' : 'meals'} ready to submit.
            </p>
          )}
          {!allCompleted && (
            <>
              <p>
                {completedMeals} of {totalMeals} {totalMeals === 1 ? 'meal' : 'meals'} completed
                {!noneCompleted && <> ({sealedKcal} kcal)</>}.
              </p>
              {!noneCompleted && (
                <p className="text-foreground/65 text-xs">
                  {totalMeals - completedMeals}{' '}
                  {totalMeals - completedMeals === 1 ? 'meal not marked complete and will' : 'meals not marked complete and will'}{' '}
                  not count.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {allCompleted ? (
            <Button onClick={() => void onConfirm({ markAll: false })} disabled={submitting}>
              Submit
            </Button>
          ) : (
            <>
              <Button onClick={() => void onConfirm({ markAll: true })} disabled={submitting}>
                Mark all & submit ({totalKcal} kcal)
              </Button>
              {!noneCompleted && (
                <Button
                  onClick={() => void onConfirm({ markAll: false })}
                  disabled={submitting}
                  variant="outline"
                >
                  Submit completed only ({sealedKcal} kcal)
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 1.1.4: Run tests, expect PASS**

```bash
pnpm test --testPathPatterns=day-complete-confirm-dialog
```
Expected: 4/4 PASS.

- [ ] **Step 1.1.5: Run full suite, lint, commit**

```bash
pnpm test 2>&1 | tail -5
pnpm lint
git add src/components/self-tracking/day-complete-confirm-dialog.tsx __tests__/components/self-tracking/day-complete-confirm-dialog.test.tsx
git commit -m "feat(self-tracking): add DayCompleteConfirmDialog with three states"
```

---

## Stage 2 — DayCompleteBar refactor

### Task 2.1: Rename `onMarkComplete` → `onRequestComplete`

**Files:**
- Modify: `src/components/self-tracking/day-complete-bar.tsx`

The semantic shift: clicking the button no longer "completes the day" directly — it requests completion (which the parent handles via dialog).

- [ ] **Step 2.1.1: Update the component**

Replace `src/components/self-tracking/day-complete-bar.tsx` with:

```tsx
// src/components/self-tracking/day-complete-bar.tsx
'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  dayCompleted: boolean;
  kcal: number;
  totalItems: number;
  onRequestComplete: () => void;
  submitting: boolean;
}

export function DayCompleteBar({ dayCompleted, kcal, totalItems, onRequestComplete, submitting }: Props) {
  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex items-center justify-between gap-3">
      <span className="text-xs text-foreground/65">
        {dayCompleted ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500 inline mr-1" />
            Day completed · {kcal} kcal
          </>
        ) : (
          <>
            {kcal} kcal · {totalItems} {totalItems === 1 ? 'item' : 'items'} logged
          </>
        )}
      </span>
      <Button
        onClick={onRequestComplete}
        disabled={dayCompleted || submitting}
        variant={dayCompleted ? 'outline' : 'default'}
      >
        {dayCompleted ? 'Day completed ✓' : 'Mark day complete'}
      </Button>
    </div>
  );
}
```

Two changes from the original:
- `onMarkComplete: () => void | Promise<void>` → `onRequestComplete: () => void` (synchronous; just opens dialog)
- Inside JSX: `onClick={() => void onMarkComplete()}` → `onClick={onRequestComplete}`

- [ ] **Step 2.1.2: Note: Stage 3 will fix the consumer**

`SelfNutritionDayView` still passes `onMarkComplete={...}` — this will fail TypeScript compilation. Don't run lint/test until Stage 3 closes the loop. Skip to Stage 3.

- [ ] **Step 2.1.3: Stage commit (will be combined with Stage 3 commit)**

Don't commit yet. Stage 3 changes the day view in the same commit so the prop rename and consumer update ship together.

---

## Stage 3 — SelfNutritionDayView integration

### Task 3.1: Wire dialog + sealed-kcal + future-date next-button + update test

**Files:**
- Modify: `src/components/self-tracking/self-nutrition-day-view.tsx`
- Modify: `__tests__/components/self-tracking/self-nutrition-day-view.test.tsx`

- [ ] **Step 3.1.1: Update the test first to match new behavior**

The existing test "Mark day complete posts dayCompleted: true" needs to flow through the dialog. Replace the file:

```tsx
// __tests__/components/self-tracking/self-nutrition-day-view.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

describe('SelfNutritionDayView', () => {
  beforeEach(() => {
    let putBody: unknown = null;
    global.fetch = jest.fn().mockImplementation((url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') {
        putBody = JSON.parse(init.body ?? '{}');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ _id: 'log1' }),
        });
      }
      // GET
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [
            { name: 'Breakfast', order: 0, completed: true, items: [{ foodName: 'A', quantityG: 100, kcal: 100, protein: 0, carbs: 0, fat: 0 }] },
            { name: 'Lunch', order: 1, completed: false, items: [{ foodName: 'B', quantityG: 100, kcal: 200, protein: 0, carbs: 0, fat: 0 }] },
          ],
          dayCompleted: false,
        }),
      });
    });
    (global as unknown as { __putBody: () => unknown }).__putBody = () => putBody;
  });

  it('Mark day complete opens confirm dialog (does not PUT directly)', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    const btn = await waitFor(() => screen.getByRole('button', { name: /mark day complete/i }));
    fireEvent.click(btn);
    // Dialog opened with title and the partial-state copy
    expect(await screen.findByRole('heading', { name: /mark today as complete/i })).toBeInTheDocument();
    // No PUT yet
    const body = (global as unknown as { __putBody: () => unknown }).__putBody();
    expect(body).toBeNull();
  });

  it('Submit completed only sends current meals + dayCompleted: true', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    fireEvent.click(await waitFor(() => screen.getByRole('button', { name: /mark day complete/i })));
    fireEvent.click(await screen.findByRole('button', { name: /submit completed only/i }));
    await waitFor(() => {
      const body = (global as unknown as { __putBody: () => { dayCompleted: boolean; meals: { completed: boolean }[] } }).__putBody();
      expect(body.dayCompleted).toBe(true);
      // Meals untouched: one true, one false
      expect(body.meals[0].completed).toBe(true);
      expect(body.meals[1].completed).toBe(false);
    });
  });

  it('Mark all & submit flips every meal to completed: true and submits', async () => {
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    fireEvent.click(await waitFor(() => screen.getByRole('button', { name: /mark day complete/i })));
    fireEvent.click(await screen.findByRole('button', { name: /mark all & submit/i }));
    await waitFor(() => {
      const body = (global as unknown as { __putBody: () => { dayCompleted: boolean; meals: { completed: boolean }[] } }).__putBody();
      expect(body.dayCompleted).toBe(true);
      expect(body.meals.every((m) => m.completed === true)).toBe(true);
    });
  });

  it('shows "Day completed" disabled when dayCompleted is true on initial load', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          date: '2026-05-08',
          sourceTemplateId: null,
          sourceTemplateDayTypeName: null,
          dayLabel: 'Freestyle',
          meals: [],
          dayCompleted: true,
        }),
      });
    });
    render(<SelfNutritionDayView initialDate="2026-05-08" />);
    const btn = await waitFor(() => screen.getByRole('button', { name: /day completed/i }));
    expect(btn).toBeDisabled();
  });

  it('disables next-day arrow when next date would be in the future', async () => {
    const today = new Date().toISOString().slice(0, 10);
    render(<SelfNutritionDayView initialDate={today} />);
    // Wait for log to load (any non-loading state)
    await waitFor(() => screen.getByRole('button', { name: /mark day complete/i }));
    // Find the next-day button — its label includes the future date and a → arrow.
    const nextBtns = screen.getAllByRole('button').filter((b) => /→/.test(b.textContent ?? ''));
    expect(nextBtns.length).toBeGreaterThan(0);
    expect(nextBtns[0]).toBeDisabled();
  });
});
```

- [ ] **Step 3.1.2: Run tests, expect FAIL**

```bash
pnpm test --testPathPatterns=self-nutrition-day-view
```
Expected: FAIL — old `markDayComplete` puts dayCompleted directly on click; no dialog.

- [ ] **Step 3.1.3: Replace the day view component**

```tsx
// src/components/self-tracking/self-nutrition-day-view.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SaveAsTemplateCheckbox } from './save-as-template-checkbox';
import { DayCompleteBar } from './day-complete-bar';
import { DayCompleteConfirmDialog } from './day-complete-confirm-dialog';
import { NutritionCalendarPopover } from './nutrition-calendar-popover';
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
  onDateChange?: (date: string) => void;
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

function sealedKcal(meals: ISelfMeal[]): number {
  return meals
    .filter((m) => m.completed)
    .reduce((s, m) => s + m.items.reduce((sk, it) => sk + it.kcal, 0), 0);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
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

export function SelfNutritionDayView({ initialDate, readOnly = false, onDateChange }: Props) {
  // initialDate is intentionally used only as the initial value for date state.
  // The parent supplies a `key` prop to force remount when URL date changes.
  const [date, setDateInternal] = useState(initialDate);

  const [log, setLog] = useState<SelfNutritionLog | null>(null);
  const [pickerForMeal, setPickerForMeal] = useState<number | null>(null);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function setDate(next: string): void {
    setDateInternal(next);
    onDateChange?.(next);
  }

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

  const totalItems = useMemo(
    () => (log ? log.meals.reduce((s, m) => s + m.items.length, 0) : 0),
    [log],
  );

  const completedMeals = useMemo(
    () => (log ? log.meals.filter((m) => m.completed).length : 0),
    [log],
  );

  const sealedTotal = useMemo(() => (log ? sealedKcal(log.meals) : 0), [log]);

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

  async function markDayComplete(opts: { markAll: boolean }): Promise<void> {
    if (!log) return;
    setSubmittingComplete(true);
    const nextMeals = opts.markAll
      ? log.meals.map((m) => ({ ...m, completed: true }))
      : log.meals;
    const next: SelfNutritionLog = { ...log, meals: nextMeals, dayCompleted: true };
    await persist(next);
    setSubmittingComplete(false);
    setConfirmOpen(false);
  }

  if (!log) return <div className="p-4 text-foreground/65 text-sm">Loading…</div>;

  const today = todayUTC();
  const nextDate = shiftDate(date, 1);
  const canGoNext = nextDate <= today;

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(shiftDate(date, -1))}
          disabled={readOnly}
        >
          ← {shiftDate(date, -1)}
        </Button>
        <NutritionCalendarPopover
          onSelect={(d) => setDate(d)}
          selectedDate={date}
          trigger={
            <button
              className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              disabled={readOnly}
              aria-label={`Open calendar (${date})`}
            >
              {date}
              <ChevronDown className="h-3 w-3 text-foreground/65" />
            </button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(nextDate)}
          disabled={readOnly || !canGoNext}
        >
          {nextDate} →
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

      {!readOnly && (
        <SaveDayAsTemplate
          onSubmit={async ({ name, description }) => {
            const res = await fetch(`/api/me/nutrition-logs/${date}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sourceTemplateId: log.sourceTemplateId,
                sourceTemplateDayTypeName: log.sourceTemplateDayTypeName,
                dayLabel: log.dayLabel,
                meals: log.meals,
                dayCompleted: log.dayCompleted,
                saveAsTemplate: {
                  name: name.trim(),
                  description: description.trim() || undefined,
                },
              }),
            });
            if (res.ok) {
              const data = (await res.json()) as { createdTemplateId?: string };
              if (data.createdTemplateId) toast.success('Saved as template');
            } else {
              toast.error('Failed to save template');
            }
          }}
        />
      )}

      {!readOnly && (
        <DayCompleteBar
          dayCompleted={log.dayCompleted}
          kcal={log.dayCompleted ? Math.round(sealedTotal) : Math.round(macros.kcal)}
          totalItems={totalItems}
          onRequestComplete={() => setConfirmOpen(true)}
          submitting={submittingComplete}
        />
      )}

      <DayCompleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        totalMeals={log.meals.length}
        completedMeals={completedMeals}
        sealedKcal={Math.round(sealedTotal)}
        totalKcal={Math.round(macros.kcal)}
        onConfirm={markDayComplete}
        submitting={submittingComplete}
      />
    </div>
  );
}

interface SaveDayAsTemplateProps {
  onSubmit: (v: { name: string; description: string }) => Promise<void>;
}

function SaveDayAsTemplate({ onSubmit }: SaveDayAsTemplateProps) {
  const [save, setSave] = useState<{ name: string; description: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = save !== null && save.name.trim() !== '';

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 space-y-3">
      <SaveAsTemplateCheckbox value={save} onChange={setSave} />
      <Button
        size="sm"
        disabled={!canSubmit || submitting}
        onClick={async () => {
          if (!save) return;
          setSubmitting(true);
          await onSubmit(save);
          setSubmitting(false);
          setSave(null);
        }}
      >
        Save as template
      </Button>
    </div>
  );
}
```

Key changes vs. the previous file:
1. Added `sealedKcal`, `todayUTC` helpers
2. Added `confirmOpen`, `completedMeals`, `sealedTotal` state/memos
3. `markDayComplete` now accepts `opts: { markAll: boolean }`, builds `nextMeals` accordingly, closes dialog after persist
4. Imported `DayCompleteConfirmDialog`
5. `DayCompleteBar` now uses `onRequestComplete` and shows `sealedTotal` when `dayCompleted` (otherwise `macros.kcal`)
6. Render `<DayCompleteConfirmDialog>` at the end
7. Next-day button now disables when `nextDate > today` (`!canGoNext`)

- [ ] **Step 3.1.4: Run the day-view tests**

```bash
pnpm test --testPathPatterns=self-nutrition-day-view
```
Expected: 5/5 PASS.

- [ ] **Step 3.1.5: Run full suite + lint, commit Stage 2 + Stage 3 together**

```bash
pnpm test 2>&1 | tail -5
pnpm lint
git add src/components/self-tracking/day-complete-bar.tsx src/components/self-tracking/self-nutrition-day-view.tsx __tests__/components/self-tracking/self-nutrition-day-view.test.tsx
git commit -m "feat(self-tracking): wire DayCompleteConfirmDialog + sealed kcal + future-date guard"
```

---

## Stage 4 — Calendar future-date disable

### Task 4.1: Future cells disabled regardless of entry presence

**Files:**
- Modify: `src/components/self-tracking/self-nutrition-calendar.tsx`
- Modify: `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx`

- [ ] **Step 4.1.1: Add a failing test for future-date disable**

Append a third test to `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx`:

```tsx
  it('disables future-date cells even when an entry exists for that future date', () => {
    // Build a date 3 days in the future
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 3);
    const futureDate = future.toISOString().slice(0, 10);
    const sample = [{ date: futureDate, kcal: 1500, dayLabel: 'Freestyle', dayCompleted: false }];
    const onSelect = jest.fn();
    render(<SelfNutritionCalendar entries={sample} onSelect={onSelect} />);

    const futureDay = future.getUTCDate();
    // Find the cell — it might appear with full label if the renderer thinks it has entry,
    // or simple "Day {N}" if disabled. We accept either label form.
    const candidates = [
      ...screen.queryAllByRole('button', { name: new RegExp(`^Day ${futureDay}$`, 'i') }),
      ...screen.queryAllByRole('button', { name: new RegExp(`Day ${futureDay},`, 'i') }),
    ];
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach((btn) => expect(btn).toBeDisabled());
  });
```

Note: this test requires the future date to land in the same calendar month as today; if today's date is near month-end the +3 may roll over. Mitigation: set `setUTCDate(d.getUTCDate() + 3)` is what I wrote — Date object handles month rollover, but the calendar component only renders the current month by default. To be robust, the test starts with today's month (calendar default) and only checks if a future cell is rendered; if it isn't (today is e.g. month-end), the test still passes via the `expect(candidates.length).toBeGreaterThan(0)` failing — fix in next bullet.

A more robust version: use `+1` instead of `+3` (next-day is almost always still in current month). Update the test to use `+1`:

```tsx
    future.setUTCDate(future.getUTCDate() + 1);
```

- [ ] **Step 4.1.2: Run, expect FAIL**

```bash
pnpm test --testPathPatterns=self-nutrition-calendar
```

- [ ] **Step 4.1.3: Update the calendar component**

Replace `src/components/self-tracking/self-nutrition-calendar.tsx` with:

```tsx
// src/components/self-tracking/self-nutrition-calendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NutritionDayEntry {
  date: string; // 'YYYY-MM-DD'
  kcal: number;
  dayLabel: string;
  dayCompleted: boolean;
}

interface Props {
  entries: NutritionDayEntry[];
  onSelect: (entry: NutritionDayEntry) => void;
  selectedDate?: string;
  onMonthChange?: (year: number, month: number) => void;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  return { startOffset: (firstDay + 6) % 7, daysInMonth };
}

export function SelfNutritionCalendar({ entries, onSelect, selectedDate, onMonthChange }: Props) {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const entriesByDay = useMemo(() => {
    const map = new Map<number, NutritionDayEntry>();
    for (const e of entries) {
      const [y, m, d] = e.date.split('-').map(Number);
      if (y === year && m === month) map.set(d, e);
    }
    return map;
  }, [entries, year, month]);

  function shift(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setYear(ny);
    setMonth(nm);
    onMonthChange?.(ny, nm);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDay = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button
          onClick={() => shift(1)}
          aria-label="Next month"
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-foreground/65 py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const entry = entriesByDay.get(day);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isFuture = dateStr > todayISO;
          const canSelect = entry !== undefined && !isFuture;
          const isSelected = canSelect && dateStr === selectedDate;
          const isToday = isCurrentMonth && day === todayDay;
          const status = entry ? (entry.dayCompleted ? 'completed' : 'in progress') : null;
          const ariaLabel = entry && !isFuture
            ? `Day ${day}, ${entry.kcal} kcal, ${status}`
            : `Day ${day}`;

          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => canSelect && onSelect(entry)}
                disabled={!canSelect}
                aria-label={ariaLabel}
                className={cn(
                  'w-9 h-11 rounded-md text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors',
                  isSelected && 'bg-foreground text-background font-bold',
                  !isSelected && canSelect && 'text-foreground hover:bg-foreground/10',
                  !canSelect && 'text-foreground/40',
                  isToday && !isSelected && 'ring-1 ring-foreground/25',
                )}
              >
                <span className="leading-none">{day}</span>
                {entry && !isFuture && (
                  <span className={cn(
                    'text-[9px] tabular-nums leading-none',
                    isSelected ? 'text-background/80' :
                      entry.dayCompleted ? 'text-emerald-300' : 'text-emerald-300/70',
                  )}>
                    {entry.kcal}
                  </span>
                )}
                {entry && !isFuture && (
                  <span className={cn(
                    'h-1 w-1 rounded-full',
                    isSelected ? 'bg-background/80' :
                      entry.dayCompleted ? 'bg-emerald-500' : 'bg-emerald-500/40',
                  )} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Key change: `isFuture = dateStr > todayISO` (string comparison works on YYYY-MM-DD format), and `canSelect` accounts for it. Future entries (which shouldn't exist normally) are also rendered as plain disabled cells with the simple `Day {N}` aria-label.

- [ ] **Step 4.1.4: Run tests, expect PASS**

```bash
pnpm test --testPathPatterns=self-nutrition-calendar
```
Expected: 3/3 PASS.

- [ ] **Step 4.1.5: Run full suite, lint, commit**

```bash
pnpm test 2>&1 | tail -5
pnpm lint
git add src/components/self-tracking/self-nutrition-calendar.tsx __tests__/components/self-tracking/self-nutrition-calendar.test.tsx
git commit -m "fix(self-tracking): disable future-date cells in calendar"
```

---

## Stage 5 — NutritionCalendarPopover sealed kcal calc

### Task 5.1: Switch kcal aggregation to sealed-only + update test mock

**Files:**
- Modify: `src/components/self-tracking/nutrition-calendar-popover.tsx`
- Modify: `__tests__/components/self-tracking/nutrition-calendar-popover.test.tsx`

- [ ] **Step 5.1.1: Update the test mock first to expose the new shape**

Replace the test file content:

```tsx
// __tests__/components/self-tracking/nutrition-calendar-popover.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionCalendarPopover } from '@/components/self-tracking/nutrition-calendar-popover';

const today = new Date().toISOString().slice(0, 10);

describe('NutritionCalendarPopover', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          date: today,
          dayLabel: 'Freestyle',
          dayCompleted: false,
          meals: [
            // sealed (1500): meal completed
            { completed: true, items: [{ kcal: 1500 }] },
            // not sealed (200): meal not completed
            { completed: false, items: [{ kcal: 200 }] },
          ],
        },
      ]),
    });
  });

  it('shows sealed-only kcal in calendar marker (excludes incomplete-meal items)', async () => {
    const onSelect = jest.fn();
    render(
      <NutritionCalendarPopover
        onSelect={onSelect}
        trigger={<button>Open</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dayNum = new Date().getDate();
    // 1500 kcal expected (sealed only), not 1700 (all)
    const dayBtn = await waitFor(() =>
      screen.getByRole('button', {
        name: new RegExp(`Day ${dayNum}, 1500 kcal, in progress`, 'i'),
      }),
    );
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(today);
  });
});
```

- [ ] **Step 5.1.2: Run test, expect FAIL**

```bash
pnpm test --testPathPatterns=nutrition-calendar-popover
```
Expected: FAIL — current code sums all items regardless of `meal.completed`.

- [ ] **Step 5.1.3: Update the popover component**

Replace `src/components/self-tracking/nutrition-calendar-popover.tsx`:

```tsx
'use client';

import { useEffect, useState, type ReactElement } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
} from '@/components/ui/popover';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';

interface RawLog {
  date: string;
  dayLabel: string;
  dayCompleted: boolean;
  meals: { completed: boolean; items: { kcal: number }[] }[];
}

interface Props {
  trigger: ReactElement;
  onSelect: (date: string) => void;
  selectedDate?: string;
}

export function NutritionCalendarPopover({ trigger, onSelect, selectedDate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      {open && (
        <PopoverPortal>
          <PopoverPositioner align="end">
            <PopoverPopup className="w-[296px] p-0">
              <NutritionCalendarBody
                onSelect={(date) => {
                  setOpen(false);
                  onSelect(date);
                }}
                selectedDate={selectedDate}
              />
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      )}
    </Popover>
  );
}

interface BodyProps {
  onSelect: (date: string) => void;
  selectedDate?: string;
}

function NutritionCalendarBody({ onSelect, selectedDate }: BodyProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((logs: RawLog[]) => {
        if (cancelled) return;
        setEntries(
          logs.map((l) => ({
            date: l.date,
            dayLabel: l.dayLabel,
            dayCompleted: l.dayCompleted,
            kcal: l.meals
              .filter((m) => m.completed)
              .flatMap((m) => m.items)
              .reduce((s, it) => s + it.kcal, 0),
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return (
    <SelfNutritionCalendar
      entries={entries}
      onSelect={(e) => onSelect(e.date)}
      selectedDate={selectedDate}
      onMonthChange={(y, m) => {
        setYear(y);
        setMonth(m);
      }}
    />
  );
}
```

Two changes vs. previous file:
- `RawLog.meals[]` adds `completed: boolean`
- kcal reducer wraps with `.filter((m) => m.completed)` before flatMap

- [ ] **Step 5.1.4: Run test, expect PASS**

```bash
pnpm test --testPathPatterns=nutrition-calendar-popover
```

- [ ] **Step 5.1.5: Lint + commit**

```bash
pnpm test 2>&1 | tail -5
pnpm lint
git add src/components/self-tracking/nutrition-calendar-popover.tsx __tests__/components/self-tracking/nutrition-calendar-popover.test.tsx
git commit -m "fix(self-tracking): show sealed-only kcal on calendar marker"
```

---

## Stage 6 — Page-level future date URL guard

### Task 6.1: Owner page

**Files:**
- Modify: `src/app/(dashboard)/owner/my-nutrition/page.tsx`

- [ ] **Step 6.1.1: Update validation logic**

Read existing file and find the line that computes `date`:

```tsx
const date = rawDate && DATE_RE.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10);
```

Replace with:

```tsx
const today = new Date().toISOString().slice(0, 10);
const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;
```

- [ ] **Step 6.1.2: Lint + run full suite + build**

```bash
pnpm lint
pnpm test 2>&1 | tail -5
pnpm build 2>&1 | tail -10
```

- [ ] **Step 6.1.3: Commit**

```bash
git add src/app/\(dashboard\)/owner/my-nutrition/page.tsx
git commit -m "fix(self-tracking): owner nutrition page silently rejects future ?date= query"
```

---

### Task 6.2: Trainer page

**Files:**
- Modify: `src/app/(dashboard)/trainer/my-nutrition/page.tsx`

- [ ] **Step 6.2.1: Apply identical change**

Same line replacement as Task 6.1:

```tsx
const today = new Date().toISOString().slice(0, 10);
const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;
```

- [ ] **Step 6.2.2: Lint + commit**

```bash
pnpm lint
pnpm test 2>&1 | tail -5
pnpm build 2>&1 | tail -10
git add src/app/\(dashboard\)/trainer/my-nutrition/page.tsx
git commit -m "fix(self-tracking): trainer nutrition page silently rejects future ?date= query"
```

---

## Stage 7 — E2E mark-complete via dialog

### Task 7.1: Update `owner-nutrition-day.spec.ts`

**Files:**
- Modify: `e2e/self-tracking/owner-nutrition-day.spec.ts`

- [ ] **Step 7.1.1: Find the existing mark-complete test**

```bash
grep -n "Mark day complete\|mark-complete\|day completed" e2e/self-tracking/owner-nutrition-day.spec.ts
```

The test currently clicks `Mark day complete` and expects the button to flip to `Day completed ✓`. With the dialog, the click now opens the dialog; the user must then click `Submit completed only` (or `Mark all & submit`) to actually persist.

- [ ] **Step 7.1.2: Update the test**

The seeded log has `meals[0]` with one Egg item but `completed: false` by default (the seed in `beforeEach` does not flip meal-level completed flags). So when Mark day complete is clicked, the dialog will show partial state (1 item logged on Breakfast not marked, 0 of 4 meals completed).

In state C (no meals ✓Completed), the dialog renders `Mark all & submit` and `Cancel` only. So the test should click `Mark all & submit`:

Replace this block in `e2e/self-tracking/owner-nutrition-day.spec.ts`:

```ts
test('owner can Mark day complete and the button transitions to disabled', async ({ page }) => {
  await page.goto('/owner/my-nutrition');

  // Click Mark day complete
  const markBtn = page.getByRole('button', { name: /^mark day complete$/i });
  await expect(markBtn).toBeVisible();
  await markBtn.click();

  // After PUT, button should swap to disabled "Day completed ✓"
  await expect(page.getByRole('button', { name: /^day completed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^day completed/i })).toBeDisabled();
});
```

with:

```ts
test('owner can Mark day complete via confirm dialog and the button transitions to disabled', async ({ page }) => {
  await page.goto('/owner/my-nutrition');

  // Click Mark day complete — opens confirm dialog
  const markBtn = page.getByRole('button', { name: /^mark day complete$/i });
  await expect(markBtn).toBeVisible();
  await markBtn.click();

  // Dialog should appear with title
  await expect(page.getByRole('heading', { name: /mark today as complete/i })).toBeVisible();

  // Seeded state has 0 meals marked complete → state C: only "Mark all & submit" + Cancel
  await page.getByRole('button', { name: /mark all & submit/i }).click();

  // After PUT, the bar's button should swap to disabled "Day completed ✓"
  await expect(page.getByRole('button', { name: /^day completed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^day completed/i })).toBeDisabled();
});
```

- [ ] **Step 7.1.3: Run the spec**

```bash
pnpm test:e2e -- e2e/self-tracking/owner-nutrition-day.spec.ts 2>&1 | tail -20
```
Expected: 2 tests passing (the existing save-as-template + the updated mark-complete).

If the test fails with a stale `dayCompleted: true` state from a prior run, the existing `beforeEach` re-seeds the log with `dayCompleted: false` so it should be safe. If the test still fails, double-check the `beforeEach` flushes the `dayCompleted` flag too.

- [ ] **Step 7.1.4: Commit**

```bash
git add e2e/self-tracking/owner-nutrition-day.spec.ts
git commit -m "test(self-tracking): mark-complete e2e routes through confirm dialog"
```

---

## Stage 8 — Final smoke + INDEX update + delete plan

### Task 8.1: Verification + cleanup

- [ ] **Step 8.1.1: Run full verification**

```bash
pnpm test 2>&1 | tail -8
pnpm lint 2>&1 | tail -5
pnpm build 2>&1 | tail -25
pnpm test:e2e -- e2e/self-tracking 2>&1 | tail -15
```

Expected:
- Jest: ~1010 tests passing (was 1008; +1 confirm-dialog suite +1 day-view test cases roughly)
- Lint: 0 warnings
- Build: clean
- E2E: 5 tests passing across 4 specs

- [ ] **Step 8.1.2: Update `docs/INDEX.md`**

Read current `docs/INDEX.md`. Make these edits:

1. **Implementation Plans section**: Remove the row for `Day Complete Confirm + Future Date Lockdown` (if it was added when this plan was committed; if not, no-op).
2. **Specs & Designs section**: Confirm the `Day Complete Confirm + Future Date Lockdown` row exists with `Approved` status. The spec doc was already added with that status.

- [ ] **Step 8.1.3: Delete the implementation plan file**

```bash
rm docs/2026-05-08/plans/day-complete-confirm-implementation-plan.md
```

- [ ] **Step 8.1.4: Final commit**

```bash
git add docs/INDEX.md
git status   # confirm deletion + INDEX edit only
git commit -m "docs(self-tracking): mark day complete confirm refactor complete; remove implementation plan"
```

- [ ] **Step 8.1.5: Branch summary**

```bash
git log --oneline 2498d46..HEAD | wc -l
git diff --stat 2498d46..HEAD | tail -3
```

(`2498d46` is the spec doc commit on main; this counts only refactor commits.)

---

## Self-Review Checklist (mapping spec sections to tasks)

| Spec section | Task |
|---|---|
| ① Three-layer kcal semantics | Stage 3 (sealed kcal helper, DayCompleteBar `dayCompleted ? sealed : all`) |
| ② Confirm dialog three states | Stage 1 (dialog component + 4 tests) |
| ③ Data flow changes (markDayComplete(opts), DayCompleteBar onRequestComplete) | Stage 2 (bar) + Stage 3 (day view) |
| ④ Calendar marker sealed-only | Stage 5 (popover kcal calc + test mock update) |
| ⑤ Future date lockdown — A (next-day btn) | Stage 3 (canGoNext disable) |
| ⑤ Future date lockdown — B (calendar cells) | Stage 4 (isFuture disable + test) |
| ⑤ Future date lockdown — C (URL ?date) | Stage 6.1 + 6.2 |
| ⑥ File deletion list | All staged across the plan; nothing intentionally deleted in Stage 6 |
| ⑦ Tests — new dialog tests | Stage 1 (4 cases) |
| ⑦ Tests — day-view existing test update | Stage 3 (4 day-view test cases including future-day disable) |
| ⑦ Tests — calendar future-date | Stage 4 |
| ⑦ Tests — popover mock | Stage 5 |
| ⑦ Tests — E2E dialog flow | Stage 7 |
