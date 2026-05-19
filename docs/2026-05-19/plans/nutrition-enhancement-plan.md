# Nutrition Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add My Nutrition landing pages for all roles, template-based day initialization for owner/trainer, member freestyle logging, and a plan-vs-actual compare dialog after day completion.

**Architecture:** New landing pages mirror the My Training cockpit pattern (PageHeader + ActivityStrip + two PathCards + MiniCalendar). Member freestyle uses the existing `SelfNutritionLog` model (member already in `requireSelfTrackingRole`). Compare dialog appears only after the completion animation `onComplete` fires — never blocks submission.

**Tech Stack:** Next.js App Router, TypeScript strict, Mongoose, Shadcn/ui, Framer Motion, Playwright E2E.

**Design spec:** `docs/2026-05-19/plans/nutrition-enhancement-design.md`

---

### Task 1: NutritionPlanCompareDialog component

**Files:**
- Create: `src/components/nutrition/nutrition-plan-compare-dialog.tsx`
- Create: `__tests__/app/nutrition/nutrition-plan-compare-dialog.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/app/nutrition/nutrition-plan-compare-dialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionPlanCompareDialog } from '@/components/nutrition/nutrition-plan-compare-dialog';

const planDayTypes = [
  { name: 'Training Day', targetKcal: 2200, targetProtein: 170, targetCarbs: 240, targetFat: 60 },
  { name: 'Rest Day', targetKcal: 1800, targetProtein: 160, targetCarbs: 170, targetFat: 58 },
];

const baseProps = {
  open: true,
  onOpenChange: jest.fn(),
  date: '2026-05-19',
  loggedKcal: 1840,
  loggedProtein: 148,
  loggedCarbs: 198,
  loggedFat: 68,
  planDayTypes,
};

it('renders pill for each plan day type', () => {
  render(<NutritionPlanCompareDialog {...baseProps} />);
  expect(screen.getByRole('button', { name: 'Training Day' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Rest Day' })).toBeInTheDocument();
});

it('shows diff values when a day type is selected', () => {
  render(<NutritionPlanCompareDialog {...baseProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Training Day' }));
  expect(screen.getByText('−22g')).toBeInTheDocument(); // protein diff
});

it('calls onOpenChange(false) when Done is clicked', () => {
  const onOpenChange = jest.fn();
  render(<NutritionPlanCompareDialog {...baseProps} onOpenChange={onOpenChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=nutrition-plan-compare-dialog
```

- [ ] **Step 3: Implement component**

```typescript
// src/components/nutrition/nutrition-plan-compare-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface PlanDayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  loggedKcal: number;
  loggedProtein: number;
  loggedCarbs: number;
  loggedFat: number;
  planDayTypes: PlanDayType[];
}

function fmt(n: number, unit = 'g'): string {
  return `${n > 0 ? '+' : ''}${n}${unit}`;
}

export function NutritionPlanCompareDialog({
  open, onOpenChange, date, loggedKcal, loggedProtein, loggedCarbs, loggedFat, planDayTypes,
}: Props) {
  const [selected, setSelected] = useState<PlanDayType | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Day Complete 🎉</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-foreground/65">{date} · {loggedKcal} kcal logged</p>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-foreground/40">
            Compare with plan day
          </p>
          <div className="flex flex-wrap gap-2">
            {planDayTypes.map((dt) => (
              <button
                key={dt.name}
                onClick={() => setSelected(dt)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                  selected?.name === dt.name
                    ? 'bg-primary/15 border-primary/50 text-primary-light'
                    : 'border-foreground/15 text-foreground/50 hover:border-foreground/30'
                }`}
              >
                {dt.name}
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/65">Plan target</span>
              <span className="text-[10px] font-semibold text-primary-light bg-primary/10 rounded-full px-2 py-0.5">
                {selected.name}
              </span>
            </div>
            <CompareRow
              label="kcal"
              logged={loggedKcal}
              target={selected.targetKcal}
              unit=""
              color="text-foreground"
            />
            <CompareRow label="Protein" logged={loggedProtein} target={selected.targetProtein} color="text-emerald-400" />
            <CompareRow label="Carbs" logged={loggedCarbs} target={selected.targetCarbs} color="text-amber-400" />
            <CompareRow label="Fat" logged={loggedFat} target={selected.targetFat} color="text-pink-400" />
          </div>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}

function CompareRow({
  label, logged, target, unit = 'g', color,
}: {
  label: string; logged: number; target: number; unit?: string; color: string;
}) {
  const diff = logged - target;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-foreground font-semibold">{logged}{unit}</span>
        <span className="text-foreground/35">/ {target}{unit}</span>
        <span className={diff > 0 ? 'text-destructive' : 'text-foreground/35'}>
          {fmt(diff, unit)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test -- --testPathPattern=nutrition-plan-compare-dialog
```

- [ ] **Step 5: Lint**

```bash
pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add src/components/nutrition/nutrition-plan-compare-dialog.tsx __tests__/app/nutrition/nutrition-plan-compare-dialog.test.tsx
git commit -m "feat(nutrition): add NutritionPlanCompareDialog component"
```

---

### Task 2: Add dayTypeName query param to member nutrition log GET

**Files:**
- Modify: `src/app/api/members/[memberId]/nutrition/log/[date]/route.ts`
- Modify: `__tests__/app/api/members-nutrition-log-date.test.ts` (or nearest existing test for this route)

- [ ] **Step 1: Write failing test**

Find the existing test file:
```bash
find __tests__ -name "*.test.ts" | xargs grep -l "nutrition/log" | head -3
```

Add to the existing test file:

```typescript
it('GET uses explicit dayTypeName param instead of schedule when provided', async () => {
  // Set up: member with active plan containing two day types, schedule maps today to 'Rest Day'
  // but we request 'Training Day' via ?dayTypeName=Training+Day
  // Expect: returns meals from 'Training Day', not 'Rest Day'
  // (implement with mock repos following the existing pattern in that test file)
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=members-nutrition
```

- [ ] **Step 3: Update route GET handler**

In `src/app/api/members/[memberId]/nutrition/log/[date]/route.ts`, in the GET handler after the `existing` check:

```typescript
export async function GET(req: Request, { params }: RouteContext): Promise<Response> {
  // ... existing auth + date validation ...

  await connectDB();
  const logRepo = new MongoNutritionDailyLogRepository();
  const existing = await logRepo.findByDate(memberId, date);
  if (existing) return Response.json(existing);

  const planRepo = new MongoMemberNutritionPlanRepository();
  const plan = await planRepo.findActive(memberId);
  if (!plan) return Response.json(null);

  // NEW: honour explicit dayTypeName param (used when member picks a day type from landing)
  const url = new URL(req.url);
  const explicitDayType = url.searchParams.get('dayTypeName');

  const startDateISO = plan.assignedAt.toISOString().slice(0, 10);
  const dayTypeName = explicitDayType ?? resolveDayType(plan.schedule, date, startDateISO);
  if (!dayTypeName) return Response.json(null);

  const dayType = plan.dayTypes.find((d) => d.name === dayTypeName);
  if (!dayType) return Response.json(null);

  return Response.json({
    memberId,
    planId: plan._id,
    date,
    dayTypeName,
    meals: dayType.meals.map((m) => ({
      name: m.name,
      order: m.order,
      completed: false,
      items: m.items,
    })),
    dayCompleted: false,
  });
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test -- --testPathPattern=members-nutrition
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/nutrition/log/[date]/route.ts
git commit -m "feat(nutrition): support explicit dayTypeName override in member log GET"
```

---

### Task 3: Add findRecent to SelfNutritionLogRepository

**Files:**
- Modify: `src/lib/repositories/self-nutrition-log.repository.ts`
- Modify: `__tests__/lib/repositories/self-nutrition-log.repository.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// In the existing test file, add:
it('findRecent returns N most recent logs sorted descending', async () => {
  const repo = new MongoSelfNutritionLogRepository();
  // create 5 logs for dates 2026-05-01 to 2026-05-05
  // call findRecent(userId, 3)
  // expect 3 results: 2026-05-05, 2026-05-04, 2026-05-03
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=self-nutrition-log.repository
```

- [ ] **Step 3: Add to interface and implementation**

In `src/lib/repositories/self-nutrition-log.repository.ts`:

```typescript
// Add to interface:
findRecent(userId: string, limit: number): Promise<ISelfNutritionLog[]>;

// Add to MongoSelfNutritionLogRepository:
async findRecent(userId: string, limit: number): Promise<ISelfNutritionLog[]> {
  return SelfNutritionLogModel
    .find({ userId: oid(userId) })
    .sort({ date: -1 })
    .limit(limit);
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test -- --testPathPattern=self-nutrition-log.repository
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/self-nutrition-log.repository.ts
git commit -m "feat(nutrition): add findRecent to SelfNutritionLogRepository"
```

---

### Task 4: NutritionTemplatePathCard

**Files:**
- Create: `src/components/self-tracking/nutrition-template-path-card.tsx`
- Create: `__tests__/app/self-tracking/nutrition-template-path-card.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/app/self-tracking/nutrition-template-path-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionTemplatePathCard } from '@/components/self-tracking/nutrition-template-path-card';

const templates = [
  {
    _id: 'tpl1',
    name: 'Muscle Gain Plan',
    dayTypes: [
      { name: 'Training Day', targetKcal: 2400, targetProtein: 180, targetCarbs: 260, targetFat: 65 },
      { name: 'Rest Day', targetKcal: 1900, targetProtein: 170, targetCarbs: 180, targetFat: 60 },
    ],
  },
];

it('shows empty state when no templates', () => {
  render(<NutritionTemplatePathCard templates={[]} basePath="/owner/my-nutrition" />);
  expect(screen.getByText(/no templates yet/i)).toBeInTheDocument();
});

it('renders template name and day type count', () => {
  render(<NutritionTemplatePathCard templates={templates} basePath="/owner/my-nutrition" />);
  expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
  expect(screen.getByText('2 day types')).toBeInTheDocument();
});

it('auto-expands when only one template', () => {
  render(<NutritionTemplatePathCard templates={templates} basePath="/owner/my-nutrition" />);
  expect(screen.getByText('Training Day')).toBeInTheDocument();
});

it('shows Log button for each day type when expanded', () => {
  render(<NutritionTemplatePathCard templates={templates} basePath="/owner/my-nutrition" />);
  expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(2);
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=nutrition-template-path-card
```

- [ ] **Step 3: Implement**

```typescript
// src/components/self-tracking/nutrition-template-path-card.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition';

export interface NutritionTemplateDayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export interface NutritionTemplate {
  _id: string;
  name: string;
  dayTypes: NutritionTemplateDayType[];
}

interface Props {
  templates: NutritionTemplate[];
  basePath: BasePath;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function NutritionTemplatePathCard({ templates, basePath }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(
    templates.length === 1 ? templates[0]._id : null,
  );

  if (templates.length === 0) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
          From Template
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-30">🥗</span>
          <p className="text-sm text-foreground/65">No templates yet.</p>
          <p className="text-xs text-foreground/40">Create a nutrition template to log structured days.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(basePath.replace('/my-nutrition', '/nutrition/new'))}
        >
          + Create Template
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light">
          From Template
        </span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
          Pick any day
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {templates.map((tpl) => {
          const isExpanded = expandedId === tpl._id;
          return (
            <div key={tpl._id} className="rounded-lg ring-1 ring-foreground/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : tpl._id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-foreground/5 transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold">{tpl.name}</div>
                  <div className="text-[10px] text-foreground/65">
                    {tpl.dayTypes.length} day type{tpl.dayTypes.length === 1 ? '' : 's'}
                  </div>
                </div>
                <span className="text-foreground/40 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="border-t border-foreground/10 bg-foreground/[0.02] px-2 py-1.5 flex flex-col gap-1">
                  {tpl.dayTypes.map((dt) => (
                    <div
                      key={dt.name}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-foreground/5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[12px] font-medium">{dt.name}</span>
                        <span className="text-[10px] text-foreground/50 ml-2">
                          {dt.targetKcal} kcal · P {dt.targetProtein}g · C {dt.targetCarbs}g · F {dt.targetFat}g
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          router.push(
                            `${basePath}/day?date=${todayISO()}&templateId=${tpl._id}&dayType=${encodeURIComponent(dt.name)}`,
                          )
                        }
                        className="h-6 px-2 text-[11px] shrink-0 text-primary-light hover:text-primary-light hover:bg-primary/10"
                      >
                        Log
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test -- --testPathPattern=nutrition-template-path-card
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/nutrition-template-path-card.tsx __tests__/app/self-tracking/nutrition-template-path-card.test.tsx
git commit -m "feat(nutrition): add NutritionTemplatePathCard"
```

---

### Task 5: NutritionFreestylePathCard

**Files:**
- Create: `src/components/self-tracking/nutrition-freestyle-path-card.tsx`
- Create: `__tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx
import { render, screen } from '@testing-library/react';
import { NutritionFreestylePathCard } from '@/components/self-tracking/nutrition-freestyle-path-card';

it('shows empty state when no logs', () => {
  render(<NutritionFreestylePathCard state="empty" basePath="/owner/my-nutrition" />);
  expect(screen.getByText(/log today/i)).toBeInTheDocument();
});

it('shows last log kcal in light state', () => {
  render(
    <NutritionFreestylePathCard
      state="light"
      lastFreestyle={{ dateLabel: 'Mon', kcal: 2087, protein: 162, carbs: 228, fat: 58 }}
      basePath="/owner/my-nutrition"
    />,
  );
  expect(screen.getByText('2,087 kcal')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=nutrition-freestyle-path-card
```

- [ ] **Step 3: Implement**

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
  | { state: 'empty'; basePath: BasePath }
  | { state: 'light'; lastFreestyle: LastFreestyle; basePath: BasePath }
  | { state: 'full'; lastFreestyle: LastFreestyle; daysThisWeek: number; basePath: BasePath };

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

  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-400 mb-3">
          Freestyle
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-30">🥦</span>
          <p className="text-sm text-foreground/65">No freestyle logs yet.</p>
          <p className="text-xs text-foreground/40">Log any day without a template.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(freestyleDayPath(props.basePath))}>
          Log Today
        </Button>
      </div>
    );
  }

  const { lastFreestyle } = props;
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-400 mb-3">
        Freestyle
      </span>
      <div className="rounded-lg ring-1 ring-foreground/10 p-3 mb-3 bg-foreground/[0.02]">
        <div className="text-[10px] text-foreground/45 uppercase tracking-[0.08em] mb-1">
          {lastFreestyle.dateLabel}
        </div>
        <div className="text-lg font-bold">
          {lastFreestyle.kcal.toLocaleString()} kcal
        </div>
        <div className="flex gap-1.5 mt-1.5">
          <MacroPill type="protein" value={lastFreestyle.protein} unit="g" />
          <MacroPill type="carbs" value={lastFreestyle.carbs} unit="g" />
          <MacroPill type="fat" value={lastFreestyle.fat} unit="g" />
        </div>
      </div>
      {props.state === 'full' && (
        <p className="text-[11px] text-foreground/35 mb-3">
          {props.daysThisWeek}× this week
        </p>
      )}
      <Button
        variant="outline"
        className="mt-auto"
        onClick={() => router.push(freestyleDayPath(props.basePath))}
      >
        Log Today (Freestyle)
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test -- --testPathPattern=nutrition-freestyle-path-card
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/nutrition-freestyle-path-card.tsx __tests__/app/self-tracking/nutrition-freestyle-path-card.test.tsx
git commit -m "feat(nutrition): add NutritionFreestylePathCard"
```

---

### Task 6: MemberNutritionPlanPathCard

**Files:**
- Create: `src/components/self-tracking/member-nutrition-plan-path-card.tsx`
- Create: `__tests__/app/self-tracking/member-nutrition-plan-path-card.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/app/self-tracking/member-nutrition-plan-path-card.test.tsx
import { render, screen } from '@testing-library/react';
import { MemberNutritionPlanPathCard } from '@/components/self-tracking/member-nutrition-plan-path-card';

const plan = {
  _id: 'plan1',
  name: 'Muscle Gain Plan',
  assignedByName: 'Coach Li',
  dayTypes: [
    { name: 'Training Day', targetKcal: 2200, targetProtein: 170, targetCarbs: 240, targetFat: 60 },
    { name: 'Rest Day', targetKcal: 1800, targetProtein: 160, targetCarbs: 170, targetFat: 58 },
  ],
};

it('shows empty state when no plan', () => {
  render(<MemberNutritionPlanPathCard plan={null} />);
  expect(screen.getByText(/no nutrition plan assigned/i)).toBeInTheDocument();
});

it('shows plan name and trainer', () => {
  render(<MemberNutritionPlanPathCard plan={plan} />);
  expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
  expect(screen.getByText(/coach li/i)).toBeInTheDocument();
});

it('shows all day types with Log buttons', () => {
  render(<MemberNutritionPlanPathCard plan={plan} />);
  expect(screen.getByText('Training Day')).toBeInTheDocument();
  expect(screen.getByText('Rest Day')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(2);
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=member-nutrition-plan-path-card
```

- [ ] **Step 3: Implement**

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
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MemberNutritionPlanPathCard({ plan }: Props) {
  const router = useRouter();

  if (!plan) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
          My Plan
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-30">📋</span>
          <p className="text-sm text-foreground/65">No nutrition plan assigned yet.</p>
          <p className="text-xs text-foreground/40">Ask your trainer to assign a plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
        My Plan
      </span>
      <div className="mb-3">
        <div className="text-sm font-semibold">{plan.name}</div>
        <div className="text-[10px] text-foreground/45 mt-0.5">
          Assigned by {plan.assignedByName} · {plan.dayTypes.length} day type{plan.dayTypes.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {plan.dayTypes.map((dt) => (
          <div
            key={dt.name}
            className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium">{dt.name}</div>
              <div className="text-[10px] text-foreground/45">
                {dt.targetKcal} kcal · P {dt.targetProtein}g · C {dt.targetCarbs}g · F {dt.targetFat}g
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                router.push(
                  `/member/nutrition/day?date=${todayISO()}&mode=plan&dayType=${encodeURIComponent(dt.name)}`,
                )
              }
              className="h-6 px-2 text-[11px] shrink-0 text-primary-light hover:bg-primary/10"
            >
              Log
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test -- --testPathPattern=member-nutrition-plan-path-card
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/member-nutrition-plan-path-card.tsx __tests__/app/self-tracking/member-nutrition-plan-path-card.test.tsx
git commit -m "feat(nutrition): add MemberNutritionPlanPathCard"
```

---

### Task 7: NutritionActivityStrip + MiniNutritionCalendar + NutritionCalendarHeaderTrigger

**Files:**
- Create: `src/components/self-tracking/nutrition-activity-strip.tsx`
- Create: `src/components/self-tracking/mini-nutrition-calendar.tsx`
- Create: `src/components/self-tracking/nutrition-calendar-header-trigger.tsx`

No unit tests needed for these thin presentational wrappers — covered by E2E.

- [ ] **Step 1: NutritionActivityStrip**

```typescript
// src/components/self-tracking/nutrition-activity-strip.tsx
'use client';

interface FullProps {
  state: 'full';
  last14Days: boolean[];
  daysThisMonth: number;
  avgKcal: number;
  avgProteinG: number;
}
interface LightProps {
  state: 'light';
  last14Days: boolean[];
  daysLogged: number;
}
interface EmptyProps { state: 'empty'; }
type Props = FullProps | LightProps | EmptyProps;

export function NutritionActivityStrip(props: Props) {
  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">Get started</span>
          <span className="text-[11px] text-foreground/65">Pick a path · Log meals · Complete day</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">Last 14 days</span>
        <div className="flex gap-[3px]">
          {props.last14Days.map((on, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-[3px] ${on ? 'bg-primary/65' : 'bg-foreground/5'}`}
            />
          ))}
        </div>
      </div>
      {props.state === 'full' ? (
        <div className="flex items-center gap-4 text-[11px] tabular-nums text-foreground/65">
          <span><span className="text-foreground font-semibold">{props.daysThisMonth}</span> days</span>
          <span><span className="text-foreground font-semibold">{props.avgKcal}</span> avg kcal</span>
          <span><span className="text-foreground font-semibold">{props.avgProteinG}g</span> avg protein</span>
        </div>
      ) : (
        <div className="text-[11px] text-foreground/65">
          <span className="text-foreground font-semibold">{props.daysLogged}</span> days logged
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: MiniNutritionCalendar**

```typescript
// src/components/self-tracking/mini-nutrition-calendar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition';

interface RawLog {
  date: string;
  dayLabel: string;
  dayCompleted: boolean;
  meals: { completed: boolean; items: { kcal: number }[] }[];
}

interface Props { basePath: BasePath; }

function toEntries(logs: RawLog[]): NutritionDayEntry[] {
  return logs.map((l) => ({
    date: l.date,
    kcal: l.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0),
    dayLabel: l.dayLabel,
    dayCompleted: l.dayCompleted,
  }));
}

export function MiniNutritionCalendar({ basePath }: Props) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: RawLog[]) => { if (!cancelled) setEntries(toEntries(data)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [year, month]);

  function dayPath(date: string): string {
    if (basePath === '/member/nutrition') return `/member/nutrition/day?date=${date}`;
    return `${basePath}/day?date=${date}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[1.4px] font-semibold text-foreground/65">
          Nutrition History
        </span>
      </div>
      <SelfNutritionCalendar
        entries={entries}
        onSelect={(entry) => router.push(dayPath(entry.date))}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      />
    </div>
  );
}
```

- [ ] **Step 3: NutritionCalendarHeaderTrigger**

```typescript
// src/components/self-tracking/nutrition-calendar-header-trigger.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { NutritionCalendarPopover } from './nutrition-calendar-popover';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition' | '/member/nutrition';

export function NutritionCalendarHeaderTrigger({ basePath }: { basePath: BasePath }) {
  const router = useRouter();

  function dayPath(date: string): string {
    if (basePath === '/member/nutrition') return `/member/nutrition/day?date=${date}`;
    return `${basePath}/day?date=${date}`;
  }

  return (
    <NutritionCalendarPopover
      onSelect={(date) => router.push(dayPath(date))}
      trigger={
        <button
          aria-label="Open calendar"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <Calendar className="h-4 w-4" />
        </button>
      }
    />
  );
}
```

- [ ] **Step 4: Lint check**

```bash
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/nutrition-activity-strip.tsx src/components/self-tracking/mini-nutrition-calendar.tsx src/components/self-tracking/nutrition-calendar-header-trigger.tsx
git commit -m "feat(nutrition): add NutritionActivityStrip, MiniNutritionCalendar, NutritionCalendarHeaderTrigger"
```

---

### Task 8: Move owner/trainer day view to /day sub-route

**Files:**
- Create: `src/app/(dashboard)/owner/my-nutrition/day/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-nutrition/day/page.tsx`
- Modify: `src/app/(dashboard)/owner/my-nutrition/_components/day-view-with-router.tsx` (update basePath type)
- Modify: `src/app/(dashboard)/trainer/my-nutrition/_components/day-view-with-router.tsx` (update basePath type)

- [ ] **Step 1: Create owner day page**

```typescript
// src/app/(dashboard)/owner/my-nutrition/day/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SelfNutritionDayViewWithRouter } from '../_components/day-view-with-router';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string; templateId?: string; dayType?: string }>;
}

export default async function OwnerMyNutritionDayPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  const { date: rawDate, templateId, dayType } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;

  return (
    <SelfNutritionDayViewWithRouter
      initialDate={date}
      basePath="/owner/my-nutrition"
      initialTemplateId={templateId}
      initialDayTypeName={dayType}
    />
  );
}
```

- [ ] **Step 2: Create trainer day page** (identical, role check only)

```typescript
// src/app/(dashboard)/trainer/my-nutrition/day/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SelfNutritionDayViewWithRouter } from '../_components/day-view-with-router';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string; templateId?: string; dayType?: string }>;
}

export default async function TrainerMyNutritionDayPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  const { date: rawDate, templateId, dayType } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;

  return (
    <SelfNutritionDayViewWithRouter
      initialDate={date}
      basePath="/trainer/my-nutrition"
      initialTemplateId={templateId}
      initialDayTypeName={dayType}
    />
  );
}
```

- [ ] **Step 3: Update day-view-with-router to accept template props**

In both `src/app/(dashboard)/owner/my-nutrition/_components/day-view-with-router.tsx` and the trainer equivalent, update:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

interface Props {
  initialDate: string;
  basePath: '/owner/my-nutrition' | '/trainer/my-nutrition';
  initialTemplateId?: string;
  initialDayTypeName?: string;
}

export function SelfNutritionDayViewWithRouter({ initialDate, basePath, initialTemplateId, initialDayTypeName }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => { router.push(`${basePath}/day?date=${d}`, { scroll: false }); },
    [router, basePath],
  );
  return (
    <SelfNutritionDayView
      key={initialDate}
      initialDate={initialDate}
      onDateChange={onDateChange}
      initialTemplateId={initialTemplateId}
      initialDayTypeName={initialDayTypeName}
    />
  );
}
```

- [ ] **Step 4: Verify build (no TS errors)**

```bash
pnpm build 2>&1 | head -40
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/owner/my-nutrition/day/" "src/app/(dashboard)/trainer/my-nutrition/day/" "src/app/(dashboard)/owner/my-nutrition/_components/" "src/app/(dashboard)/trainer/my-nutrition/_components/"
git commit -m "feat(nutrition): add /day sub-route for owner and trainer day views"
```

---

### Task 9: SelfNutritionDayView — template initialization + compare dialog

**Files:**
- Modify: `src/components/self-tracking/self-nutrition-day-view.tsx`
- Modify: `__tests__/app/self-tracking/self-nutrition-day-view.test.tsx` (if exists, else create)

- [ ] **Step 1: Write failing tests**

```typescript
// In existing or new test file for SelfNutritionDayView
it('pre-fills meals from template when initialTemplateId and initialDayTypeName are provided and no existing log', async () => {
  // Mock GET /api/me/nutrition-logs/2026-05-19 → null (no existing log)
  // Mock GET /api/nutrition-templates/tpl1 → template with 'Training Day' dayType containing meals
  // Render with initialTemplateId="tpl1" initialDayTypeName="Training Day"
  // Expect: meal names from template appear in rendered output
});

it('shows NutritionPlanCompareDialog after animation onComplete when planDayTypes provided', async () => {
  // After markDayComplete flow completes and celebration overlay calls onComplete,
  // NutritionPlanCompareDialog should open
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=self-nutrition-day-view
```

- [ ] **Step 3: Update SelfNutritionDayView**

Add these props to the `Props` interface:

```typescript
interface Props {
  initialDate: string;
  readOnly?: boolean;
  onDateChange?: (date: string) => void;
  initialTemplateId?: string;
  initialDayTypeName?: string;
  planDayTypes?: PlanDayType[]; // for member plan comparison
}
```

Import `PlanDayType` from `@/components/nutrition/nutrition-plan-compare-dialog` and `NutritionPlanCompareDialog`.

In the `useEffect` that loads the log, extend the fallback branch:

```typescript
// inside load():
const data = res.ok ? ((await res.json()) as SelfNutritionLog | null) : null;

if (data) {
  setLog(data);
  return;
}

// No existing log — check if we should init from template
if (props.initialTemplateId && props.initialDayTypeName) {
  const tplRes = await fetch(`/api/nutrition-templates/${props.initialTemplateId}`);
  if (tplRes.ok) {
    const tpl = (await tplRes.json()) as { dayTypes: Array<{ name: string; meals: ISelfMeal[] }> };
    const dayType = tpl.dayTypes.find((dt) => dt.name === props.initialDayTypeName);
    if (dayType) {
      setLog({
        date,
        sourceTemplateId: props.initialTemplateId,
        sourceTemplateDayTypeName: props.initialDayTypeName,
        dayLabel: props.initialDayTypeName,
        meals: dayType.meals.map((m) => ({ ...m, completed: false })),
        dayCompleted: false,
      });
      return;
    }
  }
}

// Fallback to freestyle defaults
setLog({
  date,
  sourceTemplateId: null,
  sourceTemplateDayTypeName: null,
  dayLabel: 'Freestyle',
  meals: DEFAULT_MEALS,
  dayCompleted: false,
});
```

Add compare dialog state and wire to animation `onComplete`:

```typescript
const [compareOpen, setCompareOpen] = useState(false);

// In the existing celebrationMacros section, change onComplete to:
onComplete={() => {
  setCelebrationMacros(null);
  if (props.planDayTypes && props.planDayTypes.length > 0) {
    setCompareOpen(true);
  }
}}
```

Add the dialog at the bottom of the return (after the celebration overlay):

```typescript
{props.planDayTypes && props.planDayTypes.length > 0 && log && (
  <NutritionPlanCompareDialog
    open={compareOpen}
    onOpenChange={setCompareOpen}
    date={date}
    loggedKcal={Math.round(macros.kcal)}
    loggedProtein={Math.round(macros.protein)}
    loggedCarbs={Math.round(macros.carbs)}
    loggedFat={Math.round(macros.fat)}
    planDayTypes={props.planDayTypes}
  />
)}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test -- --testPathPattern=self-nutrition-day-view
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/self-nutrition-day-view.tsx
git commit -m "feat(nutrition): SelfNutritionDayView — template init and plan compare dialog"
```

---

### Task 10: MyNutritionLanding (owner/trainer server component) + landing pages

**Files:**
- Create: `src/components/self-tracking/my-nutrition-landing.tsx`
- Modify: `src/app/(dashboard)/owner/my-nutrition/page.tsx`
- Modify: `src/app/(dashboard)/trainer/my-nutrition/page.tsx`

- [ ] **Step 1: Create MyNutritionLanding**

```typescript
// src/components/self-tracking/my-nutrition-landing.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { NutritionActivityStrip } from './nutrition-activity-strip';
import { NutritionTemplatePathCard, type NutritionTemplate } from './nutrition-template-path-card';
import { NutritionFreestylePathCard } from './nutrition-freestyle-path-card';
import { MiniNutritionCalendar } from './mini-nutrition-calendar';
import { NutritionCalendarHeaderTrigger } from './nutrition-calendar-header-trigger';
import { PathCardsGrid, PathCardItem } from './path-cards-grid';
import { PageHeader } from '@/components/shared/page-header';
import type { ISelfNutritionLog } from '@/lib/db/models/self-nutrition-log.model';
import type { INutritionTemplate } from '@/lib/db/models/nutrition-template.model';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition';

export async function MyNutritionLanding({ basePath }: { basePath: BasePath }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfNutritionLogRepository();
  const tplRepo = new MongoNutritionTemplateRepository();

  const now = new Date();
  const [monthLogs, recent, templates] = await Promise.all([
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 14),
    tplRepo.findByCreator(userId),
  ]);

  const completedCount = recent.filter((l) => l.dayCompleted).length;
  const hasUsedTemplate = recent.some((l) => l.sourceTemplateId !== null);
  const state = detectLandingState({ completedSessionCount: completedCount, hasUsedTemplate });

  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    last14Days.push(recent.some((l) => l.date === iso));
  }

  const avgKcal = avgKcalFromLogs(monthLogs);
  const avgProtein = avgProteinFromLogs(monthLogs);

  const headerSubtitle =
    state === 'full'
      ? `${monthLogs.length} days in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${completedCount} days logged`
        : "Track your own nutrition here — kept separate from your members'.";

  const lastFreestyleLog = recent.find((l) => l.sourceTemplateId === null && l.dayCompleted);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        subtitle={headerSubtitle}
        actions={<NutritionCalendarHeaderTrigger basePath={basePath} />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {state === 'full' && (
          <NutritionActivityStrip state="full" last14Days={last14Days} daysThisMonth={monthLogs.length} avgKcal={avgKcal} avgProteinG={avgProtein} />
        )}
        {state === 'light' && (
          <NutritionActivityStrip state="light" last14Days={last14Days} daysLogged={completedCount} />
        )}
        {state === 'empty' && <NutritionActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <NutritionTemplatePathCard
              templates={toCardTemplates(templates)}
              basePath={basePath}
            />
          </PathCardItem>
          <PathCardItem>
            {lastFreestyleLog ? (
              <NutritionFreestylePathCard
                state={state === 'full' ? 'full' : 'light'}
                lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                {...(state === 'full' ? { daysThisWeek: countDaysThisWeek(recent) } : {})}
                basePath={basePath}
              />
            ) : (
              <NutritionFreestylePathCard state="empty" basePath={basePath} />
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniNutritionCalendar basePath={basePath} />
      </div>
    </div>
  );
}

function avgKcalFromLogs(logs: ISelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce((s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.kcal, 0), 0), 0);
  return Math.round(total / logs.length);
}

function avgProteinFromLogs(logs: ISelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce((s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.protein, 0), 0), 0);
  return Math.round(total / logs.length);
}

function countDaysThisWeek(logs: ISelfNutritionLog[]): number {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekAgoISO = weekAgo.toISOString().slice(0, 10);
  return logs.filter((l) => l.date >= weekAgoISO).length;
}

function toCardTemplates(templates: INutritionTemplate[]): NutritionTemplate[] {
  return templates.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
    dayTypes: t.dayTypes.map((dt) => ({
      name: dt.name,
      targetKcal: dt.targetKcal,
      targetProtein: dt.targetProtein,
      targetCarbs: dt.targetCarbs,
      targetFat: dt.targetFat,
    })),
  }));
}

function toLastFreestyle(log: ISelfNutritionLog) {
  const kcal = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0));
  const protein = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.protein, 0), 0));
  const carbs = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.carbs, 0), 0));
  const fat = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.fat, 0), 0));
  const d = new Date(log.date + 'T00:00:00Z');
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
  return { dateLabel, kcal, protein, carbs, fat };
}
```

- [ ] **Step 2: Update owner landing page**

```typescript
// src/app/(dashboard)/owner/my-nutrition/page.tsx
import { MyNutritionLanding } from '@/components/self-tracking/my-nutrition-landing';

export default function OwnerMyNutritionPage() {
  return <MyNutritionLanding basePath="/owner/my-nutrition" />;
}
```

- [ ] **Step 3: Update trainer landing page**

```typescript
// src/app/(dashboard)/trainer/my-nutrition/page.tsx
import { MyNutritionLanding } from '@/components/self-tracking/my-nutrition-landing';

export default function TrainerMyNutritionPage() {
  return <MyNutritionLanding basePath="/trainer/my-nutrition" />;
}
```

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/my-nutrition-landing.tsx "src/app/(dashboard)/owner/my-nutrition/page.tsx" "src/app/(dashboard)/trainer/my-nutrition/page.tsx"
git commit -m "feat(nutrition): add MyNutritionLanding for owner/trainer"
```

---

### Task 11: Add DayCompleteConfirmDialog to DailyNutritionView + compare dialog

**Files:**
- Modify: `src/components/nutrition/daily-nutrition-view.tsx`
- Modify: `__tests__/app/member/nutrition-plan-viewer.test.tsx` (or nearest existing test)

- [ ] **Step 1: Write failing tests**

In the existing member nutrition test file:

```typescript
it('shows DayCompleteConfirmDialog when Complete Day is clicked', async () => {
  // render DailyNutritionView with a loaded log
  // click 'Complete Day' button
  // expect DayCompleteConfirmDialog to appear (look for confirm button text)
});

it('shows NutritionPlanCompareDialog after day completion when planDayTypes provided', async () => {
  // complete the day flow
  // after animation fires onComplete
  // expect NutritionPlanCompareDialog to open
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern=nutrition-plan-viewer
```

- [ ] **Step 3: Update DailyNutritionView**

Add to `Props`:
```typescript
interface Props {
  memberId: string;
  initialDate: string;
  planDayTypes?: PlanDayType[];
}
```

Import `DayCompleteConfirmDialog`, `DayCompleteBar`, `NutritionDayCompleteAnimation`, `NutritionPlanCompareDialog`, `PlanDayType`.

Add state:
```typescript
const [submittingComplete, setSubmittingComplete] = useState(false);
const [confirmOpen, setConfirmOpen] = useState(false);
const [celebrationMacros, setCelebrationMacros] = useState<{ proteinG: number; carbsG: number; fatG: number } | null>(null);
const [compareOpen, setCompareOpen] = useState(false);
```

Replace the existing `completeDay` function + bottom bar with the same pattern as `SelfNutritionDayView`:

```typescript
async function markDayComplete(opts: { markAll: boolean }): Promise<void> {
  if (!log) return;
  setSubmittingComplete(true);
  const nextMeals = opts.markAll
    ? log.meals.map((m) => ({ ...m, completed: true }))
    : log.meals;
  const next = { ...log, meals: nextMeals, dayCompleted: true };
  const completedMacros = aggregateMacros(nextMeals);
  await persist(next);
  setSubmittingComplete(false);
  setConfirmOpen(false);
  setCelebrationMacros({
    proteinG: Math.round(completedMacros.protein),
    carbsG: Math.round(completedMacros.carbs),
    fatG: Math.round(completedMacros.fat),
  });
}

const completedMeals = log ? log.meals.filter((m) => m.completed).length : 0;
const sealedKcal = log
  ? log.meals.filter((m) => m.completed).reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0)
  : 0;
```

Replace the bottom sticky bar:
```typescript
<DayCompleteBar
  dayCompleted={log.dayCompleted}
  kcal={log.dayCompleted ? Math.round(sealedKcal) : Math.round(dayMacros.kcal)}
  totalItems={totalItems}
  onRequestComplete={() => setConfirmOpen(true)}
  submitting={submittingComplete}
/>
```

Add dialogs after the main div:
```typescript
<DayCompleteConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  totalMeals={log?.meals.length ?? 0}
  completedMeals={completedMeals}
  sealedKcal={Math.round(sealedKcal)}
  totalKcal={Math.round(dayMacros.kcal)}
  onConfirm={markDayComplete}
  submitting={submittingComplete}
/>

{celebrationMacros && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div className="bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs mx-4">
      <NutritionDayCompleteAnimation
        proteinG={celebrationMacros.proteinG}
        carbsG={celebrationMacros.carbsG}
        fatG={celebrationMacros.fatG}
        onComplete={() => {
          setCelebrationMacros(null);
          if (planDayTypes && planDayTypes.length > 0) setCompareOpen(true);
        }}
      />
    </div>
  </div>
)}

{planDayTypes && planDayTypes.length > 0 && log && (
  <NutritionPlanCompareDialog
    open={compareOpen}
    onOpenChange={setCompareOpen}
    date={date}
    loggedKcal={Math.round(dayMacros.kcal)}
    loggedProtein={Math.round(dayMacros.protein)}
    loggedCarbs={Math.round(dayMacros.carbs)}
    loggedFat={Math.round(dayMacros.fat)}
    planDayTypes={planDayTypes}
  />
)}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test -- --testPathPattern=nutrition-plan-viewer
```

- [ ] **Step 5: Commit**

```bash
git add src/components/nutrition/daily-nutrition-view.tsx
git commit -m "feat(nutrition): add DayCompleteConfirmDialog and compare dialog to DailyNutritionView"
```

---

### Task 12: Member /member/nutrition/day route

**Files:**
- Create: `src/app/(dashboard)/member/nutrition/day/page.tsx`
- Create: `src/app/(dashboard)/member/nutrition/day/_components/member-nutrition-day-client.tsx`

- [ ] **Step 1: Create client wrapper**

```typescript
// src/app/(dashboard)/member/nutrition/day/_components/member-nutrition-day-client.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';
import type { PlanDayType } from '@/components/nutrition/nutrition-plan-compare-dialog';

interface Props {
  memberId: string;
  initialDate: string;
  mode: 'plan' | 'free';
  dayType: string | undefined;
  planDayTypes: PlanDayType[];
}

export function MemberNutritionDayClient({ memberId, initialDate, mode, dayType, planDayTypes }: Props) {
  const router = useRouter();
  const onDateChange = useCallback(
    (d: string) => {
      const params = new URLSearchParams({ date: d, mode });
      router.push(`/member/nutrition/day?${params.toString()}`, { scroll: false });
    },
    [router, mode],
  );

  if (mode === 'free') {
    return (
      <SelfNutritionDayView
        key={initialDate}
        initialDate={initialDate}
        onDateChange={onDateChange}
        planDayTypes={planDayTypes}
      />
    );
  }

  return (
    <DailyNutritionView
      memberId={memberId}
      initialDate={initialDate}
      forceDayType={dayType}
      planDayTypes={planDayTypes}
    />
  );
}
```

- [ ] **Step 2: Add `forceDayType` prop to DailyNutritionView**

In `src/components/nutrition/daily-nutrition-view.tsx`, add `forceDayType?: string` to `Props`. In the `useEffect` fetch:

```typescript
const url = forceDayType
  ? `/api/members/${memberId}/nutrition/log/${date}?dayTypeName=${encodeURIComponent(forceDayType)}`
  : `/api/members/${memberId}/nutrition/log/${date}`;
const res = await fetch(url);
```

- [ ] **Step 3: Create server page**

```typescript
// src/app/(dashboard)/member/nutrition/day/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MemberNutritionDayClient } from './_components/member-nutrition-day-client';
import type { PlanDayType } from '@/components/nutrition/nutrition-plan-compare-dialog';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{ date?: string; mode?: string; dayType?: string }>;
}

export default async function MemberNutritionDayPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');

  const { date: rawDate, mode: rawMode, dayType } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = rawDate && DATE_RE.test(rawDate) && rawDate <= today ? rawDate : today;
  const mode = rawMode === 'free' ? 'free' : 'plan';

  await connectDB();
  const planRepo = new MongoMemberNutritionPlanRepository();
  const plan = await planRepo.findActive(session.user.id);

  const planDayTypes: PlanDayType[] = plan
    ? plan.dayTypes.map((dt) => ({
        name: dt.name,
        targetKcal: dt.targetKcal,
        targetProtein: dt.targetProtein,
        targetCarbs: dt.targetCarbs,
        targetFat: dt.targetFat,
      }))
    : [];

  return (
    <MemberNutritionDayClient
      memberId={session.user.id}
      initialDate={date}
      mode={mode}
      dayType={dayType}
      planDayTypes={planDayTypes}
    />
  );
}
```

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/member/nutrition/day/"
git commit -m "feat(nutrition): add member /nutrition/day route with plan/free mode"
```

---

### Task 13: MemberNutritionLanding + update member nutrition page

**Files:**
- Create: `src/components/self-tracking/member-nutrition-landing.tsx`
- Modify: `src/app/(dashboard)/member/nutrition/page.tsx`

- [ ] **Step 1: Create MemberNutritionLanding**

```typescript
// src/components/self-tracking/member-nutrition-landing.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { NutritionActivityStrip } from './nutrition-activity-strip';
import { MemberNutritionPlanPathCard, type MemberNutritionPlan } from './member-nutrition-plan-path-card';
import { NutritionFreestylePathCard } from './nutrition-freestyle-path-card';
import { MiniNutritionCalendar } from './mini-nutrition-calendar';
import { NutritionCalendarHeaderTrigger } from './nutrition-calendar-header-trigger';
import { PathCardsGrid, PathCardItem } from './path-cards-grid';
import { PageHeader } from '@/components/shared/page-header';
import type { ISelfNutritionLog } from '@/lib/db/models/self-nutrition-log.model';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';

export async function MemberNutritionLanding() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfNutritionLogRepository();
  const planRepo = new MongoMemberNutritionPlanRepository();
  const userRepo = new MongoUserRepository();

  const now = new Date();
  const [monthLogs, recent, activePlan] = await Promise.all([
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 14),
    planRepo.findActive(userId),
  ]);

  // Fetch trainer name if plan exists
  let trainerName = 'your trainer';
  if (activePlan?.assignedById) {
    const trainer = await userRepo.findById(activePlan.assignedById.toString());
    if (trainer?.name) trainerName = trainer.name;
  }

  const completedCount = recent.filter((l) => l.dayCompleted).length;
  const hasUsedTemplate = recent.some((l) => l.sourceTemplateId !== null);
  const state = detectLandingState({ completedSessionCount: completedCount, hasUsedTemplate });

  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    last14Days.push(recent.some((l) => l.date === iso));
  }

  const avgKcal = avgKcalFromLogs(monthLogs);
  const avgProtein = avgProteinFromLogs(monthLogs);

  const headerSubtitle =
    state === 'full'
      ? `${monthLogs.length} days in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${completedCount} days logged`
        : 'Track your daily nutrition here.';

  const plan = activePlan ? toPlanCard(activePlan, trainerName) : null;
  const lastFreestyleLog = recent.find((l) => l.sourceTemplateId === null && l.dayCompleted);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        subtitle={headerSubtitle}
        actions={<NutritionCalendarHeaderTrigger basePath="/member/nutrition" />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {state === 'full' && (
          <NutritionActivityStrip state="full" last14Days={last14Days} daysThisMonth={monthLogs.length} avgKcal={avgKcal} avgProteinG={avgProtein} />
        )}
        {state === 'light' && (
          <NutritionActivityStrip state="light" last14Days={last14Days} daysLogged={completedCount} />
        )}
        {state === 'empty' && <NutritionActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <MemberNutritionPlanPathCard plan={plan} />
          </PathCardItem>
          <PathCardItem>
            {lastFreestyleLog ? (
              <NutritionFreestylePathCard
                state={state === 'full' ? 'full' : 'light'}
                lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                {...(state === 'full' ? { daysThisWeek: countDaysThisWeek(recent) } : {})}
                basePath="/member/nutrition"
              />
            ) : (
              <NutritionFreestylePathCard state="empty" basePath="/member/nutrition" />
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniNutritionCalendar basePath="/member/nutrition" />
      </div>
    </div>
  );
}

function toPlanCard(plan: IMemberNutritionPlan, trainerName: string): MemberNutritionPlan {
  return {
    _id: plan._id.toString(),
    name: plan.name,
    assignedByName: trainerName,
    dayTypes: plan.dayTypes.map((dt) => ({
      name: dt.name,
      targetKcal: dt.targetKcal,
      targetProtein: dt.targetProtein,
      targetCarbs: dt.targetCarbs,
      targetFat: dt.targetFat,
    })),
  };
}

function avgKcalFromLogs(logs: ISelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce((s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.kcal, 0), 0), 0);
  return Math.round(total / logs.length);
}

function avgProteinFromLogs(logs: ISelfNutritionLog[]): number {
  if (logs.length === 0) return 0;
  const total = logs.reduce((s, l) => s + l.meals.reduce((ms, m) => ms + m.items.reduce((is, i) => is + i.protein, 0), 0), 0);
  return Math.round(total / logs.length);
}

function countDaysThisWeek(logs: ISelfNutritionLog[]): number {
  const now = new Date();
  const weekAgoISO = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  return logs.filter((l) => l.date >= weekAgoISO).length;
}

function toLastFreestyle(log: ISelfNutritionLog) {
  const kcal = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.kcal, 0), 0));
  const protein = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.protein, 0), 0));
  const carbs = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.carbs, 0), 0));
  const fat = Math.round(log.meals.reduce((s, m) => s + m.items.reduce((si, i) => si + i.fat, 0), 0));
  const dateLabel = new Date(log.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short' });
  return { dateLabel, kcal, protein, carbs, fat };
}
```

- [ ] **Step 2: Update member nutrition page**

```typescript
// src/app/(dashboard)/member/nutrition/page.tsx
import { MemberNutritionLanding } from '@/components/self-tracking/member-nutrition-landing';

export default function MemberNutritionPage() {
  return <MemberNutritionLanding />;
}
```

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 4: Full test suite**

```bash
pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/member-nutrition-landing.tsx "src/app/(dashboard)/member/nutrition/page.tsx"
git commit -m "feat(nutrition): add MemberNutritionLanding and update member nutrition page"
```

---

### Task 14: E2E tests

**Files:**
- Create: `e2e/self-tracking/owner-nutrition-landing.spec.ts`
- Create: `e2e/member/member-nutrition-landing.spec.ts`
- Create: `e2e/member/member-nutrition-freestyle.spec.ts`

Reference existing patterns in `e2e/self-tracking/owner-session-lifecycle.spec.ts` and `e2e/member/session-lifecycle.spec.ts` before writing.

- [ ] **Step 1: Owner/Trainer nutrition landing spec**

```typescript
// e2e/self-tracking/owner-nutrition-landing.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Owner My Nutrition landing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'owner');
  });

  test('landing page renders with From Template and Freestyle cards', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await expect(page.getByText('My Nutrition')).toBeVisible();
    await expect(page.getByText('From Template')).toBeVisible();
    await expect(page.getByText('Freestyle')).toBeVisible();
  });

  test('template accordion expands to show day types', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    // If templates exist, expand the first one
    const firstTemplate = page.locator('.tpl-header, [data-testid="tpl-header"]').first();
    if (await firstTemplate.isVisible()) {
      await firstTemplate.click();
      await expect(page.getByRole('button', { name: /log/i }).first()).toBeVisible();
    }
  });

  test('Log button navigates to day view with template params', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    const logBtn = page.getByRole('button', { name: /^log$/i }).first();
    if (await logBtn.isVisible()) {
      await logBtn.click();
      await expect(page).toHaveURL(/\/owner\/my-nutrition\/day/);
    }
  });

  test('Freestyle Log Today navigates to day view', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await page.getByRole('button', { name: /log today/i }).click();
    await expect(page).toHaveURL(/\/owner\/my-nutrition\/day/);
  });

  test('calendar icon opens calendar popover', async ({ page }) => {
    await page.goto('/owner/my-nutrition');
    await page.getByRole('button', { name: /open calendar/i }).click();
    await expect(page.locator('[role="dialog"], [data-radix-popper-content-wrapper]')).toBeVisible();
  });
});
```

- [ ] **Step 2: Member nutrition landing spec**

```typescript
// e2e/member/member-nutrition-landing.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Member My Nutrition landing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'member');
  });

  test('landing page renders with My Plan and Freestyle cards', async ({ page }) => {
    await page.goto('/member/nutrition');
    await expect(page.getByText('My Nutrition')).toBeVisible();
    await expect(page.getByText(/my plan|no nutrition plan/i)).toBeVisible();
    await expect(page.getByText('Freestyle')).toBeVisible();
  });

  test('plan Log button navigates to day view in plan mode', async ({ page }) => {
    await page.goto('/member/nutrition');
    const logBtn = page.getByRole('button', { name: /^log$/i }).first();
    if (await logBtn.isVisible()) {
      await logBtn.click();
      await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=plan/);
    }
  });

  test('Freestyle Log Today navigates to day view in free mode', async ({ page }) => {
    await page.goto('/member/nutrition');
    await page.getByRole('button', { name: /log today/i }).click();
    await expect(page).toHaveURL(/\/member\/nutrition\/day.*mode=free/);
  });
});
```

- [ ] **Step 3: Member freestyle day view + compare dialog spec**

```typescript
// e2e/member/member-nutrition-freestyle.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test.describe('Member freestyle nutrition day view', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'member');
  });

  test('freestyle day view loads and shows meal sections', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.goto(`/member/nutrition/day?date=${today}&mode=free`);
    await expect(page.getByText(/breakfast|lunch|dinner/i).first()).toBeVisible();
  });

  test('complete day flow: confirm dialog appears before submitting', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.goto(`/member/nutrition/day?date=${today}&mode=free`);
    await page.getByRole('button', { name: /complete day/i }).click();
    // DayCompleteConfirmDialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/mark today as complete/i)).toBeVisible();
  });

  test('compare dialog appears after completion when plan exists', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.goto(`/member/nutrition/day?date=${today}&mode=free`);
    await page.getByRole('button', { name: /complete day/i }).click();
    // Confirm in the dialog
    const submitBtn = page.getByRole('button', { name: /submit|mark all/i }).first();
    await submitBtn.click();
    // Wait for celebration animation to complete (up to 4s) and compare dialog to appear
    await page.waitForTimeout(3000);
    // If member has an active plan, compare dialog should appear with pill selector
    const compareDialog = page.getByRole('dialog').filter({ hasText: /compare with plan/i });
    if (await compareDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      // verify pill selector is present
      await expect(page.getByRole('button').filter({ hasText: /(training|rest|high)/i }).first()).toBeVisible();
      // click Done
      await page.getByRole('button', { name: /done/i }).click();
      await expect(compareDialog).not.toBeVisible();
    }
  });

  test('plan-mode day view loads with pre-filled meals', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.goto(`/member/nutrition/day?date=${today}&mode=plan`);
    // Should load without error and show meal sections
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.getByText(/breakfast|lunch|training|rest/i).first()).toBeVisible();
  });
});
```

- [ ] **Step 4: Run E2E tests**

```bash
pnpm test:e2e -- --grep "nutrition"
```

Fix any failures before proceeding.

- [ ] **Step 5: Commit**

```bash
git add e2e/self-tracking/owner-nutrition-landing.spec.ts e2e/member/member-nutrition-landing.spec.ts e2e/member/member-nutrition-freestyle.spec.ts
git commit -m "test(e2e): add nutrition landing and freestyle flow specs"
```

---

### Task 15: Final checks and docs update

- [ ] **Step 1: Full test suite**

```bash
pnpm test
```

All tests must pass.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Zero warnings, zero errors.

- [ ] **Step 3: Production build**

```bash
pnpm build
```

Must complete cleanly.

- [ ] **Step 4: Full E2E suite**

```bash
pnpm test:e2e
```

- [ ] **Step 5: Update docs/INDEX.md** — add plan row

```markdown
| Nutrition Enhancement (Plan) | [nutrition-enhancement-plan.md](2026-05-19/plans/nutrition-enhancement-plan.md) | Complete |
```

- [ ] **Step 6: Final commit**

```bash
git add docs/INDEX.md
git commit -m "docs: mark nutrition enhancement plan complete"
```
