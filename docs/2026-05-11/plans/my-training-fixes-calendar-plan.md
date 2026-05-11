# My Training Bug Fixes + Calendar — Implementation Plan

> **Status: COMPLETE** — All 12 tasks implemented, reviewed, and committed (2026-05-11).

**Goal:** Fix 5 issues in owner/trainer My Training: one-per-day hard gate, multi-tab 404 safety, completed-session read-only mode, mini workout calendar (replaces Recent Sessions list), and a full weekly self-tracking calendar page.

**Architecture:** Repository gets two new methods (`findCompletedToday`, `findByUserDateRange`). API gets `DAY_ALREADY_LOGGED` 409 on POST + a new `/range` GET route. Three new UI components (`DayAlreadyLoggedDialog`, `MiniWorkoutCalendar`, `SelfWeekCalendarGrid`, `SelfWorkoutCalendarClient`). Two new calendar pages. `ExerciseRow` gains a `readOnly` logging prop.

**Tech Stack:** Next.js 15 App Router, MongoDB/Mongoose, React 18, TypeScript strict, shadcn/ui Dialog, TailwindCSS, Jest (unit), Playwright (E2E, no new specs needed)

---

## Task 1: Repository — `findCompletedToday`

**Files:**
- Modify: `src/lib/repositories/self-workout-log.repository.ts`
- Test: `__tests__/lib/repositories/self-workout-log.repository.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the existing `describe('MongoSelfWorkoutLogRepository')` block in `__tests__/lib/repositories/self-workout-log.repository.test.ts`:

```typescript
describe('findCompletedToday', () => {
  it('calls findOne with completedAt range covering today UTC', async () => {
    mockModel.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) } as never);
    await repo.findCompletedToday(USER_A);

    const callArg = mockModel.findOne.mock.calls[0][0] as {
      userId: unknown;
      completedAt: { $gte: Date; $lt: Date };
    };
    const { $gte, $lt } = callArg.completedAt;
    expect($gte.getUTCHours()).toBe(0);
    expect($gte.getUTCMinutes()).toBe(0);
    expect($lt.getTime() - $gte.getTime()).toBe(86_400_000);
    expect(callArg.userId).toEqual(new mongoose.Types.ObjectId(USER_A));
  });

  it('returns null when no completed session exists today', async () => {
    mockModel.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) } as never);
    const result = await repo.findCompletedToday(USER_A);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/eric_gong/Projects/power_gym
pnpm test -- --testPathPattern="self-workout-log.repository.test" --no-coverage
```

Expected: FAIL — `repo.findCompletedToday is not a function`

- [ ] **Step 3: Add interface method + implementation**

In `src/lib/repositories/self-workout-log.repository.ts`:

Add to the `ISelfWorkoutLogRepository` interface (after `findToday`):
```typescript
findCompletedToday(userId: string): Promise<ISelfWorkoutLog | null>;
```

Add to `MongoSelfWorkoutLogRepository` class (after `findToday` implementation):
```typescript
async findCompletedToday(userId: string): Promise<ISelfWorkoutLog | null> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);
  return SelfWorkoutLogModel.findOne({
    userId: oid(userId),
    completedAt: { $gte: start, $lt: end },
  }).sort({ completedAt: -1 });
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern="self-workout-log.repository.test" --no-coverage
```

Expected: PASS (all tests in file)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/self-workout-log.repository.ts \
        __tests__/lib/repositories/self-workout-log.repository.test.ts
git commit -m "feat(repo): add findCompletedToday to SelfWorkoutLogRepository"
```

---

## Task 2: API — `DAY_ALREADY_LOGGED` in POST /api/me/workout-logs

**Files:**
- Modify: `src/app/api/me/workout-logs/route.ts`
- Test: `__tests__/app/api/me/workout-logs.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the `describe('POST')` block in `__tests__/app/api/me/workout-logs.test.ts`:

```typescript
it('returns 409 DAY_ALREADY_LOGGED when a completed log exists today', async () => {
  mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
  const findActive = jest.fn().mockResolvedValue(null);
  const findCompletedToday = jest.fn().mockResolvedValue({
    _id: { toString: () => 'log-today' },
    dayName: 'Push',
  });
  const create = jest.fn();
  mockSelfRepo.mockImplementation(
    () => ({ findActive, findCompletedToday, create } as unknown as MongoSelfWorkoutLogRepository),
  );
  const res = await POST(
    new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ dayName: 'Pull', plannedSets: [] }),
    }),
  );
  expect(res.status).toBe(409);
  const body = (await res.json()) as { error: string; session: { _id: string; dayName: string } };
  expect(body.error).toBe('DAY_ALREADY_LOGGED');
  expect(body.session._id).toBe('log-today');
  expect(body.session.dayName).toBe('Push');
  expect(create).not.toHaveBeenCalled();
});

it('does not check completedToday when an active log exists (active check runs first)', async () => {
  mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
  const findActive = jest.fn().mockResolvedValue({
    _id: { toString: () => 'log-active' },
    dayName: 'Push',
    startedAt: new Date(),
    sets: [],
  });
  const findCompletedToday = jest.fn();
  const create = jest.fn();
  mockSelfRepo.mockImplementation(
    () => ({ findActive, findCompletedToday, create } as unknown as MongoSelfWorkoutLogRepository),
  );
  const res = await POST(
    new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ dayName: 'Pull', plannedSets: [] }),
    }),
  );
  expect(res.status).toBe(409);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe('ACTIVE_SESSION_EXISTS');
  expect(findCompletedToday).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern="workout-logs.test" --no-coverage
```

Expected: FAIL — `DAY_ALREADY_LOGGED` test fails

- [ ] **Step 3: Add the check to the POST handler**

In `src/app/api/me/workout-logs/route.ts`, after the `if (activeLog)` block (after line 52 — after `await repo.delete(activeLog._id.toString(), guard.userId);`):

```typescript
  // After the active log block, before creating:
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
```

The full POST handler order after changes:
1. Guard check
2. Parse + validate body
3. connectDB
4. Template existence check (if sourceTemplateId provided)
5. `findActive` → 409 ACTIVE_SESSION_EXISTS (or delete if deleteActive=true)
6. **NEW**: `findCompletedToday` → 409 DAY_ALREADY_LOGGED
7. `create` → 201

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern="workout-logs.test" --no-coverage
```

Expected: all tests in file PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/me/workout-logs/route.ts \
        __tests__/app/api/me/workout-logs.test.ts
git commit -m "feat(api): add DAY_ALREADY_LOGGED gate to POST /api/me/workout-logs"
```

---

## Task 3: `DayAlreadyLoggedDialog` component

**Files:**
- Create: `src/components/self-tracking/day-already-logged-dialog.tsx`

No unit test needed — thin wrapper around shadcn Dialog.

- [ ] **Step 1: Create the component**

```typescript
// src/components/self-tracking/day-already-logged-dialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  dayName: string;
  sessionId: string;
  basePath: '/owner/my-training' | '/trainer/my-training';
  onClose: () => void;
}

export function DayAlreadyLoggedDialog({ open, dayName, sessionId, basePath, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Already trained today</DialogTitle>
          <DialogDescription>
            You completed your &ldquo;{dayName}&rdquo; session today. Rest up — see you tomorrow!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <a
            href={`${basePath}/session/${sessionId}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            View session →
          </a>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Confirm no TypeScript errors**

```bash
pnpm build 2>&1 | grep "day-already-logged"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/self-tracking/day-already-logged-dialog.tsx
git commit -m "feat(ui): add DayAlreadyLoggedDialog component"
```

---

## Task 4: Wire `DAY_ALREADY_LOGGED` into `FreestylePathCard`

**Files:**
- Modify: `src/components/self-tracking/freestyle-path-card.tsx`

- [ ] **Step 1: Add state and handle new 409**

Replace the import section at the top — add the new dialog:
```typescript
import { ActiveSessionConflictDialog } from './active-session-conflict-dialog';
import { DayAlreadyLoggedDialog } from './day-already-logged-dialog';
```

Add new state inside `FreestylePathCard` (after the `conflict` state):
```typescript
const [dayAlreadyLogged, setDayAlreadyLogged] = useState<{
  _id: string;
  dayName: string;
} | null>(null);
```

In `startBlank`, replace the `if (res.status === 409)` block:
```typescript
      if (res.status === 409) {
        const body = (await res.json()) as {
          error: string;
          activeSession?: { _id: string; dayName: string; setCount: number };
          session?: { _id: string; dayName: string };
        };
        if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
          setConflict(body.activeSession);
        } else if (body.error === 'DAY_ALREADY_LOGGED' && body.session) {
          setDayAlreadyLogged(body.session);
        }
      }
```

- [ ] **Step 2: Render the new dialog**

In the JSX return, after the `{conflict && <ActiveSessionConflictDialog ... />}` block, add:
```tsx
      {dayAlreadyLogged && (
        <DayAlreadyLoggedDialog
          open
          dayName={dayAlreadyLogged.dayName}
          sessionId={dayAlreadyLogged._id}
          basePath={props.basePath}
          onClose={() => setDayAlreadyLogged(null)}
        />
      )}
```

- [ ] **Step 3: Run lint + type check**

```bash
pnpm lint --max-warnings 0
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/self-tracking/freestyle-path-card.tsx
git commit -m "feat(ui): handle DAY_ALREADY_LOGGED in FreestylePathCard"
```

---

## Task 5: Wire `DAY_ALREADY_LOGGED` into `TemplatePathCard`

**Files:**
- Modify: `src/components/self-tracking/template-path-card.tsx`

- [ ] **Step 1: Add import + state**

Add import:
```typescript
import { DayAlreadyLoggedDialog } from './day-already-logged-dialog';
```

Add state inside `TemplatePathCard` (after the `pending` state):
```typescript
const [dayAlreadyLogged, setDayAlreadyLogged] = useState<{
  _id: string;
  dayName: string;
} | null>(null);
```

- [ ] **Step 2: Handle new 409 in `handleLog`**

Replace the `if (res.status === 409)` block:
```typescript
      if (res.status === 409) {
        const body = (await res.json()) as {
          error: string;
          activeSession?: ConflictInfo;
          session?: { _id: string; dayName: string };
        };
        if (body.error === 'ACTIVE_SESSION_EXISTS' && body.activeSession) {
          setConflict(body.activeSession);
          setPending({ template, day });
        } else if (body.error === 'DAY_ALREADY_LOGGED' && body.session) {
          setDayAlreadyLogged(body.session);
        }
      }
```

- [ ] **Step 3: Render the dialog**

In the JSX return (after the `{conflict && <ActiveSessionConflictDialog ... />}` block):
```tsx
      {dayAlreadyLogged && (
        <DayAlreadyLoggedDialog
          open
          dayName={dayAlreadyLogged.dayName}
          sessionId={dayAlreadyLogged._id}
          basePath={basePath}
          onClose={() => setDayAlreadyLogged(null)}
        />
      )}
```

- [ ] **Step 4: Run lint**

```bash
pnpm lint --max-warnings 0
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/template-path-card.tsx
git commit -m "feat(ui): handle DAY_ALREADY_LOGGED in TemplatePathCard"
```

---

## Task 6: Multi-tab 404 safety in `SelfWorkoutSession`

**Files:**
- Modify: `src/components/self-tracking/self-workout-session.tsx`

- [ ] **Step 1: Add 404 guard to `logSet`**

In `self-workout-session.tsx`, find the `logSet` function. After `const res = await fetch(...)`, add before `if (res.ok)`:

```typescript
    if (res.status === 404) {
      toast.error('This session was ended on another device.');
      router.push(basePath);
      return;
    }
```

Full updated `logSet`:
```typescript
  async function logSet(globalIndex: number) {
    if (!log) return;
    const set = log.sets[globalIndex];
    const exId = set.exerciseId.toString();
    const isBw = bwOverrides[exId] ?? set.isBodyweight;
    const i = inputs[globalIndex] ?? { weight: '', reps: '' };
    const weight = isBw ? null : i.weight === '' ? null : parseFloat(i.weight);
    const reps = i.reps === '' ? null : parseInt(i.reps, 10);
    const res = await fetch(`/api/me/workout-logs/${logId}/sets/${globalIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualWeight: weight, actualReps: reps }),
    });
    if (res.status === 404) {
      toast.error('This session was ended on another device.');
      router.push(basePath);
      return;
    }
    if (res.ok) syncLog((await res.json()) as ISelfWorkoutLog);
  }
```

- [ ] **Step 2: Add 404 guard to `addSet`**

```typescript
  async function addSet(exerciseId: string) {
    if (!log) return;
    const exerciseSets = log.sets.filter((s) => s.exerciseId.toString() === exerciseId);
    const last = exerciseSets[exerciseSets.length - 1];
    if (!last) return;
    const newSet: ISelfWorkoutSet = {
      ...last,
      setNumber: last.setNumber + 1,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    const res = await fetch(`/api/me/workout-logs/${logId}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSet),
    });
    if (res.status === 404) {
      toast.error('This session was ended on another device.');
      router.push(basePath);
      return;
    }
    if (res.ok) syncLog((await res.json()) as ISelfWorkoutLog);
  }
```

- [ ] **Step 3: Add 404 guard to `addExercise`**

```typescript
  async function addExercise(option: ExerciseOption) {
    if (!log) return;
    const newSet = {
      exerciseId: option._id,
      exerciseName: option.name,
      groupId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isSuperset: false,
      isBodyweight: option.isBodyweight,
      setNumber: 1,
      prescribedRepsMin: null,
      prescribedRepsMax: null,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    const res = await fetch(`/api/me/workout-logs/${logId}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSet),
    });
    if (res.status === 404) {
      toast.error('This session was ended on another device.');
      router.push(basePath);
      return;
    }
    if (!res.ok) {
      toast.error('Failed to add exercise');
      return;
    }
    const next = (await res.json()) as ISelfWorkoutLog;
    syncLog(next);
    setBwOverrides((prev) => ({ ...prev, [option._id]: option.isBodyweight }));
  }
```

- [ ] **Step 4: Lint check**

```bash
pnpm lint --max-warnings 0
```

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/self-workout-session.tsx
git commit -m "fix(ui): gracefully redirect on 404 in SelfWorkoutSession (multi-tab safety)"
```

---

## Task 7: `readOnly` prop on `ExerciseRow` logging mode

**Files:**
- Modify: `src/components/training/exercise-row.tsx`

- [ ] **Step 1: Add `readOnly` to `LoggingProps`**

Find the `LoggingProps` interface and add `readOnly?: boolean`:

```typescript
interface LoggingProps extends BaseProps {
  mode: 'logging';
  loggingSets: LoggingSetInput[];
  inputs: { weight: string; reps: string }[];
  onInputChange: (globalIndex: number, field: 'weight' | 'reps', value: string) => void;
  onLogSet: (globalIndex: number) => void;
  onAddSet: () => void;
  onBwToggle: (next: boolean) => void;
  bwOverride?: boolean;
  readOnly?: boolean;
}
```

- [ ] **Step 2: Destructure and apply `readOnly` in the logging branch**

Find `const { loggingSets, inputs, onInputChange, onLogSet, onAddSet, onBwToggle, bwOverride } = props;` in the `if (mode === 'logging')` branch and add `readOnly`:

```typescript
const { loggingSets, inputs, onInputChange, onLogSet, onAddSet, onBwToggle, bwOverride, readOnly } = props;
```

Wrap the BW toggle label (around line 245) with `{!readOnly && (...)}`:
```tsx
          {!readOnly && (
            <label className="inline-flex items-center gap-1.5 text-xs text-foreground/65 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                aria-label="BW"
                checked={isBw}
                onChange={(e) => onBwToggle(e.target.checked)}
                className="accent-foreground"
              />
              BW
            </label>
          )}
```

Wrap the "+ Add Set" button (around line 324) with `{!readOnly && (...)}`:
```tsx
        {!readOnly && (
          <button
            type="button"
            onClick={onAddSet}
            className="mt-2 text-xs text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
          >
            + Add Set
          </button>
        )}
```

- [ ] **Step 3: Verify existing ExerciseRow tests still pass**

```bash
pnpm test -- --testPathPattern="exercise-row" --no-coverage
```

Expected: all existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/training/exercise-row.tsx
git commit -m "feat(ui): add readOnly prop to ExerciseRow logging mode"
```

---

## Task 8: Completed session read-only mode in `SelfWorkoutSession`

**Files:**
- Modify: `src/components/self-tracking/self-workout-session.tsx`

- [ ] **Step 1: Add duration helper and completed-state vars**

After the `useElapsedTimer` hook definition, add:

```typescript
function formatStaticDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '0m';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;
}
```

Inside `SelfWorkoutSession`, after `const elapsed = useElapsedTimer(startedAtIso);`, add:

```typescript
  const completedAtIso = log?.completedAt
    ? log.completedAt instanceof Date
      ? log.completedAt.toISOString()
      : (log.completedAt as unknown as string)
    : null;
  const isCompleted = completedAtIso !== null;
  const staticDuration = formatStaticDuration(startedAtIso, completedAtIso);
  const completedDateLabel = completedAtIso
    ? new Date(completedAtIso).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';
```

- [ ] **Step 2: Replace timer display in header with conditional**

Find the timer `<div>` in the header (renders `{elapsed}`). Replace:

```tsx
        <div className="text-sm font-mono font-semibold text-foreground/65 bg-muted rounded-md px-2 py-1">
          {isCompleted ? staticDuration : elapsed}
        </div>
```

- [ ] **Step 3: Pass `readOnly` to each `ExerciseRow` and `SupersetBlock`**

In the `groups.map(...)`, find the standalone ExerciseRow call and add `readOnly={isCompleted}`:

```tsx
                <ExerciseRow
                  mode="logging"
                  row={group.exercise}
                  label={(group.exercise as ExerciseRowData & { label?: string }).label ?? ''}
                  loggingSets={toLoggingSets(group.sets)}
                  inputs={inputs}
                  bwOverride={bwOverrides[group.exerciseId]}
                  onInputChange={updateInput}
                  onLogSet={(idx) => void logSet(idx)}
                  onAddSet={() => void addSet(group.exerciseId)}
                  onBwToggle={(next) =>
                    setBwOverrides((prev) => ({ ...prev, [group.exerciseId]: next }))
                  }
                  readOnly={isCompleted}
                />
```

For the superset case, `SupersetBlock` passes through to ExerciseRow. Check if `SupersetBlock` accepts a `readOnly` prop. If not, skip for now — the BW toggle and Add Set in supersets will still show. Add `readOnly={isCompleted}` to SupersetBlock only if it already has that prop. Otherwise this is a follow-up.

Check: `grep -n "readOnly" src/components/training/superset-block.tsx`

If it has `readOnly`: add it. If not: leave superset blocks as-is (standalone blocks are fixed; superset fix is a follow-up).

- [ ] **Step 4: Hide "Add Exercise" button and replace bottom bar**

The freestyle "+ Add Exercise" button is guarded by `isFreestyle`. Add `&& !isCompleted`:
```tsx
        {isFreestyle && !isCompleted && (
          <button type="button" onClick={() => setPickerOpen(true)} ...>
            + Add Exercise
          </button>
        )}
```

Replace the bottom bar's `<Button onClick={() => setCompleteOpen(true)}>Finish</Button>` with a conditional:
```tsx
          {isCompleted ? (
            <span className="text-xs text-foreground/65 tabular-nums">
              Completed {completedDateLabel} · {log.sets.length} sets · {staticDuration}
              {log.rpe != null ? ` · RPE ${log.rpe}` : ''}
            </span>
          ) : (
            <Button onClick={() => setCompleteOpen(true)}>Finish</Button>
          )}
```

- [ ] **Step 5: Ensure `CompleteWorkoutDialog` doesn't render when completed**

The dialog is rendered at the bottom with `open={completeOpen}`. Since `isCompleted` sessions can never have `completeOpen` become true (Finish button is hidden), this is already safe. No change needed.

- [ ] **Step 6: Lint check**

```bash
pnpm lint --max-warnings 0
```

- [ ] **Step 7: Commit**

```bash
git add src/components/self-tracking/self-workout-session.tsx
git commit -m "feat(ui): completed sessions render as read-only in SelfWorkoutSession"
```

---

## Task 9: `MiniWorkoutCalendar` + integrate into My Training landing

**Files:**
- Create: `src/components/self-tracking/mini-workout-calendar.tsx`
- Modify: `src/components/self-tracking/my-training-landing.tsx`

- [ ] **Step 1: Create `MiniWorkoutCalendar`**

```typescript
// src/components/self-tracking/mini-workout-calendar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SelfWorkoutCalendar } from './self-workout-calendar';

type BasePath = '/owner/my-training' | '/trainer/my-training';

interface SelfLog {
  _id: string;
  dayName: string;
  completedAt: string;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface Props {
  basePath: BasePath;
}

export function MiniWorkoutCalendar({ basePath }: Props) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/workout-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: SelfLog[]) => {
        if (!cancelled) setLogs(data.filter((l) => l.completedAt !== null));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[1.4px] font-semibold text-foreground/65">
          Training History
        </span>
        <a
          href={`${basePath}/calendar`}
          className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
        >
          View calendar →
        </a>
      </div>
      <SelfWorkoutCalendar
        logs={logs}
        onSelect={(log) => router.push(`${basePath}/session/${log._id}`)}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update `my-training-landing.tsx`**

Replace the `RecentSessionsList` import and usage:

Remove import:
```typescript
import { RecentSessionsList, type SessionRow } from './recent-sessions-list';
```

Add import:
```typescript
import { MiniWorkoutCalendar } from './mini-workout-calendar';
```

Remove the `sessionRows` computation block (lines that build `SessionRow[]`):
```typescript
  // Remove this entire block:
  const pbLogIds = new Set(pbs.map((pb) => pb.logId.toString()));
  const sessionRows: SessionRow[] = recent.slice(0, 5).map((r) => { ... });
```

Replace the `RecentSessionsList` render at the bottom of the JSX:
```tsx
        {/* Remove: */}
        {state === 'empty' ? (
          <RecentSessionsList state="empty" basePath={basePath} />
        ) : (
          <RecentSessionsList state={state} sessions={sessionRows} basePath={basePath} />
        )}

        {/* Add: */}
        <MiniWorkoutCalendar basePath={basePath} />
```

Also remove the `pbs` variable from `Promise.all` since it's no longer used for `sessionRows`. Check if `pbs` is still used for `monthStats.prs` — yes it is (`pbs.filter(...).length`). Keep `pbs` in `Promise.all`.

Also remove `recent` from `Promise.all` if it's only used for `sessionRows` and `renderFreestyleCard`. Check: `recent` is also used for `hasUsedTemplate`, `last14Days`, and `renderFreestyleCard`. Keep `recent`.

- [ ] **Step 3: Run lint + type check**

```bash
pnpm lint --max-warnings 0
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/self-tracking/mini-workout-calendar.tsx \
        src/components/self-tracking/my-training-landing.tsx
git commit -m "feat(ui): MiniWorkoutCalendar replaces RecentSessionsList in My Training"
```

---

## Task 10: Repository `findByUserDateRange` + API `/api/me/workout-logs/range`

**Files:**
- Modify: `src/lib/repositories/self-workout-log.repository.ts`
- Create: `src/app/api/me/workout-logs/range/route.ts`
- Create: `__tests__/app/api/me/workout-logs-range.test.ts`

- [ ] **Step 1: Add `findByUserDateRange` to repository**

Add to `ISelfWorkoutLogRepository` interface (after `findByUserMonth`):
```typescript
findByUserDateRange(userId: string, start: Date, end: Date): Promise<ISelfWorkoutLog[]>;
```

Add implementation to `MongoSelfWorkoutLogRepository` (after `findByUserMonth`):
```typescript
  async findByUserDateRange(userId: string, start: Date, end: Date): Promise<ISelfWorkoutLog[]> {
    return SelfWorkoutLogModel.find({
      userId: oid(userId),
      startedAt: { $gte: start, $lt: end },
    }).sort({ startedAt: 1 });
  }
```

- [ ] **Step 2: Write failing test for the route**

Create `__tests__/app/api/me/workout-logs-range.test.ts`:

```typescript
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { GET } from '@/app/api/me/workout-logs/range/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockSelfRepo = jest.mocked(MongoSelfWorkoutLogRepository);
const USER = '507f1f77bcf86cd799439011';

describe('GET /api/me/workout-logs/range', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when start or end missing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const res = await GET(new Request('http://x/api/me/workout-logs/range'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when dates are invalid', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const res = await GET(new Request('http://x/api/me/workout-logs/range?start=bad&end=bad'));
    expect(res.status).toBe(400);
  });

  it('returns logs in the date range as shaped DTOs', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const fakeLogs = [
      {
        _id: { toString: () => 'log1' },
        dayName: 'Push',
        startedAt: new Date('2026-05-12T09:00:00Z'),
        completedAt: new Date('2026-05-12T10:00:00Z'),
        sets: [{}, {}],
        rpe: 8,
      },
    ];
    const findByUserDateRange = jest.fn().mockResolvedValue(fakeLogs);
    mockSelfRepo.mockImplementation(
      () => ({ findByUserDateRange }) as unknown as MongoSelfWorkoutLogRepository,
    );
    const res = await GET(
      new Request(
        'http://x/api/me/workout-logs/range?start=2026-05-11T00:00:00Z&end=2026-05-18T00:00:00Z',
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      _id: string;
      dayName: string;
      startedAt: string;
      completedAt: string | null;
      setCount: number;
      rpe: number | null;
    }>;
    expect(body).toHaveLength(1);
    expect(body[0]._id).toBe('log1');
    expect(body[0].dayName).toBe('Push');
    expect(body[0].setCount).toBe(2);
    expect(body[0].rpe).toBe(8);
    expect(body[0].completedAt).toBe('2026-05-12T10:00:00.000Z');
    expect(findByUserDateRange).toHaveBeenCalledWith(
      USER,
      new Date('2026-05-11T00:00:00Z'),
      new Date('2026-05-18T00:00:00Z'),
    );
  });

  it('returns 403 when guard fails', async () => {
    const forbidden = Response.json({ error: 'Forbidden' }, { status: 403 });
    mockGuard.mockResolvedValue({ ok: false, response: forbidden });
    const res = await GET(new Request('http://x/api/me/workout-logs/range?start=2026-05-11T00:00:00Z&end=2026-05-18T00:00:00Z'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern="workout-logs-range" --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 4: Create the route file**

```typescript
// src/app/api/me/workout-logs/range/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

export async function GET(req: Request): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  if (!startParam || !endParam) {
    return Response.json({ error: 'start and end required' }, { status: 400 });
  }

  const start = new Date(startParam);
  const end = new Date(endParam);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: 'invalid date' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const logs = await repo.findByUserDateRange(guard.userId, start, end);

  return Response.json(
    logs.map((l) => ({
      _id: l._id.toString(),
      dayName: l.dayName,
      startedAt: l.startedAt.toISOString(),
      completedAt: l.completedAt ? l.completedAt.toISOString() : null,
      setCount: l.sets.length,
      rpe: l.rpe,
    })),
  );
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern="workout-logs-range" --no-coverage
```

Expected: all 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/repositories/self-workout-log.repository.ts \
        src/app/api/me/workout-logs/range/route.ts \
        __tests__/app/api/me/workout-logs-range.test.ts
git commit -m "feat(api): add GET /api/me/workout-logs/range endpoint"
```

---

## Task 11: `SelfWeekCalendarGrid` component

**Files:**
- Create: `src/components/self-tracking/self-week-calendar-grid.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/self-tracking/self-week-calendar-grid.tsx
import { cn } from '@/lib/utils';

export interface SelfCalendarLog {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  setCount: number;
  rpe: number | null;
}

interface Props {
  logs: SelfCalendarLog[];
  weekStart: Date;
  onEventClick: (logId: string) => void;
}

const HOUR_START = 5;
const HOUR_END = 23;
const SLOT_HEIGHT = 48;

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function dayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1; // Mon=0 … Sun=6
}

function topPx(date: Date): number {
  const minutesFromStart = (date.getHours() - HOUR_START) * 60 + date.getMinutes();
  return Math.max(0, (minutesFromStart / 30) * SLOT_HEIGHT);
}

function heightPx(startIso: string, endIso: string | null): number {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date(start.getTime() + 3_600_000);
  const durationMin = Math.max(30, (end.getTime() - start.getTime()) / 60_000);
  return (durationMin / 30) * SLOT_HEIGHT;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const totalGridHeight = (HOUR_END - HOUR_START) * 2 * SLOT_HEIGHT;
const hourCount = HOUR_END - HOUR_START;

export function SelfWeekCalendarGrid({ logs, weekStart, onEventClick }: Props) {
  const weekDates = getWeekDates(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logsByDay = new Map<number, SelfCalendarLog[]>();
  for (const log of logs) {
    const d = new Date(log.startedAt);
    const idx = dayIndex(d);
    const existing = logsByDay.get(idx) ?? [];
    existing.push(log);
    logsByDay.set(idx, existing);
  }

  return (
    <div className="overflow-auto">
      {/* Day headers */}
      <div className="flex ml-14 border-b border-foreground/10">
        {weekDates.map((date, i) => {
          const isToday = date.getTime() === today.getTime();
          return (
            <div
              key={i}
              className={cn(
                'flex-1 text-center py-2',
                isToday && 'text-foreground font-semibold',
                !isToday && 'text-foreground/65',
              )}
            >
              <div className="text-[10px] uppercase tracking-wider">{DAY_SHORT[i]}</div>
              <div className={cn(
                'text-[13px] mt-0.5',
                isToday && 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background font-bold text-[11px]',
              )}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex" style={{ height: totalGridHeight }}>
        {/* Hour labels */}
        <div className="w-14 shrink-0 relative">
          {Array.from({ length: hourCount }, (_, i) => (
            <div
              key={i}
              style={{ top: i * 2 * SLOT_HEIGHT }}
              className="absolute right-2 text-[9px] text-foreground/40 tabular-nums"
            >
              {String(HOUR_START + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex-1 border-l border-foreground/5 relative"
          >
            {/* Hour lines */}
            {Array.from({ length: hourCount * 2 }, (_, i) => (
              <div
                key={i}
                style={{ top: i * SLOT_HEIGHT }}
                className={cn(
                  'absolute w-full border-t',
                  i % 2 === 0 ? 'border-foreground/5' : 'border-foreground/[0.03]',
                )}
              />
            ))}

            {/* Events */}
            {(logsByDay.get(colIdx) ?? []).map((log) => {
              const top = topPx(new Date(log.startedAt));
              const height = heightPx(log.startedAt, log.completedAt);
              const isActive = log.completedAt === null;
              return (
                <button
                  key={log._id}
                  onClick={() => onEventClick(log._id)}
                  style={{ top, height, minHeight: SLOT_HEIGHT }}
                  className={cn(
                    'absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left overflow-hidden transition-opacity hover:opacity-80',
                    isActive
                      ? 'bg-sky-500/20 ring-1 ring-sky-500/40'
                      : 'bg-emerald-500/15 ring-1 ring-emerald-500/30',
                  )}
                >
                  <div
                    className={cn(
                      'text-[11px] font-semibold truncate leading-tight',
                      isActive ? 'text-sky-300' : 'text-emerald-300',
                    )}
                  >
                    {log.dayName}
                  </div>
                  <div
                    className={cn(
                      'text-[9px] mt-0.5',
                      isActive ? 'text-sky-300/65' : 'text-emerald-300/65',
                    )}
                  >
                    {formatTime(log.startedAt)}
                    {log.setCount > 0 && ` · ${log.setCount} sets`}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint check**

```bash
pnpm lint --max-warnings 0
```

- [ ] **Step 3: Commit**

```bash
git add src/components/self-tracking/self-week-calendar-grid.tsx
git commit -m "feat(ui): add SelfWeekCalendarGrid for self-tracking weekly timeline"
```

---

## Task 12: `SelfWorkoutCalendarClient` + calendar pages

**Files:**
- Create: `src/components/self-tracking/self-workout-calendar-client.tsx`
- Create: `src/app/(dashboard)/owner/my-training/calendar/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-training/calendar/page.tsx`

- [ ] **Step 1: Create `SelfWorkoutCalendarClient`**

```typescript
// src/components/self-tracking/self-workout-calendar-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SelfWeekCalendarGrid, type SelfCalendarLog } from './self-week-calendar-grid';

type BasePath = '/owner/my-training' | '/trainer/my-training';

interface Props {
  basePath: BasePath;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function SelfWorkoutCalendarClient({ basePath }: Props) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [logs, setLogs] = useState<SelfCalendarLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    setLoading(true);
    fetch(
      `/api/me/workout-logs/range?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
    )
      .then((r) => r.json())
      .then((data: SelfCalendarLog[]) => {
        if (!cancelled) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  function prevWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() - 7);
      return n;
    });
  }

  function nextWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() + 7);
      return n;
    });
  }

  function goToday() {
    setWeekStart(getMonday(new Date()));
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const headerLabel = `${weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 sm:px-8 py-3 border-b border-foreground/10 shrink-0">
        <button
          onClick={prevWeek}
          aria-label="Previous week"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={nextWeek}
          aria-label="Next week"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={goToday}
          className="text-[12px] px-2.5 py-1 rounded-md border border-foreground/15 text-foreground/65 hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Today
        </button>
        <span className="text-[13px] text-foreground/65">{headerLabel}</span>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-8 py-4">
        {loading ? (
          <div className="text-sm text-foreground/65 py-8 text-center">Loading…</div>
        ) : (
          <SelfWeekCalendarGrid
            logs={logs}
            weekStart={weekStart}
            onEventClick={(id) => router.push(`${basePath}/session/${id}`)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create owner calendar page**

```typescript
// src/app/(dashboard)/owner/my-training/calendar/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { SelfWorkoutCalendarClient } from '@/components/self-tracking/self-workout-calendar-client';

export default async function OwnerMyTrainingCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Training Calendar" subtitle="Your workout history" />
      <SelfWorkoutCalendarClient basePath="/owner/my-training" />
    </div>
  );
}
```

- [ ] **Step 3: Create trainer calendar page**

```typescript
// src/app/(dashboard)/trainer/my-training/calendar/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { SelfWorkoutCalendarClient } from '@/components/self-tracking/self-workout-calendar-client';

export default async function TrainerMyTrainingCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Training Calendar" subtitle="Your workout history" />
      <SelfWorkoutCalendarClient basePath="/trainer/my-training" />
    </div>
  );
}
```

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build succeeds (no TypeScript errors)

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/self-workout-calendar-client.tsx \
        src/app/(dashboard)/owner/my-training/calendar/page.tsx \
        src/app/(dashboard)/trainer/my-training/calendar/page.tsx
git commit -m "feat: add self-tracking weekly calendar at /my-training/calendar"
```

---

## Final verification

- [ ] **Run full test suite**

```bash
pnpm test --no-coverage 2>&1 | tail -10
```

Expected: all tests pass, 0 failures

- [ ] **Run lint**

```bash
pnpm lint --max-warnings 0
```

Expected: no errors

- [ ] **Run build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: build succeeds

---

## Spec coverage check

| Spec requirement | Covered by |
|---|---|
| One completed session per day (hard gate) | Tasks 1, 2 |
| DAY_ALREADY_LOGGED dialog at FreestylePathCard | Task 4 |
| DAY_ALREADY_LOGGED dialog at TemplatePathCard | Task 5 |
| Multi-tab: 404 → toast + redirect | Task 6 |
| Completed session read-only (timer, no Finish, no Add Set) | Tasks 7, 8 |
| Mini calendar replaces Recent Sessions list | Task 9 |
| "View calendar →" link in mini calendar | Task 9 |
| Range API for weekly calendar | Task 10 |
| Weekly timeline calendar grid | Task 11 |
| Calendar pages at /owner/my-training/calendar + /trainer/my-training/calendar | Task 12 |
