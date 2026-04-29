# Progress Charts & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Progress page for members showing a 13-week training-frequency heatmap and an on-demand 1RM trend chart per exercise; expose the same view inside each trainer's member detail pages.

**Architecture:** Server components fetch static data (completed dates, exercise list) at render time; the exercise-specific 1RM history is fetched client-side on exercise selection to avoid a large initial payload. A single new API route handles the on-demand fetch with role-based auth. Three new repository methods are added to `MongoWorkoutSessionRepository` — no new models or schemas.

**Tech Stack:** Next.js App Router, MongoDB aggregation pipeline, Recharts (already installed), custom div-grid heatmap (no extra library), TypeScript strict mode.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/repositories/workout-session.repository.ts` | Modify | Add `findCompletedDates`, `findTrainedExercises`, `findExerciseHistory` to interface + class |
| `__tests__/lib/repositories/workout-session-progress.test.ts` | Create | Unit tests for the three new repository methods |
| `src/app/api/progress/[memberId]/route.ts` | Create | GET handler: auth + role check + exerciseId → history |
| `__tests__/app/api/progress.test.ts` | Create | Unit tests for the API route (all auth cases + success) |
| `src/app/(dashboard)/member/progress/_components/progress-client.tsx` | Create | `ProgressClient` — heatmap + exercise selector + 1RM LineChart |
| `src/app/(dashboard)/member/progress/page.tsx` | Create | Server component: auth → fetch dates + exercises → render ProgressClient |
| `src/app/(dashboard)/trainer/members/[id]/progress/page.tsx` | Create | Trainer variant of the progress page (checks member ownership) |
| `src/components/shared/app-shell.tsx` | Modify | Add `My Progress` nav item to member TRAINING group |
| `src/app/(dashboard)/trainer/members/page.tsx` | Modify | Add `Progress →` link to each member card |
| `e2e/seed.ts` | Modify | Ensure existing completed WorkoutSession includes a Bench Press set with completedAt set |
| `e2e/member/progress.spec.ts` | Create | E2E: heatmap visible, exercise chart renders |
| `e2e/trainer/members.spec.ts` | Modify | Add case: trainer navigates to member Progress tab |

---

## Task 1: Repository Methods

**Files:**
- Modify: `src/lib/repositories/workout-session.repository.ts`
- Create: `__tests__/lib/repositories/workout-session-progress.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/repositories/workout-session-progress.test.ts`:

```typescript
/** @jest-environment node */

jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    aggregate: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

const mockModel = jest.mocked(WorkoutSessionModel);
const mockFind = mockModel.find as jest.Mock;
const mockAggregate = mockModel.aggregate as jest.Mock;

const MEMBER_ID = '507f1f77bcf86cd799439011';
const EXERCISE_ID = '507f1f77bcf86cd799439012';

describe('MongoWorkoutSessionRepository — progress methods', () => {
  let repo: MongoWorkoutSessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoWorkoutSessionRepository();
  });

  // ── findCompletedDates ──────────────────────────────────────────────────

  describe('findCompletedDates', () => {
    it('returns completedAt values from matching sessions', async () => {
      const since = new Date('2026-01-01');
      const date1 = new Date('2026-03-01');
      const date2 = new Date('2026-03-15');
      mockFind.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ completedAt: date1 }, { completedAt: date2 }]),
      });

      const result = await repo.findCompletedDates(MEMBER_ID, since);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: expect.any(mongoose.Types.ObjectId),
          completedAt: { $gte: since, $ne: null },
        }),
      );
      expect(result).toEqual([date1, date2]);
    });

    it('returns empty array when no sessions match', async () => {
      mockFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      const result = await repo.findCompletedDates(MEMBER_ID, new Date());

      expect(result).toEqual([]);
    });
  });

  // ── findTrainedExercises ────────────────────────────────────────────────

  describe('findTrainedExercises', () => {
    it('returns mapped exerciseId and exerciseName from aggregate', async () => {
      const objectId = new mongoose.Types.ObjectId(EXERCISE_ID);
      mockAggregate.mockResolvedValue([{ _id: objectId, exerciseName: 'Bench Press' }]);

      const result = await repo.findTrainedExercises(MEMBER_ID);

      expect(result).toEqual([{ exerciseId: EXERCISE_ID, exerciseName: 'Bench Press' }]);
    });

    it('returns empty array when aggregate returns nothing', async () => {
      mockAggregate.mockResolvedValue([]);

      const result = await repo.findTrainedExercises(MEMBER_ID);

      expect(result).toEqual([]);
    });
  });

  // ── findExerciseHistory ─────────────────────────────────────────────────

  describe('findExerciseHistory', () => {
    const exerciseObjectId = new mongoose.Types.ObjectId(EXERCISE_ID);

    it('computes max estimated 1RM per session and sorts ascending', async () => {
      const date1 = new Date('2026-03-01');
      const date2 = new Date('2026-03-15');
      // Session 1: two sets for the exercise — 60 kg × 8 reps and 70 kg × 5 reps
      // Epley: 60*(1+8/30)=76, 70*(1+5/30)≈81.67 → max = 81.67 → rounded = 81.7
      // Session 2: 80 kg × 3 reps → 80*(1+3/30)=88 → rounded = 88
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt: date1,
            startedAt: new Date('2026-03-01T09:00:00'),
            sets: [
              { exerciseId: exerciseObjectId, actualWeight: 60, actualReps: 8 },
              { exerciseId: exerciseObjectId, actualWeight: 70, actualReps: 5 },
            ],
          },
          {
            completedAt: date2,
            startedAt: new Date('2026-03-15T09:00:00'),
            sets: [{ exerciseId: exerciseObjectId, actualWeight: 80, actualReps: 3 }],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result).toEqual([
        { date: date1, estimatedOneRM: 81.7 },
        { date: date2, estimatedOneRM: 88 },
      ]);
    });

    it('skips sessions with no matching exercise sets', async () => {
      const otherExerciseId = new mongoose.Types.ObjectId();
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt: new Date('2026-03-01'),
            startedAt: new Date('2026-03-01T09:00:00'),
            sets: [{ exerciseId: otherExerciseId, actualWeight: 60, actualReps: 8 }],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result).toEqual([]);
    });

    it('skips sets with null actualWeight or actualReps', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt: new Date('2026-03-01'),
            startedAt: new Date('2026-03-01T09:00:00'),
            sets: [
              { exerciseId: exerciseObjectId, actualWeight: null, actualReps: 8 },
              { exerciseId: exerciseObjectId, actualWeight: 60, actualReps: null },
            ],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result).toEqual([]);
    });

    it('uses completedAt as date field', async () => {
      const completedAt = new Date('2026-03-10T15:00:00');
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            completedAt,
            startedAt: new Date('2026-03-10T09:00:00'),
            sets: [{ exerciseId: exerciseObjectId, actualWeight: 100, actualReps: 1 }],
          },
        ]),
      });

      const result = await repo.findExerciseHistory(MEMBER_ID, EXERCISE_ID);

      expect(result[0].date).toEqual(completedAt);
    });
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm test -- --testPathPattern=workout-session-progress
```

Expected: FAIL — `findCompletedDates is not a function` (or similar).

- [ ] **Step 3: Add the three methods to the interface and class**

Open `src/lib/repositories/workout-session.repository.ts`. Add the import at the top and the three interface + class methods:

```typescript
import { estimatedOneRM } from '@/lib/training/epley';
```

Add to the `IWorkoutSessionRepository` interface (after the existing `countByMemberIdsSince` line):

```typescript
  findCompletedDates(memberId: string, since: Date): Promise<Date[]>;
  findTrainedExercises(memberId: string): Promise<{ exerciseId: string; exerciseName: string }[]>;
  findExerciseHistory(memberId: string, exerciseId: string): Promise<{ date: Date; estimatedOneRM: number }[]>;
```

Add to the `MongoWorkoutSessionRepository` class (after the `countByMemberIdsSince` method):

```typescript
  async findCompletedDates(memberId: string, since: Date): Promise<Date[]> {
    const sessions = await WorkoutSessionModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
      completedAt: { $gte: since, $ne: null },
    }).select('completedAt');
    return sessions.map((s) => s.completedAt!);
  }

  async findTrainedExercises(memberId: string): Promise<{ exerciseId: string; exerciseName: string }[]> {
    const results = await WorkoutSessionModel.aggregate<{ _id: mongoose.Types.ObjectId; exerciseName: string }>([
      { $match: { memberId: new mongoose.Types.ObjectId(memberId) } },
      { $unwind: '$sets' },
      { $match: { 'sets.actualWeight': { $ne: null }, 'sets.actualReps': { $ne: null } } },
      { $group: { _id: '$sets.exerciseId', exerciseName: { $first: '$sets.exerciseName' } } },
      { $sort: { exerciseName: 1 } },
    ]);
    return results.map((r) => ({ exerciseId: r._id.toString(), exerciseName: r.exerciseName }));
  }

  async findExerciseHistory(
    memberId: string,
    exerciseId: string,
  ): Promise<{ date: Date; estimatedOneRM: number }[]> {
    const sessions = await WorkoutSessionModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
      completedAt: { $ne: null },
    }).sort({ completedAt: 1 });

    return sessions
      .map((session) => {
        const matchingSets = session.sets.filter(
          (s) =>
            s.exerciseId.toString() === exerciseId &&
            s.actualWeight !== null &&
            s.actualReps !== null,
        );
        if (matchingSets.length === 0) return null;
        const maxOneRM = Math.max(
          ...matchingSets.map((s) => estimatedOneRM(s.actualWeight!, s.actualReps!)),
        );
        return { date: session.completedAt!, estimatedOneRM: Math.round(maxOneRM * 10) / 10 };
      })
      .filter((entry): entry is { date: Date; estimatedOneRM: number } => entry !== null);
  }
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=workout-session-progress
```

Expected: All tests PASS.

- [ ] **Step 5: Run lint**

```bash
pnpm lint
```

Expected: No warnings or errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/repositories/workout-session.repository.ts __tests__/lib/repositories/workout-session-progress.test.ts
git commit -m "feat: add progress repository methods (findCompletedDates, findTrainedExercises, findExerciseHistory)"
```

---

## Task 2: Progress API Route

**Files:**
- Create: `src/app/api/progress/[memberId]/route.ts`
- Create: `__tests__/app/api/progress.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/app/api/progress.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockWorkoutRepo = { findExerciseHistory: jest.fn() };
const mockUserRepo = { findById: jest.fn() };

jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockWorkoutRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

function makeReq(memberId: string, exerciseId?: string): Request {
  const url = exerciseId
    ? `http://localhost/api/progress/${memberId}?exerciseId=${exerciseId}`
    : `http://localhost/api/progress/${memberId}`;
  return new Request(url);
}

describe('GET /api/progress/[memberId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m2', 'ex1'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when exerciseId is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1'), makeParams('m1'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'exerciseId is required' });
  });

  it('returns 404 when trainer queries a non-existent member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('nonexistent', 'ex1'), makeParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer queries a member belonging to different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({
      trainerId: { toString: () => 't2' },
    });
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for member accessing own data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const history = [{ date: new Date('2026-03-01'), estimatedOneRM: 80 }];
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue(history);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.history).toEqual([{ date: '2026-03-01', estimatedOneRM: 80 }]);
  });

  it('returns 200 for trainer querying own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue([]);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.history).toEqual([]);
  });

  it('returns 200 for owner querying any member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue([]);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('formats date as YYYY-MM-DD in response', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockWorkoutRepo.findExerciseHistory.mockResolvedValue([
      { date: new Date('2026-04-15T14:30:00.000Z'), estimatedOneRM: 95.3 },
    ]);
    const { GET } = await import('@/app/api/progress/[memberId]/route');
    const res = await GET(makeReq('m1', 'ex1'), makeParams('m1'));
    const data = await res.json();
    expect(data.history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/progress
```

Expected: FAIL — `Cannot find module '@/app/api/progress/[memberId]/route'`.

- [ ] **Step 3: Create the API route**

Create `src/app/api/progress/[memberId]/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get('exerciseId');
  if (!exerciseId) return Response.json({ error: 'exerciseId is required' }, { status: 400 });

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const history = await new MongoWorkoutSessionRepository().findExerciseHistory(memberId, exerciseId);

  return Response.json({
    history: history.map((h) => ({
      date: h.date.toISOString().split('T')[0],
      estimatedOneRM: h.estimatedOneRM,
    })),
  });
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/progress
```

Expected: All tests PASS.

- [ ] **Step 5: Run lint**

```bash
pnpm lint
```

Expected: No warnings or errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/progress/__tests__/app/api/progress.test.ts
git commit -m "feat: add GET /api/progress/[memberId] route with role-based auth"
```

---

## Task 3: ProgressClient Component

**Files:**
- Create: `src/app/(dashboard)/member/progress/_components/progress-client.tsx`

This is a client component. No unit test — it requires a browser environment and is covered by E2E tests in Task 7.

- [ ] **Step 1: Create the component**

Create `src/app/(dashboard)/member/progress/_components/progress-client.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SectionHeader } from '@/components/shared/section-header';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface ProgressClientProps {
  heatmapData: { date: string }[];
  exercises: { exerciseId: string; exerciseName: string }[];
  memberId: string;
  title?: string;
}

interface HistoryPoint {
  date: string;
  estimatedOneRM: number;
}

function buildHeatmapWeeks(activeDates: Set<string>): {
  monthLabel: string | null;
  days: { inRange: boolean; hasSession: boolean }[];
}[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysSinceMonday);

  const startMonday = new Date(thisMonday);
  startMonday.setDate(thisMonday.getDate() - 12 * 7);

  const since = new Date(today);
  since.setDate(today.getDate() - 90);

  const weeks: { monthLabel: string | null; days: { inRange: boolean; hasSession: boolean }[] }[] = [];
  let prevMonth = -1;

  for (let w = 0; w < 13; w++) {
    const weekMonday = new Date(startMonday);
    weekMonday.setDate(startMonday.getDate() + w * 7);

    const month = weekMonday.getMonth();
    const monthLabel =
      month !== prevMonth
        ? weekMonday.toLocaleDateString('en-US', { month: 'short' })
        : null;
    prevMonth = month;

    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekMonday);
      date.setDate(weekMonday.getDate() + d);
      const inRange = date >= since && date <= today;
      const dateStr = date.toISOString().split('T')[0];
      days.push({ inRange, hasSession: inRange && activeDates.has(dateStr) });
    }
    weeks.push({ monthLabel, days });
  }

  return weeks;
}

export function ProgressClient({
  heatmapData,
  exercises,
  memberId,
  title = 'My Progress',
}: ProgressClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.exerciseId ?? '');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedExerciseId) return;
    setLoading(true);
    fetch(`/api/progress/${memberId}?exerciseId=${selectedExerciseId}`)
      .then((r) => r.json())
      .then((data: { history: HistoryPoint[] }) => {
        setHistory(data.history ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedExerciseId, memberId]);

  const activeDates = new Set(heatmapData.map((d) => d.date));
  const weeks = buildHeatmapWeeks(activeDates);

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    estimatedOneRM: h.estimatedOneRM,
  }));

  return (
    <div>
      <PageHeader title={title} />
      <div className="px-4 sm:px-8 py-7 space-y-7">
        {/* Training Frequency Heatmap */}
        <div>
          <SectionHeader title="Training Frequency" />
          <Card className="mt-3 bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {/* Day-of-week labels column */}
              <div className="flex flex-col gap-1 mr-1">
                <div className="h-3" />
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                  <div key={i} className="h-3 w-3 flex items-center justify-center text-[9px] text-[#444]">
                    {label}
                  </div>
                ))}
              </div>
              {/* Week columns */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  <div className="h-3 text-[9px] text-[#444] whitespace-nowrap">
                    {week.monthLabel ?? ''}
                  </div>
                  {week.days.map((day, di) => (
                    <div
                      key={di}
                      className="w-3 h-3 rounded-[2px]"
                      style={{
                        backgroundColor: day.hasSession
                          ? '#2563eb'
                          : day.inRange
                            ? '#1a1a1a'
                            : 'transparent',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Strength Progress */}
        <div>
          <SectionHeader title="Strength Progress" />
          {exercises.length === 0 ? (
            <p className="mt-3 text-[12px] text-[#555]">No exercise history yet.</p>
          ) : (
            <>
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="mt-3 bg-[#0c0c0c] border border-[#141414] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#333]"
              >
                {exercises.map((ex) => (
                  <option key={ex.exerciseId} value={ex.exerciseId}>
                    {ex.exerciseName}
                  </option>
                ))}
              </select>

              <Card
                className={`mt-3 bg-[#0c0c0c] border-[#141414] rounded-xl p-4 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}
              >
                {chartData.length === 0 ? (
                  <p className="text-[12px] text-[#555] text-center py-8">
                    No history yet for this exercise.
                  </p>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#333' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#333' }} unit=" kg" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0c0c0c',
                            border: '1px solid #141414',
                            borderRadius: 8,
                          }}
                          labelStyle={{ color: '#666', fontSize: 10 }}
                          itemStyle={{ color: '#ccc', fontSize: 11 }}
                          formatter={(value: number) => [`${value} kg`, 'Est. 1RM']}
                        />
                        <Line
                          type="monotone"
                          dataKey="estimatedOneRM"
                          stroke="#2563eb"
                          dot={{ fill: '#2563eb', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No warnings or errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/member/progress/_components/progress-client.tsx
git commit -m "feat: add ProgressClient component (heatmap + exercise 1RM chart)"
```

---

## Task 4: Member Progress Page

**Files:**
- Create: `src/app/(dashboard)/member/progress/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/member/progress/page.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { ProgressClient } from './_components/progress-client';

export default async function MemberProgressPage() {
  const session = await auth();
  if (!session?.user) return null;

  const memberId = session.user.id;

  await connectDB();
  const repo = new MongoWorkoutSessionRepository();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [completedDates, exercises] = await Promise.all([
    repo.findCompletedDates(memberId, since),
    repo.findTrainedExercises(memberId),
  ]);

  const heatmapData = completedDates.map((d) => ({
    date: d.toISOString().split('T')[0],
  }));

  return (
    <ProgressClient
      heatmapData={heatmapData}
      exercises={exercises}
      memberId={memberId}
    />
  );
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No warnings or errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/member/progress/page.tsx
git commit -m "feat: add member progress page (server component)"
```

---

## Task 5: Trainer Member Progress Page

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/progress/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/trainer/members/[id]/progress/page.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { ProgressClient } from '@/app/(dashboard)/member/progress/_components/progress-client';

export default async function TrainerMemberProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();

  const member = await new MongoUserRepository().findById(memberId);
  if (!member || member.trainerId?.toString() !== session.user.id) return null;

  const repo = new MongoWorkoutSessionRepository();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [completedDates, exercises] = await Promise.all([
    repo.findCompletedDates(memberId, since),
    repo.findTrainedExercises(memberId),
  ]);

  const heatmapData = completedDates.map((d) => ({
    date: d.toISOString().split('T')[0],
  }));

  return (
    <ProgressClient
      heatmapData={heatmapData}
      exercises={exercises}
      memberId={memberId}
      title={`${member.name}'s Progress`}
    />
  );
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No warnings or errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/progress/page.tsx
git commit -m "feat: add trainer member progress page"
```

---

## Task 6: Navigation Updates

**Files:**
- Modify: `src/components/shared/app-shell.tsx`
- Modify: `src/app/(dashboard)/trainer/members/page.tsx`

- [ ] **Step 1: Add My Progress to member nav in app-shell**

Open `src/components/shared/app-shell.tsx`. Find the `member` TRAINING group in the `NAV` constant:

```typescript
  member: [
    {
      group: 'TRAINING',
      items: [
        { href: '/member/plan', label: 'My Plan' },
        { href: '/member/pbs', label: 'Personal Bests' },
        { href: '/member/schedule', label: 'My Schedule' },
      ],
    },
```

Change it to:

```typescript
  member: [
    {
      group: 'TRAINING',
      items: [
        { href: '/member/plan', label: 'My Plan' },
        { href: '/member/pbs', label: 'Personal Bests' },
        { href: '/member/progress', label: 'My Progress' },
        { href: '/member/schedule', label: 'My Schedule' },
      ],
    },
```

- [ ] **Step 2: Add Progress link to trainer members list**

Open `src/app/(dashboard)/trainer/members/page.tsx`. Find the links div inside the member card:

```typescript
                <div className="flex items-center gap-4 pt-3 border-t border-[#141414] sm:pt-0 sm:border-0">
                  <Link
                    href={`/trainer/members/${member._id}/plan`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Plan →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/body-tests`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Body Tests →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/nutrition`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Nutrition →
                  </Link>
                </div>
```

Change it to:

```typescript
                <div className="flex items-center gap-4 pt-3 border-t border-[#141414] sm:pt-0 sm:border-0">
                  <Link
                    href={`/trainer/members/${member._id}/plan`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Plan →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/body-tests`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Body Tests →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/nutrition`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Nutrition →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/progress`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Progress →
                  </Link>
                </div>
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No warnings or errors.

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/app-shell.tsx src/app/\(dashboard\)/trainer/members/page.tsx
git commit -m "feat: add My Progress nav entry and Progress link on trainer member cards"
```

---

## Task 7: E2E Tests

**Files:**
- Modify: `e2e/seed.ts` (verify existing WorkoutSession has completedAt set — it already does)
- Create: `e2e/member/progress.spec.ts`
- Modify: `e2e/trainer/members.spec.ts`

**Context on existing seed:** The seed already creates a `WorkoutSession` for Test Member with `completedAt: now` and a Bench Press set with `actualWeight: 60, actualReps: 8, completedAt: now`. This is sufficient for both the heatmap (one coloured cell today) and the exercise list (Bench Press appears). No seed changes needed.

- [ ] **Step 1: Create member progress E2E spec**

Create `e2e/member/progress.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Member: Progress', () => {
  test('heatmap is visible on the progress page', async ({ page }) => {
    await page.goto('/member/progress');
    await expect(page.getByRole('heading', { name: 'My Progress' })).toBeVisible();
    // Heatmap cells are rendered as divs — look for the section header
    await expect(page.getByText('Training Frequency')).toBeVisible();
  });

  test('exercise dropdown shows Bench Press and chart renders on selection', async ({ page }) => {
    await page.goto('/member/progress');
    await expect(page.getByText('Strength Progress')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await page.selectOption('select', { label: 'Bench Press' });
    // Chart container appears (ResponsiveContainer renders inside a div)
    await expect(page.locator('.recharts-responsive-container')).toBeVisible();
  });
});
```

- [ ] **Step 2: Add trainer progress case to trainer members spec**

Open `e2e/trainer/members.spec.ts`. Add at the end:

```typescript
  test('trainer navigates to member progress page and sees heatmap', async ({ page }) => {
    await page.goto('/trainer/members');
    await page.getByRole('link', { name: 'Progress →' }).click();
    await page.waitForURL(/\/trainer\/members\/.+\/progress/);
    await expect(page.getByText('Training Frequency')).toBeVisible();
  });
```

- [ ] **Step 3: Run existing Jest tests to make sure nothing is broken**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/member/progress.spec.ts e2e/trainer/members.spec.ts
git commit -m "test: add E2E specs for member and trainer progress pages"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Covered by |
|----------------|------------|
| `findCompletedDates` repository method | Task 1 |
| `findTrainedExercises` repository method | Task 1 |
| `findExerciseHistory` (Epley max per session, sorted ascending) | Task 1 |
| `GET /api/progress/[memberId]?exerciseId=` | Task 2 |
| 401 unauthenticated | Task 2 test |
| 403 member accessing other member | Task 2 test |
| 403 trainer accessing non-owned member | Task 2 test |
| 400 missing exerciseId | Task 2 test |
| 404 member not found (trainer path) | Task 2 test |
| 200 success with date as YYYY-MM-DD | Task 2 test |
| Owner allowed for any member | Task 2 test |
| `ProgressClient` component (heatmap + selector + chart) | Task 3 |
| 13×7 heatmap grid, last 91 days, blue for active | Task 3 |
| Month labels above columns on month change | Task 3 |
| Exercise select default to first exercise | Task 3 |
| Empty state when no exercise history | Task 3 |
| Opacity dimming during fetch | Task 3 |
| Member progress page at `/member/progress` | Task 4 |
| Trainer member progress page | Task 5 |
| Trainer auth: member.trainerId check | Task 5 |
| `My Progress` nav entry in member TRAINING group | Task 6 |
| `Progress →` link on trainer member cards | Task 6 |
| E2E: member heatmap visible | Task 7 |
| E2E: Bench Press chart appears | Task 7 |
| E2E: trainer sees heatmap via Progress link | Task 7 |

### Placeholder scan

No TBDs, TODOs, or vague steps found.

### Type consistency

- `findCompletedDates` returns `Promise<Date[]>` — used as `Date[]` in page, mapped to ISO string — consistent.
- `findTrainedExercises` returns `{ exerciseId: string; exerciseName: string }[]` — prop type in `ProgressClient` matches.
- `findExerciseHistory` returns `{ date: Date; estimatedOneRM: number }[]` — API route maps `date` to `toISOString().split('T')[0]`, consistent with test expectation `'2026-03-01'`.
- `ProgressClientProps.heatmapData: { date: string }[]` — page passes `{ date: d.toISOString().split('T')[0] }[]` — consistent.
- API response `{ history: { date: string; estimatedOneRM: number }[] }` — `HistoryPoint` interface in `ProgressClient` matches.
