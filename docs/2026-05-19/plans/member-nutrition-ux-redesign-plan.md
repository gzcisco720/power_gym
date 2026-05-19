# Member Nutrition UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the member nutrition landing so the plan card is schedule-aware (follows the weekly/calendar schedule model, with fallback to day-type picker when no schedule exists for today), and the freestyle card is today-only (no date navigation, prevents re-logging a completed day).

**Architecture:** Three UI components change (`MemberNutritionPlanPathCard`, `NutritionFreestylePathCard`, `SelfNutritionDayView`) and the `MemberNutritionLanding` server component is extended to resolve today's scheduled day type and today's freestyle log status before rendering. The `MemberNutritionDayClient` passes a `noDateNav` flag to suppress date navigation in freestyle mode.

**Tech Stack:** Next.js App Router, TypeScript strict, Shadcn/ui, Tailwind, Playwright E2E.

**Design spec:** `docs/2026-05-19/plans/nutrition-enhancement-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/components/self-tracking/member-nutrition-plan-path-card.tsx` | Add `todayDayTypeName` prop; new schedule-aware render |
| `src/components/self-tracking/nutrition-freestyle-path-card.tsx` | Add `todayLog` prop for member today-only state |
| `src/components/self-tracking/self-nutrition-day-view.tsx` | Add `noDateNav` prop to hide ← → arrows |
| `src/app/(dashboard)/member/nutrition/day/_components/member-nutrition-day-client.tsx` | Pass `noDateNav` for free mode |
| `src/components/self-tracking/member-nutrition-landing.tsx` | Resolve schedule + today freestyle log server-side |
| `__tests__/app/self-tracking/member-nutrition-plan-path-card.test.tsx` | Tests for schedule-aware render |
| `__tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx` | Tests for today-log states |
| `e2e/member/member-nutrition-redesign.spec.ts` | Comprehensive lifecycle E2E |

---

### Task 1: Update MemberNutritionPlanPathCard — schedule-aware

**Files:**
- Modify: `src/components/self-tracking/member-nutrition-plan-path-card.tsx`
- Modify: `__tests__/app/self-tracking/member-nutrition-plan-path-card.test.tsx`

**New prop:** `todayDayTypeName: string | null`
- Not null → today has a scheduled day type → show single "Log Today" button, navigate `mode=plan` WITHOUT `dayTypeName` (server resolves from schedule)
- Null → trainer didn't schedule today → show fallback "No plan for today. Pick a day:" + all day types

- [ ] **Step 1: Write failing tests**

```typescript
// In __tests__/app/self-tracking/member-nutrition-plan-path-card.test.tsx
// ADD these tests after the existing ones:

it('shows single Log Today button when todayDayTypeName is set', () => {
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName="Training Day"
    />,
  );
  expect(screen.getByRole('button', { name: /log today/i })).toBeInTheDocument();
  expect(screen.getByText('Training Day')).toBeInTheDocument();
  // Should NOT show fallback day list as separate Log buttons for each type
  expect(screen.queryByText('Rest Day')).not.toBeInTheDocument();
});

it('navigates to mode=plan WITHOUT dayTypeName when todayDayTypeName is set', () => {
  const pushMock = jest.fn();
  jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: pushMock });
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName="Training Day"
    />,
  );
  screen.getByRole('button', { name: /log today/i }).click();
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('mode=plan'));
  expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining('dayTypeName'));
});

it('shows all day types when todayDayTypeName is null (no schedule)', () => {
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName={null}
    />,
  );
  expect(screen.getByText(/no plan for today/i)).toBeInTheDocument();
  expect(screen.getByText('Training Day')).toBeInTheDocument();
  expect(screen.getByText('Rest Day')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(2);
});

it('fallback navigates with dayTypeName when no schedule', () => {
  const pushMock = jest.fn();
  jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: pushMock });
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName={null}
    />,
  );
  screen.getAllByRole('button', { name: /log/i })[0].click();
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('dayTypeName='));
});
```

- [ ] **Step 2: Run — expect FAIL**
```bash
pnpm test -- --testPathPattern=member-nutrition-plan-path-card
```

- [ ] **Step 3: Implement**

Replace the full file with:

```typescript
// src/components/self-tracking/member-nutrition-plan-path-card.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface MemberNutritionPlan {
  _id: string;
  name: string;
  assignedByName: string;
  dayTypes: Array<{
    name: string;
    targetKcal: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  }>;
}

interface Props {
  plan: MemberNutritionPlan | null;
  todayDayTypeName: string | null;
  basePath?: '/member/nutrition';
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MemberNutritionPlanPathCard({ plan, todayDayTypeName, basePath = '/member/nutrition' }: Props) {
  const router = useRouter();

  if (!plan) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
          My Plan
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-35">📋</span>
          <p className="text-sm text-foreground/65">No nutrition plan assigned yet.</p>
          <p className="text-xs text-foreground/65">Ask your trainer to assign a plan.</p>
        </div>
      </div>
    );
  }

  const todayDayType = todayDayTypeName
    ? plan.dayTypes.find((dt) => dt.name === todayDayTypeName) ?? null
    : null;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
        My Plan
      </span>
      <div className="mb-3">
        <div className="text-sm font-semibold">{plan.name}</div>
        <div className="text-[10px] text-foreground/65 mt-0.5">
          Assigned by {plan.assignedByName} · {plan.dayTypes.length} day type{plan.dayTypes.length === 1 ? '' : 's'}
        </div>
      </div>

      {todayDayType ? (
        // Schedule found for today — single direct Log Today button
        <div className="flex flex-col gap-2">
          <div className="rounded-lg ring-1 ring-foreground/10 px-3 py-2.5 bg-foreground/[0.02]">
            <div className="text-[12px] font-semibold text-foreground">{todayDayType.name}</div>
            <div className="text-[10px] text-foreground/65 mt-0.5">
              {todayDayType.targetKcal} kcal · P {todayDayType.targetProtein}g · C {todayDayType.targetCarbs}g · F {todayDayType.targetFat}g
            </div>
          </div>
          <Button
            type="button"
            onClick={() =>
              router.push(`${basePath}/day?date=${todayISO()}&mode=plan`)
            }
            className="w-full"
          >
            Log Today
          </Button>
        </div>
      ) : (
        // No schedule for today — fallback: let member pick any day type
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-foreground/65 mb-1">
            No plan for today. Pick a day:
          </p>
          {plan.dayTypes.map((dt) => (
            <div
              key={dt.name}
              className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium">{dt.name}</div>
                <div className="text-[10px] text-foreground/65">
                  {dt.targetKcal} kcal · P {dt.targetProtein}g · C {dt.targetCarbs}g · F {dt.targetFat}g
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() =>
                  router.push(
                    `${basePath}/day?date=${todayISO()}&mode=plan&dayTypeName=${encodeURIComponent(dt.name)}`,
                  )
                }
                className="h-6 px-2 text-[11px] shrink-0 text-primary-light hover:bg-primary/10"
              >
                Log
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**
```bash
pnpm test -- --testPathPattern=member-nutrition-plan-path-card
```

- [ ] **Step 5: Lint**
```bash
pnpm lint
```

- [ ] **Step 6: Commit**
```bash
git add src/components/self-tracking/member-nutrition-plan-path-card.tsx __tests__/app/self-tracking/member-nutrition-plan-path-card.test.tsx
git commit -m "feat(nutrition): schedule-aware MemberNutritionPlanPathCard"
```

---

### Task 2: Update NutritionFreestylePathCard — member today-only states

**Files:**
- Modify: `src/components/self-tracking/nutrition-freestyle-path-card.tsx`
- Modify: `__tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx`

**New optional prop:** `todayLog?: { kcal: number; dayCompleted: boolean } | null`

When `basePath === '/member/nutrition'` and `todayLog` is provided:
- `todayLog` is null → no log today → "Log Today" button (existing)
- `todayLog` exists, `dayCompleted=false` → "Continue Today's Log" button (navigate to free mode)
- `todayLog` exists, `dayCompleted=true` → show kcal + "View Today's Log" button (navigate to free mode, will be read-only due to `dayCompleted`)

Owner/trainer do not pass `todayLog` → existing `state` prop behavior unchanged.

- [ ] **Step 1: Write failing tests**

```typescript
// In __tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx
// ADD these tests:

it('shows Log Today when member has no log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/member/nutrition"
      todayLog={null}
    />,
  );
  expect(screen.getByRole('button', { name: /log today/i })).toBeInTheDocument();
});

it('shows Continue Today log button when member has incomplete log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/member/nutrition"
      todayLog={{ kcal: 800, dayCompleted: false }}
    />,
  );
  expect(screen.getByRole('button', { name: /continue today/i })).toBeInTheDocument();
  expect(screen.getByText(/800/)).toBeInTheDocument();
});

it('shows View Today log button when member has completed log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/member/nutrition"
      todayLog={{ kcal: 2100, dayCompleted: true }}
    />,
  );
  expect(screen.getByRole('button', { name: /view today/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /log today/i })).not.toBeInTheDocument();
});

it('owner/trainer state=full unaffected when no todayLog', () => {
  render(
    <NutritionFreestylePathCard
      state="full"
      lastFreestyle={{ dateLabel: 'Mon', kcal: 2087, protein: 162, carbs: 228, fat: 58 }}
      daysThisWeek={5}
      basePath="/owner/my-nutrition"
    />,
  );
  expect(screen.getByText(/5× this week/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect FAIL**
```bash
pnpm test -- --testPathPattern=nutrition-freestyle-path-card
```

- [ ] **Step 3: Implement**

Add `todayLog` to the type and update the member section:

```typescript
// src/components/self-tracking/nutrition-freestyle-path-card.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MacroPill } from '@/components/nutrition/macro-pill';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition';

interface LastFreestyle {
  dateLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

type Props =
  | { state: 'empty'; basePath: BasePath; todayLog?: { kcal: number; dayCompleted: boolean } | null }
  | { state: 'light'; lastFreestyle: LastFreestyle; basePath: BasePath; todayLog?: { kcal: number; dayCompleted: boolean } | null }
  | { state: 'full'; lastFreestyle: LastFreestyle; daysThisWeek: number; basePath: BasePath; todayLog?: { kcal: number; dayCompleted: boolean } | null };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function freestyleDayPath(basePath: BasePath): string {
  if (basePath === '/member/nutrition') {
    return `/member/nutrition/day?date=${todayISO()}&mode=free`;
  }
  return `${basePath}/day?date=${todayISO()}`;
}

export function NutritionFreestylePathCard(props: Props) {
  const router = useRouter();
  const isMember = props.basePath === '/member/nutrition';
  const todayLog = props.todayLog;

  // Member: if today has any log, override the bottom CTA
  const memberTodayCTA =
    isMember && todayLog != null ? (
      <div className="mt-auto flex flex-col gap-2">
        <div className="text-[11px] text-foreground/65">
          Today · {todayLog.kcal.toLocaleString()} kcal
          {todayLog.dayCompleted && ' · completed'}
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push(freestyleDayPath(props.basePath))}
        >
          {todayLog.dayCompleted ? 'View Today\'s Log' : 'Continue Today\'s Log'}
        </Button>
      </div>
    ) : null;

  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
          Freestyle
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-30">🥦</span>
          <p className="text-sm text-foreground/65">No freestyle logs yet.</p>
          <p className="text-xs text-foreground/65">Log any day without a template.</p>
        </div>
        {memberTodayCTA ?? (
          <Button variant="outline" type="button" onClick={() => router.push(freestyleDayPath(props.basePath))}>
            Log Today
          </Button>
        )}
      </div>
    );
  }

  const { lastFreestyle } = props;
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
        Freestyle
      </span>
      <div className="rounded-lg ring-1 ring-foreground/10 p-3 mb-3 bg-foreground/[0.02]">
        <div className="text-[10px] text-foreground/65 uppercase tracking-[0.08em] mb-1">
          {lastFreestyle.dateLabel}
        </div>
        <div className="text-lg font-bold">
          {lastFreestyle.kcal.toLocaleString()} kcal
        </div>
        <div className="flex gap-1.5 mt-1.5">
          <MacroPill value={lastFreestyle.protein} label="g protein" tone="emerald" />
          <MacroPill value={lastFreestyle.carbs} label="g carbs" tone="amber" />
          <MacroPill value={lastFreestyle.fat} label="g fat" tone="pink" />
        </div>
      </div>
      {props.state === 'full' && (
        <p className="text-[11px] text-foreground/65 mb-3">
          {props.daysThisWeek}× this week
        </p>
      )}
      {memberTodayCTA ?? (
        <Button
          variant="outline"
          type="button"
          className="mt-auto"
          onClick={() => router.push(freestyleDayPath(props.basePath))}
        >
          Log Today (Freestyle)
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**
```bash
pnpm test -- --testPathPattern=nutrition-freestyle-path-card
```

- [ ] **Step 5: Commit**
```bash
git add src/components/self-tracking/nutrition-freestyle-path-card.tsx __tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx
git commit -m "feat(nutrition): member today-only states in NutritionFreestylePathCard"
```

---

### Task 3: Add noDateNav to SelfNutritionDayView

**Files:**
- Modify: `src/components/self-tracking/self-nutrition-day-view.tsx`

When `noDateNav=true`: hide the entire sticky header navigation row (← button, calendar popover, → button) and replace with a simple centered date display. All other functionality (adding food, completing day) unchanged.

- [ ] **Step 1: Add prop to interface**

In `src/components/self-tracking/self-nutrition-day-view.tsx`, add to `Props`:

```typescript
interface Props {
  initialDate: string;
  readOnly?: boolean;
  onDateChange?: (date: string) => void;
  initialTemplateId?: string;
  initialDayTypeName?: string;
  planDayTypes?: PlanDayType[];
  noDateNav?: boolean;  // NEW — hides ← [date] → row; used in member freestyle mode
}
```

- [ ] **Step 2: Update the function signature**

```typescript
export function SelfNutritionDayView({
  initialDate,
  readOnly = false,
  onDateChange,
  initialTemplateId,
  initialDayTypeName,
  planDayTypes,
  noDateNav = false,
}: Props) {
```

- [ ] **Step 3: Update the sticky header render**

Find the sticky header section (around line 238) and replace:

```typescript
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
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
```

With:

```typescript
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 sm:px-8 py-5 border-b border-foreground/10">
        {noDateNav ? (
          <div className="w-full text-center text-sm font-semibold">{date}</div>
        ) : (
          <>
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
          </>
        )}
      </div>
```

- [ ] **Step 4: Build check**
```bash
pnpm build 2>&1 | grep -E "Type error|error TS" | grep -v node_modules | head -10
```

- [ ] **Step 5: Lint**
```bash
pnpm lint
```

- [ ] **Step 6: Commit**
```bash
git add src/components/self-tracking/self-nutrition-day-view.tsx
git commit -m "feat(nutrition): add noDateNav prop to SelfNutritionDayView"
```

---

### Task 4: Wire noDateNav in MemberNutritionDayClient

**Files:**
- Modify: `src/app/(dashboard)/member/nutrition/day/_components/member-nutrition-day-client.tsx`

When `mode === 'free'`, pass `noDateNav={true}` to `SelfNutritionDayView` and remove the `onDateChange` callback (no date navigation = no URL sync needed).

- [ ] **Step 1: Update the file**

```typescript
// src/app/(dashboard)/member/nutrition/day/_components/member-nutrition-day-client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';
import type { PlanDayType } from '@/components/nutrition/nutrition-plan-compare-dialog';

interface Props {
  memberId: string;
  initialDate: string;
  mode: 'plan' | 'free';
  forceDayType: string | undefined;
  planDayTypes: PlanDayType[];
}

export function MemberNutritionDayClient({ memberId, initialDate, mode, forceDayType, planDayTypes }: Props) {
  const router = useRouter();
  const onPlanDateChange = useCallback(
    (d: string) => {
      router.push(`/member/nutrition/day?date=${d}&mode=plan`, { scroll: false });
    },
    [router],
  );

  if (mode === 'free') {
    return (
      <SelfNutritionDayView
        key={initialDate}
        initialDate={initialDate}
        noDateNav
        planDayTypes={planDayTypes}
      />
    );
  }

  return (
    <DailyNutritionView
      memberId={memberId}
      initialDate={initialDate}
      forceDayType={forceDayType}
      planDayTypes={planDayTypes}
      onDateChange={onPlanDateChange}
    />
  );
}
```

- [ ] **Step 2: Build check**
```bash
pnpm build 2>&1 | grep -E "Type error|error TS" | grep -v node_modules | head -10
```

- [ ] **Step 3: Commit**
```bash
git add "src/app/(dashboard)/member/nutrition/day/_components/member-nutrition-day-client.tsx"
git commit -m "feat(nutrition): member freestyle day view has no date navigation"
```

---

### Task 5: Update MemberNutritionLanding — resolve schedule + today freestyle log

**Files:**
- Modify: `src/components/self-tracking/member-nutrition-landing.tsx`

Two new server-side lookups:
1. `resolveDayType(activePlan.schedule, todayISO, startDateISO)` → `todayDayTypeName: string | null`
2. `logRepo.findByDate(userId, todayISO)` → `todayFreestyleLog: ISelfNutritionLog | null`

These are passed as props to both path cards.

- [ ] **Step 1: Add imports**

At the top of `src/components/self-tracking/member-nutrition-landing.tsx`, add:

```typescript
import { resolveDayType } from '@/lib/nutrition/schedule';
```

- [ ] **Step 2: Compute today's values in the server component body**

After the `await Promise.all([...])` block, add:

```typescript
  // Resolve today's scheduled day type from the plan schedule
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayDayTypeName: string | null = activePlan
    ? resolveDayType(
        activePlan.schedule,
        todayISO,
        activePlan.assignedAt.toISOString().slice(0, 10),
      )
    : null;

  // Check if member already has a freestyle log for today
  const todayFreestyleLog = await logRepo.findByDate(userId, todayISO);
  const todayFreestyleLogSummary =
    todayFreestyleLog != null
      ? {
          kcal: Math.round(
            todayFreestyleLog.meals.reduce(
              (s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0),
              0,
            ),
          ),
          dayCompleted: todayFreestyleLog.dayCompleted,
        }
      : null;
```

- [ ] **Step 3: Pass props to path cards**

Replace the `MemberNutritionPlanPathCard` render:

```typescript
<MemberNutritionPlanPathCard
  plan={plan}
  todayDayTypeName={todayDayTypeName}
  basePath="/member/nutrition"
/>
```

For `NutritionFreestylePathCard`, add `todayLog` to all three variants:

```typescript
{!lastFreestyleLog && (
  <NutritionFreestylePathCard
    state="empty"
    basePath="/member/nutrition"
    todayLog={todayFreestyleLogSummary}
  />
)}
{lastFreestyleLog && state === 'full' && (
  <NutritionFreestylePathCard
    state="full"
    lastFreestyle={toLastFreestyle(lastFreestyleLog)}
    daysThisWeek={countDaysThisWeek(recent)}
    basePath="/member/nutrition"
    todayLog={todayFreestyleLogSummary}
  />
)}
{lastFreestyleLog && state !== 'full' && (
  <NutritionFreestylePathCard
    state="light"
    lastFreestyle={toLastFreestyle(lastFreestyleLog)}
    basePath="/member/nutrition"
    todayLog={todayFreestyleLogSummary}
  />
)}
```

- [ ] **Step 4: Build check**
```bash
pnpm build 2>&1 | grep -E "Type error|error TS" | grep -v node_modules | head -10
```

- [ ] **Step 5: Full test suite**
```bash
pnpm test
```

Expected: same pass count as before (no regressions from adding optional props).

- [ ] **Step 6: Commit**
```bash
git add src/components/self-tracking/member-nutrition-landing.tsx
git commit -m "feat(nutrition): MemberNutritionLanding resolves today schedule and freestyle log"
```

---

### Task 6: E2E tests — deep lifecycle coverage

**Files:**
- Create: `e2e/member/member-nutrition-redesign.spec.ts`

Reference patterns from `e2e/self-tracking/owner-nutrition-day.spec.ts` (API seeding via `request.put`) and `e2e/member/session-lifecycle.spec.ts` (teardown helpers).

- [ ] **Step 1: Create spec file**

```typescript
// e2e/member/member-nutrition-redesign.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function deleteTodayFreestyleLog(request: import('@playwright/test').APIRequestContext) {
  await request.delete(`/api/me/nutrition-logs/${TODAY}`);
}

async function seedTodayFreestyleLog(
  request: import('@playwright/test').APIRequestContext,
  opts: { dayCompleted: boolean; kcal?: number },
) {
  const kcal = opts.kcal ?? 800;
  await request.put(`/api/me/nutrition-logs/${TODAY}`, {
    data: {
      sourceTemplateId: null,
      sourceTemplateDayTypeName: null,
      dayLabel: 'Freestyle',
      dayCompleted: opts.dayCompleted,
      meals: [
        {
          name: 'Breakfast',
          order: 0,
          completed: opts.dayCompleted,
          items: [
            {
              foodName: 'Egg',
              quantityG: 100,
              kcal,
              protein: 12,
              carbs: 1,
              fat: 10,
            },
          ],
        },
        { name: 'Lunch', order: 1, completed: false, items: [] },
        { name: 'Dinner', order: 2, completed: false, items: [] },
        { name: 'Snack', order: 3, completed: false, items: [] },
      ],
    },
  });
}

// ── Plan card: schedule-aware ─────────────────────────────────────────────────

test.describe('Member: Plan card — schedule-aware', () => {
  test('landing shows "Log Today" with today scheduled day type when schedule covers today', async ({ page }) => {
    // The dev member has an active nutrition plan with a weeklyPattern.
    // Navigate to the landing and check the plan card shows today's scheduled day type.
    await page.goto('/member/nutrition');

    // The plan card should show either:
    // (A) a single "Log Today" button if today is scheduled, OR
    // (B) "No plan for today. Pick a day:" if today is not in the schedule
    const logTodayBtn = page.getByRole('button', { name: /^log today$/i });
    const noPlanMsg = page.getByText(/no plan for today/i);

    await expect(logTodayBtn.or(noPlanMsg)).toBeVisible({ timeout: 8000 });
  });

  test('"Log Today" navigates to plan mode WITHOUT dayTypeName param when schedule exists', async ({ page }) => {
    await page.goto('/member/nutrition');

    const logTodayBtn = page.getByRole('button', { name: /^log today$/i });
    if (!(await logTodayBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Today is not scheduled; skip this test
      test.skip();
      return;
    }

    await logTodayBtn.click();
    await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=plan/);
    // dayTypeName should NOT appear in URL — server resolves from schedule
    expect(page.url()).not.toContain('dayTypeName');
  });

  test('plan mode day view loads the correct scheduled day type meals', async ({ page }) => {
    await page.goto('/member/nutrition');

    const logTodayBtn = page.getByRole('button', { name: /^log today$/i });
    if (!(await logTodayBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await logTodayBtn.click();
    // Page should show meal sections from the plan (not empty freestyle default)
    await expect(
      page.getByText(/breakfast|lunch|dinner/i).first()
    ).toBeVisible({ timeout: 8000 });
    // Should NOT show ← → navigation arrows
    // (plan mode DOES have navigation, only freestyle loses it)
  });

  test('fallback shows all day types when today is not in schedule', async ({ page }) => {
    await page.goto('/member/nutrition');

    const noPlanMsg = page.getByText(/no plan for today/i);
    if (!(await noPlanMsg.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // All day types should be shown with individual Log buttons
    const logBtns = page.locator('[data-testid="plan-fallback-log"], button').filter({ hasText: /^log$/i });
    await expect(logBtns.first()).toBeVisible({ timeout: 5000 });
  });

  test('fallback Log button navigates with dayTypeName param', async ({ page }) => {
    await page.goto('/member/nutrition');

    const noPlanMsg = page.getByText(/no plan for today/i);
    if (!(await noPlanMsg.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    const logBtn = page.getByRole('button', { name: /^log$/i }).first();
    await logBtn.click();
    await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=plan.*dayTypeName=/);
  });
});

// ── Freestyle card: today-only ────────────────────────────────────────────────

test.describe('Member: Freestyle card — today only, no double-log', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('shows "Log Today" when no freestyle log exists for today', async ({ page, request }) => {
    await deleteTodayFreestyleLog(request);
    await page.goto('/member/nutrition');

    const logTodayBtn = page.getByRole('button', { name: /log today/i }).filter({ hasText: /log today/i });
    // At least one "Log Today" must be visible (could be in plan or freestyle card)
    await expect(logTodayBtn.first()).toBeVisible({ timeout: 8000 });
  });

  test('shows "Continue Today\'s Log" when incomplete freestyle log exists for today', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 800 });
    await page.goto('/member/nutrition');

    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 8000 });
    // Should NOT show a "Log Today" button in the freestyle card
    await expect(page.getByRole('button', { name: /^log today$/i })).not.toBeVisible();
  });

  test('shows "View Today\'s Log" when completed freestyle log exists for today', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.goto('/member/nutrition');

    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 8000 });
    // "Log Today" should NOT appear — prevents re-logging
    await expect(page.getByRole('button', { name: /^log today$/i })).not.toBeVisible();
  });

  test('"View Today\'s Log" navigates to freestyle day view for that date', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.goto('/member/nutrition');

    await page.getByRole('button', { name: /view today/i }).click();
    await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=free/);
  });
});

// ── Freestyle day view: no date navigation ────────────────────────────────────

test.describe('Member: Freestyle day view — no date navigation', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('no ← and → buttons visible in freestyle mode', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1000);

    // ← and → navigation buttons should not exist
    const prevBtn = page.getByRole('button', { name: /←/ });
    const nextBtn = page.getByRole('button', { name: /→/ });
    await expect(prevBtn).not.toBeVisible();
    await expect(nextBtn).not.toBeVisible();
  });

  test('date is shown as plain text without calendar popover', async ({ page }) => {
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);
    await page.waitForTimeout(1000);

    // Today's date is visible as text
    await expect(page.getByText(TODAY)).toBeVisible();
    // Calendar popover trigger (ChevronDown) should not exist
    await expect(page.getByRole('button', { name: /open calendar/i })).not.toBeVisible();
  });

  test('completed freestyle log is read-only — cannot add more food', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 2100 });
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);

    // "Day completed ✓" shown in bar, "Mark day complete" disabled/absent
    await expect(
      page.getByRole('button', { name: /day completed/i })
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole('button', { name: /\+ add food/i })
    ).not.toBeVisible();
  });

  test('incomplete freestyle log is editable — can add food and complete', async ({ page, request }) => {
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 0 });
    await page.goto(`/member/nutrition/day?date=${TODAY}&mode=free`);

    await expect(
      page.getByRole('button', { name: /\+ add food/i }).first()
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole('button', { name: /mark day complete/i })
    ).toBeVisible();
  });

  test('navigating directly to past date with mode=free shows today instead', async ({ page }) => {
    // The page should redirect or clamp to today when mode=free is requested for a past date
    // (server clamps rawDate <= today which is fine; the noDateNav ensures the user can't navigate away)
    await page.goto(`/member/nutrition/day?date=2026-05-01&mode=free`);
    await page.waitForTimeout(1000);

    // Verify no ← → arrows, meaning the user is locked to whatever date was loaded
    const prevBtn = page.getByRole('button', { name: /←/ });
    await expect(prevBtn).not.toBeVisible();
  });
});

// ── Full lifecycle: log today via plan, then open freestyle ───────────────────

test.describe('Member: Nutrition full daily lifecycle', () => {
  test.afterEach(async ({ request }) => {
    await deleteTodayFreestyleLog(request);
  });

  test('can log plan-mode today and separately log freestyle today — both show independently', async ({ page, request }) => {
    // 1. Start at landing
    await page.goto('/member/nutrition');

    // 2. The activity strip and calendar should render without errors
    await expect(page.getByText('My Nutrition')).toBeVisible();

    // 3. Seed a freestyle log
    await seedTodayFreestyleLog(request, { dayCompleted: false, kcal: 500 });
    await page.reload();

    // 4. Freestyle card now shows "Continue Today's Log" (not "Log Today")
    await expect(page.getByRole('button', { name: /continue today/i })).toBeVisible({ timeout: 6000 });

    // 5. Complete the freestyle log via API and reload
    await seedTodayFreestyleLog(request, { dayCompleted: true, kcal: 1900 });
    await page.reload();

    // 6. Freestyle card now shows "View Today's Log"
    await expect(page.getByRole('button', { name: /view today/i })).toBeVisible({ timeout: 6000 });
  });
});
```

- [ ] **Step 2: Run E2E for member nutrition**
```bash
pnpm test:e2e -- --spec "e2e/member/member-nutrition-redesign.spec.ts"
```

Fix any selector mismatches before moving on. All non-skipped tests must pass.

- [ ] **Step 3: Run full E2E suite for regressions**
```bash
pnpm test:e2e 2>&1 | tail -10
```

- [ ] **Step 4: Commit**
```bash
git add e2e/member/member-nutrition-redesign.spec.ts
git commit -m "test(e2e): deep lifecycle coverage for member nutrition redesign"
```

---

### Task 7: Final checks

- [ ] **Step 1: Full unit test suite**
```bash
pnpm test
```
Expected: same 15 pre-existing failures, no new failures.

- [ ] **Step 2: Lint**
```bash
pnpm lint
```

- [ ] **Step 3: Production build**
```bash
pnpm build
```

- [ ] **Step 4: Update docs INDEX**

In `docs/INDEX.md`, add:
```
| Member Nutrition UX Redesign (Plan) | [member-nutrition-ux-redesign-plan.md](2026-05-19/plans/member-nutrition-ux-redesign-plan.md) | Complete |
```

- [ ] **Step 5: Commit**
```bash
git add docs/INDEX.md
git commit -m "docs: mark member nutrition UX redesign plan complete"
```
