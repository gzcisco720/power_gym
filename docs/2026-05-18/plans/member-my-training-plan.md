# Member My Training — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `/member/my-training/` that mirrors the owner/trainer My Training cockpit, with the member's assigned plan days on the left card and the same freestyle card on the right.

**Architecture:** Reuse all existing self-tracking components (ActivityStrip, FreestylePathCard, MiniWorkoutCalendar, SelfWorkoutSession, SelfWorkoutCalendarClient). Add `MemberPlanPathCard` as the only new component. Create `MemberTrainingLanding` server component. Update auth guard to allow `member`, remove stale template-existence validation from the POST API, and extend `BasePath` union types in 6 shared components.

**Tech Stack:** Next.js App Router, TypeScript, React, Mongoose, Jest + React Testing Library

---

## File Map

**Create:**
- `src/components/self-tracking/member-plan-path-card.tsx` — left card showing assigned plan days
- `src/components/self-tracking/member-training-landing.tsx` — server component, member cockpit landing
- `src/app/(dashboard)/member/my-training/page.tsx` — route entry point
- `src/app/(dashboard)/member/my-training/session/[id]/page.tsx` — session route
- `src/app/(dashboard)/member/my-training/calendar/page.tsx` — calendar route
- `__tests__/components/self-tracking/member-plan-path-card.test.tsx` — unit tests

**Modify:**
- `src/lib/auth/self-tracking-access.ts` — add `member` to allowed roles
- `src/app/api/me/workout-logs/route.ts` — remove template existence check
- `src/components/self-tracking/template-path-card.tsx` — update empty state + extend `BasePath`
- `src/components/self-tracking/freestyle-path-card.tsx` — extend `BasePath`
- `src/components/self-tracking/my-training-landing.tsx` — extend `BasePath`
- `src/components/self-tracking/day-already-logged-dialog.tsx` — extend `basePath` union
- `src/components/self-tracking/workout-calendar-header-trigger.tsx` — extend `BasePath`
- `src/components/self-tracking/mini-workout-calendar.tsx` — extend `BasePath`
- `src/components/shared/app-shell.tsx` — add My Training nav item for member
- `__tests__/lib/auth/self-tracking-access.test.ts` — update member test case
- `__tests__/app/api/me/workout-logs.test.ts` — remove template-404 test
- `__tests__/components/self-tracking/template-path-card.test.tsx` — add empty-state assertions
- `__tests__/components/shared/app-shell.test.tsx` — add nav assertion

---

### Task 1: Allow `member` in `requireSelfTrackingRole`

**Files:**
- Modify: `src/lib/auth/self-tracking-access.ts`
- Modify: `__tests__/lib/auth/self-tracking-access.test.ts`

- [ ] **Step 1: Update the test — change "member gets 403" to "member returns ok"**

In `__tests__/lib/auth/self-tracking-access.test.ts`, replace the existing member test case:

```typescript
// OLD (lines 20-27) — delete this test:
it('returns 403 response when role is member', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
  const result = await requireSelfTrackingRole();
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.response.status).toBe(403);
  }
});

// NEW — add this test instead:
it('returns ok with userId for member', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'u3', role: 'member' } } as never);
  const result = await requireSelfTrackingRole();
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.userId).toBe('u3');
    expect(result.role).toBe('member');
  }
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=self-tracking-access -t "member"
```

Expected: FAIL — `result.ok` is `false` but expected `true`.

- [ ] **Step 3: Update `self-tracking-access.ts`**

Replace the full file content of `src/lib/auth/self-tracking-access.ts`:

```typescript
import { auth } from '@/lib/auth/auth';
import type { UserRole } from '@/types/auth';

export type SelfTrackingAuthResult =
  | { ok: true; userId: string; role: 'owner' | 'trainer' | 'member' }
  | { ok: false; response: Response };

export async function requireSelfTrackingRole(): Promise<SelfTrackingAuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = session.user.role as UserRole;
  if (role !== 'owner' && role !== 'trainer' && role !== 'member') {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: session.user.id, role };
}
```

- [ ] **Step 4: Run all auth tests**

```bash
pnpm test -- --testPathPattern=self-tracking-access
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/self-tracking-access.ts __tests__/lib/auth/self-tracking-access.test.ts
git commit -m "feat(auth): allow member role in requireSelfTrackingRole"
```

---

### Task 2: Remove template existence validation from POST `/api/me/workout-logs`

**Files:**
- Modify: `src/app/api/me/workout-logs/route.ts`
- Modify: `__tests__/app/api/me/workout-logs.test.ts`

- [ ] **Step 1: Delete the template-404 test**

In `__tests__/app/api/me/workout-logs.test.ts`, delete the test at lines 118–139:

```typescript
// DELETE this entire test:
it('returns 404 when sourceTemplateId given but template not found', async () => {
  ...
});
```

Also remove the `mockTplRepo` variable and its usage since `MongoPlanTemplateRepository` will no longer be imported in the route.

The updated mock block at the top of the file should be:

```typescript
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { POST, GET } from '@/app/api/me/workout-logs/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockSelfRepo = jest.mocked(MongoSelfWorkoutLogRepository);

const USER = '507f1f77bcf86cd799439011';
```

- [ ] **Step 2: Run the test file to confirm remaining tests pass**

```bash
pnpm test -- --testPathPattern="workout-logs\.test"
```

Expected: all remaining tests PASS (the template-404 test no longer exists so no failure there).

- [ ] **Step 3: Update `route.ts` — remove template validation block**

In `src/app/api/me/workout-logs/route.ts`, delete lines 27–31 (the template existence check) and remove the `MongoPlanTemplateRepository` import:

```typescript
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

interface PostBody {
  dayName?: string;
  sourceTemplateId?: string | null;
  sourceTemplateDayNumber?: number | null;
  plannedSets?: ISelfWorkoutSet[];
}

export async function POST(req: Request): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const deleteActive = url.searchParams.get('deleteActive') === 'true';
  const body = (await req.json()) as PostBody;
  if (!body.dayName || typeof body.dayName !== 'string') {
    return Response.json({ error: 'dayName is required' }, { status: 400 });
  }

  await connectDB();

  const repo = new MongoSelfWorkoutLogRepository();
  const activeLog = await repo.findActive(guard.userId);

  if (activeLog) {
    if (!deleteActive) {
      return Response.json(
        {
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: {
            _id: activeLog._id.toString(),
            dayName: activeLog.dayName,
            startedAt: activeLog.startedAt,
            setCount: activeLog.sets.filter((s) => s.completedAt !== null).length,
          },
        },
        { status: 409 },
      );
    }
    await repo.delete(activeLog._id.toString(), guard.userId);
  }

  const completedToday = await repo.findCompletedToday(guard.userId);
  if (completedToday) {
    return Response.json(
      {
        error: 'DAY_ALREADY_LOGGED',
        session: {
          _id: completedToday._id.toString(),
          dayName: completedToday.dayName,
        },
      },
      { status: 409 },
    );
  }

  const log = await repo.create({
    userId: guard.userId,
    startedAt: new Date(),
    sourceTemplateId: body.sourceTemplateId ?? null,
    sourceTemplateDayNumber: body.sourceTemplateDayNumber ?? null,
    dayName: body.dayName,
    sets: body.plannedSets ?? [],
  });

  return Response.json(log, { status: 201 });
}

export async function GET(req: Request): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');
  if (!yearParam || !monthParam) {
    return Response.json({ error: 'year and month required' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const logs = await repo.findByUserMonth(guard.userId, parseInt(yearParam, 10), parseInt(monthParam, 10));
  return Response.json(logs);
}
```

- [ ] **Step 4: Run all workout-logs tests**

```bash
pnpm test -- --testPathPattern="workout-logs"
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/me/workout-logs/route.ts __tests__/app/api/me/workout-logs.test.ts
git commit -m "feat(api): remove template existence validation from POST workout-logs"
```

---

### Task 3: Extend `BasePath` union in 6 shared components

**Files:**
- Modify: `src/components/self-tracking/template-path-card.tsx` (line 9)
- Modify: `src/components/self-tracking/freestyle-path-card.tsx` (line 8)
- Modify: `src/components/self-tracking/my-training-landing.tsx` (line 19)
- Modify: `src/components/self-tracking/day-already-logged-dialog.tsx` (line 16)
- Modify: `src/components/self-tracking/workout-calendar-header-trigger.tsx` (line 8)
- Modify: `src/components/self-tracking/mini-workout-calendar.tsx` (line 7)

No tests needed — these are type-only changes verified by `pnpm build`.

- [ ] **Step 1: Update `template-path-card.tsx` line 9**

```typescript
// OLD:
type BasePath = '/trainer/my-training' | '/owner/my-training';
// NEW:
type BasePath = '/trainer/my-training' | '/owner/my-training' | '/member/my-training';
```

- [ ] **Step 2: Update `freestyle-path-card.tsx` line 8**

```typescript
// OLD:
type BasePath = '/trainer/my-training' | '/owner/my-training';
// NEW:
type BasePath = '/trainer/my-training' | '/owner/my-training' | '/member/my-training';
```

- [ ] **Step 3: Update `my-training-landing.tsx` line 19**

```typescript
// OLD:
type BasePath = '/trainer/my-training' | '/owner/my-training';
// NEW:
type BasePath = '/trainer/my-training' | '/owner/my-training' | '/member/my-training';
```

- [ ] **Step 4: Update `day-already-logged-dialog.tsx` line 16**

```typescript
// OLD:
basePath: '/owner/my-training' | '/trainer/my-training' | '/member/plan';
// NEW:
basePath: '/owner/my-training' | '/trainer/my-training' | '/member/plan' | '/member/my-training';
```

- [ ] **Step 5: Update `workout-calendar-header-trigger.tsx` line 8**

```typescript
// OLD:
basePath: '/owner/my-training' | '/trainer/my-training';
// NEW:
basePath: '/owner/my-training' | '/trainer/my-training' | '/member/my-training';
```

- [ ] **Step 6: Update `mini-workout-calendar.tsx` line 7**

```typescript
// OLD:
type BasePath = '/owner/my-training' | '/trainer/my-training';
// NEW:
type BasePath = '/owner/my-training' | '/trainer/my-training' | '/member/my-training';
```

- [ ] **Step 7: Verify no TypeScript errors**

```bash
pnpm lint
```

Expected: no errors or warnings.

- [ ] **Step 8: Commit**

```bash
git add \
  src/components/self-tracking/template-path-card.tsx \
  src/components/self-tracking/freestyle-path-card.tsx \
  src/components/self-tracking/my-training-landing.tsx \
  src/components/self-tracking/day-already-logged-dialog.tsx \
  src/components/self-tracking/workout-calendar-header-trigger.tsx \
  src/components/self-tracking/mini-workout-calendar.tsx
git commit -m "feat(types): extend BasePath union to include /member/my-training"
```

---

### Task 4: Update `TemplatePathCard` empty state

**Files:**
- Modify: `src/components/self-tracking/template-path-card.tsx`
- Modify: `__tests__/components/self-tracking/template-path-card.test.tsx`

- [ ] **Step 1: Update the existing empty-state test to assert the new UI**

In `__tests__/components/self-tracking/template-path-card.test.tsx`, replace the existing empty-state describe block (lines 69–81):

```typescript
describe('empty state (no templates)', () => {
  it('renders unified empty state with icon title and create button', () => {
    render(<TemplatePathCard templates={[]} basePath="/trainer/my-training" />);
    expect(screen.getByText('No templates yet.')).toBeInTheDocument();
    expect(screen.getByText(/create a training template/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ create template/i })).toBeInTheDocument();
  });

  it('Create Template button routes to plans/new', () => {
    render(<TemplatePathCard templates={[]} basePath="/owner/my-training" />);
    fireEvent.click(screen.getByRole('button', { name: /\+ create template/i }));
    expect(pushMock).toHaveBeenCalledWith('/owner/plans/new');
  });
});
```

- [ ] **Step 2: Run test to confirm the first test fails**

```bash
pnpm test -- --testPathPattern=template-path-card -t "unified empty state"
```

Expected: FAIL — "No templates yet." not found in document.

- [ ] **Step 3: Update the empty state in `template-path-card.tsx`**

Replace the empty-state early return (lines 100–119):

```typescript
if (templates.length === 0) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
          From Template
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
        <span className="text-3xl opacity-35">🗂️</span>
        <p className="text-sm text-foreground/65">No templates yet.</p>
        <p className="text-xs text-foreground/40">
          Create a training template to log structured workouts.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => router.push(basePath.replace('/my-training', '/plans/new'))}
      >
        + Create Template
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run all template-path-card tests**

```bash
pnpm test -- --testPathPattern=template-path-card
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/template-path-card.tsx __tests__/components/self-tracking/template-path-card.test.tsx
git commit -m "feat(ui): update TemplatePathCard empty state to unified icon+text design"
```

---

### Task 5: Create `MemberPlanPathCard`

**Files:**
- Create: `src/components/self-tracking/member-plan-path-card.tsx`
- Create: `__tests__/components/self-tracking/member-plan-path-card.test.tsx`

- [ ] **Step 1: Write the test file**

Create `__tests__/components/self-tracking/member-plan-path-card.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemberPlanPathCard } from '@/components/self-tracking/member-plan-path-card';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock('@/components/self-tracking/active-session-conflict-dialog', () => ({
  ActiveSessionConflictDialog: ({
    open,
    dayName,
    onClose,
    onDeleteAndStart,
  }: {
    open: boolean;
    dayName: string;
    setCount: number;
    resumeHref: string;
    onClose: () => void;
    onDeleteAndStart: () => void;
  }) =>
    open ? (
      <div role="dialog" data-testid="conflict-dialog">
        <span>Active: {dayName}</span>
        <button onClick={onDeleteAndStart}>Delete and Start</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));
jest.mock('@/components/self-tracking/day-already-logged-dialog', () => ({
  DayAlreadyLoggedDialog: ({
    open,
    dayName,
    onClose,
  }: {
    open: boolean;
    dayName: string;
    sessionId: string;
    basePath: string;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" data-testid="already-logged-dialog">
        <span>Already logged: {dayName}</span>
        <button onClick={onClose}>Got it</button>
      </div>
    ) : null,
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const plan = {
  _id: 'plan1',
  templateId: 'tpl1',
  name: 'Push Pull Legs',
  days: [
    {
      dayNumber: 1,
      name: 'Day 1 · Push',
      exercises: [
        {
          groupId: 'g1',
          isSuperset: false,
          exerciseId: 'ex1',
          exerciseName: 'Bench Press',
          isBodyweight: false,
          sets: 3,
          repsMin: 6,
          repsMax: 8,
        },
      ],
    },
    { dayNumber: 2, name: 'Day 2 · Pull', exercises: [] },
    { dayNumber: 3, name: 'Day 3 · Legs', exercises: [] },
  ],
};

describe('MemberPlanPathCard', () => {
  describe('empty state (no plan)', () => {
    it('renders no-plan message when plan is null', () => {
      render(<MemberPlanPathCard plan={null} basePath="/member/my-training" />);
      expect(screen.getByText(/no training plan assigned/i)).toBeInTheDocument();
      expect(screen.getByText(/ask your trainer/i)).toBeInTheDocument();
    });

    it('does not render any Log button when plan is null', () => {
      render(<MemberPlanPathCard plan={null} basePath="/member/my-training" />);
      expect(screen.queryByRole('button', { name: /log/i })).not.toBeInTheDocument();
    });
  });

  describe('with plan', () => {
    it('renders plan name and all day names', () => {
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
      expect(screen.getByText('Day 1 · Push')).toBeInTheDocument();
      expect(screen.getByText('Day 2 · Pull')).toBeInTheDocument();
      expect(screen.getByText('Day 3 · Legs')).toBeInTheDocument();
    });

    it('shows exercise preview for days that have exercises', () => {
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      expect(screen.getByText(/bench press/i)).toBeInTheDocument();
    });

    it('renders a Log button for each day', () => {
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(3);
    });

    it('POSTs with correct payload and navigates to session on Log click', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'log42' }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
      expect(body.dayName).toBe('Day 1 · Push');
      expect(body.sourceTemplateId).toBe('tpl1');
      expect(body.sourceTemplateDayNumber).toBe(1);
      expect(body.plannedSets).toHaveLength(3);
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith('/member/my-training/session/log42'),
      );
    });

    it('plannedSets have correct shape', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'logX' }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
      const set = body.plannedSets[0];
      expect(set.exerciseName).toBe('Bench Press');
      expect(set.setNumber).toBe(1);
      expect(set.prescribedRepsMin).toBe(6);
      expect(set.prescribedRepsMax).toBe(8);
      expect(set.actualWeight).toBeNull();
      expect(set.actualReps).toBeNull();
    });

    it('shows conflict dialog on 409 ACTIVE_SESSION_EXISTS', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: { _id: 'act1', dayName: 'Day 2 · Pull', setCount: 2 },
        }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      expect(await screen.findByTestId('conflict-dialog')).toBeInTheDocument();
    });

    it('conflict Cancel clears dialog', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: { _id: 'act1', dayName: 'Day 2', setCount: 0 },
        }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await screen.findByTestId('conflict-dialog');
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() =>
        expect(screen.queryByTestId('conflict-dialog')).not.toBeInTheDocument(),
      );
    });

    it('conflict "Delete and Start" re-POSTs with deleteActive=true', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'ACTIVE_SESSION_EXISTS',
            activeSession: { _id: 'act1', dayName: 'Day 2', setCount: 0 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: 'newLog' }),
        });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await screen.findByTestId('conflict-dialog');
      fireEvent.click(screen.getByRole('button', { name: /delete and start/i }));
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/me/workout-logs?deleteActive=true',
          expect.objectContaining({ method: 'POST' }),
        ),
      );
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith('/member/my-training/session/newLog'),
      );
    });

    it('shows already-logged dialog on 409 DAY_ALREADY_LOGGED', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'DAY_ALREADY_LOGGED',
          session: { _id: 'done1', dayName: 'Day 1 · Push' },
        }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      expect(await screen.findByTestId('already-logged-dialog')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails (module not found)**

```bash
pnpm test -- --testPathPattern=member-plan-path-card
```

Expected: FAIL — `Cannot find module '@/components/self-tracking/member-plan-path-card'`.

- [ ] **Step 3: Create `member-plan-path-card.tsx`**

Create `src/components/self-tracking/member-plan-path-card.tsx`:

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ActiveSessionConflictDialog } from './active-session-conflict-dialog';
import { DayAlreadyLoggedDialog } from './day-already-logged-dialog';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

type BasePath = '/member/my-training';

export interface MemberPlanExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}

export interface MemberPlanDay {
  dayNumber: number;
  name: string;
  exercises: MemberPlanExercise[];
}

export interface MemberPlan {
  _id: string;
  templateId: string;
  name: string;
  days: MemberPlanDay[];
}

interface Props {
  plan: MemberPlan | null;
  basePath: BasePath;
}

interface ConflictInfo {
  _id: string;
  dayName: string;
  setCount: number;
}

export function MemberPlanPathCard({ plan, basePath }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [pendingDay, setPendingDay] = useState<MemberPlanDay | null>(null);
  const [dayAlreadyLogged, setDayAlreadyLogged] = useState<{
    _id: string;
    dayName: string;
  } | null>(null);

  async function handleLog(day: MemberPlanDay, deleteActive = false) {
    if (!plan) return;
    setStarting(true);
    try {
      const url = deleteActive
        ? '/api/me/workout-logs?deleteActive=true'
        : '/api/me/workout-logs';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: day.name,
          sourceTemplateId: plan.templateId,
          sourceTemplateDayNumber: day.dayNumber,
          plannedSets: buildPlannedSets(day),
        }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        router.push(`${basePath}/session/${log._id}`);
        return;
      }
      if (res.status === 409) {
        const body = (await res.json()) as {
          error: string;
          activeSession?: ConflictInfo;
          session?: { _id: string; dayName: string };
        };
        if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
          setConflict(body.activeSession);
          setPendingDay(day);
        } else if (body.error === 'DAY_ALREADY_LOGGED' && body.session) {
          setDayAlreadyLogged(body.session);
        }
      }
    } finally {
      setStarting(false);
    }
  }

  if (!plan) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            Training Plan
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-35">📋</span>
          <p className="text-sm text-foreground/65">No training plan assigned yet.</p>
          <p className="text-xs text-foreground/40">Ask your trainer to assign a plan.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            Training Plan
          </span>
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
            Pick any day
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{plan.name}</span>
          <span className="text-[10px] text-foreground/50">
            {plan.days.length} day{plan.days.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {plan.days.map((day) => (
            <div
              key={day.dayNumber}
              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-foreground/5"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-medium">{day.name}</span>
                {day.exercises.length > 0 && (
                  <span className="text-[10px] text-foreground/50 ml-2 truncate">
                    {day.exercises
                      .slice(0, 3)
                      .map((e) => e.exerciseName)
                      .join(' · ')}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={starting}
                onClick={() => handleLog(day)}
                className="h-6 px-2 text-[11px] shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                Log
              </Button>
            </div>
          ))}
        </div>
      </div>

      {conflict && pendingDay && (
        <ActiveSessionConflictDialog
          open
          dayName={conflict.dayName}
          setCount={conflict.setCount}
          resumeHref={`${basePath}/session/${conflict._id}`}
          onDeleteAndStart={() => {
            const day = pendingDay;
            setConflict(null);
            setPendingDay(null);
            void handleLog(day, true);
          }}
          onClose={() => {
            setConflict(null);
            setPendingDay(null);
          }}
        />
      )}
      {dayAlreadyLogged && (
        <DayAlreadyLoggedDialog
          open
          dayName={dayAlreadyLogged.dayName}
          sessionId={dayAlreadyLogged._id}
          basePath={basePath}
          onClose={() => setDayAlreadyLogged(null)}
        />
      )}
    </>
  );
}

function buildPlannedSets(day: MemberPlanDay): ISelfWorkoutSet[] {
  return day.exercises.flatMap((ex) =>
    Array.from({ length: ex.sets }, (_, i) => ({
      exerciseId: ex.exerciseId as unknown as ISelfWorkoutSet['exerciseId'],
      exerciseName: ex.exerciseName,
      groupId: ex.groupId,
      isSuperset: ex.isSuperset,
      isBodyweight: ex.isBodyweight,
      setNumber: i + 1,
      prescribedRepsMin: ex.repsMin,
      prescribedRepsMax: ex.repsMax,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    })),
  );
}
```

- [ ] **Step 4: Run all MemberPlanPathCard tests**

```bash
pnpm test -- --testPathPattern=member-plan-path-card
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/member-plan-path-card.tsx __tests__/components/self-tracking/member-plan-path-card.test.tsx
git commit -m "feat(self-tracking): add MemberPlanPathCard component"
```

---

### Task 6: Create `MemberTrainingLanding` server component

**Files:**
- Create: `src/components/self-tracking/member-training-landing.tsx`

No unit test — server components with DB access are verified by `pnpm build`.

- [ ] **Step 1: Create `member-training-landing.tsx`**

Create `src/components/self-tracking/member-training-landing.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { ActivityStrip } from './activity-strip';
import { MemberPlanPathCard } from './member-plan-path-card';
import { FreestylePathCard } from './freestyle-path-card';
import { MiniWorkoutCalendar } from './mini-workout-calendar';
import { PageHeader } from '@/components/shared/page-header';
import { ActiveSessionPrompt } from '@/components/shared/active-session-prompt';
import { WorkoutCalendarHeaderTrigger } from './workout-calendar-header-trigger';
import { PathCardsGrid, PathCardItem } from './path-cards-grid';
import type { ISelfWorkoutLog } from '@/lib/db/models/self-workout-log.model';
import type { IMemberPlan } from '@/lib/db/models/member-plan.model';
import type { MemberPlan } from './member-plan-path-card';

const BASE_PATH = '/member/my-training' as const;

export async function MemberTrainingLanding() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfWorkoutLogRepository();
  const pbRepo = new MongoSelfPersonalBestRepository();
  const planRepo = new MongoMemberPlanRepository();

  const now = new Date();
  const [activeLog, monthLogs, recent, pbs, rawPlan] = await Promise.all([
    logRepo.findActive(userId),
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 10),
    pbRepo.findByUser(userId),
    planRepo.findActive(userId),
  ]);

  const completedSessionCount = recent.length;
  const hasUsedTemplate = recent.some((r) => r.sourceTemplateId !== null);
  const state = detectLandingState({ completedSessionCount, hasUsedTemplate });

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    last14Days.push(
      recent.some((r) => r.completedAt && r.completedAt >= day && r.completedAt < next),
    );
  }

  const headerSubtitle =
    state === 'full'
      ? `${monthLogs.length} sessions in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${completedSessionCount} sessions logged`
        : 'Track your own workouts here.';

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStats = {
    sessions: monthLogs.length,
    sets: monthLogs.reduce((acc, l) => acc + l.sets.length, 0),
    avgRpe: avgRpe(monthLogs),
    prs: pbs.filter((pb) => pb.achievedAt >= startOfMonth).length,
  };

  const plan = rawPlan ? toMemberPlan(rawPlan) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        subtitle={headerSubtitle}
        actions={<WorkoutCalendarHeaderTrigger basePath={BASE_PATH} />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {activeLog && (
          <div className="mb-4">
            <ActiveSessionPrompt
              dayName={activeLog.dayName}
              startedAtIso={activeLog.startedAt.toISOString()}
              lastActivityAtIso={(activeLog.lastActivityAt ?? activeLog.startedAt).toISOString()}
              continueHref={`${BASE_PATH}/session/${activeLog._id.toString()}`}
              sealEndpoint={`/api/me/workout-logs/${activeLog._id.toString()}/seal`}
              deleteEndpoint={`/api/me/workout-logs/${activeLog._id.toString()}`}
            />
          </div>
        )}
        {state === 'full' && (
          <ActivityStrip state="full" last14Days={last14Days} monthStats={monthStats} />
        )}
        {state === 'light' && (
          <ActivityStrip state="light" last14Days={last14Days} sessionCount={completedSessionCount} />
        )}
        {state === 'empty' && <ActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <MemberPlanPathCard plan={plan} basePath={BASE_PATH} />
          </PathCardItem>
          <PathCardItem>
            {state === 'empty' ? (
              <FreestylePathCard state="empty" basePath={BASE_PATH} />
            ) : (
              renderFreestyleCard(state, recent)
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniWorkoutCalendar basePath={BASE_PATH} />
      </div>
    </div>
  );
}

function toMemberPlan(plan: IMemberPlan): MemberPlan {
  return {
    _id: plan._id.toString(),
    templateId: plan.templateId.toString(),
    name: plan.name,
    days: plan.days.map((d) => ({
      dayNumber: d.dayNumber,
      name: d.name,
      exercises: d.exercises.map((ex) => ({
        groupId: ex.groupId,
        isSuperset: ex.isSuperset,
        exerciseId: ex.exerciseId.toString(),
        exerciseName: ex.exerciseName,
        isBodyweight: ex.isBodyweight,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
      })),
    })),
  };
}

function avgRpe(logs: ISelfWorkoutLog[]): number {
  const withRpe = logs.filter((l) => l.rpe != null);
  if (withRpe.length === 0) return 0;
  return withRpe.reduce((acc, l) => acc + (l.rpe ?? 0), 0) / withRpe.length;
}

function renderFreestyleCard(state: 'full' | 'light', recent: ISelfWorkoutLog[]) {
  const lastFreestyleLog = recent.find((r) => r.sourceTemplateId == null);
  if (!lastFreestyleLog) return <FreestylePathCard state="empty" basePath={BASE_PATH} />;

  const dateLabel = lastFreestyleLog.completedAt
    ? lastFreestyleLog.completedAt.toLocaleDateString('en-US', { weekday: 'short' })
    : '—';
  const startedMs = lastFreestyleLog.startedAt.getTime();
  const endedMs = (lastFreestyleLog.completedAt ?? new Date()).getTime();
  const durationMin = Math.max(1, Math.round((endedMs - startedMs) / 60000));
  const topSets = lastFreestyleLog.sets.slice(0, 3).map((s) => ({
    exerciseName: s.exerciseName,
    weight: s.actualWeight,
    reps: s.actualReps,
    isPR: false,
  }));
  const remainingSets = Math.max(0, lastFreestyleLog.sets.length - 3);
  const lastFreestyle = { dateLabel, durationMin, rpe: lastFreestyleLog.rpe, topSets, remainingSets };

  if (state === 'full') {
    const freestyleCount = recent.filter((r) => r.sourceTemplateId == null).length;
    const weeklyFrequency = Math.round((freestyleCount / 14) * 7);
    return (
      <FreestylePathCard
        state="full"
        lastFreestyle={lastFreestyle}
        weeklyFrequency={weeklyFrequency}
        basePath={BASE_PATH}
      />
    );
  }
  return <FreestylePathCard state="light" lastFreestyle={lastFreestyle} basePath={BASE_PATH} />;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/self-tracking/member-training-landing.tsx
git commit -m "feat(self-tracking): add MemberTrainingLanding server component"
```

---

### Task 7: Create `/member/my-training/` routes

**Files:**
- Create: `src/app/(dashboard)/member/my-training/page.tsx`
- Create: `src/app/(dashboard)/member/my-training/session/[id]/page.tsx`
- Create: `src/app/(dashboard)/member/my-training/calendar/page.tsx`

- [ ] **Step 1: Create landing page**

Create `src/app/(dashboard)/member/my-training/page.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MemberTrainingLanding } from '@/components/self-tracking/member-training-landing';

export default async function MemberMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');
  return <MemberTrainingLanding />;
}
```

- [ ] **Step 2: Create session page**

Create `src/app/(dashboard)/member/my-training/session/[id]/page.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SelfWorkoutSession } from '@/components/self-tracking/self-workout-session';

export default async function MemberMyTrainingSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');
  const { id } = await params;
  return <SelfWorkoutSession logId={id} basePath="/member/my-training" />;
}
```

- [ ] **Step 3: Create calendar page**

Create `src/app/(dashboard)/member/my-training/calendar/page.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { SelfWorkoutCalendarClient } from '@/components/self-tracking/self-workout-calendar-client';

export default async function MemberMyTrainingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');
  const { date } = await searchParams;
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Training Calendar" subtitle="Your workout history" />
      <SelfWorkoutCalendarClient basePath="/member/my-training" initialDate={date} />
    </div>
  );
}
```

- [ ] **Step 4: Verify build passes**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/\(dashboard\)/member/my-training/page.tsx \
  src/app/\(dashboard\)/member/my-training/session/\[id\]/page.tsx \
  src/app/\(dashboard\)/member/my-training/calendar/page.tsx
git commit -m "feat(routes): add /member/my-training landing, session, and calendar pages"
```

---

### Task 8: Update member sidebar navigation

**Files:**
- Modify: `src/components/shared/app-shell.tsx`
- Modify: `__tests__/components/shared/app-shell.test.tsx`

- [ ] **Step 1: Update the nav test to assert the new "My Training" link points to `/member/my-training`**

In `__tests__/components/shared/app-shell.test.tsx`, find the member navigation test and add an assertion. After the existing `expect(screen.getByText('My Training')).toBeInTheDocument()` line, add:

```typescript
// The existing test asserts 'My Training' exists.
// Add this assertion to verify it points to the new route:
it('member My Training nav link points to /member/my-training', () => {
  render(
    <AppShell role="member" userName="Eric Gong">
      <div>page content</div>
    </AppShell>
  );
  const link = screen.getByRole('link', { name: 'My Training' });
  expect(link).toHaveAttribute('href', '/member/my-training');
});
```

- [ ] **Step 2: Run the new test to confirm it fails**

```bash
pnpm test -- --testPathPattern=app-shell -t "My Training nav link"
```

Expected: FAIL — href is `/member/plan` not `/member/my-training`.

- [ ] **Step 3: Update the member nav in `app-shell.tsx`**

In `src/components/shared/app-shell.tsx`, find the member TRAINING group (lines 19–23) and update the href:

```typescript
// OLD:
{ href: '/member/plan', label: 'My Training' },
// NEW:
{ href: '/member/my-training', label: 'My Training' },
```

- [ ] **Step 4: Run all app-shell tests**

```bash
pnpm test -- --testPathPattern=app-shell
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
pnpm test
```

Expected: 100% pass rate.

- [ ] **Step 6: Final build check**

```bash
pnpm build
```

Expected: clean build, no errors or warnings.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/app-shell.tsx __tests__/components/shared/app-shell.test.tsx
git commit -m "feat(nav): update member My Training link to /member/my-training"
```
