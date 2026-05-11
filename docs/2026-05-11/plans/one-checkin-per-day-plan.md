# One Check-in Per Calendar Day — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one workout check-in per UTC calendar day for all roles; a second attempt shows an overwrite confirmation dialog that deletes the old record and creates a new one.

**Architecture:** Add `findToday` to both session repositories, update both POST API routes to use it (replacing the old `findActive`-only check), and add an overwrite dialog to the three frontend entry points. No schema changes — the guard lives entirely in application logic.

**Tech Stack:** TypeScript, Mongoose, Next.js App Router (Server + Client Components), shadcn/ui `<Dialog>`, Jest (unit tests for repository + API routes).

---

## File Map

| File | Change |
|---|---|
| `src/lib/repositories/workout-session.repository.ts` | Add `findToday` to interface + impl |
| `src/lib/repositories/self-workout-log.repository.ts` | Add `findToday` to interface + impl |
| `src/app/api/sessions/route.ts` | Replace `findActive` check with `findToday` + overwrite logic |
| `src/app/api/me/workout-logs/route.ts` | Replace `findActive` check with `findToday` + overwrite logic |
| `src/components/self-tracking/template-path-card.tsx` | Add overwrite dialog to `DataCard` and `EmptyCard` |
| `src/components/self-tracking/freestyle-path-card.tsx` | Add overwrite dialog |
| `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` | Convert `<a>` CTA to client-side fetch + overwrite dialog |
| `__tests__/lib/repositories/workout-session.repository.test.ts` | Add `findToday` tests |
| `__tests__/lib/repositories/self-workout-log.repository.test.ts` | Add `findToday` tests |
| `__tests__/app/api/sessions.test.ts` | Update existing conflict tests; add today-conflict + overwrite tests |
| `__tests__/app/api/me/workout-logs.test.ts` | Update existing conflict test; add today-conflict + overwrite tests |

---

## Task 1: `WorkoutSessionRepository.findToday`

**Files:**
- Modify: `src/lib/repositories/workout-session.repository.ts`
- Test: `__tests__/lib/repositories/workout-session.repository.test.ts`

- [ ] **Step 1.1 — Write the failing tests**

Append to the `describe('MongoWorkoutSessionRepository')` block in `__tests__/lib/repositories/workout-session.repository.test.ts`:

```typescript
describe('findToday', () => {
  it('calls findOne with memberId and today UTC date range', async () => {
    const sortMock = jest.fn().mockResolvedValue(null);
    mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
    const id = new mongoose.Types.ObjectId().toString();
    await repo.findToday(id);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      memberId: expect.any(mongoose.Types.ObjectId),
      startedAt: { $gte: expect.any(Date), $lt: expect.any(Date) },
    });
    const args = mockModel.findOne.mock.calls[0][0] as {
      startedAt: { $gte: Date; $lt: Date };
    };
    // $gte is start of today UTC, $lt is start of tomorrow UTC
    expect(args.startedAt.$lt.getTime() - args.startedAt.$gte.getTime()).toBe(86_400_000);
    expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
  });

  it('returns null when no session exists today', async () => {
    const sortMock = jest.fn().mockResolvedValue(null);
    mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
    const result = await repo.findToday(new mongoose.Types.ObjectId().toString());
    expect(result).toBeNull();
  });

  it('returns the session when one exists today', async () => {
    const session = { _id: 's1', dayNumber: 1, startedAt: new Date() };
    const sortMock = jest.fn().mockResolvedValue(session);
    mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
    const result = await repo.findToday(new mongoose.Types.ObjectId().toString());
    expect(result).toEqual(session);
  });
});
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
cd /Users/eric_gong/Projects/power_gym
pnpm test -- --testPathPattern="workout-session.repository.test" 2>&1 | tail -20
```

Expected: `TypeError: repo.findToday is not a function`

- [ ] **Step 1.3 — Add `findToday` to the interface and implementation**

In `src/lib/repositories/workout-session.repository.ts`, add to `IWorkoutSessionRepository` interface (after `findActive`):

```typescript
findToday(memberId: string): Promise<IWorkoutSession | null>;
```

Add to `MongoWorkoutSessionRepository` class (after the `findActive` method):

```typescript
async findToday(memberId: string): Promise<IWorkoutSession | null> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);
  return WorkoutSessionModel.findOne({
    memberId: new mongoose.Types.ObjectId(memberId),
    startedAt: { $gte: start, $lt: end },
  }).sort({ startedAt: -1 });
}
```

- [ ] **Step 1.4 — Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern="workout-session.repository.test" 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 1.5 — Commit**

```bash
git add src/lib/repositories/workout-session.repository.ts \
        __tests__/lib/repositories/workout-session.repository.test.ts
git commit -m "feat(repo): add findToday to WorkoutSessionRepository"
```

---

## Task 2: `SelfWorkoutLogRepository.findToday`

**Files:**
- Modify: `src/lib/repositories/self-workout-log.repository.ts`
- Test: `__tests__/lib/repositories/self-workout-log.repository.test.ts`

- [ ] **Step 2.1 — Write the failing tests**

Append to the `describe('MongoSelfWorkoutLogRepository')` block in `__tests__/lib/repositories/self-workout-log.repository.test.ts`:

```typescript
describe('findToday', () => {
  it('calls findOne with userId and today UTC date range', async () => {
    const sortMock = jest.fn().mockResolvedValue(null);
    mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
    await repo.findToday(USER_A);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      userId: expect.any(mongoose.Types.ObjectId),
      startedAt: { $gte: expect.any(Date), $lt: expect.any(Date) },
    });
    const args = mockModel.findOne.mock.calls[0][0] as {
      startedAt: { $gte: Date; $lt: Date };
    };
    expect(args.startedAt.$lt.getTime() - args.startedAt.$gte.getTime()).toBe(86_400_000);
    expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
  });

  it('returns null when no log exists today', async () => {
    const sortMock = jest.fn().mockResolvedValue(null);
    mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
    const result = await repo.findToday(USER_A);
    expect(result).toBeNull();
  });

  it('returns the log when one exists today', async () => {
    const log = { _id: 'log1', dayName: 'Push', startedAt: new Date() };
    const sortMock = jest.fn().mockResolvedValue(log);
    mockModel.findOne.mockReturnValue({ sort: sortMock } as never);
    const result = await repo.findToday(USER_A);
    expect(result).toEqual(log);
  });
});
```

- [ ] **Step 2.2 — Run tests to confirm they fail**

```bash
pnpm test -- --testPathPattern="self-workout-log.repository.test" 2>&1 | tail -20
```

Expected: `TypeError: repo.findToday is not a function`

- [ ] **Step 2.3 — Add `findToday` to the interface and implementation**

In `src/lib/repositories/self-workout-log.repository.ts`, add to `ISelfWorkoutLogRepository` interface (after `findActive`):

```typescript
findToday(userId: string): Promise<ISelfWorkoutLog | null>;
```

Add to `MongoSelfWorkoutLogRepository` class (after the `findActive` method):

```typescript
async findToday(userId: string): Promise<ISelfWorkoutLog | null> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);
  return SelfWorkoutLogModel.findOne({
    userId: oid(userId),
    startedAt: { $gte: start, $lt: end },
  }).sort({ startedAt: -1 });
}
```

- [ ] **Step 2.4 — Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern="self-workout-log.repository.test" 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 2.5 — Commit**

```bash
git add src/lib/repositories/self-workout-log.repository.ts \
        __tests__/lib/repositories/self-workout-log.repository.test.ts
git commit -m "feat(repo): add findToday to SelfWorkoutLogRepository"
```

---

## Task 3: Update `POST /api/sessions`

**Files:**
- Modify: `src/app/api/sessions/route.ts`
- Test: `__tests__/app/api/sessions.test.ts`

- [ ] **Step 3.1 — Update the mock and write new/updated tests**

Replace the entire `__tests__/app/api/sessions.test.ts` file with the following (preserving the GET block, updating the POST mock and tests):

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = {
  create: jest.fn(),
  findByMember: jest.fn(),
  findToday: jest.fn(),
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

  it('pre-populates sets from plan day exercises and creates session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const plan = {
      _id: 'mp1',
      memberId: { toString: () => 'm1' },
      days: [
        {
          dayNumber: 1,
          name: 'Day 1 — Push',
          exercises: [
            {
              exerciseId: 'e1',
              exerciseName: 'Bench Press',
              groupId: 'A',
              isSuperset: false,
              isBodyweight: false,
              sets: 3,
              repsMin: 8,
              repsMax: 10,
              restSeconds: 90,
            },
          ],
        },
      ],
    };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);
    mockSessionRepo.findToday.mockResolvedValue(null);
    const createdSession = { _id: 's1', dayNumber: 1, sets: [] };
    mockSessionRepo.create.mockResolvedValue(createdSession);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 1 }),
    }));

    expect(res.status).toBe(201);
    const createCall = mockSessionRepo.create.mock.calls[0][0];
    expect(createCall.sets).toHaveLength(3);
    expect(createCall.sets[0]).toMatchObject({
      exerciseName: 'Bench Press',
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
    });
    expect(createCall.sets[2].setNumber).toBe(3);
  });

  it('returns existing active session (200) when same dayNumber active today', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue({
      _id: 'mp1',
      memberId: { toString: () => 'm1' },
      days: [{ dayNumber: 1, name: 'Day A', exercises: [] }],
    });
    const existing = { _id: 'sExisting', dayNumber: 1, dayName: 'Day A', completedAt: null };
    mockSessionRepo.findToday.mockResolvedValue(existing);

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

  it('returns 409 TODAY_ALREADY_LOGGED when today has an active session with different dayNumber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sExisting' },
      dayNumber: 1,
      dayName: 'Day A',
      completedAt: null,
      startedAt: new Date(),
    };
    mockSessionRepo.findToday.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('TODAY_ALREADY_LOGGED');
    expect(data.existingSession).toMatchObject({ _id: 'sExisting', dayName: 'Day A', dayNumber: 1 });
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('returns 409 TODAY_ALREADY_LOGGED when today has a completed session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sDone' },
      dayNumber: 1,
      dayName: 'Day A',
      completedAt: new Date(),
      startedAt: new Date(),
    };
    mockSessionRepo.findToday.mockResolvedValue(existing);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('TODAY_ALREADY_LOGGED');
    expect(mockSessionRepo.create).not.toHaveBeenCalled();
  });

  it('deletes today session and creates new when ?overwrite=true', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(PLAN_WITH_TWO_DAYS);
    const existing = {
      _id: { toString: () => 'sOld' },
      dayNumber: 1,
      dayName: 'Day A',
      completedAt: new Date(),
      startedAt: new Date(),
    };
    mockSessionRepo.findToday.mockResolvedValue(existing);
    mockSessionRepo.delete.mockResolvedValue(true);
    mockSessionRepo.create.mockResolvedValue({ _id: 'sNew', dayNumber: 2 });

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions?overwrite=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'mp1', dayNumber: 2 }),
    }));

    expect(res.status).toBe(201);
    expect(mockSessionRepo.delete).toHaveBeenCalledWith('sOld');
    expect(mockSessionRepo.create).toHaveBeenCalled();
  });
});

describe('GET /api/sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sessions for self when member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const sessions = [{ _id: 's1' }];
    mockSessionRepo.findByMember.mockResolvedValue(sessions);

    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(sessions);
  });

  it('returns 403 when member queries another member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m2'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3.2 — Run tests to confirm they fail**

```bash
pnpm test -- --testPathPattern="__tests__/app/api/sessions.test" 2>&1 | tail -20
```

Expected: new today-conflict + overwrite tests fail; the rest may pass or fail due to `findToday` vs `findActive`.

- [ ] **Step 3.3 — Rewrite `POST /api/sessions`**

Replace the `POST` function in `src/app/api/sessions/route.ts` with:

```typescript
export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const overwrite = url.searchParams.get('overwrite') === 'true';
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
  const todaySession = await sessionRepo.findToday(targetMemberId);

  if (todaySession) {
    if (todaySession.completedAt === null && todaySession.dayNumber === body.dayNumber) {
      return Response.json(todaySession, { status: 200 });
    }
    if (!overwrite) {
      return Response.json(
        {
          error: 'TODAY_ALREADY_LOGGED',
          existingSession: {
            _id: todaySession._id.toString(),
            dayName: todaySession.dayName,
            dayNumber: todaySession.dayNumber,
            startedAt: todaySession.startedAt,
          },
        },
        { status: 409 },
      );
    }
    await sessionRepo.delete(todaySession._id.toString());
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

- [ ] **Step 3.4 — Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern="__tests__/app/api/sessions.test" 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3.5 — Commit**

```bash
git add src/app/api/sessions/route.ts \
        __tests__/app/api/sessions.test.ts
git commit -m "feat(api): enforce one-check-in-per-day in POST /api/sessions"
```

---

## Task 4: Update `POST /api/me/workout-logs`

**Files:**
- Modify: `src/app/api/me/workout-logs/route.ts`
- Test: `__tests__/app/api/me/workout-logs.test.ts`

- [ ] **Step 4.1 — Update the mock and write new/updated tests**

Replace the entire `__tests__/app/api/me/workout-logs.test.ts` with:

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

    it('creates a freestyle log when no session exists today', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const create = jest.fn().mockResolvedValue({ _id: 'log1' });
      const findToday = jest.fn().mockResolvedValue(null);
      mockSelfRepo.mockImplementation(
        () => ({ create, findToday } as unknown as MongoSelfWorkoutLogRepository),
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
          userId: USER,
          dayName: 'Freestyle',
          sourceTemplateId: null,
          sourceTemplateDayNumber: null,
          sets: [],
        }),
      );
    });

    it('returns 409 TODAY_ALREADY_LOGGED when an active log exists today', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findToday = jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-active' },
        dayName: 'Push',
        startedAt: new Date('2026-05-11T10:00:00Z'),
        completedAt: null,
      });
      const create = jest.fn();
      mockSelfRepo.mockImplementation(
        () => ({ findToday, create } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Pull', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; existingLog: { _id: string; dayName: string } };
      expect(body.error).toBe('TODAY_ALREADY_LOGGED');
      expect(body.existingLog._id).toBe('log-active');
      expect(body.existingLog.dayName).toBe('Push');
      expect(create).not.toHaveBeenCalled();
    });

    it('returns 409 TODAY_ALREADY_LOGGED when a completed log exists today', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findToday = jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-done' },
        dayName: 'Legs',
        startedAt: new Date('2026-05-11T08:00:00Z'),
        completedAt: new Date('2026-05-11T09:00:00Z'),
      });
      const create = jest.fn();
      mockSelfRepo.mockImplementation(
        () => ({ findToday, create } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ dayName: 'Push', plannedSets: [] }),
        }),
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('TODAY_ALREADY_LOGGED');
      expect(create).not.toHaveBeenCalled();
    });

    it('deletes today log and creates new when ?overwrite=true', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const findToday = jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-old' },
        dayName: 'Push',
        startedAt: new Date(),
        completedAt: new Date(),
      });
      const deleteFn = jest.fn().mockResolvedValue(true);
      const create = jest.fn().mockResolvedValue({ _id: 'log-new' });
      mockSelfRepo.mockImplementation(
        () => ({ findToday, delete: deleteFn, create } as unknown as MongoSelfWorkoutLogRepository),
      );
      const res = await POST(
        new Request('http://x?overwrite=true', {
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
      const findToday = jest.fn().mockResolvedValue(null);
      mockSelfRepo.mockImplementation(
        () => ({ findToday } as unknown as MongoSelfWorkoutLogRepository),
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

- [ ] **Step 4.2 — Run tests to confirm they fail**

```bash
pnpm test -- --testPathPattern="__tests__/app/api/me/workout-logs.test" 2>&1 | tail -20
```

Expected: today-conflict and overwrite tests fail (API still uses `findActive`).

- [ ] **Step 4.3 — Rewrite `POST /api/me/workout-logs`**

Replace the `POST` function in `src/app/api/me/workout-logs/route.ts` with:

```typescript
export async function POST(req: Request): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const overwrite = url.searchParams.get('overwrite') === 'true';
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
  const todayLog = await repo.findToday(guard.userId);

  if (todayLog) {
    if (!overwrite) {
      return Response.json(
        {
          error: 'TODAY_ALREADY_LOGGED',
          existingLog: {
            _id: todayLog._id.toString(),
            dayName: todayLog.dayName,
            startedAt: todayLog.startedAt,
          },
        },
        { status: 409 },
      );
    }
    await repo.delete(todayLog._id.toString(), guard.userId);
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

- [ ] **Step 4.4 — Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern="__tests__/app/api/me/workout-logs.test" 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 4.5 — Run the full test suite to catch regressions**

```bash
pnpm test 2>&1 | tail -20
```

Expected: all tests pass. If any related test (e.g. `sessions/role-fix.test.ts`) fails because it mocks `findActive` but not `findToday`, add `findToday: jest.fn().mockResolvedValue(null)` to that test's mock object.

- [ ] **Step 4.6 — Commit**

```bash
git add src/app/api/me/workout-logs/route.ts \
        __tests__/app/api/me/workout-logs.test.ts
git commit -m "feat(api): enforce one-check-in-per-day in POST /api/me/workout-logs"
```

---

## Task 5: Overwrite dialog in self-tracking cards

**Files:**
- Modify: `src/components/self-tracking/template-path-card.tsx`
- Modify: `src/components/self-tracking/freestyle-path-card.tsx`

No new test files — these are UI state changes. Run `pnpm lint` and `pnpm test` to confirm no regressions.

- [ ] **Step 5.1 — Add overwrite dialog to `template-path-card.tsx`**

Add `DialogDescription` and `DialogFooter` to the shadcn import at the top of `template-path-card.tsx`:

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
```

Replace the `DataCard` function with:

```typescript
function DataCard(props: FullProps | LightProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Parameters<typeof start>[0] | null>(null);
  const [conflictDayName, setConflictDayName] = useState<string | null>(null);
  const eyebrow = props.state === 'full' ? 'Next in rotation' : 'Repeat or rotate';

  async function start(
    payload: {
      templateId: string;
      dayNumber: number;
      dayName: string;
      plannedSets: ISelfWorkoutSet[];
    },
    overwrite = false,
  ) {
    setStarting(true);
    try {
      const url = overwrite ? '/api/me/workout-logs?overwrite=true' : '/api/me/workout-logs';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: payload.dayName,
          sourceTemplateId: payload.templateId,
          sourceTemplateDayNumber: payload.dayNumber,
          plannedSets: payload.plannedSets,
        }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        router.push(`${props.basePath}/session/${log._id}`);
        return;
      }
      if (res.status === 409) {
        const body = (await res.json()) as { error: string; existingLog?: { dayName: string } };
        if (body.error === 'TODAY_ALREADY_LOGGED') {
          setConflictDayName(body.existingLog?.dayName ?? null);
          setPendingPayload(payload);
        }
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">{eyebrow}</span>
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">From template</span>
        </div>
        <div className="mb-1">
          <div className="text-[11px] text-foreground/65 tabular-nums">{props.templateName}</div>
          <h2 className="text-xl font-bold leading-tight mt-0.5">
            Day {props.nextDay.dayNumber} — {props.nextDay.dayName}
          </h2>
        </div>
        <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 space-y-1.5 my-3 bg-foreground/5">
          {props.exercisePreview.map((ex, i) => (
            <div key={i} className="flex items-center justify-between text-[12px] tabular-nums">
              <span>{ex.name}</span>
              <span className="text-foreground/65">{ex.prescribed}</span>
              {props.state === 'full' && ex.lastWeight != null ? (
                <span className="text-foreground/65 w-16 text-right">last {ex.lastWeight}kg</span>
              ) : (
                <span className="w-16" />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-[3px]">
            {Array.from({ length: props.cycleSize }).map((_, i) => {
              const dn = i + 1;
              const done = props.completedDayNumbers.includes(dn);
              const isNext = dn === props.nextDay.dayNumber;
              return (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    done
                      ? 'bg-emerald-400'
                      : isNext
                        ? 'bg-emerald-400/40 ring-1 ring-emerald-400/40'
                        : 'bg-foreground/10'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[11px] text-foreground/65 tabular-nums">
            <span className="text-foreground font-semibold">{props.nextDay.dayNumber}</span> / {props.cycleSize}
          </span>
        </div>
        <div className="mt-auto flex gap-2">
          <Button
            disabled={starting}
            onClick={() =>
              start({
                templateId: props.templateId,
                dayNumber: props.nextDay.dayNumber,
                dayName: props.nextDay.dayName,
                plannedSets: props.plannedSets,
              })
            }
            className="flex-1"
          >
            {starting ? 'Starting…' : `Start Day ${props.nextDay.dayNumber} →`}
          </Button>
          <Button variant="outline" disabled={starting} onClick={() => setPickerOpen(true)}>
            Pick another day
          </Button>
        </div>
        <TemplateDayPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={async ({ templateId, dayNumber, dayName, plannedSets }) => {
            await start({ templateId, dayNumber, dayName, plannedSets });
          }}
        />
      </div>

      <Dialog open={pendingPayload !== null} onOpenChange={() => setPendingPayload(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>今天已有打卡记录</DialogTitle>
            <DialogDescription>
              你今天已记录了「{conflictDayName ?? ''}」。继续将删除这条记录并创建新记录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPayload(null)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const payload = pendingPayload!;
                setPendingPayload(null);
                void start(payload, true);
              }}
            >
              覆盖并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

In `EmptyCard`, add the same dialog state and update `startDay`:

```typescript
function EmptyCard({ basePath, templates }: EmptyProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pendingDay, setPendingDay] = useState<UserTemplateDay | null>(null);
  const [conflictDayName, setConflictDayName] = useState<string | null>(null);

  const plansBase = basePath.replace('/my-training', '/plans');
  const selected = templates.find((t) => t._id === selectedId) ?? null;
  const hasTemplates = templates.length > 0;

  async function startDay(day: UserTemplateDay, overwrite = false) {
    if (!selected) return;
    setStarting(true);
    try {
      const url = overwrite ? '/api/me/workout-logs?overwrite=true' : '/api/me/workout-logs';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayName: day.name,
          sourceTemplateId: selected._id,
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
        const body = (await res.json()) as { error: string; existingLog?: { dayName: string } };
        if (body.error === 'TODAY_ALREADY_LOGGED') {
          setConflictDayName(body.existingLog?.dayName ?? null);
          setPendingDay(day);
        }
      }
    } finally {
      setStarting(false);
    }
  }

  function handleStart() {
    if (!selected) return;
    if (selected.days.length === 1) {
      void startDay(selected.days[0]);
    } else {
      setPickerOpen(true);
    }
  }

  return (
    <>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        {/* ... (keep all existing JSX unchanged) ... */}
      </div>

      <Dialog open={pendingDay !== null} onOpenChange={() => setPendingDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>今天已有打卡记录</DialogTitle>
            <DialogDescription>
              你今天已记录了「{conflictDayName ?? ''}」。继续将删除这条记录并创建新记录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDay(null)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const day = pendingDay!;
                setPendingDay(null);
                void startDay(day, true);
              }}
            >
              覆盖并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 5.2 — Add overwrite dialog to `freestyle-path-card.tsx`**

Add imports at the top:

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
```

Replace `FreestylePathCard` function with:

```typescript
export function FreestylePathCard(props: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [conflictDayName, setConflictDayName] = useState<string | null>(null);

  async function startBlank(overwrite = false) {
    setStarting(true);
    try {
      const url = overwrite ? '/api/me/workout-logs?overwrite=true' : '/api/me/workout-logs';
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
        const body = (await res.json()) as { error: string; existingLog?: { dayName: string } };
        if (body.error === 'TODAY_ALREADY_LOGGED') {
          setConflictDayName(body.existingLog?.dayName ?? null);
          setShowOverwrite(true);
        }
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        {/* ... (keep all existing JSX unchanged, update onClick) ... */}
        <div className="mt-auto">
          <Button onClick={() => startBlank()} disabled={starting} className="w-full">
            {starting ? 'Starting…' : 'Start blank →'}
          </Button>
        </div>
      </div>

      <Dialog open={showOverwrite} onOpenChange={setShowOverwrite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>今天已有打卡记录</DialogTitle>
            <DialogDescription>
              你今天已记录了「{conflictDayName ?? ''}」。继续将删除这条记录并创建新记录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverwrite(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setShowOverwrite(false);
                void startBlank(true);
              }}
            >
              覆盖并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 5.3 — Lint and test**

```bash
pnpm lint && pnpm test 2>&1 | tail -20
```

Expected: no lint errors, all tests pass.

- [ ] **Step 5.4 — Commit**

```bash
git add src/components/self-tracking/template-path-card.tsx \
        src/components/self-tracking/freestyle-path-card.tsx
git commit -m "feat(ui): overwrite dialog for today-conflict in self-tracking cards"
```

---

## Task 6: Overwrite dialog in member `plan-overview.tsx`

**Files:**
- Modify: `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`

- [ ] **Step 6.1 — Convert "Log This Workout" to client-side fetch with overwrite dialog**

Add `useRouter` to the import at the top of `plan-overview.tsx`:

```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';
```

Add shadcn dialog and button imports:

```typescript
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
```

In the `PlanOverview` component, add new state variables and a `startSession` function (insert after the `setActiveDay` useState line):

```typescript
const router = useRouter();
const [starting, setStarting] = useState(false);
const [showOverwrite, setShowOverwrite] = useState(false);
const [conflictDayName, setConflictDayName] = useState<string | null>(null);
const [pendingDay, setPendingDay] = useState<number | null>(null);

async function startSession(dayNum: number, overwrite = false) {
  if (!plan) return;
  setStarting(true);
  try {
    const url = overwrite ? '/api/sessions?overwrite=true' : '/api/sessions';
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
        existingSession?: { dayName: string };
      };
      if (body.error === 'TODAY_ALREADY_LOGGED') {
        setConflictDayName(body.existingSession?.dayName ?? null);
        setPendingDay(dayNum);
        setShowOverwrite(true);
      }
    }
  } finally {
    setStarting(false);
  }
}
```

Replace the fixed bottom bar `<a>` tag with a `<button>`:

```tsx
<div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-[#0f0f0f] bg-[#050505] px-4 sm:px-8 py-3">
  <button
    disabled={starting}
    onClick={() => startSession(activeDay)}
    className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-black hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {starting ? 'Starting…' : 'Log This Workout'}
  </button>
</div>
```

Add the overwrite dialog just before the closing `</div>` of the returned JSX:

```tsx
<Dialog open={showOverwrite} onOpenChange={setShowOverwrite}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>今天已有打卡记录</DialogTitle>
      <DialogDescription>
        你今天已记录了「{conflictDayName ?? ''}」。继续将删除这条记录并创建新记录。
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowOverwrite(false)}>
        取消
      </Button>
      <Button
        onClick={() => {
          const dayNum = pendingDay!;
          setShowOverwrite(false);
          setPendingDay(null);
          void startSession(dayNum, true);
        }}
      >
        覆盖并继续
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 6.2 — Lint and full test suite**

```bash
pnpm lint && pnpm test 2>&1 | tail -20
```

Expected: no lint errors, all tests pass.

- [ ] **Step 6.3 — Commit**

```bash
git add src/app/(dashboard)/member/plan/_components/plan-overview.tsx
git commit -m "feat(ui): overwrite dialog for today-conflict in member plan-overview"
```

---

## Final verification

- [ ] `pnpm build` passes cleanly
- [ ] Manually test in the browser: start a session, complete it, try to start another — overwrite dialog appears
- [ ] Confirm Cancel keeps the existing session; Confirm overwrites and starts a new one
