# Free Day Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-per-day restriction and rotation logic with free day selection: any role can log any plan/template day, any order, multiple times per day; the only gate is one active (in-progress) session at a time.

**Architecture:** API routes swap `findToday` blocking → `findActive` blocking with new error code `ACTIVE_SESSION_EXISTS`; a shared `ActiveSessionConflictDialog` component replaces the overwrite dialog in all three entry points; `TemplatePathCard` is rewritten as an expandable template list; `MyTrainingLanding` drops the cycle-tracking fetch and render path.

**Tech Stack:** TypeScript, Next.js App Router (Server + Client Components), Mongoose, shadcn/ui Dialog, Jest.

---

## File Map

| File | Change |
|---|---|
| `src/app/api/sessions/route.ts` | `findToday` → `findActive`, `TODAY_ALREADY_LOGGED` → `ACTIVE_SESSION_EXISTS`, `?overwrite` → `?deleteActive` |
| `src/app/api/me/workout-logs/route.ts` | Same swap |
| `src/components/self-tracking/active-session-conflict-dialog.tsx` | **New** — shared destructive-action dialog |
| `src/components/self-tracking/template-path-card.tsx` | **Rewrite** — expandable template list, remove cycle logic |
| `src/components/self-tracking/freestyle-path-card.tsx` | Replace overwrite dialog with `ActiveSessionConflictDialog` |
| `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` | Replace overwrite dialog with `ActiveSessionConflictDialog` |
| `src/components/self-tracking/my-training-landing.tsx` | Remove `lastByTemplate` fetch, drop `renderTemplateCard`, simplify `TemplatePathCard` usage |
| `__tests__/app/api/sessions.test.ts` | Rewrite POST tests for new logic |
| `__tests__/app/api/me/workout-logs.test.ts` | Rewrite POST tests for new logic |
| `__tests__/app/api/sessions/role-fix.test.ts` | Add `findActive` to mock |
| `__tests__/app/api/sessions-calendar.test.ts` | Remove stale `findToday` from mock |

---

## Task 1: Update `POST /api/sessions`

**Files:**
- Modify: `src/app/api/sessions/route.ts`
- Test: `__tests__/app/api/sessions.test.ts`

- [ ] **Step 1.1 — Replace the entire test file**

Write `__tests__/app/api/sessions.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = {
  create: jest.fn(),
  findByMember: jest.fn(),
  findActive: jest.fn(),
  delete: jest.fn(),
};
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockMemberPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

const PLAN_WITH_TWO_DAYS = {
  _id: 'mp1',
  memberId: { toString: () => 'm1' },
  days: [
    { dayNumber: 1, name: 'Day A', exercises: [] },
    { dayNumber: 2, name: 'Day B', exercises: [] },
  ],
};

describe('POST /api/sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST', body: JSON.stringify({ memberPlanId: 'p1', dayNumber: 1 }),
    }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when member has no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(null);
    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));
    expect(res.status).toBe(404);
  });

  it('creates session with pre-populated sets when no active session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const plan = {
      _id: 'mp1',
      memberId: { toString: () => 'm1' },
      days: [{
        dayNumber: 1, name: 'Push',
        exercises: [{
          exerciseId: 'e1', exerciseName: 'Bench Press', groupId: 'A',
          isSuperset: false, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90,
        }],
      }],
    };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);
    mockSessionRepo.findActive.mockResolvedValue(null);
    mockSessionRepo.create.mockResolvedValue({ _id: 's1', dayNumber: 1, sets: [] });

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));

    expect(res.status).toBe(201);
    const call = mockSessionRepo.create.mock.calls[0][0];
    expect(call.sets).toHaveLength(3);
    expect(call.sets[0]).toMatchObject({
      exerciseName: 'Bench Press', setNumber: 1,
      prescribedRepsMin: 8, prescribedRepsMax: 10,
      isExtraSet: false, actualWeight: null, actualReps: null,
    });
  });

  it('returns 200 (resume) when active session has same dayNumber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue({
      _id: 'mp1', memberId: { toString: () => 'm1' },
      days: [{ dayNumber: 1, name: 'Day A', exercises: [] }],
    });
    const existing = { _id: 'sExisting', dayNumber: 1, dayName: 'Day A', completedAt: null, sets: [] };
    mockSessionRepo.findActive.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data._id).toBe('sExisting');
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('returns 409 ACTIVE_SESSION_EXISTS when active session has different dayNumber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sActive' }, dayNumber: 1, dayName: 'Day A',
      completedAt: null, startedAt: new Date(),
      sets: [{ completedAt: new Date() }, { completedAt: new Date() }],
    };
    mockSessionRepo.findActive.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('ACTIVE_SESSION_EXISTS');
    expect(data.activeSession).toMatchObject({
      _id: 'sActive', dayName: 'Day A', dayNumber: 1, setCount: 2,
    });
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('deletes active session and creates new when ?deleteActive=true', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sActive' }, dayNumber: 1, dayName: 'Day A',
      completedAt: null, startedAt: new Date(), sets: [],
    };
    mockSessionRepo.findActive.mockResolvedValue(existing);
    mockSessionRepo.delete.mockResolvedValue(true);
    mockSessionRepo.create.mockResolvedValue({ _id: 'sNew', dayNumber: 2 });

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions?deleteActive=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));

    expect(res.status).toBe(201);
    expect(mockSessionRepo.delete).toHaveBeenCalledWith('sActive');
    expect(mockSessionRepo.create).toHaveBeenCalled();
  });
});

describe('GET /api/sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sessions for self when member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findByMember.mockResolvedValue([{ _id: 's1' }]);
    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ _id: 's1' }]);
  });

  it('returns 403 when member queries another member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m2'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm test -- --testPathPattern="__tests__/app/api/sessions.test" 2>&1 | tail -20
```

Expected: `ACTIVE_SESSION_EXISTS`-related tests fail; old `findToday`-based tests fail.

- [ ] **Step 1.3 — Rewrite the POST function in `src/app/api/sessions/route.ts`**

Replace only the `POST` function (keep `GET` unchanged):

```typescript
export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const deleteActive = url.searchParams.get('deleteActive') === 'true';
  const body = (await req.json()) as { memberPlanId: string; dayNumber: number; memberId?: string };

  const role = session.user.role as UserRole;
  const targetMemberId =
    (role === 'trainer' || role === 'owner') && body.memberId
      ? body.memberId
      : session.user.id;
  const loggedBy = targetMemberId !== session.user.id ? session.user.id : null;

  const memberPlanRepo = new MongoMemberPlanRepository();
  const plan = await memberPlanRepo.findActive(targetMemberId);
  if (!plan) return Response.json({ error: 'No active plan' }, { status: 404 });

  const day = plan.days.find((d) => d.dayNumber === body.dayNumber);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

  const sessionRepo = new MongoWorkoutSessionRepository();
  const activeSession = await sessionRepo.findActive(targetMemberId);

  if (activeSession) {
    if (activeSession.dayNumber === body.dayNumber) {
      return Response.json(activeSession, { status: 200 });
    }
    if (!deleteActive) {
      return Response.json(
        {
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: {
            _id: activeSession._id.toString(),
            dayName: activeSession.dayName,
            dayNumber: activeSession.dayNumber,
            startedAt: activeSession.startedAt,
            setCount: activeSession.sets.filter((s) => s.completedAt !== null).length,
          },
        },
        { status: 409 },
      );
    }
    await sessionRepo.delete(activeSession._id.toString());
  }

  const sets = day.exercises.flatMap((ex) =>
    Array.from({ length: ex.sets }, (_, i) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      groupId: ex.groupId,
      isSuperset: ex.isSuperset,
      isBodyweight: ex.isBodyweight,
      setNumber: i + 1,
      prescribedRepsMin: ex.repsMin,
      prescribedRepsMax: ex.repsMax,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    })),
  );

  const workoutSession = await sessionRepo.create({
    memberId: targetMemberId,
    memberPlanId: body.memberPlanId,
    dayNumber: body.dayNumber,
    dayName: day.name,
    startedAt: new Date(),
    sets,
    loggedBy,
  });

  return Response.json(workoutSession, { status: 201 });
}
```

- [ ] **Step 1.4 — Fix stale mocks in related test files**

In `__tests__/app/api/sessions/role-fix.test.ts`, the `mockSessionRepo` object is `{ create, findByMember }`. The new POST route calls `findActive`, which is missing. Add it:

```typescript
// Change this line:
const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn() };
// To:
const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn(), findActive: jest.fn() };
```

In `__tests__/app/api/sessions-calendar.test.ts`, remove `findToday: jest.fn()` (no longer called by POST):

```typescript
// Change this line:
const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn(), findByMonth: jest.fn(), findActive: jest.fn(), findToday: jest.fn() };
// To:
const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn(), findByMonth: jest.fn(), findActive: jest.fn() };
```

- [ ] **Step 1.5 — Run all session tests**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm test -- --testPathPattern="sessions" 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Step 1.6 — Lint**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint 2>&1 | tail -5
```

- [ ] **Step 1.7 — Commit**

```bash
cd /Users/eric_gong/Projects/power_gym && git add src/app/api/sessions/route.ts __tests__/app/api/sessions.test.ts __tests__/app/api/sessions/role-fix.test.ts __tests__/app/api/sessions-calendar.test.ts && git commit -m "feat(api): free day logging — sessions POST uses findActive + ACTIVE_SESSION_EXISTS"
```

---

## Task 2: Update `POST /api/me/workout-logs`

**Files:**
- Modify: `src/app/api/me/workout-logs/route.ts`
- Test: `__tests__/app/api/me/workout-logs.test.ts`

- [ ] **Step 2.1 — Replace the entire test file**

Write `__tests__/app/api/me/workout-logs.test.ts`:

```typescript
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(),
}));

import { POST, GET } from '@/app/api/me/workout-logs/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockSelfRepo = jest.mocked(MongoSelfWorkoutLogRepository);
const mockTplRepo = jest.mocked(MongoPlanTemplateRepository);

const USER = '507f1f77bcf86cd799439011';

describe('/api/me/workout-logs', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST', () => {
    it('returns guard response when guard fails', async () => {
      const forbidden = Response.json({ error: 'Forbidden' }, { status: 403 });
      mockGuard.mockResolvedValue({ ok: false, response: forbidden });
      const res = await POST(new Request('http://x', { method: 'POST', body: '{}' }));
      expect(res.status).toBe(403);
    });

    it('creates a log when no active log exists', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const create = jest.fn().mockResolvedValue({ _id: 'log1' });
      const findActive = jest.fn().mockResolvedValue(null);
      mockSelfRepo.mockImplementation(
        () => ({ create, findActive } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(201);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER, dayName: 'Freestyle',
          sourceTemplateId: null, sourceTemplateDayNumber: null, sets: [],
        }),
      );
    });

    it('returns 409 ACTIVE_SESSION_EXISTS when an active log exists', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findActive = jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-active' },
        dayName: 'Push',
        startedAt: new Date('2026-05-11T10:00:00Z'),
        sets: [{ completedAt: new Date() }, { completedAt: new Date() }, { completedAt: null }],
      });
      const create = jest.fn();
      mockSelfRepo.mockImplementation(
        () => ({ findActive, create } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Pull', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as {
        error: string;
        activeSession: { _id: string; dayName: string; setCount: number };
      };
      expect(body.error).toBe('ACTIVE_SESSION_EXISTS');
      expect(body.activeSession._id).toBe('log-active');
      expect(body.activeSession.dayName).toBe('Push');
      expect(body.activeSession.setCount).toBe(2);
      expect(create).not.toHaveBeenCalled();
    });

    it('deletes active log and creates new when ?deleteActive=true', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findActive = jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-old' },
        dayName: 'Push',
        startedAt: new Date(),
        sets: [],
      });
      const deleteFn = jest.fn().mockResolvedValue(true);
      const create = jest.fn().mockResolvedValue({ _id: 'log-new' });
      mockSelfRepo.mockImplementation(
        () => ({ findActive, delete: deleteFn, create } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x?deleteActive=true', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Pull', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(201);
      expect(deleteFn).toHaveBeenCalledWith('log-old', USER);
      expect(create).toHaveBeenCalled();
    });

    it('returns 400 when dayName missing', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const res = await POST(
        new Request('http://x', { method: 'POST', body: JSON.stringify({ plannedSets: [] }) }),
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 when sourceTemplateId given but template not found', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findById = jest.fn().mockResolvedValue(null);
      mockTplRepo.mockImplementation(() => ({ findById } as unknown as MongoPlanTemplateRepository));
      const findActive = jest.fn().mockResolvedValue(null);
      mockSelfRepo.mockImplementation(
        () => ({ findActive } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({
            dayName: 'Push Day',
            sourceTemplateId: '507f1f77bcf86cd799439040',
            sourceTemplateDayNumber: 1,
            plannedSets: [],
          }),
        }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET', () => {
    it('returns month list', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
      const findByUserMonth = jest.fn().mockResolvedValue([{ _id: 'log1' }]);
      mockSelfRepo.mockImplementation(
        () => ({ findByUserMonth } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await GET(new Request('http://x?year=2026&month=5'));
      expect(res.status).toBe(200);
      expect(findByUserMonth).toHaveBeenCalledWith(USER, 2026, 5);
    });

    it('returns 400 when year/month missing', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
      const res = await GET(new Request('http://x'));
      expect(res.status).toBe(400);
    });
  });
});
```

- [ ] **Step 2.2 — Run tests to confirm they fail**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm test -- --testPathPattern="__tests__/app/api/me/workout-logs.test" 2>&1 | tail -20
```

- [ ] **Step 2.3 — Rewrite the POST function in `src/app/api/me/workout-logs/route.ts`**

Replace only the `POST` function (keep `GET` unchanged):

```typescript
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

  if (body.sourceTemplateId) {
    const tplRepo = new MongoPlanTemplateRepository();
    const tpl = await tplRepo.findById(body.sourceTemplateId);
    if (!tpl) return Response.json({ error: 'Template not found' }, { status: 404 });
  }

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
```

- [ ] **Step 2.4 — Run tests and check for regressions**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm test -- --testPathPattern="workout-logs" 2>&1 | tail -15
```

Expected: all pass. If sibling test files (`workout-logs-sets.test.ts` etc.) mock `findToday` in a `mockSelfRepo`, replace with `findActive: jest.fn().mockResolvedValue(null)`.

- [ ] **Step 2.5 — Lint and commit**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint 2>&1 | tail -5
git add src/app/api/me/workout-logs/route.ts __tests__/app/api/me/workout-logs.test.ts
git commit -m "feat(api): free day logging — workout-logs POST uses findActive + ACTIVE_SESSION_EXISTS"
```

---

## Task 3: Create `ActiveSessionConflictDialog`

**Files:**
- Create: `src/components/self-tracking/active-session-conflict-dialog.tsx`

- [ ] **Step 3.1 — Create the component**

Write `src/components/self-tracking/active-session-conflict-dialog.tsx`:

```typescript
'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  dayName: string;
  setCount: number;
  resumeHref: string;
  onDeleteAndStart: () => void;
  onClose: () => void;
}

export function ActiveSessionConflictDialog({
  open,
  dayName,
  setCount,
  resumeHref,
  onDeleteAndStart,
  onClose,
}: Props) {
  const hasData = setCount > 0;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>&ldquo;{dayName}&rdquo; is still in progress</DialogTitle>
          <DialogDescription>
            {hasData
              ? `You have ${setCount} set${setCount === 1 ? '' : 's'} logged. Starting a new session will permanently delete this data.`
              : 'This session has no sets logged yet. Starting a new session will delete it.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={resumeHref}>Resume &ldquo;{dayName}&rdquo;</a>
          </Button>
          <Button variant="destructive" onClick={onDeleteAndStart}>
            Delete &amp; Start New
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3.2 — Lint**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint 2>&1 | tail -5
```

- [ ] **Step 3.3 — Commit**

```bash
cd /Users/eric_gong/Projects/power_gym && git add src/components/self-tracking/active-session-conflict-dialog.tsx && git commit -m "feat(ui): add ActiveSessionConflictDialog shared component"
```

---

## Task 4: Rewrite `TemplatePathCard`

**Files:**
- Modify: `src/components/self-tracking/template-path-card.tsx`

This file is completely rewritten. The exported `UserTemplate`, `UserTemplateDay`, `UserTemplateExercise` interfaces are preserved (used by `my-training-landing.tsx`).

- [ ] **Step 4.1 — Write the new file**

Write `src/components/self-tracking/template-path-card.tsx`:

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ActiveSessionConflictDialog } from './active-session-conflict-dialog';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

type BasePath = '/trainer/my-training' | '/owner/my-training';

export interface UserTemplateExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}
export interface UserTemplateDay {
  dayNumber: number;
  name: string;
  exercises: UserTemplateExercise[];
}
export interface UserTemplate {
  _id: string;
  name: string;
  days: UserTemplateDay[];
}

interface Props {
  templates: UserTemplate[];
  basePath: BasePath;
}

interface ConflictInfo {
  _id: string;
  dayName: string;
  setCount: number;
}

interface PendingLog {
  template: UserTemplate;
  day: UserTemplateDay;
}

export function TemplatePathCard({ templates, basePath }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(
    templates.length === 1 ? templates[0]._id : null,
  );
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [pending, setPending] = useState<PendingLog | null>(null);

  async function handleLog(template: UserTemplate, day: UserTemplateDay, deleteActive = false) {
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
          sourceTemplateId: template._id,
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
        };
        if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
          setConflict(body.activeSession);
          setPending({ template, day });
        }
      }
    } finally {
      setStarting(false);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            From Template
          </span>
        </div>
        <p className="text-sm text-foreground/65 mb-4 flex-1">
          Create a training template to log structured workouts.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(basePath.replace('/my-training', '/plans/new'))}
        >
          + Create Template
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
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
                      {tpl.days.length} day{tpl.days.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <span className="text-foreground/40 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-foreground/10 bg-foreground/[0.02] px-2 py-1.5 flex flex-col gap-1">
                    {tpl.days.map((day) => (
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
                          onClick={() => handleLog(tpl, day)}
                          className="h-6 px-2 text-[11px] shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
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

      {conflict && pending && (
        <ActiveSessionConflictDialog
          open
          dayName={conflict.dayName}
          setCount={conflict.setCount}
          resumeHref={`${basePath}/session/${conflict._id}`}
          onDeleteAndStart={() => {
            const { template, day } = pending;
            setConflict(null);
            setPending(null);
            void handleLog(template, day, true);
          }}
          onClose={() => {
            setConflict(null);
            setPending(null);
          }}
        />
      )}
    </>
  );
}

function buildPlannedSets(day: UserTemplateDay): ISelfWorkoutSet[] {
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

- [ ] **Step 4.2 — Lint**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint 2>&1 | tail -10
```

Fix any TypeScript errors.

- [ ] **Step 4.3 — Run full test suite**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm test 2>&1 | tail -10
```

- [ ] **Step 4.4 — Commit**

```bash
cd /Users/eric_gong/Projects/power_gym && git add src/components/self-tracking/template-path-card.tsx && git commit -m "feat(ui): rewrite TemplatePathCard as expandable template list"
```

---

## Task 5: Update `FreestylePathCard`

**Files:**
- Modify: `src/components/self-tracking/freestyle-path-card.tsx`

Replace the `TODAY_ALREADY_LOGGED` overwrite dialog with `ActiveSessionConflictDialog`.

- [ ] **Step 5.1 — Read the current file**

Read `src/components/self-tracking/freestyle-path-card.tsx` in full before editing.

- [ ] **Step 5.2 — Update imports**

Replace the entire Dialog import block with:
```typescript
import { ActiveSessionConflictDialog } from './active-session-conflict-dialog';
```

Remove imports for `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` (they moved into the shared component).

- [ ] **Step 5.3 — Update state and `startBlank` function**

Replace the two state variables:
```typescript
// Remove these:
const [showOverwrite, setShowOverwrite] = useState(false);
const [conflictDayName, setConflictDayName] = useState<string | null>(null);

// Add these:
const [conflict, setConflict] = useState<{
  _id: string;
  dayName: string;
  setCount: number;
} | null>(null);
```

Replace the `startBlank` function:
```typescript
async function startBlank(deleteActive = false) {
  setStarting(true);
  try {
    const url = deleteActive
      ? '/api/me/workout-logs?deleteActive=true'
      : '/api/me/workout-logs';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
    });
    if (res.ok) {
      const log = (await res.json()) as { _id: string };
      router.push(`${props.basePath}/session/${log._id}`);
      return;
    }
    if (res.status === 409) {
      const body = (await res.json()) as {
        error: string;
        activeSession?: { _id: string; dayName: string; setCount: number };
      };
      if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
        setConflict(body.activeSession);
      }
    }
  } finally {
    setStarting(false);
  }
}
```

- [ ] **Step 5.4 — Update the return JSX**

Replace the `<Dialog>` block at the end of the return with `<ActiveSessionConflictDialog>`:

```tsx
{conflict && (
  <ActiveSessionConflictDialog
    open
    dayName={conflict.dayName}
    setCount={conflict.setCount}
    resumeHref={`${props.basePath}/session/${conflict._id}`}
    onDeleteAndStart={() => {
      setConflict(null);
      void startBlank(true);
    }}
    onClose={() => setConflict(null)}
  />
)}
```

- [ ] **Step 5.5 — Lint and test**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint 2>&1 | tail -5 && pnpm test 2>&1 | tail -5
```

- [ ] **Step 5.6 — Commit**

```bash
cd /Users/eric_gong/Projects/power_gym && git add src/components/self-tracking/freestyle-path-card.tsx && git commit -m "feat(ui): FreestylePathCard uses ACTIVE_SESSION_EXISTS conflict dialog"
```

---

## Task 6: Update `PlanOverview`

**Files:**
- Modify: `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`

Replace the `TODAY_ALREADY_LOGGED` overwrite dialog with `ActiveSessionConflictDialog`.

- [ ] **Step 6.1 — Read the current file**

Read `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` in full.

- [ ] **Step 6.2 — Update imports**

Add the new import:
```typescript
import { ActiveSessionConflictDialog } from '@/components/self-tracking/active-session-conflict-dialog';
```

Remove the individual Dialog primitive imports (`DialogDescription`, `DialogFooter`, etc.) that were used for the overwrite dialog — they're now inside the shared component.

- [ ] **Step 6.3 — Update state in `PlanOverview`**

Replace the three state variables related to the old overwrite dialog:
```typescript
// Remove:
const [showOverwrite, setShowOverwrite] = useState(false);
const [conflictDayName, setConflictDayName] = useState<string | null>(null);
const [pendingDay, setPendingDay] = useState<number | null>(null);

// Add:
const [conflict, setConflict] = useState<{
  _id: string;
  dayName: string;
  setCount: number;
} | null>(null);
```

- [ ] **Step 6.4 — Update `startSession` function**

Replace the `startSession` function:
```typescript
async function startSession(dayNum: number, deleteActive = false) {
  if (!plan) return;
  setStarting(true);
  try {
    const url = deleteActive ? '/api/sessions?deleteActive=true' : '/api/sessions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: plan._id, dayNumber: dayNum }),
    });
    if (res.ok) {
      const data = (await res.json()) as { _id: string };
      router.push(`${sessionBasePath}/session/${data._id}`);
      return;
    }
    if (res.status === 409) {
      const body = (await res.json()) as {
        error: string;
        activeSession?: { _id: string; dayName: string; dayNumber: number; setCount: number };
      };
      if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
        setConflict(body.activeSession);
      }
    }
  } finally {
    setStarting(false);
  }
}
```

- [ ] **Step 6.5 — Update the Dialog in JSX**

Replace the old `<Dialog>` block with:
```tsx
{conflict && (
  <ActiveSessionConflictDialog
    open
    dayName={conflict.dayName}
    setCount={conflict.setCount}
    resumeHref={`${sessionBasePath}/session/${conflict._id}`}
    onDeleteAndStart={() => {
      const dayNum = conflict.dayNumber ?? activeDay;
      setConflict(null);
      void startSession(dayNum, true);
    }}
    onClose={() => setConflict(null)}
  />
)}
```

Note: `conflict.dayNumber` is the dayNumber of the conflicting session. Use `activeDay` as fallback if `dayNumber` is not on `ConflictInfo`. Make sure to include `dayNumber` in the state type:
```typescript
const [conflict, setConflict] = useState<{
  _id: string;
  dayName: string;
  dayNumber: number;
  setCount: number;
} | null>(null);
```

- [ ] **Step 6.6 — Lint and test**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint 2>&1 | tail -5 && pnpm test 2>&1 | tail -5
```

- [ ] **Step 6.7 — Commit**

```bash
cd /Users/eric_gong/Projects/power_gym && git add src/app/\(dashboard\)/member/plan/_components/plan-overview.tsx && git commit -m "feat(ui): PlanOverview uses ACTIVE_SESSION_EXISTS conflict dialog"
```

---

## Task 7: Simplify `MyTrainingLanding`

**Files:**
- Modify: `src/components/self-tracking/my-training-landing.tsx`

Remove the `lastByTemplate` fetch and the complex `renderTemplateCard` function. Pass all templates directly to the new `TemplatePathCard`.

- [ ] **Step 7.1 — Read the current file**

Read `src/components/self-tracking/my-training-landing.tsx` in full.

- [ ] **Step 7.2 — Update the `Promise.all` call**

Replace the six-element `Promise.all`:
```typescript
const [activeLog, monthLogs, recent, lastByTemplate, pbs, userTemplates] = await Promise.all([
  logRepo.findActive(userId),
  logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
  logRepo.findRecent(userId, 10),
  logRepo.findLastByTemplate(userId),
  pbRepo.findByUser(userId),
  templateRepo.findByCreator(userId),
]);
```

With the five-element version (drop `lastByTemplate`):
```typescript
const [activeLog, monthLogs, recent, pbs, userTemplates] = await Promise.all([
  logRepo.findActive(userId),
  logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
  logRepo.findRecent(userId, 10),
  pbRepo.findByUser(userId),
  templateRepo.findByCreator(userId),
]);
```

- [ ] **Step 7.3 — Update `hasUsedTemplate` computation**

Replace:
```typescript
const hasUsedTemplate = lastByTemplate !== null;
```

With:
```typescript
const hasUsedTemplate = recent.some((r) => r.sourceTemplateId !== null);
```

- [ ] **Step 7.4 — Replace the template card rendering block**

Replace the entire conditional block:
```tsx
{state === 'empty' ? (
  <TemplatePathCard
    state="empty"
    basePath={basePath}
    templates={toUserTemplates(userTemplates)}
  />
) : (
  await renderTemplateCard(state, lastByTemplate, templateRepo, basePath, userTemplates)
)}
```

With:
```tsx
<TemplatePathCard
  templates={toUserTemplates(userTemplates)}
  basePath={basePath}
/>
```

- [ ] **Step 7.5 — Remove dead code**

Delete the entire `renderTemplateCard` async function (lines ~177–236 in the current file). It is no longer called.

- [ ] **Step 7.6 — Remove unused type import**

Remove `ISelfWorkoutSet` from the import line at the top if it is no longer used after removing `renderTemplateCard`. Check and adjust.

- [ ] **Step 7.7 — Lint**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm lint 2>&1 | tail -10
```

Fix any unused import warnings.

- [ ] **Step 7.8 — Run full test suite**

```bash
cd /Users/eric_gong/Projects/power_gym && pnpm test 2>&1 | tail -10
```

Expected: 1133+ tests pass.

- [ ] **Step 7.9 — Commit**

```bash
cd /Users/eric_gong/Projects/power_gym && git add src/components/self-tracking/my-training-landing.tsx && git commit -m "feat(ui): MyTrainingLanding drops cycle-tracking, uses new TemplatePathCard"
```

---

## Final verification

- [ ] `pnpm build` completes cleanly
- [ ] In browser: My Training page shows expandable template list; clicking any day opens a session
- [ ] Completing a session and clicking another day's "Log" on the same day creates a second session without any conflict dialog
- [ ] Starting a session and — without completing it — trying to log a new day shows the "still in progress" dialog with correct set count and "Delete & Start New" / "Resume" options
