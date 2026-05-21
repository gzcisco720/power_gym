# Member Nutrition Plan Create Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simple template-picker dialog with a full plan create flow: searchable template combobox → full plan editor page (scratch or pre-filled) → schedule sheet → atomic save of plan + schedule.

**Architecture:** A new server-rendered page at `/trainer/members/[id]/nutrition/new` hosts a `MemberNutritionPlanForm` client component. The form collects plan data, opens the existing `ScheduleEditor` in create mode (no PATCH — just returns schedule via callback), then POSTs plan + schedule together. The old `AssignDialog` is replaced with a `ChangePlanDialog` that uses a shadcn Command combobox.

**Tech Stack:** Next.js App Router, shadcn/ui (Command, Popover, Sheet, Dialog), React state, existing `ScheduleEditor`, existing `NutritionTemplateForm` patterns, Playwright E2E.

---

## File Map

| Path | Change |
|------|--------|
| `src/components/nutrition/schedule-editor.tsx` | Edit — expose schedule to `onSave`, add `mode` prop |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx` | Edit — update `onSave` signature, replace `AssignDialog` with `ChangePlanDialog` |
| `src/lib/repositories/member-nutrition-plan.repository.ts` | Edit — add `schedule` to `CreateMemberNutritionPlanData` |
| `src/app/api/members/[memberId]/nutrition/route.ts` | Edit — unified POST body with required `schedule` |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/new/page.tsx` | New — server component |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/new/_components/member-nutrition-plan-form.tsx` | New — client form component |
| `__tests__/app/api/members-nutrition.test.ts` | Edit — update for new POST schema |
| `__tests__/components/nutrition/schedule-editor-create-mode.test.tsx` | New — tests for create mode |
| `e2e/trainer/nutrition.spec.ts` | Edit — update assign test, add 5 new tests |

---

## Task 1: Update `ScheduleEditor` — expose schedule to callback and add create mode

**Files:**
- Modify: `src/components/nutrition/schedule-editor.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`
- Test: `__tests__/components/nutrition/schedule-editor-create-mode.test.tsx`

- [ ] **Step 1.1: Write failing test**

Create `__tests__/components/nutrition/schedule-editor-create-mode.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const schedule = {
  weeklyPattern: [{ dayOfWeek: 1 as const, dayTypeName: 'Training' }],
  calendarOverrides: [],
  iterate: true,
};

beforeEach(() => jest.clearAllMocks());

describe('ScheduleEditor — create mode', () => {
  it('calls onSave with built schedule, does NOT call fetch', async () => {
    const onSave = jest.fn();
    render(
      <ScheduleEditor
        dayTypeNames={['Training', 'Rest']}
        initialSchedule={schedule}
        mode="create"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockFetch).not.toHaveBeenCalled();
    const passedSchedule = onSave.mock.calls[0][0] as typeof schedule;
    expect(passedSchedule.weeklyPattern).toEqual([{ dayOfWeek: 1, dayTypeName: 'Training' }]);
    expect(passedSchedule.iterate).toBe(true);
  });

  it('edit mode still calls fetch and passes schedule to onSave', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const onSave = jest.fn();
    render(
      <ScheduleEditor
        memberId="m1"
        dayTypeNames={['Training']}
        initialSchedule={schedule}
        mode="edit"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const passedSchedule = onSave.mock.calls[0][0];
    expect(passedSchedule).toHaveProperty('weeklyPattern');
  });
});
```

- [ ] **Step 1.2: Run — confirm FAIL**

```bash
pnpm test -- "__tests__/components/nutrition/schedule-editor-create-mode.test.tsx"
```
Expected: FAIL — `onSave` receives no argument / `mode` prop not recognized.

- [ ] **Step 1.3: Update `ScheduleEditor` props and `save` function**

In `src/components/nutrition/schedule-editor.tsx`, apply the following diff:

```typescript
// Change Props interface:
interface Props {
  memberId?: string;           // optional — only needed for mode='edit'
  dayTypeNames: string[];
  initialSchedule: ISchedule;
  onSave?: (schedule: ISchedule) => void;  // was: () => void
  mode?: 'edit' | 'create';   // default 'edit'
}

// Change function signature:
export function ScheduleEditor({ memberId, dayTypeNames, initialSchedule, onSave, mode = 'edit' }: Props) {
```

Replace the `save` function body:

```typescript
  async function save(): Promise<void> {
    setSaving(true);
    const weeklyPattern: IWeeklyPatternEntry[] = DAY_VALUES
      .filter((d) => weekly[d] !== NONE)
      .map((d) => ({ dayOfWeek: d, dayTypeName: weekly[d] }));
    const builtSchedule: ISchedule = { weeklyPattern, calendarOverrides: overrides, iterate };

    if (mode === 'edit') {
      await fetch(`/api/members/${memberId}/nutrition/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(builtSchedule),
      });
    }

    setSaving(false);
    onSave?.(builtSchedule);
  }
```

Add `ISchedule` to the import at the top (it's already imported from the model — verify and keep).

- [ ] **Step 1.4: Update existing `onSave` caller in `trainer-member-nutrition-client.tsx`**

Find the `ScheduleEditor` usage inside the `Sheet` and update `onSave`:

```typescript
// Before:
onSave={() => { setScheduleOpen(false); setScheduleRefresh((n) => n + 1); }}

// After:
onSave={(_schedule) => { setScheduleOpen(false); setScheduleRefresh((n) => n + 1); }}
```

Also pass `mode="edit"` explicitly for clarity (optional but self-documenting):

```typescript
<ScheduleEditor
  memberId={memberId}
  dayTypeNames={active.dayTypes.map((d) => d.name)}
  initialSchedule={active.schedule}
  mode="edit"
  onSave={(_schedule) => { setScheduleOpen(false); setScheduleRefresh((n) => n + 1); }}
/>
```

- [ ] **Step 1.5: Update the existing schedule-editor tests**

In `__tests__/app/trainer/nutrition-schedule-editor.test.tsx`, update every `onSave` test to expect a schedule argument:

```typescript
  it('calls onSave callback after successful save', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const onSave = jest.fn();
    render(
      <ScheduleEditor
        memberId="m1"
        dayTypeNames={dayTypeNames}
        initialSchedule={weeklySchedule}
        mode="edit"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const [passedSchedule] = onSave.mock.calls[0] as [{ weeklyPattern: unknown[] }];
    expect(passedSchedule).toHaveProperty('weeklyPattern');
  });
```

- [ ] **Step 1.6: Run all schedule-editor tests — confirm all pass**

```bash
pnpm test -- "__tests__/app/trainer/nutrition-schedule-editor.test.tsx" "__tests__/components/nutrition/schedule-editor-create-mode.test.tsx"
```
Expected: all green.

- [ ] **Step 1.7: Commit**

```bash
git add src/components/nutrition/schedule-editor.tsx \
        src/app/\(dashboard\)/trainer/members/\[id\]/nutrition/_components/trainer-member-nutrition-client.tsx \
        __tests__/app/trainer/nutrition-schedule-editor.test.tsx \
        __tests__/components/nutrition/schedule-editor-create-mode.test.tsx
git commit -m "feat(nutrition): expose schedule to ScheduleEditor.onSave, add create mode"
```

---

## Task 2: Extend repository + update POST API to require schedule

**Files:**
- Modify: `src/lib/repositories/member-nutrition-plan.repository.ts`
- Modify: `src/app/api/members/[memberId]/nutrition/route.ts`

- [ ] **Step 2.1: Update `CreateMemberNutritionPlanData` in the repository**

In `src/lib/repositories/member-nutrition-plan.repository.ts`:

```typescript
// Add ISchedule to import:
import type { IMemberNutritionPlan, ISchedule } from '@/lib/db/models/member-nutrition-plan.model';

// Update the interface:
export interface CreateMemberNutritionPlanData {
  memberId: string;
  assignedById: string;
  templateId: string | null;
  name: string;
  dayTypes: IDayType[];
  assignedAt: Date;
  schedule: ISchedule;   // ← new
}
```

Update the `create` method body to use `data.schedule` instead of the hardcoded default:

```typescript
  async create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan> {
    const plan = new MemberNutritionPlanModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      assignedById: new mongoose.Types.ObjectId(data.assignedById),
      templateId: data.templateId ? new mongoose.Types.ObjectId(data.templateId) : null,
      name: data.name,
      dayTypes: data.dayTypes,
      isActive: true,
      assignedAt: data.assignedAt,
      schedule: data.schedule,
    });
    return plan.save();
  }
```

- [ ] **Step 2.2: Replace POST body types in the API route**

In `src/app/api/members/[memberId]/nutrition/route.ts`, replace the old body types and handlers:

```typescript
import type { IDayType } from '@/lib/db/models/nutrition-template.model';
import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';
import type { UserRole } from '@/types/auth';

// Replace old AssignFromTemplate / AssignDirect / AssignBody with:
interface AssignBody {
  name: string;
  dayTypes: IDayType[];
  schedule: ISchedule;
  templateId?: string;
}

function isValidBody(b: unknown): b is AssignBody {
  if (!b || typeof b !== 'object') return false;
  const body = b as Record<string, unknown>;
  return (
    typeof body.name === 'string' &&
    body.name.trim().length > 0 &&
    Array.isArray(body.dayTypes) &&
    body.schedule !== null &&
    typeof body.schedule === 'object'
  );
}
```

Replace the entire `POST` function:

```typescript
export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const raw = await req.json();

  if (!isValidBody(raw)) {
    return Response.json({ error: 'Body must be {name, dayTypes, schedule}' }, { status: 400 });
  }

  const body: AssignBody = raw;

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planRepo = new MongoMemberNutritionPlanRepository();
  await planRepo.deactivateAll(memberId);

  const plan = await planRepo.create({
    memberId,
    assignedById: session.user.id,
    templateId: body.templateId ?? null,
    name: body.name,
    dayTypes: body.dayTypes,
    schedule: body.schedule,
    assignedAt: new Date(),
  });

  try {
    await getEmailService().sendNutritionPlanAssigned({
      to: member.email,
      trainerName: session.user.name ?? 'Your trainer',
      planName: body.name,
    });
  } catch (e) {
    console.error('sendNutritionPlanAssigned failed:', e);
  }

  return Response.json(plan, { status: 201 });
}
```

Remove the unused imports: `MongoNutritionTemplateRepository` is no longer needed in this file.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/repositories/member-nutrition-plan.repository.ts \
        src/app/api/members/\[memberId\]/nutrition/route.ts
git commit -m "refactor(nutrition): unify member plan POST body to {name, dayTypes, schedule}"
```

---

## Task 3: Update API unit tests

**Files:**
- Modify: `__tests__/app/api/members-nutrition.test.ts`

- [ ] **Step 3.1: Write failing tests that reflect the new API**

Replace the full contents of `__tests__/app/api/members-nutrition.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({
  getEmailService: () => ({ sendNutritionPlanAssigned: jest.fn().mockResolvedValue(undefined) }),
}));

const mockNutritionPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockNutritionPlanRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

const emptySchedule = { weeklyPattern: [], calendarOverrides: [], iterate: true };
const validBody = { name: 'Bulk Plan', dayTypes: [{ name: 'Training', meals: [] }], schedule: emptySchedule };

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}
function makeRequest(body: unknown) {
  return new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects member role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when body is missing required fields', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest({}), makeParams('m1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when schedule is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      makeRequest({ name: 'Plan', dayTypes: [] }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });

  it('trainer cannot assign to a member belonging to another trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't2' } });
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('creates plan with name, dayTypes, schedule, and templateId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', name: 'T' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' },
    });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: 'Bulk Plan' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const body = { ...validBody, templateId: 'tpl1' };
    const res = await POST(makeRequest(body), makeParams('m1'));

    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.deactivateAll).toHaveBeenCalledWith('m1');
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      assignedById: 't1',
      templateId: 'tpl1',
      name: 'Bulk Plan',
      schedule: emptySchedule,
    }));
  });

  it('creates plan without templateId when not provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', name: 'T' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' },
    });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: 'Bulk Plan' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));

    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: null }),
    );
  });

  it('owner can create plan for any member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner', name: 'Owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' },
    });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: 'Bulk Plan' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(makeRequest(validBody), makeParams('m1'));
    expect(res.status).toBe(201);
  });
});

describe('GET /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns active plan for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockNutritionPlanRepo.findActive.mockResolvedValue({ _id: 'np1' });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('blocks cross-member GET', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3.2: Run — confirm all pass**

```bash
pnpm test -- "__tests__/app/api/members-nutrition.test.ts"
```
Expected: all green.

- [ ] **Step 3.3: Commit**

```bash
git add __tests__/app/api/members-nutrition.test.ts
git commit -m "test(nutrition): update member plan POST tests for unified body schema"
```

---

## Task 4: Build `MemberNutritionPlanForm` client component

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/nutrition/new/_components/member-nutrition-plan-form.tsx`
- Create: `__tests__/app/trainer/members/member-nutrition-plan-form.test.tsx`

This component mirrors `NutritionTemplateForm` for day type / meal / item editing, but has a different footer (no description, "Continue → Set Schedule" + save-as-template checkbox) and manages the schedule sheet internally.

- [ ] **Step 4.1: Write failing tests**

Create `__tests__/app/trainer/members/member-nutrition-plan-form.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemberNutritionPlanForm } from '@/app/(dashboard)/trainer/members/[id]/nutrition/new/_components/member-nutrition-plan-form';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.mockClear();
});

describe('MemberNutritionPlanForm', () => {
  it('disables Continue when name is empty', () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('disables Continue when no day types exist', () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    fireEvent.change(screen.getByPlaceholderText(/plan name/i), { target: { value: 'My Plan' } });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables Continue when name and at least one day type exist', async () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    fireEvent.change(screen.getByPlaceholderText(/plan name/i), { target: { value: 'My Plan' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled(),
    );
  });

  it('pre-fills name and day types from initialData', () => {
    render(
      <MemberNutritionPlanForm
        memberId="m1"
        initialData={{
          name: 'Bulk Phase',
          dayTypes: [{ name: 'Training', meals: [] }],
          fromTemplateId: 'tpl1',
        }}
      />,
    );
    expect(screen.getByDisplayValue('Bulk Phase')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
  });

  it('Save as template checkbox reveals template name input', async () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    expect(screen.queryByPlaceholderText(/template name/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /save as template/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/template name/i)).toBeInTheDocument(),
    );
  });

  it('disables Continue when save-as-template is checked but template name is empty', async () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    fireEvent.change(screen.getByPlaceholderText(/plan name/i), { target: { value: 'My Plan' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /save as template/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled(),
    );
  });
});
```

- [ ] **Step 4.2: Run — confirm FAIL**

```bash
pnpm test -- "__tests__/app/trainer/members/member-nutrition-plan-form.test.tsx"
```
Expected: FAIL — module not found.

- [ ] **Step 4.3: Create the form component**

Create `src/app/(dashboard)/trainer/members/[id]/nutrition/new/_components/member-nutrition-plan-form.tsx`:

```typescript
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
                        (acc, it) => ({ kcal: acc.kcal + it.kcal, protein: acc.protein + it.protein, carbs: acc.carbs + it.carbs, fat: acc.fat + it.fat }),
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
                              <MacroPill type="kcal" value={Math.round(mealMacros.kcal)} />
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
              if (e.target.checked && !templateName) setTemplateName(name);
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
          onClose={() => setAddingFor(null)}
          onPick={(picked) => addItem(addingFor.dayIdx, addingFor.mealIdx, picked)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.kind === 'day' ? 'Day Type' : pendingDelete?.kind === 'meal' ? 'Meal' : 'Item'}?</DialogTitle>
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
```

- [ ] **Step 4.4: Run tests — confirm all pass**

```bash
pnpm test -- "__tests__/app/trainer/members/member-nutrition-plan-form.test.tsx"
```
Expected: all green.

- [ ] **Step 4.5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/nutrition/new/_components/member-nutrition-plan-form.tsx \
        __tests__/app/trainer/members/member-nutrition-plan-form.test.tsx
git commit -m "feat(nutrition): add MemberNutritionPlanForm with schedule sheet and save-as-template"
```

---

## Task 5: Build the new server page

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/nutrition/new/page.tsx`

- [ ] **Step 5.1: Create the page**

Create `src/app/(dashboard)/trainer/members/[id]/nutrition/new/page.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MemberNutritionPlanForm } from './_components/member-nutrition-plan-form';
import type { InitialData } from './_components/member-nutrition-plan-form';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ templateId?: string }>;
}

export default async function NewMemberNutritionPlanPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role === 'member') redirect('/');

  const { id: memberId } = await params;
  const { templateId } = await searchParams;

  let initialData: InitialData | null = null;

  if (templateId) {
    await connectDB();
    const repo = new MongoNutritionTemplateRepository();
    const template = await repo.findById(templateId);
    if (template) {
      initialData = {
        name: template.name,
        dayTypes: template.toObject().dayTypes,
        fromTemplateId: templateId,
      };
    }
    // if template not found, fall through to null (scratch mode)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        <MemberNutritionPlanForm memberId={memberId} initialData={initialData} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```
Expected: no TypeScript or build errors related to the new page.

- [ ] **Step 5.3: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/nutrition/new/page.tsx
git commit -m "feat(nutrition): add member nutrition plan new page (server component)"
```

---

## Task 6: Replace `AssignDialog` with `ChangePlanDialog`

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`
- Modify: `__tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx`

The existing `AssignDialog` selected a template and called the API directly. The new `ChangePlanDialog` only navigates to the new editor page.

- [ ] **Step 6.1: Check that shadcn Command and Popover are installed**

```bash
ls src/components/ui/command.tsx src/components/ui/popover.tsx 2>&1
```

If either file is missing, install it:
```bash
pnpm dlx shadcn@latest add command popover
```

- [ ] **Step 6.2: Update `trainer-member-nutrition-client.tsx`**

Add imports at the top:

```typescript
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
```

Remove the old `AssignDialog` component at the bottom of the file and replace it with `ChangePlanDialog`:

```typescript
function ChangePlanDialog({
  templates,
  memberId,
  triggerLabel,
}: {
  templates: TemplateOption[];
  memberId: string;
  triggerLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  function handleOpen(): void {
    const url = selectedId
      ? `/trainer/members/${memberId}/nutrition/new?templateId=${selectedId}`
      : `/trainer/members/${memberId}/nutrition/new`;
    router.push(url);
    setOpen(false);
  }

  const selectedName = templates.find((t) => t._id === selectedId)?.name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-xs font-medium">
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Change Nutrition Plan</DialogTitle>
        <p className="text-xs text-foreground/65 -mt-1">
          Pre-fill from a template, or leave blank to start from scratch.
        </p>
        <div className="space-y-3 mt-2">
          <Label className="text-xs font-medium text-foreground/80">
            Template <span className="text-foreground/45">(optional)</span>
          </Label>
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="w-full justify-between text-sm font-normal text-foreground/70"
              >
                {selectedName ?? 'Search templates...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search templates..." />
                <CommandList>
                  <CommandEmpty>No templates found.</CommandEmpty>
                  <CommandGroup>
                    {templates.map((t) => (
                      <CommandItem
                        key={t._id}
                        value={t.name}
                        onSelect={() => {
                          setSelectedId((prev) => (prev === t._id ? '' : t._id));
                          setComboOpen(false);
                        }}
                      >
                        <Check
                          className={cn('mr-2 h-4 w-4', selectedId === t._id ? 'opacity-100' : 'opacity-0')}
                        />
                        {t.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId('')}
              className="text-xs text-foreground/45 hover:text-foreground/70 transition-colors"
            >
              Clear selection
            </button>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={handleOpen} className="text-xs font-semibold">
              Open Editor →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Replace all four `<AssignDialog` usages in `TrainerMemberNutritionClient` with `<ChangePlanDialog`:

```typescript
// The prop signature changes: no onAssigned — it navigates instead
<ChangePlanDialog
  templates={templates}
  memberId={memberId}
  triggerLabel="Change Plan"
/>
// ...and:
<ChangePlanDialog
  templates={templates}
  memberId={memberId}
  triggerLabel="Assign Plan"
/>
```

Remove the old `onAssigned` prop and its usages from `TrainerMemberNutritionClient` since the page now refreshes via a full navigation redirect.

Also remove `toast` import if it was only used in `AssignDialog`.

- [ ] **Step 6.3: Update client tests**

In `__tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx`, mock `next/navigation`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => jest.clearAllMocks());

describe('TrainerMemberNutritionClient', () => {
  it('shows assign button when no active plan', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(
      <TrainerMemberNutritionClient
        memberId="m1"
        templates={[]}
        recentLogs={[]}
        dayTypeTargets={{}}
      />,
    );
    await waitFor(() => expect(screen.getByText(/No nutrition plan assigned/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /assign plan/i })).toBeInTheDocument();
  });

  it('renders active plan summary in hero card', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            _id: 'np1',
            name: 'Bulk',
            dayTypes: [{ name: 'Training', meals: [] }],
            assignedAt: '2026-04-10T00:00:00Z',
            schedule: { weeklyPattern: [], calendarOverrides: [], iterate: true },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(
      <TrainerMemberNutritionClient
        memberId="m1"
        templates={[]}
        recentLogs={[]}
        dayTypeTargets={{}}
      />,
    );
    await waitFor(() => expect(screen.getByText('Bulk')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /change plan/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6.4: Run all affected tests**

```bash
pnpm test -- "__tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx"
```
Expected: all green.

- [ ] **Step 6.5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/nutrition/_components/trainer-member-nutrition-client.tsx \
        __tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx
git commit -m "feat(nutrition): replace AssignDialog with ChangePlanDialog (searchable combobox)"
```

---

## Task 7: E2E tests

**Files:**
- Modify: `e2e/trainer/nutrition.spec.ts`

- [ ] **Step 7.1: Update the existing assign test and add 5 new tests**

In `e2e/trainer/nutrition.spec.ts`, replace the `assigning nutrition plan sends email to member` test and add new tests after it:

```typescript
  test('assigning nutrition plan sends email to member', async ({ page }) => {
    const before = new Date();
    await goToMemberNutrition(page);

    // New flow: "Change Plan" → combobox → Open Editor → fill form → schedule → save
    await page.getByRole('button', { name: 'Change Plan' }).click();

    // Combobox: click trigger, then search and pick template
    await page.getByRole('button', { name: /search templates/i }).click();
    await page.getByPlaceholder('Search templates...').fill('E2E');
    await page.getByRole('option', { name: 'E2E Nutrition Template' }).click();

    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new/);

    // Editor is pre-filled — just continue
    await page.getByRole('button', { name: /continue/i }).click();

    // Schedule sheet is open — save directly (schedule can be empty)
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);
    await expect(page.getByText('E2E Nutrition Template')).toBeVisible();

    const email = await waitForEmailTo('member@test.com', {
      subject: /Nutrition Plan/,
      since: before,
    });
    expect(email.Subject).toBe('Your Nutrition Plan Has Been Updated — POWER GYM');
    expect(email.HTML).toContain('E2E Nutrition Template');
  });

  test('assign plan from scratch', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /assign plan|change plan/i }).first().click();

    // Leave combobox empty → scratch
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new$/);

    // Fill name + add day type
    await page.getByPlaceholder('Plan name').fill('Scratch Plan E2E');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');

    // Continue is now enabled
    await page.getByRole('button', { name: /continue/i }).click();

    // Schedule sheet is open — save directly
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);
    await expect(page.getByText('Scratch Plan E2E')).toBeVisible();
  });

  test('assign plan from template with micro-edit', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /change plan/i }).click();

    // Select template via combobox
    await page.getByRole('button', { name: /search templates/i }).click();
    await page.getByPlaceholder('Search templates...').fill('E2E');
    await page.getByRole('option', { name: 'E2E Nutrition Template' }).click();
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new\?templateId=/);

    // Editor is pre-filled — edit the plan name
    await page.getByPlaceholder('Plan name').fill('Custom Bulk');

    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);
    await expect(page.getByText('Custom Bulk')).toBeVisible();
  });

  test('save as template checkbox creates template in trainer list', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /assign plan|change plan/i }).first().click();
    // Leave combobox empty → scratch
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new$/);

    await page.getByPlaceholder('Plan name').fill('E2E SaveAsTemplate Plan');
    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await page.getByPlaceholder('Day type name').fill('Training Day');

    // Check save-as-template
    await page.getByRole('checkbox', { name: /save as template/i }).check();
    await page.getByPlaceholder('Template name').fill('E2E Generated Template');

    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /save schedule/i }).click();

    await page.waitForURL(/\/nutrition$/);

    // Verify template was created
    await page.goto('/trainer/nutrition');
    await expect(page.getByText('E2E Generated Template')).toBeVisible();
  });

  test('Continue button is disabled until name and day type are filled', async ({ page }) => {
    await goToMemberNutrition(page);
    await page.getByRole('button', { name: /assign plan|change plan/i }).first().click();
    await page.getByRole('button', { name: 'Open Editor →' }).click();
    await page.waitForURL(/\/nutrition\/new/);

    await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled();

    await page.getByPlaceholder('Plan name').fill('My Plan');
    await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled();

    await page.getByRole('button', { name: '+ Add Day Type' }).click();
    await expect(page.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });
```

- [ ] **Step 7.2: Run the E2E suite**

```bash
pnpm test:e2e -- --grep "nutrition" 2>&1 | tail -30
```
Expected: existing schedule edit tests still pass; new assign/create tests pass.

- [ ] **Step 7.3: Commit**

```bash
git add e2e/trainer/nutrition.spec.ts
git commit -m "test(e2e): add nutrition plan create flow E2E tests (scratch, template, save-as-template)"
```

---

## Task 8: Final quality check

- [ ] **Step 8.1: Run all unit tests**

```bash
pnpm test 2>&1 | tail -5
```
Expected: zero new failures (pre-existing 7 unrelated failures are OK).

- [ ] **Step 8.2: Lint**

```bash
pnpm lint 2>&1 | grep -E "error|warning" | grep -v node_modules | head -20
```
Expected: no errors or warnings in changed files.

- [ ] **Step 8.3: Build**

```bash
pnpm build 2>&1 | tail -10
```
Expected: clean build.

- [ ] **Step 8.4: Run /simplify on changed files**

```bash
git diff HEAD~8 --name-only
```
Run `/simplify` targeting the diff before final commit.
