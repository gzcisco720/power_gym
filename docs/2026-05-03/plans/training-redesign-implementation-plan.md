# Training Module Redesign (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely redesign the Training UI — plan overview, session logger, and template builder — to match the design spec at `docs/2026-05-03/plans/training-redesign-design.md`.

**Architecture:** Pure UI layer change; all data models are unchanged. Shared atomic components (`ExerciseThumbnail`, `ExerciseBadge`, `ExerciseSearchSheet`) are built first, then the three main views (overview, logger, builder) are rewritten in order. Two API fixes are needed: remove the `role !== 'member'` guard on `POST /api/sessions` and extend `POST /api/sessions/[id]/sets` to accept brand-new exercises.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, shadcn/ui, Mongoose, TypeScript strict mode, Jest + React Testing Library.

---

## File Map

### New files
| File | Responsibility |
|------|----------------|
| `src/lib/training/label-exercises.ts` | Pure fn: assign A/B/C labels to standalone exercises and D1/D2 prefix labels to superset groups |
| `src/components/training/exercise-thumbnail.tsx` | Image if `imageUrl`, else dark placeholder with dumbbell icon |
| `src/components/training/exercise-badge.tsx` | Small label chip (A, D1, etc.) |
| `src/components/training/exercise-search-sheet.tsx` | Sheet with text search, exercise list, create-new form |
| `src/app/(dashboard)/trainer/my-plan/page.tsx` | Trainer personal plan overview page |
| `src/app/(dashboard)/trainer/my-plan/session/new/page.tsx` | Create session + redirect |
| `src/app/(dashboard)/trainer/my-plan/session/[id]/page.tsx` | Session logger page |

### Modified files
| File | Change |
|------|--------|
| `src/app/api/sessions/route.ts` | Remove `role !== 'member'` guard |
| `src/app/api/sessions/[id]/sets/route.ts` | Accept new exercises (not just existing ones) |
| `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` | Full rewrite: tabs + exercise cards + sticky button |
| `src/app/(dashboard)/member/plan/page.tsx` | Update Plan type passed to overview |
| `src/app/(dashboard)/member/plan/session/new/page.tsx` | Remove confirmation UI; create session immediately + redirect |
| `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx` | Full rewrite: timer, BW toggle, inline set rows, sticky complete button |
| `src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx` | Full rewrite: exercise search, superset grouping, reordering |
| `src/app/(dashboard)/trainer/plans/new/page.tsx` | Convert to server component; fetch exercises |
| `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx` | Convert to server component; fetch template + exercises |
| `src/app/(dashboard)/owner/plans/new/page.tsx` | Convert to server component; fetch exercises |
| `src/app/(dashboard)/owner/plans/[id]/edit/page.tsx` | Convert to server component; fetch template + exercises |
| `src/components/shared/app-shell.tsx` | Add "My Plan" + "Personal Bests" to trainer TRAINING group |

### Test files
| File | What it tests |
|------|---------------|
| `__tests__/lib/training/label-exercises.test.ts` | labelExercises pure function |
| `__tests__/components/training/exercise-badge.test.tsx` | ExerciseBadge renders correct label |
| `__tests__/components/training/exercise-thumbnail.test.tsx` | Shows image or placeholder |

---

## Task 1: `labelExercises` utility

**Files:**
- Create: `src/lib/training/label-exercises.ts`
- Create: `__tests__/lib/training/label-exercises.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/training/label-exercises.test.ts
import { labelExercises } from '@/lib/training/label-exercises';

const ex = (exerciseId: string, groupId: string, isSuperset: boolean) => ({
  groupId,
  isSuperset,
  exerciseId,
  exerciseName: exerciseId,
  imageUrl: null,
  isBodyweight: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: null,
});

describe('labelExercises', () => {
  it('labels standalone exercises A, B, C in order', () => {
    const result = labelExercises([
      ex('e1', 'g1', false),
      ex('e2', 'g2', false),
      ex('e3', 'g3', false),
    ]);
    expect(result.map((r) => r.label)).toEqual(['A', 'B', 'C']);
  });

  it('labels superset group exercises with shared letter prefix and numeric suffix', () => {
    const result = labelExercises([
      ex('e1', 'g1', false),
      ex('e2', 'grp', true),
      ex('e3', 'grp', true),
      ex('e4', 'g4', false),
    ]);
    expect(result.map((r) => r.label)).toEqual(['A', 'B1', 'B2', 'C']);
  });

  it('handles multiple superset groups', () => {
    const result = labelExercises([
      ex('e1', 'ga', true),
      ex('e2', 'ga', true),
      ex('e3', 'gb', true),
      ex('e4', 'gb', true),
    ]);
    expect(result.map((r) => r.label)).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('returns empty array for empty input', () => {
    expect(labelExercises([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/eric_gong/Desktop/power_gym
pnpm test -- --testPathPattern=label-exercises -t '' 2>&1 | tail -20
```
Expected: FAIL — `labelExercises` not found.

- [ ] **Step 3: Implement `labelExercises`**

```typescript
// src/lib/training/label-exercises.ts
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface ExerciseIn {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export type LabelledExercise = ExerciseIn & { label: string };

export function labelExercises(exercises: ExerciseIn[]): LabelledExercise[] {
  let letterIdx = 0;
  const groupLabels = new Map<string, string>();
  const groupCounters = new Map<string, number>();

  return exercises.map((ex) => {
    if (!ex.isSuperset) {
      const label = LETTERS[letterIdx++] ?? `EX${letterIdx}`;
      return { ...ex, label };
    }
    if (!groupLabels.has(ex.groupId)) {
      groupLabels.set(ex.groupId, LETTERS[letterIdx++] ?? `EX${letterIdx}`);
      groupCounters.set(ex.groupId, 1);
    }
    const prefix = groupLabels.get(ex.groupId)!;
    const num = groupCounters.get(ex.groupId)!;
    groupCounters.set(ex.groupId, num + 1);
    return { ...ex, label: `${prefix}${num}` };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=label-exercises 2>&1 | tail -10
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/training/label-exercises.ts __tests__/lib/training/label-exercises.test.ts
git commit -m "feat: add labelExercises utility for training exercise badge labels"
```

---

## Task 2: `ExerciseThumbnail` component

**Files:**
- Create: `src/components/training/exercise-thumbnail.tsx`
- Create: `__tests__/components/training/exercise-thumbnail.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/components/training/exercise-thumbnail.test.tsx
import { render, screen } from '@testing-library/react';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';

describe('ExerciseThumbnail', () => {
  it('renders an img tag when imageUrl is provided', () => {
    render(<ExerciseThumbnail imageUrl="https://example.com/img.jpg" name="Squat" size={40} />);
    const img = screen.getByRole('img', { name: 'Squat' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('renders a placeholder when imageUrl is null', () => {
    render(<ExerciseThumbnail imageUrl={null} name="Squat" size={40} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(document.querySelector('[data-testid="thumbnail-placeholder"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=exercise-thumbnail 2>&1 | tail -10
```

- [ ] **Step 3: Implement component**

```tsx
// src/components/training/exercise-thumbnail.tsx
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  imageUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function ExerciseThumbnail({ imageUrl, name, size = 40, className }: Props) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-md object-cover shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      data-testid="thumbnail-placeholder"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-[#161616]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Dumbbell className="text-[#444]" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=exercise-thumbnail 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/exercise-thumbnail.tsx __tests__/components/training/exercise-thumbnail.test.tsx
git commit -m "feat: add ExerciseThumbnail component with imageUrl/placeholder support"
```

---

## Task 3: `ExerciseBadge` component

**Files:**
- Create: `src/components/training/exercise-badge.tsx`
- Create: `__tests__/components/training/exercise-badge.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/components/training/exercise-badge.test.tsx
import { render, screen } from '@testing-library/react';
import { ExerciseBadge } from '@/components/training/exercise-badge';

describe('ExerciseBadge', () => {
  it('renders the label text', () => {
    render(<ExerciseBadge label="A" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders superset label with number suffix', () => {
    render(<ExerciseBadge label="D1" />);
    expect(screen.getByText('D1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=exercise-badge 2>&1 | tail -10
```

- [ ] **Step 3: Implement component**

```tsx
// src/components/training/exercise-badge.tsx
interface Props {
  label: string;
}

export function ExerciseBadge({ label }: Props) {
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-[#1e1e1e] px-1.5 text-[9px] font-bold tracking-wider text-[#888] shrink-0">
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=exercise-badge 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/training/exercise-badge.tsx __tests__/components/training/exercise-badge.test.tsx
git commit -m "feat: add ExerciseBadge component for training exercise labels"
```

---

## Task 4: Fix `POST /api/sessions` role restriction

**Files:**
- Modify: `src/app/api/sessions/route.ts`

The current guard `if (role !== 'member') return 403` prevents owners and trainers from logging their own personal workouts. Remove it — the ownership check is handled downstream (the session is created with `memberId: session.user.id`, and the plan lookup also uses the session's own user ID).

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/app/api/sessions/role-fix.test.ts
import { POST } from '@/app/api/sessions/route';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

jest.mock('@/lib/auth/auth');
jest.mock('@/lib/db/connect');
jest.mock('@/lib/repositories/member-plan.repository');
jest.mock('@/lib/repositories/workout-session.repository');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;

describe('POST /api/sessions role fix', () => {
  beforeEach(() => {
    mockConnectDB.mockResolvedValue(undefined as never);
    (MongoMemberPlanRepository.prototype.findActive as jest.Mock).mockResolvedValue(null);
    (MongoWorkoutSessionRepository.prototype.create as jest.Mock).mockResolvedValue({ _id: 'sess1' });
  });

  it('allows owner to create a session (no longer returns 403)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'owner1', role: 'owner' },
    } as never);
    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ memberPlanId: 'plan1', dayNumber: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).not.toBe(403);
  });

  it('allows trainer to create a session (no longer returns 403)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'trainer1', role: 'trainer' },
    } as never);
    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ memberPlanId: 'plan1', dayNumber: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).not.toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=role-fix 2>&1 | tail -15
```
Expected: FAIL — both tests get 403.

- [ ] **Step 3: Remove the role guard**

Open `src/app/api/sessions/route.ts` and delete lines:
```typescript
const role = session.user.role as UserRole;
if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
```

The file should look like:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = (await req.json()) as { memberPlanId: string; dayNumber: number };

  const memberPlanRepo = new MongoMemberPlanRepository();
  const plan = await memberPlanRepo.findActive(session.user.id);
  if (!plan) return Response.json({ error: 'No active plan' }, { status: 404 });

  const day = plan.days.find((d) => d.dayNumber === body.dayNumber);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

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

  const sessionRepo = new MongoWorkoutSessionRepository();
  const workoutSession = await sessionRepo.create({
    memberId: session.user.id,
    memberPlanId: body.memberPlanId,
    dayNumber: body.dayNumber,
    dayName: day.name,
    startedAt: new Date(),
    sets,
  });

  return Response.json(workoutSession, { status: 201 });
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  const role = session.user.role;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const sessions = await sessionRepo.findByMember(memberId);
  return Response.json(sessions);
}
```

- [ ] **Step 4: Run test + full suite**

```bash
pnpm test -- --testPathPattern=role-fix 2>&1 | tail -10
pnpm test 2>&1 | tail -15
```
Expected: role-fix tests PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sessions/route.ts __tests__/app/api/sessions/role-fix.test.ts
git commit -m "fix: allow owner/trainer to create workout sessions for their own plans"
```

---

## Task 5: Extend `POST /api/sessions/[id]/sets` to handle new exercises

**Files:**
- Modify: `src/app/api/sessions/[id]/sets/route.ts`

Currently returns 404 if the exerciseId isn't already in the session. The `+ Add Exercise` feature in the session logger sends a new exerciseId. We need to handle this case by using `body.exerciseName` to create the first set.

- [ ] **Step 1: Update the API**

The body now optionally accepts `exerciseName` for new exercises:

```typescript
// src/app/api/sessions/[id]/sets/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);
  if (!workoutSession) return Response.json({ error: 'Not found' }, { status: 404 });

  if (workoutSession.memberId.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (workoutSession.completedAt) {
    return Response.json({ error: 'Session already completed' }, { status: 409 });
  }

  const body = (await req.json()) as {
    exerciseId: string;
    exerciseName?: string;
    prescribedRepsMin: number;
    prescribedRepsMax: number;
  };

  const exerciseOId = new mongoose.Types.ObjectId(body.exerciseId);
  const existingSets = workoutSession.sets.filter(
    (s) => s.exerciseId.toString() === body.exerciseId,
  );

  let extraSet;
  if (existingSets.length === 0) {
    // Brand new exercise added during session
    if (!body.exerciseName) {
      return Response.json({ error: 'exerciseName required for new exercise' }, { status: 400 });
    }
    extraSet = {
      exerciseId: exerciseOId,
      exerciseName: body.exerciseName,
      groupId: body.exerciseId, // standalone: use exerciseId as its own groupId
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: body.prescribedRepsMin,
      prescribedRepsMax: body.prescribedRepsMax,
      isExtraSet: true,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
  } else {
    const ref = existingSets[0];
    const nextSetNumber = Math.max(...existingSets.map((s) => s.setNumber)) + 1;
    extraSet = {
      exerciseId: exerciseOId,
      exerciseName: ref.exerciseName,
      groupId: ref.groupId,
      isSuperset: ref.isSuperset,
      isBodyweight: ref.isBodyweight,
      setNumber: nextSetNumber,
      prescribedRepsMin: body.prescribedRepsMin,
      prescribedRepsMax: body.prescribedRepsMax,
      isExtraSet: true,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
  }

  const updated = await repo.addExtraSet(id, extraSet);
  return Response.json(updated, { status: 201 });
}
```

- [ ] **Step 2: Run lint + tests**

```bash
pnpm lint src/app/api/sessions/[id]/sets/route.ts 2>&1 | tail -5
pnpm test 2>&1 | tail -10
```
Expected: no lint errors; all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sessions/[id]/sets/route.ts
git commit -m "feat: extend session sets API to accept new exercises added mid-session"
```

---

## Task 6: `ExerciseSearchSheet` component

**Files:**
- Create: `src/components/training/exercise-search-sheet.tsx`

This is a shared sheet used in both the session logger (add exercise mid-session) and the plan template builder (add exercise to a day). It:
1. Displays a text search input
2. Filters exercises from the provided list
3. Shows each result: thumbnail + name + muscle group
4. "Create exercise" form at the bottom: name + imageUrl + muscle group + isBodyweight toggle
5. Calls `onSelect(exercise)` when an exercise is picked
6. Calls `onCreated(exercise)` when a new exercise is created (optimistic)

```tsx
// src/components/training/exercise-search-sheet.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExerciseThumbnail } from './exercise-thumbnail';

export interface ExerciseOption {
  _id: string;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  isBodyweight: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: ExerciseOption[];
  onSelect: (exercise: ExerciseOption) => void;
  onCreated: (exercise: ExerciseOption) => void;
}

export function ExerciseSearchSheet({ open, onOpenChange, exercises, onSelect, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newBW, setNewBW] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  );

  async function createExercise() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          imageUrl: newImageUrl.trim() || null,
          muscleGroup: newMuscle.trim() || null,
          isBodyweight: newBW,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        toast.error(body.error ?? 'Failed to create exercise');
        return;
      }
      const created = (await res.json()) as ExerciseOption;
      onCreated(created);
      setNewName('');
      setNewImageUrl('');
      setNewMuscle('');
      setNewBW(false);
      setCreating(false);
      onSelect(created);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#0f0f0f] border-t border-[#1e1e1e] rounded-t-xl px-4 pb-8 pt-4 h-[80vh] overflow-y-auto">
        <SheetTitle className="text-[13px] font-semibold text-white mb-3">Select Exercise</SheetTitle>

        <Input
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3 bg-[#141414] border-[#1e1e1e] text-white placeholder:text-[#555]"
          autoFocus
        />

        <div className="space-y-1 mb-4">
          {filtered.length === 0 && (
            <p className="text-[12px] text-[#555] py-2">No exercises found.</p>
          )}
          {filtered.map((ex) => (
            <button
              key={ex._id}
              onClick={() => { onSelect(ex); onOpenChange(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#1a1a1a] transition-colors text-left"
            >
              <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.name} size={36} />
              <div>
                <div className="text-[12px] font-medium text-white">{ex.name}</div>
                {ex.muscleGroup && (
                  <div className="text-[10px] text-[#555]">{ex.muscleGroup}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {!creating ? (
          <Button
            variant="ghost"
            onClick={() => setCreating(true)}
            className="w-full border border-[#1a1a1a] text-[#666] hover:border-[#333] hover:text-[#aaa] text-[11px]"
          >
            + Create new exercise
          </Button>
        ) : (
          <div className="space-y-2 border border-[#1e1e1e] rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666] mb-2">New Exercise</div>
            <Input
              placeholder="Name (required)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555] text-[12px]"
            />
            <Input
              placeholder="Image URL (optional)"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555] text-[12px]"
            />
            <Input
              placeholder="Muscle group (optional)"
              value={newMuscle}
              onChange={(e) => setNewMuscle(e.target.value)}
              className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#555] text-[12px]"
            />
            <label className="flex items-center gap-2 text-[12px] text-[#888] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newBW}
                onChange={(e) => setNewBW(e.target.checked)}
                className="accent-white"
              />
              Bodyweight exercise
            </label>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={createExercise}
                disabled={saving || !newName.trim()}
                className="flex-1 bg-white text-black hover:bg-white/90 text-[11px] font-semibold disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCreating(false)}
                className="text-[#666] text-[11px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 1: Create the file** (code above)

- [ ] **Step 2: Check lint**

```bash
pnpm lint src/components/training/exercise-search-sheet.tsx 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/training/exercise-search-sheet.tsx
git commit -m "feat: add ExerciseSearchSheet component with search + create-exercise form"
```

---

## Task 7: Plan Overview redesign (A1)

**Files:**
- Modify: `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`
- Modify: `src/app/(dashboard)/member/plan/page.tsx`
- Modify: `src/app/(dashboard)/member/plan/session/new/page.tsx`

The overview shows: plan name header → horizontal day tab strip → exercise list for selected day (standalone cards + superset blocks) → sticky "Log This Workout" button.

The `session/new` page is converted to a purely mechanical redirect (no confirmation UI). The sticky button on the overview links to `{sessionBasePath}/session/new?day={dayNumber}` which auto-creates the session.

### 7a: Update `plan-overview.tsx`

- [ ] **Step 1: Rewrite `plan-overview.tsx`**

```tsx
// src/app/(dashboard)/member/plan/_components/plan-overview.tsx
'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';
import { ExerciseBadge } from '@/components/training/exercise-badge';
import { labelExercises } from '@/lib/training/label-exercises';
import { cn } from '@/lib/utils';

interface PlanDayExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: PlanDayExercise[];
}

interface Plan {
  _id: string;
  name: string;
  days: PlanDay[];
}

interface Props {
  plan: Plan | null;
  sessionBasePath?: string;
}

export function PlanOverview({ plan, sessionBasePath = '/member/plan' }: Props) {
  const [activeDay, setActiveDay] = useState<number>(plan?.days[0]?.dayNumber ?? 1);

  if (!plan) {
    return (
      <div className="px-4 sm:px-8 py-28">
        <EmptyState
          heading="No plan assigned"
          description="Your trainer hasn't assigned a training plan yet. Check back soon."
        />
      </div>
    );
  }

  const currentDay = plan.days.find((d) => d.dayNumber === activeDay) ?? plan.days[0];
  const labelled = labelExercises(currentDay?.exercises ?? []);

  // Group labelled exercises: collect superset groups and standalone exercises in order
  const groups: { type: 'standalone'; exercise: (typeof labelled)[number] } | { type: 'superset'; groupId: string; exercises: (typeof labelled)[number][] }[] = [];
  // Rebuild as array with correct typing
  type StandaloneGroup = { type: 'standalone'; exercise: (typeof labelled)[number] };
  type SupersetGroup = { type: 'superset'; groupId: string; exercises: (typeof labelled)[number][] };
  type ExerciseGroup = StandaloneGroup | SupersetGroup;

  const exerciseGroups: ExerciseGroup[] = [];
  const seenGroupIds = new Set<string>();

  for (const ex of labelled) {
    if (!ex.isSuperset) {
      exerciseGroups.push({ type: 'standalone', exercise: ex });
    } else {
      if (!seenGroupIds.has(ex.groupId)) {
        seenGroupIds.add(ex.groupId);
        const groupExercises = labelled.filter((e) => e.groupId === ex.groupId && e.isSuperset);
        exerciseGroups.push({ type: 'superset', groupId: ex.groupId, exercises: groupExercises });
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Plan name header */}
      <div className="px-4 sm:px-8 pt-6 pb-3 border-b border-[#0f0f0f]">
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#555] mb-0.5">Training Plan</div>
        <div className="text-[18px] font-bold text-white">{plan.name}</div>
      </div>

      {/* Day tab strip */}
      <div className="border-b border-[#0f0f0f] overflow-x-auto scrollbar-none">
        <div className="flex min-w-max px-4 sm:px-8">
          {plan.days.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setActiveDay(day.dayNumber)}
              className={cn(
                'flex flex-col items-start py-3 pr-6 text-left shrink-0 border-b-2 transition-colors',
                activeDay === day.dayNumber
                  ? 'border-white text-white'
                  : 'border-transparent text-[#555] hover:text-[#888]',
              )}
            >
              <span className="text-[9px] font-semibold uppercase tracking-[1.5px]">
                Day {day.dayNumber}
              </span>
              <span className="text-[12px] font-medium mt-0.5">{day.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 pb-24 space-y-3">
        {exerciseGroups.length === 0 && (
          <p className="text-[12px] text-[#555]">No exercises in this day.</p>
        )}

        {exerciseGroups.map((group, i) => {
          if (group.type === 'standalone') {
            const ex = group.exercise;
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-[#0c0c0c] border border-[#141414] p-3">
                <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.exerciseName} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ExerciseBadge label={ex.label} />
                    <span className="text-[13px] font-semibold text-white truncate">{ex.exerciseName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">Sets: {ex.sets}</span>
                    <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">
                      {ex.repsMin === ex.repsMax ? `${ex.repsMin} reps` : `${ex.repsMin}–${ex.repsMax} reps`}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Superset group
          return (
            <div key={i} className="rounded-xl border border-[#2a2a2a] overflow-hidden">
              <div className="flex justify-center py-1.5 bg-[#111]">
                <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#666]">Superset</span>
              </div>
              {group.exercises.map((ex, j) => (
                <div key={ex.exerciseId}>
                  {j > 0 && <div className="h-px bg-[#141414]" />}
                  <div className="flex items-center gap-3 bg-[#0c0c0c] p-3">
                    <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.exerciseName} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ExerciseBadge label={ex.label} />
                        <span className="text-[12px] font-semibold text-white truncate">{ex.exerciseName}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">Sets: {ex.sets}</span>
                        <span className="text-[10px] text-[#555] bg-[#141414] rounded px-2 py-0.5">
                          {ex.repsMin === ex.repsMax ? `${ex.repsMin} reps` : `${ex.repsMin}–${ex.repsMax} reps`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-[#0f0f0f] bg-[#050505] px-4 sm:px-8 py-3">
        <a
          href={`${sessionBasePath}/session/new?day=${activeDay}`}
          className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-black hover:bg-white/90 transition-colors"
        >
          Log This Workout
        </a>
      </div>
    </div>
  );
}
```

### 7b: Update `plan/page.tsx` type alias (no functional change needed — `JSON.parse(JSON.stringify(plan))` already passes all fields)

The existing `repo.findActive()` returns a document with all `IPlanDayExercise` fields. The current `PlanOverview` interface only accepted `{ exerciseName: string }[]`, but now accepts the full shape. No change to `plan/page.tsx` is needed.

### 7c: Update `session/new/page.tsx` to auto-create and redirect

Remove the confirmation UI. The server component creates the session immediately on page load:

```tsx
// src/app/(dashboard)/member/plan/session/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export default async function SessionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { day } = await searchParams;
  const dayNumber = parseInt(day ?? '1', 10);

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);
  if (!plan) redirect('/member/plan');

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect('/member/plan');

  const cookieStore = await cookies();
  const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ memberPlanId: plan._id.toString(), dayNumber }),
  });

  if (res.ok) {
    const data = (await res.json()) as { _id: string };
    redirect(`/member/plan/session/${data._id}`);
  }

  redirect('/member/plan');
}
```

- [ ] **Step 1: Apply all three file changes** (plan-overview.tsx, session/new/page.tsx)

- [ ] **Step 2: Check lint**

```bash
pnpm lint src/app/\(dashboard\)/member/plan/ 2>&1 | tail -10
```

- [ ] **Step 3: Run tests**

```bash
pnpm test 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/member/plan/
git commit -m "feat: redesign plan overview with day tabs, exercise cards, and superset blocks"
```

---

## Task 8: Session Logger redesign (A2)

**Files:**
- Modify: `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx`

Key changes from the current implementation:
1. **Live elapsed timer** — `useEffect` with `setInterval(1000)` counting up from `session.startedAt`
2. **Inline set rows** — weight + reps + ✓ button in one horizontal row (no click-to-expand)
3. **BW toggle per exercise** — local state map `Map<exerciseId, boolean>` initialized from `isBodyweight`; when toggled, weight input greyed and non-editable (weight saved as null)
4. **Completed rows** — filled ✓ icon + muted text, no inputs shown
5. **"+ Add Exercise"** — opens `ExerciseSearchSheet`; selected exercise POSTed to `/api/sessions/[id]/sets` with `exerciseName` + default reps
6. **"Complete Workout"** sticky button — always visible (not gated on allDone)
7. **Superset rendering** — exercises with same `groupId` + `isSuperset=true` rendered in a single bordered card

```tsx
// src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';
import { ExerciseBadge } from '@/components/training/exercise-badge';
import { ExerciseSearchSheet, type ExerciseOption } from '@/components/training/exercise-search-sheet';
import { labelExercises } from '@/lib/training/label-exercises';
import { cn } from '@/lib/utils';

interface SessionSet {
  exerciseId: string;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  isExtraSet: boolean;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

interface Session {
  _id: string;
  memberId: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  sets: SessionSet[];
}

function useElapsedTimer(startedAt: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function buildExerciseGroups(sets: SessionSet[]) {
  // Collect unique exercises in first-seen order
  const seen = new Set<string>();
  const uniqueExercises: { exerciseId: string; exerciseName: string; imageUrl: null; isBodyweight: boolean; isSuperset: boolean; groupId: string; sets: number; repsMin: number; repsMax: number; restSeconds: null }[] = [];
  sets.forEach((s) => {
    if (!seen.has(s.exerciseId)) {
      seen.add(s.exerciseId);
      // Derive sets count from actual set rows for this exercise (max setNumber)
      const exSets = sets.filter((x) => x.exerciseId === s.exerciseId);
      const maxSet = Math.max(...exSets.map((x) => x.setNumber));
      uniqueExercises.push({
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName,
        imageUrl: null,
        isBodyweight: s.isBodyweight,
        isSuperset: s.isSuperset,
        groupId: s.groupId,
        sets: maxSet,
        repsMin: s.prescribedRepsMin,
        repsMax: s.prescribedRepsMax,
        restSeconds: null,
      });
    }
  });

  const labelled = labelExercises(uniqueExercises);

  type StandaloneGroup = { type: 'standalone'; exercise: (typeof labelled)[number]; sets: (SessionSet & { globalIndex: number })[] };
  type SupersetGroup = { type: 'superset'; groupId: string; exercises: { exercise: (typeof labelled)[number]; sets: (SessionSet & { globalIndex: number })[] }[] };
  type Group = StandaloneGroup | SupersetGroup;

  const groups: Group[] = [];
  const seenGroupIds = new Set<string>();
  const setsWithIndex = sets.map((s, i) => ({ ...s, globalIndex: i }));

  for (const ex of labelled) {
    const exSets = setsWithIndex.filter((s) => s.exerciseId === ex.exerciseId);
    if (!ex.isSuperset) {
      groups.push({ type: 'standalone', exercise: ex, sets: exSets });
    } else {
      if (!seenGroupIds.has(ex.groupId)) {
        seenGroupIds.add(ex.groupId);
        const groupExercises = labelled
          .filter((e) => e.groupId === ex.groupId && e.isSuperset)
          .map((e) => ({
            exercise: e,
            sets: setsWithIndex.filter((s) => s.exerciseId === e.exerciseId),
          }));
        groups.push({ type: 'superset', groupId: ex.groupId, exercises: groupExercises });
      }
    }
  }

  return groups;
}

export function SessionLogger({ session: initialSession, backPath = '/member/plan' }: { session: Session; backPath?: string }) {
  const router = useRouter();
  const elapsed = useElapsedTimer(initialSession.startedAt);
  const [session, setSession] = useState(initialSession);
  const [inputs, setInputs] = useState<{ weight: string; reps: string }[]>(
    initialSession.sets.map(() => ({ weight: '', reps: '' })),
  );
  const [bwOverrides, setBwOverrides] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialSession.sets.forEach((s) => { map[s.exerciseId] = s.isBodyweight; });
    return map;
  });
  const [completing, setCompleting] = useState(false);
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const exercisesFetchedRef = useRef(false);

  useEffect(() => {
    if (exercisesFetchedRef.current) return;
    fetch('/api/exercises')
      .then((r) => r.json())
      .then((data: ExerciseOption[]) => setAvailableExercises(data))
      .catch(() => {});
    exercisesFetchedRef.current = true;
  }, []);

  function updateInput(index: number, field: 'weight' | 'reps', value: string) {
    setInputs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function logSet(setIndex: number) {
    const input = inputs[setIndex];
    const set = session.sets[setIndex];
    const isBodyweight = bwOverrides[set.exerciseId] ?? set.isBodyweight;
    try {
      const res = await fetch(`/api/sessions/${session._id}/sets/${setIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualWeight: isBodyweight ? null : parseFloat(input.weight) || null,
          actualReps: parseInt(input.reps, 10) || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to log set');
        return;
      }
      const updated = (await res.json()) as Session;
      setSession(updated);
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function addSet(exerciseId: string) {
    const exercise = session.sets.find((s) => s.exerciseId === exerciseId);
    if (!exercise) return;
    try {
      const res = await fetch(`/api/sessions/${session._id}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          prescribedRepsMin: exercise.prescribedRepsMin,
          prescribedRepsMax: exercise.prescribedRepsMax,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to add set');
        return;
      }
      const updated = (await res.json()) as Session;
      setSession(updated);
      setInputs((prev) => [...prev, { weight: '', reps: '' }]);
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function addExercise(exercise: ExerciseOption) {
    try {
      const res = await fetch(`/api/sessions/${session._id}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercise._id,
          exerciseName: exercise.name,
          prescribedRepsMin: 8,
          prescribedRepsMax: 12,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to add exercise');
        return;
      }
      const updated = (await res.json()) as Session;
      setSession(updated);
      setInputs((prev) => [...prev, { weight: '', reps: '' }]);
      setBwOverrides((prev) => ({ ...prev, [exercise._id]: exercise.isBodyweight }));
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function completeSession() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/sessions/${session._id}/complete`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to complete session');
        setCompleting(false);
        return;
      }
      toast.success('Workout complete!');
      router.push(backPath);
    } catch {
      toast.error('Something went wrong');
      setCompleting(false);
    }
  }

  const groups = buildExerciseGroups(session.sets);

  function renderExerciseCard(
    exercise: { exerciseId: string; exerciseName: string; isBodyweight: boolean; label: string; imageUrl: null; isSuperset: boolean; groupId: string; sets: number; repsMin: number; repsMax: number; restSeconds: null },
    exSets: (SessionSet & { globalIndex: number })[],
  ) {
    const isBodyweight = bwOverrides[exercise.exerciseId] ?? exercise.isBodyweight;
    const firstSet = exSets[0];
    const repsLabel = firstSet
      ? firstSet.prescribedRepsMin === firstSet.prescribedRepsMax
        ? `${firstSet.prescribedRepsMin} reps`
        : `${firstSet.prescribedRepsMin}–${firstSet.prescribedRepsMax} reps`
      : '';

    return (
      <div key={exercise.exerciseId}>
        {/* Exercise header row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <ExerciseThumbnail imageUrl={exercise.imageUrl} name={exercise.exerciseName} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ExerciseBadge label={exercise.label} />
              <span className="text-[13px] font-semibold text-white truncate">{exercise.exerciseName}</span>
            </div>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[9px] text-[#555] bg-[#141414] rounded px-1.5 py-0.5">
                Sets: {Math.max(...exSets.map((s) => s.setNumber))}
              </span>
              <span className="text-[9px] text-[#555] bg-[#141414] rounded px-1.5 py-0.5">{repsLabel}</span>
            </div>
          </div>
          {/* BW toggle */}
          <label className="flex items-center gap-1.5 text-[10px] text-[#666] cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={isBodyweight}
              onChange={(e) => setBwOverrides((prev) => ({ ...prev, [exercise.exerciseId]: e.target.checked }))}
              className="accent-white"
            />
            BW
          </label>
        </div>

        {/* Set rows */}
        <div className="space-y-1.5">
          {exSets.map(({ globalIndex, setNumber, completedAt, actualWeight, actualReps }) => {
            const done = completedAt !== null;
            return (
              <div key={globalIndex} className={cn('flex items-center gap-2', done && 'opacity-60')}>
                <span className="text-[11px] text-[#555] w-5 shrink-0 font-mono">
                  {String(setNumber).padStart(2, '0')}
                </span>
                {done ? (
                  <>
                    <span className="flex-1 text-[11px] text-[#666]">
                      {!isBodyweight && actualWeight !== null ? `${actualWeight} kg × ` : ''}
                      {actualReps !== null ? `${actualReps} reps` : '–'}
                    </span>
                    <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-white/10">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    {!isBodyweight ? (
                      <Input
                        aria-label={`Set ${setNumber} weight`}
                        type="number"
                        placeholder="kg"
                        value={inputs[globalIndex]?.weight ?? ''}
                        onChange={(e) => updateInput(globalIndex, 'weight', e.target.value)}
                        className="h-7 w-16 text-[11px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#444] px-2"
                      />
                    ) : (
                      <div className="h-7 w-16 shrink-0 flex items-center justify-center rounded-md border border-[#1e1e1e] text-[10px] text-[#333]">
                        BW
                      </div>
                    )}
                    <Input
                      aria-label={`Set ${setNumber} reps`}
                      type="number"
                      placeholder="reps"
                      value={inputs[globalIndex]?.reps ?? ''}
                      onChange={(e) => updateInput(globalIndex, 'reps', e.target.value)}
                      className="h-7 flex-1 text-[11px] bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#444] px-2"
                    />
                    <button
                      onClick={() => logSet(globalIndex)}
                      className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg border border-[#2a2a2a] text-[#555] hover:border-white hover:text-white transition-colors"
                      aria-label={`Complete set ${setNumber}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* + Add Set */}
        <button
          onClick={() => addSet(exercise.exerciseId)}
          className="mt-2 text-[11px] text-[#555] hover:text-[#888] transition-colors"
        >
          + Add Set
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-[#0f0f0f]">
        <div>
          <button
            onClick={() => router.push(backPath)}
            className="text-[11px] text-[#555] hover:text-[#888] mb-1 block transition-colors"
          >
            ← Back
          </button>
          <div className="text-[16px] font-bold text-white">{session.dayName}</div>
        </div>
        <div className="text-[18px] font-mono font-semibold text-[#666]">{elapsed}</div>
      </div>

      {/* Exercise cards */}
      <div className="flex-1 px-4 sm:px-8 py-5 pb-32 space-y-4">
        {groups.map((group, i) => {
          if (group.type === 'standalone') {
            return (
              <div key={i} className="rounded-xl bg-[#0c0c0c] border border-[#141414] p-4">
                {renderExerciseCard(group.exercise, group.sets)}
              </div>
            );
          }
          // Superset block
          return (
            <div key={i} className="rounded-xl border border-[#2a2a2a] overflow-hidden">
              <div className="flex justify-center py-1.5 bg-[#111]">
                <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#666]">Superset</span>
              </div>
              {group.exercises.map(({ exercise, sets: exSets }, j) => (
                <div key={exercise.exerciseId}>
                  {j > 0 && <div className="h-px bg-[#141414]" />}
                  <div className="bg-[#0c0c0c] p-4">
                    {renderExerciseCard(exercise, exSets)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* + Add Exercise */}
        <button
          onClick={() => setExerciseSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#1e1e1e] py-4 text-[12px] text-[#555] hover:border-[#333] hover:text-[#777] transition-colors"
        >
          + Add Exercise
        </button>
      </div>

      {/* Sticky Complete Workout button */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-[#0f0f0f] bg-[#050505] px-4 sm:px-8 py-3">
        <Button
          onClick={completeSession}
          disabled={completing}
          className="w-full bg-white text-black hover:bg-white/90 text-[13px] font-bold py-3 h-auto rounded-xl disabled:opacity-50"
        >
          {completing ? 'Saving…' : 'Complete Workout'}
        </Button>
      </div>

      {/* Exercise search sheet */}
      <ExerciseSearchSheet
        open={exerciseSheetOpen}
        onOpenChange={setExerciseSheetOpen}
        exercises={availableExercises}
        onSelect={addExercise}
        onCreated={(ex) => setAvailableExercises((prev) => [...prev, ex])}
      />
    </div>
  );
}
```

- [ ] **Step 1: Apply the file** (code above)

- [ ] **Step 2: Check lint**

```bash
pnpm lint src/app/\(dashboard\)/member/plan/session/\[id\]/_components/session-logger.tsx 2>&1 | tail -10
```

- [ ] **Step 3: Run tests**

```bash
pnpm test 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/member/plan/session/\[id\]/_components/session-logger.tsx
git commit -m "feat: redesign session logger with live timer, inline set rows, BW toggle, and add-exercise"
```

---

## Task 9: Plan Template Builder redesign (A3)

**Files:**
- Modify: `src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/new/page.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx`
- Modify: `src/app/(dashboard)/owner/plans/new/page.tsx`
- Modify: `src/app/(dashboard)/owner/plans/[id]/edit/page.tsx`

The form component is fully replaced. It now takes `exercises: ExerciseOption[]` as a prop and manages a rich day/exercise state.

### 9a: Rewrite `plan-template-form.tsx`

```tsx
// src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx
'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';
import { ExerciseSearchSheet, type ExerciseOption } from '@/components/training/exercise-search-sheet';
import type { IPlanDayExercise, IPlanDay } from '@/lib/db/models/plan-template.model';

// Client-side exercise shape (exerciseId as string, not ObjectId)
interface ExerciseRow {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

interface DayState {
  dayNumber: number;
  name: string;
  exercises: ExerciseRow[];
}

interface FormData {
  name: string;
  description: string | null;
  days: IPlanDay[];
}

interface Props {
  initialData?: { name: string; description: string | null; days: IPlanDay[] };
  exercises: ExerciseOption[];
  onSubmit: (data: FormData) => Promise<void>;
  backPath?: string;
}

function rowToIPlanDayExercise(row: ExerciseRow): IPlanDayExercise {
  return {
    groupId: row.groupId,
    isSuperset: row.isSuperset,
    exerciseId: row.exerciseId as unknown as import('mongoose').Types.ObjectId,
    exerciseName: row.exerciseName,
    imageUrl: row.imageUrl,
    isBodyweight: row.isBodyweight,
    sets: row.sets,
    repsMin: row.repsMin,
    repsMax: row.repsMax,
    restSeconds: row.restSeconds,
  };
}

function toDayState(day: IPlanDay): DayState {
  return {
    dayNumber: day.dayNumber,
    name: day.name,
    exercises: day.exercises.map((ex) => ({
      ...ex,
      exerciseId: ex.exerciseId.toString(),
    })),
  };
}

export function PlanTemplateForm({ initialData, exercises: initialExercises, onSubmit, backPath }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [days, setDays] = useState<DayState[]>(initialData?.days.map(toDayState) ?? []);
  const [saving, setSaving] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set()); // exerciseId+dayIndex keys
  const [exerciseSheetDay, setExerciseSheetDay] = useState<number | null>(null); // dayIndex
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>(initialExercises);

  function addDay() {
    const num = days.length + 1;
    setDays([...days, { dayNumber: num, name: `Day ${num}`, exercises: [] }]);
  }

  function updateDayName(dayIdx: number, value: string) {
    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, name: value } : d)));
  }

  function removeDay(dayIdx: number) {
    setDays((prev) =>
      prev
        .filter((_, i) => i !== dayIdx)
        .map((d, i) => ({ ...d, dayNumber: i + 1 })),
    );
  }

  function addExerciseToDayFromSheet(dayIdx: number, exercise: ExerciseOption) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const newExercise: ExerciseRow = {
          groupId: exercise._id, // standalone: use own id as groupId
          isSuperset: false,
          exerciseId: exercise._id,
          exerciseName: exercise.name,
          imageUrl: exercise.imageUrl,
          isBodyweight: exercise.isBodyweight,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: null,
        };
        return { ...d, exercises: [...d.exercises, newExercise] };
      }),
    );
    setExerciseSheetDay(null);
  }

  function updateExerciseField(
    dayIdx: number,
    exIdx: number,
    field: keyof ExerciseRow,
    value: ExerciseRow[keyof ExerciseRow],
  ) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((ex, j) =>
          j === exIdx ? { ...ex, [field]: value } : ex,
        );
        return { ...d, exercises };
      }),
    );
  }

  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) };
      }),
    );
  }

  function moveExercise(dayIdx: number, exIdx: number, dir: 'up' | 'down') {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exs = [...d.exercises];
        const target = dir === 'up' ? exIdx - 1 : exIdx + 1;
        if (target < 0 || target >= exs.length) return d;
        [exs[exIdx], exs[target]] = [exs[target], exs[exIdx]];
        return { ...d, exercises: exs };
      }),
    );
  }

  function toggleExerciseSelection(dayIdx: number, exIdx: number) {
    const key = `${dayIdx}-${exIdx}`;
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function groupAsSuperset(dayIdx: number) {
    const day = days[dayIdx];
    const selectedIndices = day.exercises
      .map((_, i) => i)
      .filter((i) => selectedExercises.has(`${dayIdx}-${i}`));
    if (selectedIndices.length < 2) return;

    const groupId = crypto.randomUUID();
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((ex, j) =>
          selectedIndices.includes(j) ? { ...ex, groupId, isSuperset: true } : ex,
        );
        return { ...d, exercises };
      }),
    );
    setSelectedExercises(new Set());
  }

  function ungroupSuperset(dayIdx: number, groupId: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((ex) =>
          ex.groupId === groupId && ex.isSuperset
            ? { ...ex, groupId: ex.exerciseId, isSuperset: false }
            : ex,
        );
        return { ...d, exercises };
      }),
    );
  }

  const selectedKeysForDay = (dayIdx: number) =>
    days[dayIdx].exercises
      .map((_, i) => i)
      .filter((i) => selectedExercises.has(`${dayIdx}-${i}`));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: FormData = {
        name,
        description: description || null,
        days: days.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name,
          exercises: d.exercises.map(rowToIPlanDayExercise),
        })),
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Plan name + description */}
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="plan-name" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666]">
            Plan Name
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="plan-desc" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666]">
            Description
          </label>
          <Textarea
            id="plan-desc"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white resize-none"
          />
        </div>
      </Card>

      {/* Day list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#666]">Training Days</span>
          <Button type="button" variant="ghost" onClick={addDay}
            className="border border-[#1a1a1a] text-[#888] hover:border-[#333] hover:text-[#aaa] text-xs">
            + Add Day
          </Button>
        </div>

        {days.map((day, dayIdx) => {
          const selectedInDay = selectedKeysForDay(dayIdx);
          const canGroup = selectedInDay.length >= 2;

          return (
            <Card key={dayIdx} className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 space-y-3">
              {/* Day header */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Day ${dayIdx + 1}`}
                  value={day.name}
                  onChange={(e) => updateDayName(dayIdx, e.target.value)}
                  className="flex-1 bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white text-[13px]"
                />
                <Button type="button" variant="ghost" onClick={() => removeDay(dayIdx)}
                  className="text-[#777] hover:text-red-400 hover:bg-[#141414] text-xs shrink-0">
                  Remove
                </Button>
              </div>

              {/* Group as superset button */}
              {canGroup && (
                <Button type="button" variant="ghost" onClick={() => groupAsSuperset(dayIdx)}
                  className="text-[11px] border border-[#2a2a2a] text-[#777] hover:border-[#444] hover:text-white">
                  Group as Superset ({selectedInDay.length} selected)
                </Button>
              )}

              {/* Exercise list */}
              <div className="space-y-2">
                {day.exercises.map((ex, exIdx) => {
                  const key = `${dayIdx}-${exIdx}`;
                  const isSelected = selectedExercises.has(key);
                  const isSupersetMember = ex.isSuperset;

                  // For superset blocks, only render the first member as the block header
                  const sameGroupBefore = isSupersetMember &&
                    day.exercises.slice(0, exIdx).some((e) => e.groupId === ex.groupId && e.isSuperset);
                  if (sameGroupBefore) return null; // rendered inside the superset block below

                  const groupMembers = isSupersetMember
                    ? day.exercises
                        .map((e, i) => ({ e, i }))
                        .filter(({ e }) => e.groupId === ex.groupId && e.isSuperset)
                    : [{ e: ex, i: exIdx }];

                  return (
                    <div
                      key={exIdx}
                      className={`rounded-lg border ${isSupersetMember ? 'border-[#2a2a2a]' : 'border-[#1a1a1a]'} overflow-hidden`}
                    >
                      {isSupersetMember && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#111]">
                          <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#666]">Superset</span>
                          <button
                            type="button"
                            onClick={() => ungroupSuperset(dayIdx, ex.groupId)}
                            className="text-[10px] text-[#555] hover:text-[#888]"
                          >
                            Ungroup
                          </button>
                        </div>
                      )}

                      {groupMembers.map(({ e, i: mIdx }, memberPos) => (
                        <div key={mIdx}>
                          {memberPos > 0 && <div className="h-px bg-[#141414]" />}
                          <div className="p-3 bg-[#0a0a0a]">
                            {/* Row 1: checkbox + thumbnail + name + move + remove */}
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={selectedExercises.has(`${dayIdx}-${mIdx}`)}
                                onChange={() => toggleExerciseSelection(dayIdx, mIdx)}
                                className="accent-white shrink-0"
                              />
                              <ExerciseThumbnail imageUrl={e.imageUrl} name={e.exerciseName} size={28} />
                              <span className="flex-1 text-[12px] font-medium text-white truncate">{e.exerciseName}</span>
                              <button type="button" onClick={() => moveExercise(dayIdx, mIdx, 'up')}
                                disabled={mIdx === 0}
                                className="text-[#555] hover:text-[#888] disabled:opacity-20 transition-colors">
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => moveExercise(dayIdx, mIdx, 'down')}
                                disabled={mIdx === day.exercises.length - 1}
                                className="text-[#555] hover:text-[#888] disabled:opacity-20 transition-colors">
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => removeExercise(dayIdx, mIdx)}
                                className="text-[#555] hover:text-red-400 transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            {/* Row 2: numeric inputs */}
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { label: 'Sets', field: 'sets' as const, value: e.sets },
                                { label: 'Reps Min', field: 'repsMin' as const, value: e.repsMin },
                                { label: 'Reps Max', field: 'repsMax' as const, value: e.repsMax },
                                { label: 'Rest (s)', field: 'restSeconds' as const, value: e.restSeconds ?? '' },
                              ].map(({ label, field, value }) => (
                                <div key={field} className="flex flex-col">
                                  <label className="text-[8px] uppercase tracking-[1px] text-[#555] mb-0.5">{label}</label>
                                  <Input
                                    type="number"
                                    value={value}
                                    onChange={(ev) =>
                                      updateExerciseField(dayIdx, mIdx, field, ev.target.value === '' ? null : Number(ev.target.value))
                                    }
                                    className="h-7 w-16 text-[11px] bg-[#0a0a0a] border-[#1e1e1e] text-white px-2"
                                  />
                                </div>
                              ))}
                              <div className="flex flex-col justify-end">
                                <label className="flex items-center gap-1.5 text-[10px] text-[#666] cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={e.isBodyweight}
                                    onChange={(ev) => updateExerciseField(dayIdx, mIdx, 'isBodyweight', ev.target.checked)}
                                    className="accent-white"
                                  />
                                  BW
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* + Add Exercise button */}
              <button
                type="button"
                onClick={() => setExerciseSheetDay(dayIdx)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#1a1a1a] py-3 text-[11px] text-[#555] hover:border-[#333] hover:text-[#777] transition-colors"
              >
                + Add Exercise
              </button>
            </Card>
          );
        })}
      </div>

      <Button
        type="submit"
        disabled={saving}
        className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Plan'}
      </Button>

      {/* Exercise search sheet */}
      {exerciseSheetDay !== null && (
        <ExerciseSearchSheet
          open={exerciseSheetDay !== null}
          onOpenChange={(open) => { if (!open) setExerciseSheetDay(null); }}
          exercises={availableExercises}
          onSelect={(ex) => addExerciseToDayFromSheet(exerciseSheetDay, ex)}
          onCreated={(ex) => setAvailableExercises((prev) => [...prev, ex])}
        />
      )}
    </form>
  );
}
```

### 9b: Convert trainer `plans/new/page.tsx` to server component

```tsx
// src/app/(dashboard)/trainer/plans/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { NewPlanClient } from './_client';

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const exercises = await new MongoExerciseRepository().findAll({ creatorId: session.user.id });
  return <NewPlanClient exercises={JSON.parse(JSON.stringify(exercises))} backPath="/trainer/plans" />;
}
```

Create `src/app/(dashboard)/trainer/plans/new/_client.tsx`:

```tsx
// src/app/(dashboard)/trainer/plans/new/_client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlanTemplateForm } from '../_components/plan-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { ExerciseOption } from '@/components/training/exercise-search-sheet';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

interface Props {
  exercises: ExerciseOption[];
  backPath: string;
}

export function NewPlanClient({ exercises, backPath }: Props) {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch('/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save plan');
      return;
    }
    toast.success('Plan saved');
    router.push(backPath);
  }

  return (
    <div>
      <PageHeader title="New Plan" />
      <div className="px-4 sm:px-8 py-7">
        <PlanTemplateForm exercises={exercises} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
```

### 9c: Convert trainer `plans/[id]/edit/page.tsx` to server component

```tsx
// src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { notFound } from 'next/navigation';
import { EditPlanClient } from './_client';

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  const { id } = await params;
  await connectDB();

  const [template, exercises] = await Promise.all([
    new MongoPlanTemplateRepository().findById(id),
    new MongoExerciseRepository().findAll({ creatorId: session.user.id }),
  ]);

  if (!template) notFound();

  return (
    <EditPlanClient
      id={id}
      initialData={JSON.parse(JSON.stringify(template))}
      exercises={JSON.parse(JSON.stringify(exercises))}
      backPath="/trainer/plans"
    />
  );
}
```

Create `src/app/(dashboard)/trainer/plans/[id]/edit/_client.tsx`:

```tsx
// src/app/(dashboard)/trainer/plans/[id]/edit/_client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlanTemplateForm } from '../../_components/plan-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { ExerciseOption } from '@/components/training/exercise-search-sheet';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

interface Props {
  id: string;
  initialData: { name: string; description: string | null; days: IPlanDay[] };
  exercises: ExerciseOption[];
  backPath: string;
}

export function EditPlanClient({ id, initialData, exercises, backPath }: Props) {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch(`/api/plan-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save plan');
      return;
    }
    toast.success('Plan saved');
    router.push(backPath);
  }

  return (
    <div>
      <PageHeader title="Edit Plan" />
      <div className="px-4 sm:px-8 py-7">
        <PlanTemplateForm initialData={initialData} exercises={exercises} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
```

### 9d: Check if `MongoPlanTemplateRepository` has `findById`

```bash
grep -n "findById" /Users/eric_gong/Desktop/power_gym/src/lib/repositories/plan-template.repository.ts
```

If not present, read the file and add it. (The trainer edit page previously used client-side fetch; now we use the repository directly.)

### 9e: Update owner plans pages to use the new server-component pattern

The existing `src/app/(dashboard)/owner/plans/new/page.tsx` and `src/app/(dashboard)/owner/plans/[id]/edit/page.tsx` are already thin wrappers. Update them to fetch exercises and pass to the same `NewPlanClient` / `EditPlanClient` components:

```tsx
// src/app/(dashboard)/owner/plans/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { NewPlanClient } from '@/app/(dashboard)/trainer/plans/new/_client';

export default async function OwnerNewPlanPage() {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const exercises = await new MongoExerciseRepository().findAll({ creatorId: session.user.id });
  return <NewPlanClient exercises={JSON.parse(JSON.stringify(exercises))} backPath="/owner/plans" />;
}
```

```tsx
// src/app/(dashboard)/owner/plans/[id]/edit/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { notFound } from 'next/navigation';
import { EditPlanClient } from '@/app/(dashboard)/trainer/plans/[id]/edit/_client';

export default async function OwnerEditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  const { id } = await params;
  await connectDB();

  const [template, exercises] = await Promise.all([
    new MongoPlanTemplateRepository().findById(id),
    new MongoExerciseRepository().findAll({ creatorId: session.user.id }),
  ]);

  if (!template) notFound();

  return (
    <EditPlanClient
      id={id}
      initialData={JSON.parse(JSON.stringify(template))}
      exercises={JSON.parse(JSON.stringify(exercises))}
      backPath="/owner/plans"
    />
  );
}
```

- [ ] **Step 1: Check if `MongoPlanTemplateRepository` has `findById`**

```bash
grep -n "findById" /Users/eric_gong/Desktop/power_gym/src/lib/repositories/plan-template.repository.ts
```

If missing, add it. If the repository doesn't exist, check `src/lib/repositories/` for the correct filename.

- [ ] **Step 2: Apply all files** (plan-template-form.tsx, trainer/plans/new/page.tsx, trainer/plans/new/_client.tsx, trainer/plans/[id]/edit/page.tsx, trainer/plans/[id]/edit/_client.tsx, owner/plans/new/page.tsx, owner/plans/[id]/edit/page.tsx)

- [ ] **Step 3: Check lint**

```bash
pnpm lint src/app/\(dashboard\)/trainer/plans/ src/app/\(dashboard\)/owner/plans/ src/components/training/ 2>&1 | tail -15
```

- [ ] **Step 4: Run tests**

```bash
pnpm test 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/plans/ src/app/\(dashboard\)/owner/plans/ src/components/training/plan-template-form.tsx 2>/dev/null || true
git add src/app/\(dashboard\)/trainer/plans/_components/plan-template-form.tsx
git add -A src/app/\(dashboard\)/trainer/plans/new/ src/app/\(dashboard\)/trainer/plans/\[id\]/edit/
git add -A src/app/\(dashboard\)/owner/plans/
git commit -m "feat: rebuild plan template builder with exercise search, superset grouping, and reordering"
```

---

## Task 10: Trainer personal plan routes + nav update

**Files:**
- Create: `src/app/(dashboard)/trainer/my-plan/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-plan/session/new/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-plan/session/[id]/page.tsx`
- Modify: `src/components/shared/app-shell.tsx`

Trainers should be able to log their own workouts just like members and owners. The routes mirror the owner `my-plan` routes.

### 10a: Trainer my-plan pages

```tsx
// src/app/(dashboard)/trainer/my-plan/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { PlanOverview } from '@/app/(dashboard)/member/plan/_components/plan-overview';

export default async function TrainerMyPlanPage() {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const repo = new MongoMemberPlanRepository();
  const plan = await repo.findActive(session.user.id);
  return <PlanOverview plan={JSON.parse(JSON.stringify(plan))} sessionBasePath="/trainer/my-plan" />;
}
```

```tsx
// src/app/(dashboard)/trainer/my-plan/session/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export default async function TrainerSessionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { day } = await searchParams;
  const dayNumber = parseInt(day ?? '1', 10);

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);
  if (!plan) redirect('/trainer/my-plan');

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect('/trainer/my-plan');

  const cookieStore = await cookies();
  const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ memberPlanId: plan._id.toString(), dayNumber }),
  });

  if (res.ok) {
    const data = (await res.json()) as { _id: string };
    redirect(`/trainer/my-plan/session/${data._id}`);
  }

  redirect('/trainer/my-plan');
}
```

```tsx
// src/app/(dashboard)/trainer/my-plan/session/[id]/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';
import { notFound } from 'next/navigation';

export default async function TrainerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  await connectDB();
  const workoutSession = await new MongoWorkoutSessionRepository().findById(id);

  if (!workoutSession) notFound();
  if (workoutSession.memberId.toString() !== session.user.id) notFound();

  return (
    <SessionLogger
      session={JSON.parse(JSON.stringify(workoutSession))}
      backPath="/trainer/my-plan"
    />
  );
}
```

### 10b: Update trainer nav in `app-shell.tsx`

In the trainer `TRAINING` group, add "My Plan" and "Personal Bests" before "Plan Templates":

```typescript
// In NAV.trainer TRAINING group:
{
  group: 'TRAINING',
  items: [
    { href: '/trainer/my-plan', label: 'My Plan' },
    { href: '/trainer/my-pbs', label: 'Personal Bests' },
    { href: '/trainer/plans', label: 'Plan Templates' },
  ],
},
```

Note: `/trainer/my-pbs` route does not exist yet — add a placeholder note in the plan, but create a minimal page so the nav link doesn't 404.

Create `src/app/(dashboard)/trainer/my-pbs/page.tsx`:

```tsx
// src/app/(dashboard)/trainer/my-pbs/page.tsx
import { PageHeader } from '@/components/shared/page-header';
export default function TrainerMyPbsPage() {
  return <PageHeader title="Personal Bests" subtitle="Coming soon" />;
}
```

- [ ] **Step 1: Create all three trainer my-plan route files**

- [ ] **Step 2: Create trainer my-pbs placeholder**

- [ ] **Step 3: Update app-shell.tsx trainer TRAINING group**

Find this block in `src/components/shared/app-shell.tsx`:
```typescript
    {
      group: 'TRAINING',
      items: [{ href: '/trainer/plans', label: 'Plan Templates' }],
    },
```

Replace with:
```typescript
    {
      group: 'TRAINING',
      items: [
        { href: '/trainer/my-plan', label: 'My Plan' },
        { href: '/trainer/my-pbs', label: 'Personal Bests' },
        { href: '/trainer/plans', label: 'Plan Templates' },
      ],
    },
```

- [ ] **Step 4: Check lint + tests**

```bash
pnpm lint src/app/\(dashboard\)/trainer/my-plan/ src/components/shared/app-shell.tsx 2>&1 | tail -10
pnpm test 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/my-plan/ src/app/\(dashboard\)/trainer/my-pbs/ src/components/shared/app-shell.tsx
git commit -m "feat: add trainer personal plan routes and My Plan / Personal Bests to trainer nav"
```

---

## Task 11: Update owner my-plan session routes (verify `backPath`)

The owner `my-plan` session routes were created in the previous phase. Verify they pass `backPath="/owner/my-plan"` correctly, and update their `session/new/page.tsx` to use the same auto-redirect pattern (no confirmation UI) from Task 7c.

- [ ] **Step 1: Read current owner my-plan session/new/page.tsx**

```bash
cat /Users/eric_gong/Desktop/power_gym/src/app/\(dashboard\)/owner/my-plan/session/new/page.tsx
```

If it has a confirmation UI (form with a button), replace it with the auto-redirect pattern from Task 7c, adjusted for `/owner/my-plan`.

- [ ] **Step 2: Verify session/[id]/page.tsx passes `backPath="/owner/my-plan"`**

```bash
grep -n "backPath" /Users/eric_gong/Desktop/power_gym/src/app/\(dashboard\)/owner/my-plan/session/\[id\]/page.tsx
```

Expected: `backPath="/owner/my-plan"` present.

- [ ] **Step 3: Commit any changes**

```bash
git add src/app/\(dashboard\)/owner/my-plan/
git commit -m "fix: owner my-plan session/new auto-redirects without confirmation UI"
```

---

## Task 12: Final lint + build check

- [ ] **Step 1: Full lint**

```bash
pnpm lint 2>&1 | tail -20
```

Fix all warnings and errors before proceeding.

- [ ] **Step 2: Full test suite**

```bash
pnpm test 2>&1 | tail -20
```

All tests must pass.

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -30
```

Fix any TypeScript or build errors.

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve lint and build errors from training redesign"
```

---

## Post-implementation manual verification checklist

After build passes, verify in the browser (dev server):

- [ ] **Member plan overview**: plan name shows, day tabs scroll horizontally, clicking tab switches exercise list, standalone exercises show thumbnail + letter badge + sets/reps chips, superset exercises show in bordered card with "Superset" chip + D1/D2 labels, "Log This Workout" button is sticky at bottom
- [ ] **Session creation**: clicking "Log This Workout" navigates to session page without confirmation screen
- [ ] **Session logger**: live MM:SS timer counts up, BW checkbox disables weight input, ✓ button logs set inline, completed sets show filled check + weight×reps text, "+ Add Set" appends row, "+ Add Exercise" opens search sheet, "Complete Workout" is always visible at bottom
- [ ] **Plan builder (trainer)**: can add exercises per day, inline fields update correctly, checkbox + "Group as Superset" button appears when ≥2 selected, superset block shows "Ungroup" button, ↑/↓ buttons reorder, save submits correctly
- [ ] **Owner plans builder**: same as trainer, back path goes to `/owner/plans`
- [ ] **Trainer My Plan nav item**: visible in sidebar, links to `/trainer/my-plan`
- [ ] **Owner My Plan**: same session flow as member
