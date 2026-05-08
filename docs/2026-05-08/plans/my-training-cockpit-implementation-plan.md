# My Training Cockpit Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `My Training` landing (`/trainer/my-training` and `/owner/my-training`) with a dual-path Cockpit (From Template / Freestyle, equal weight) that degrades gracefully across Full / Light / Empty data states.

**Architecture:** New server component `MyTrainingLanding` composes four sibling regions (header, activity strip, hero cockpit, recent sessions). Each region is a standalone component with explicit sub-states keyed by props — no conditional region rendering at the page level. Three new repo methods (`findRecent`, `findLastByTemplate`, plus a new `SelfPersonalBest` model + repo) feed the landing. Empty state suggests three hard-coded preset frameworks that route to `/trainer/plans/new?preset=<key>` with prefill.

**Tech Stack:** Next.js (App Router) server components + client islands, Mongoose, Jest + RTL, Playwright. Existing project conventions (repository pattern, role-guard middleware, `text-foreground/65` token discipline).

**Reference design:** `docs/2026-05-08/plans/my-training-cockpit-design.md`
**Reference mock:** `docs/2026-05-08/mockups/my-training-cockpit.html`

**Spec drift / simplifications (already validated against the codebase):**
1. The spec's `PresetTemplatePicker` is **inlined** into `TemplatePathCard`'s empty branch — it's only used in that one spot, so a separate file would be needless indirection. The 3 preset rows live directly inside the `EmptyCard` sub-component.
2. The spec describes "extract Epley into a shared `lib/training/one-rep-max.ts` helper". `lib/training/epley.ts` already exists and is already shared (used by `personal-best.repository.ts` and `workout-session.repository.ts`). Plan reuses it directly; no extraction needed.
3. The "Pick another day" secondary button on `TemplatePathCard` opens the existing `TemplateDayPickerDialog` component (already wired and used by the legacy `StartWorkoutCard`). No new picker is built.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/db/models/self-personal-best.model.ts` | Mongoose model, `userId`-indexed PB record |
| `src/lib/repositories/self-personal-best.repository.ts` | Interface + Mongo impl: `findByUser`, `upsertIfBetter` |
| `src/lib/training/preset-plans.ts` | 3 hard-coded preset framework definitions (PPL / Upper-Lower / Full Body) shared by landing + plans-new |
| `src/components/self-tracking/my-training-landing.tsx` | Server component: fetches data, computes state, composes regions |
| `src/components/self-tracking/activity-strip.tsx` | 3-state strip (heatmap+stats / sparse+nudge / 3-step onboarding) |
| `src/components/self-tracking/template-path-card.tsx` | Left hero card with three sub-states |
| `src/components/self-tracking/freestyle-path-card.tsx` | Right hero card with three sub-states |
| `src/components/self-tracking/recent-sessions-list.tsx` | Footer list with three sub-states |
| `src/components/self-tracking/preset-template-picker.tsx` | Client island: 3 preset rows that `router.push` to plans-new |
| `__tests__/lib/repositories/self-workout-log.repository.recent.test.ts` | Unit tests for new repo methods |
| `__tests__/lib/repositories/self-personal-best.repository.test.ts` | Unit tests for new PB repo |
| `__tests__/components/self-tracking/my-training-landing.test.tsx` | State-detection + region composition tests |
| `__tests__/components/self-tracking/template-path-card.test.tsx` | Sub-state rendering |
| `__tests__/components/self-tracking/freestyle-path-card.test.tsx` | Sub-state rendering |
| `__tests__/components/self-tracking/activity-strip.test.tsx` | Sub-state rendering |
| `__tests__/components/self-tracking/recent-sessions-list.test.tsx` | Sub-state rendering |
| `e2e/trainer/my-training-cockpit.spec.ts` | Playwright: 3 user-flow scenarios |

### Modified files

| Path | Change |
|---|---|
| `src/lib/repositories/self-workout-log.repository.ts` | Add `findRecent(userId, limit)` and `findLastByTemplate(userId)` to interface + impl |
| `src/app/api/me/workout-logs/[id]/complete/route.ts` | After complete, scan log sets and call `SelfPersonalBest.upsertIfBetter` per exercise |
| `src/app/(dashboard)/trainer/plans/new/page.tsx` | Read `searchParams.preset`, pass through |
| `src/app/(dashboard)/trainer/plans/new/_client.tsx` | Accept `presetKey?: string`, prefill `name` + `days` from `preset-plans.ts` when present |
| `src/app/(dashboard)/trainer/my-training/page.tsx` | Replace body with `<MyTrainingLanding basePath="/trainer/my-training" />` |
| `src/app/(dashboard)/owner/my-training/page.tsx` | Same swap with `basePath="/owner/my-training"` |

### Deleted files

| Path | Reason |
|---|---|
| `src/components/self-tracking/start-workout-card.tsx` | Replaced by `MyTrainingLanding` |

---

## Phase A — Data Layer

### Task A1: Add `findRecent` and `findLastByTemplate` to `SelfWorkoutLogRepository`

**Files:**
- Modify: `src/lib/repositories/self-workout-log.repository.ts`
- Test: `__tests__/lib/repositories/self-workout-log.repository.recent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/repositories/self-workout-log.repository.recent.test.ts`:

```ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await SelfWorkoutLogModel.deleteMany({});
});

const userId = new mongoose.Types.ObjectId().toString();
const tplA = new mongoose.Types.ObjectId().toString();

async function seedLog(opts: {
  daysAgo: number;
  templateId?: string | null;
  dayName?: string;
  completed?: boolean;
}) {
  const completedAt = opts.completed === false ? null : new Date(Date.now() - opts.daysAgo * 86400000);
  return SelfWorkoutLogModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    startedAt: new Date(Date.now() - opts.daysAgo * 86400000 - 3600000),
    completedAt,
    sourceTemplateId: opts.templateId ? new mongoose.Types.ObjectId(opts.templateId) : null,
    sourceTemplateDayNumber: opts.templateId ? 2 : null,
    dayName: opts.dayName ?? 'Push',
    sets: [],
    rpe: null,
    note: null,
  });
}

describe('SelfWorkoutLogRepository — findRecent', () => {
  it('returns most-recently-completed logs first, capped at limit', async () => {
    await seedLog({ daysAgo: 5, dayName: 'A' });
    await seedLog({ daysAgo: 1, dayName: 'B' });
    await seedLog({ daysAgo: 3, dayName: 'C' });
    await seedLog({ daysAgo: 10, dayName: 'D' });

    const repo = new MongoSelfWorkoutLogRepository();
    const recent = await repo.findRecent(userId, 3);

    expect(recent.map((l) => l.dayName)).toEqual(['B', 'C', 'A']);
  });

  it('excludes logs that are not completed', async () => {
    await seedLog({ daysAgo: 1, dayName: 'Active', completed: false });
    await seedLog({ daysAgo: 2, dayName: 'Done' });

    const repo = new MongoSelfWorkoutLogRepository();
    const recent = await repo.findRecent(userId, 5);

    expect(recent.map((l) => l.dayName)).toEqual(['Done']);
  });
});

describe('SelfWorkoutLogRepository — findLastByTemplate', () => {
  it('returns null when no log has a sourceTemplateId', async () => {
    await seedLog({ daysAgo: 1 });
    await seedLog({ daysAgo: 2 });

    const repo = new MongoSelfWorkoutLogRepository();
    expect(await repo.findLastByTemplate(userId)).toBeNull();
  });

  it('returns the most recent log that has a sourceTemplateId', async () => {
    await seedLog({ daysAgo: 1, dayName: 'Freestyle' });
    await seedLog({ daysAgo: 3, templateId: tplA, dayName: 'Push' });
    await seedLog({ daysAgo: 5, templateId: tplA, dayName: 'Pull' });

    const repo = new MongoSelfWorkoutLogRepository();
    const last = await repo.findLastByTemplate(userId);

    expect(last?.dayName).toBe('Push');
    expect(last?.sourceTemplateId?.toString()).toBe(tplA);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns self-workout-log.repository.recent`
Expected: FAIL — `repo.findRecent is not a function`

- [ ] **Step 3: Add to interface and impl**

Edit `src/lib/repositories/self-workout-log.repository.ts`. Add to the interface (after `findByUserMonth`):

```ts
findRecent(userId: string, limit: number): Promise<ISelfWorkoutLog[]>;
findLastByTemplate(userId: string): Promise<ISelfWorkoutLog | null>;
```

Add to `MongoSelfWorkoutLogRepository` (right after the existing `findByUserMonth` method body):

```ts
async findRecent(userId: string, limit: number): Promise<ISelfWorkoutLog[]> {
  return SelfWorkoutLogModel.find({
    userId: oid(userId),
    completedAt: { $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(limit);
}

async findLastByTemplate(userId: string): Promise<ISelfWorkoutLog | null> {
  return SelfWorkoutLogModel.findOne({
    userId: oid(userId),
    sourceTemplateId: { $ne: null },
    completedAt: { $ne: null },
  }).sort({ completedAt: -1 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest --testPathPatterns self-workout-log.repository.recent`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/self-workout-log.repository.ts __tests__/lib/repositories/self-workout-log.repository.recent.test.ts
git commit -m "feat(self-tracking): add findRecent + findLastByTemplate to repo"
```

---

### Task A2: Create `SelfPersonalBest` model + repository

**Files:**
- Create: `src/lib/db/models/self-personal-best.model.ts`
- Create: `src/lib/repositories/self-personal-best.repository.ts`
- Test: `__tests__/lib/repositories/self-personal-best.repository.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/repositories/self-personal-best.repository.test.ts`:

```ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { SelfPersonalBestModel } from '@/lib/db/models/self-personal-best.model';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await SelfPersonalBestModel.deleteMany({});
});

const userId = new mongoose.Types.ObjectId().toString();
const exA = new mongoose.Types.ObjectId().toString();
const logId = new mongoose.Types.ObjectId().toString();

describe('SelfPersonalBestRepository', () => {
  it('upserts when no PB exists yet', async () => {
    const repo = new MongoSelfPersonalBestRepository();
    const wasUpdated = await repo.upsertIfBetter({
      userId, exerciseId: exA, exerciseName: 'Bench', weight: 100, reps: 5, logId,
    });

    expect(wasUpdated).toBe(true);
    const all = await repo.findByUser(userId);
    expect(all).toHaveLength(1);
    expect(all[0].bestWeight).toBe(100);
    expect(all[0].estimatedOneRM).toBeCloseTo(116.67, 1);
  });

  it('does not update when new estimated 1RM is lower', async () => {
    const repo = new MongoSelfPersonalBestRepository();
    await repo.upsertIfBetter({ userId, exerciseId: exA, exerciseName: 'Bench', weight: 100, reps: 5, logId });
    const wasUpdated = await repo.upsertIfBetter({
      userId, exerciseId: exA, exerciseName: 'Bench', weight: 90, reps: 5, logId,
    });

    expect(wasUpdated).toBe(false);
    const all = await repo.findByUser(userId);
    expect(all[0].bestWeight).toBe(100);
  });

  it('updates when new estimated 1RM is higher', async () => {
    const repo = new MongoSelfPersonalBestRepository();
    await repo.upsertIfBetter({ userId, exerciseId: exA, exerciseName: 'Bench', weight: 100, reps: 5, logId });
    const wasUpdated = await repo.upsertIfBetter({
      userId, exerciseId: exA, exerciseName: 'Bench', weight: 105, reps: 5, logId,
    });

    expect(wasUpdated).toBe(true);
    const all = await repo.findByUser(userId);
    expect(all[0].bestWeight).toBe(105);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns self-personal-best.repository`
Expected: FAIL — module not found

- [ ] **Step 3: Create model**

Create `src/lib/db/models/self-personal-best.model.ts`:

```ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISelfPersonalBest extends Document {
  userId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: Date;
  logId: mongoose.Types.ObjectId;
}

const SelfPersonalBestSchema = new Schema<ISelfPersonalBest>({
  userId: { type: Schema.Types.ObjectId, required: true },
  exerciseId: { type: Schema.Types.ObjectId, required: true },
  exerciseName: { type: String, required: true },
  bestWeight: { type: Number, required: true },
  bestReps: { type: Number, required: true },
  estimatedOneRM: { type: Number, required: true },
  achievedAt: { type: Date, required: true },
  logId: { type: Schema.Types.ObjectId, required: true },
});

SelfPersonalBestSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

export const SelfPersonalBestModel: Model<ISelfPersonalBest> =
  mongoose.models.SelfPersonalBest ??
  mongoose.model<ISelfPersonalBest>('SelfPersonalBest', SelfPersonalBestSchema);
```

- [ ] **Step 4: Create repository**

Create `src/lib/repositories/self-personal-best.repository.ts`:

```ts
import mongoose from 'mongoose';
import type { ISelfPersonalBest } from '@/lib/db/models/self-personal-best.model';
import { SelfPersonalBestModel } from '@/lib/db/models/self-personal-best.model';
import { estimatedOneRM } from '@/lib/training/epley';

export interface UpsertSelfPBData {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  logId: string;
}

export interface ISelfPersonalBestRepository {
  findByUser(userId: string): Promise<ISelfPersonalBest[]>;
  upsertIfBetter(data: UpsertSelfPBData): Promise<boolean>;
}

const oid = (s: string) => new mongoose.Types.ObjectId(s);

export class MongoSelfPersonalBestRepository implements ISelfPersonalBestRepository {
  async findByUser(userId: string): Promise<ISelfPersonalBest[]> {
    return SelfPersonalBestModel.find({ userId: oid(userId) });
  }

  async upsertIfBetter(data: UpsertSelfPBData): Promise<boolean> {
    const newEstimated = estimatedOneRM(data.weight, data.reps);
    try {
      const result = await SelfPersonalBestModel.updateOne(
        {
          userId: oid(data.userId),
          exerciseId: oid(data.exerciseId),
          $or: [{ estimatedOneRM: { $lt: newEstimated } }, { estimatedOneRM: { $exists: false } }],
        },
        {
          $set: {
            exerciseName: data.exerciseName,
            bestWeight: data.weight,
            bestReps: data.reps,
            estimatedOneRM: newEstimated,
            achievedAt: new Date(),
            logId: oid(data.logId),
          },
        },
        { upsert: true },
      );
      return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      return false;
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm jest --testPathPatterns self-personal-best.repository`
Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/models/self-personal-best.model.ts src/lib/repositories/self-personal-best.repository.ts __tests__/lib/repositories/self-personal-best.repository.test.ts
git commit -m "feat(self-tracking): add SelfPersonalBest model + repo"
```

---

### Task A3: Trigger PB upsert on session complete

**Files:**
- Modify: `src/app/api/me/workout-logs/[id]/complete/route.ts`
- Test: `__tests__/app/api/me/workout-logs/complete-pb.test.ts`

- [ ] **Step 1: Read the existing complete route**

Read `src/app/api/me/workout-logs/[id]/complete/route.ts` to understand the current handler shape — note imports, how it accesses session, and what it returns.

- [ ] **Step 2: Write the failing integration test**

Create `__tests__/app/api/me/workout-logs/complete-pb.test.ts`:

```ts
import { POST } from '@/app/api/me/workout-logs/[id]/complete/route';
import { auth } from '@/lib/auth/auth';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { connectDB } from '@/lib/db/connect';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/lib/auth/auth');
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

let mongo: MongoMemoryServer;
const userId = new mongoose.Types.ObjectId().toString();
const exA = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  (connectDB as jest.Mock).mockResolvedValue(undefined);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  (auth as jest.Mock).mockResolvedValue({ user: { id: userId, role: 'trainer' } });
  await mongoose.connection.dropDatabase();
});

describe('POST /api/me/workout-logs/[id]/complete — PB hook', () => {
  it('records a PB for the heaviest set per exercise on complete', async () => {
    const logRepo = new MongoSelfWorkoutLogRepository();
    const log = await logRepo.create({
      userId,
      startedAt: new Date(),
      sourceTemplateId: null,
      sourceTemplateDayNumber: null,
      dayName: 'Freestyle',
      sets: [
        { exerciseId: new mongoose.Types.ObjectId(exA), exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: null, prescribedRepsMax: null, actualWeight: 90, actualReps: 5, completedAt: new Date() },
        { exerciseId: new mongoose.Types.ObjectId(exA), exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 2, prescribedRepsMin: null, prescribedRepsMax: null, actualWeight: 100, actualReps: 5, completedAt: new Date() },
      ],
    });

    const req = new Request(`http://localhost/api/me/workout-logs/${log._id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ rpe: 8, note: null }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: log._id.toString() }) });
    expect(res.status).toBe(200);

    const pbs = await new MongoSelfPersonalBestRepository().findByUser(userId);
    expect(pbs).toHaveLength(1);
    expect(pbs[0].bestWeight).toBe(100);
    expect(pbs[0].bestReps).toBe(5);
  });

  it('skips sets with null weight or reps', async () => {
    const logRepo = new MongoSelfWorkoutLogRepository();
    const log = await logRepo.create({
      userId,
      startedAt: new Date(),
      sourceTemplateId: null,
      sourceTemplateDayNumber: null,
      dayName: 'Freestyle',
      sets: [
        { exerciseId: new mongoose.Types.ObjectId(exA), exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: null, prescribedRepsMax: null, actualWeight: null, actualReps: null, completedAt: null },
      ],
    });

    const req = new Request(`http://localhost/api/me/workout-logs/${log._id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ rpe: null, note: null }),
    });
    await POST(req, { params: Promise.resolve({ id: log._id.toString() }) });

    const pbs = await new MongoSelfPersonalBestRepository().findByUser(userId);
    expect(pbs).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns complete-pb`
Expected: FAIL — `pbs` is empty (no PB hook yet)

- [ ] **Step 4: Modify the complete route**

Edit `src/app/api/me/workout-logs/[id]/complete/route.ts`. After the existing `complete()` call, before returning the response, add:

```ts
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
// ... existing imports

// after `const updated = await repo.complete(id, userId, rpe, note);` and before `return NextResponse.json(updated);`:
if (updated) {
  const pbRepo = new MongoSelfPersonalBestRepository();
  const heaviestPerExercise = new Map<string, { weight: number; reps: number; exerciseName: string }>();
  for (const s of updated.sets) {
    if (s.actualWeight == null || s.actualReps == null) continue;
    const key = s.exerciseId.toString();
    const cur = heaviestPerExercise.get(key);
    const candidate = { weight: s.actualWeight, reps: s.actualReps, exerciseName: s.exerciseName };
    if (!cur || candidate.weight * (1 + candidate.reps / 30) > cur.weight * (1 + cur.reps / 30)) {
      heaviestPerExercise.set(key, candidate);
    }
  }
  await Promise.all(
    Array.from(heaviestPerExercise.entries()).map(([exerciseId, set]) =>
      pbRepo.upsertIfBetter({
        userId,
        exerciseId,
        exerciseName: set.exerciseName,
        weight: set.weight,
        reps: set.reps,
        logId: id,
      }),
    ),
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm jest --testPathPatterns complete-pb`
Expected: PASS — 2 tests

- [ ] **Step 6: Run all repo + complete tests as regression check**

Run: `pnpm jest --testPathPatterns "self-(personal-best|workout-log)|complete"`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/me/workout-logs/[id]/complete/route.ts __tests__/app/api/me/workout-logs/complete-pb.test.ts
git commit -m "feat(self-tracking): record PBs on workout-log complete"
```

---

## Phase B — Preset Plan Support

### Task B1: Define preset frameworks + plumb `?preset=` through `/trainer/plans/new`

**Files:**
- Create: `src/lib/training/preset-plans.ts`
- Modify: `src/app/(dashboard)/trainer/plans/new/page.tsx`
- Modify: `src/app/(dashboard)/trainer/plans/new/_client.tsx`
- Test: `__tests__/lib/training/preset-plans.test.ts`

- [ ] **Step 1: Write the failing test for the preset registry**

Create `__tests__/lib/training/preset-plans.test.ts`:

```ts
import { PRESET_PLANS, getPresetPlan, isPresetKey } from '@/lib/training/preset-plans';

describe('preset plans', () => {
  it('exposes 3 preset frameworks', () => {
    expect(Object.keys(PRESET_PLANS)).toEqual(['ppl', 'upper-lower', 'full-body']);
  });

  it('each preset has name, dayCount, days[] with name + empty exercises', () => {
    for (const key of Object.keys(PRESET_PLANS)) {
      const p = PRESET_PLANS[key];
      expect(p.name).toBeTruthy();
      expect(p.summary).toBeTruthy();
      expect(p.dayCount).toBeGreaterThan(0);
      expect(p.days).toHaveLength(p.dayCount);
      for (const d of p.days) {
        expect(d.name).toBeTruthy();
        expect(Array.isArray(d.exercises)).toBe(true);
      }
    }
  });

  it('isPresetKey narrows correctly', () => {
    expect(isPresetKey('ppl')).toBe(true);
    expect(isPresetKey('nope')).toBe(false);
  });

  it('getPresetPlan returns null for unknown key', () => {
    expect(getPresetPlan('nope')).toBeNull();
    expect(getPresetPlan('ppl')?.name).toBe('Push · Pull · Legs');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns preset-plans`
Expected: FAIL — module not found

- [ ] **Step 3: Create the preset registry**

Create `src/lib/training/preset-plans.ts`:

```ts
export interface PresetPlanDay {
  name: string;
  exercises: never[]; // intentionally empty — trainer fills exercises in the editor
}

export interface PresetPlan {
  name: string;
  summary: string;
  dayCount: number;
  days: PresetPlanDay[];
}

export const PRESET_PLANS: Record<string, PresetPlan> = {
  ppl: {
    name: 'Push · Pull · Legs',
    summary: '6 days · 3 day-groups · classic split',
    dayCount: 6,
    days: [
      { name: 'Push A', exercises: [] },
      { name: 'Pull A', exercises: [] },
      { name: 'Legs A', exercises: [] },
      { name: 'Push B', exercises: [] },
      { name: 'Pull B', exercises: [] },
      { name: 'Legs B', exercises: [] },
    ],
  },
  'upper-lower': {
    name: 'Upper / Lower',
    summary: '4 days · 2 day-groups · time-friendly',
    dayCount: 4,
    days: [
      { name: 'Upper A', exercises: [] },
      { name: 'Lower A', exercises: [] },
      { name: 'Upper B', exercises: [] },
      { name: 'Lower B', exercises: [] },
    ],
  },
  'full-body': {
    name: 'Full Body',
    summary: '3 days · single rotation · beginner-friendly',
    dayCount: 3,
    days: [
      { name: 'Full Body A', exercises: [] },
      { name: 'Full Body B', exercises: [] },
      { name: 'Full Body C', exercises: [] },
    ],
  },
};

export function isPresetKey(key: string): boolean {
  return key in PRESET_PLANS;
}

export function getPresetPlan(key: string): PresetPlan | null {
  return PRESET_PLANS[key] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest --testPathPatterns preset-plans`
Expected: PASS — 4 tests

- [ ] **Step 5: Plumb `?preset=` through the plans-new page**

Edit `src/app/(dashboard)/trainer/plans/new/page.tsx`:

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { getPresetPlan } from '@/lib/training/preset-plans';
import { NewPlanClient } from './_client';

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const exercises = await new MongoExerciseRepository().findAll({ creatorId: session.user.id });
  const { preset } = await searchParams;
  const presetPlan = preset ? getPresetPlan(preset) : null;
  return (
    <NewPlanClient
      exercises={JSON.parse(JSON.stringify(exercises))}
      backPath="/trainer/plans"
      presetPlan={presetPlan}
    />
  );
}
```

- [ ] **Step 6: Accept preset in `_client.tsx` and prefill initial state**

Read `src/app/(dashboard)/trainer/plans/new/_client.tsx` first to find where the initial `name` and `days` state is set up — every codebase does this slightly differently. Add to the props interface:

```ts
import type { PresetPlan } from '@/lib/training/preset-plans';

interface NewPlanClientProps {
  exercises: /* existing */;
  backPath: string;
  presetPlan?: PresetPlan | null;
}
```

In the component, when initializing the form state (look for `useState<...>(...)` calls for `name` and `days`), use the preset's values as the default when present:

```tsx
const [name, setName] = useState(presetPlan?.name ?? '');
const [days, setDays] = useState(
  presetPlan
    ? presetPlan.days.map((d, i) => ({ dayNumber: i + 1, name: d.name, exercises: [] }))
    : [/* existing initial value */],
);
```

(If the existing initial state structure is different, mirror its shape — the goal is: when `presetPlan` is non-null, preload the name and the day skeletons; the trainer still fills exercises themselves.)

- [ ] **Step 7: Manual smoke check**

Run `pnpm dev` in another terminal. Visit `http://localhost:3000/trainer/plans/new?preset=ppl` and verify:
- Plan name field shows "Push · Pull · Legs"
- Day list shows 6 days named Push A / Pull A / Legs A / Push B / Pull B / Legs B with no exercises

Visit `/trainer/plans/new` (no preset) and verify the original blank form still shows.

- [ ] **Step 8: Commit**

```bash
git add src/lib/training/preset-plans.ts __tests__/lib/training/preset-plans.test.ts src/app/\(dashboard\)/trainer/plans/new/page.tsx src/app/\(dashboard\)/trainer/plans/new/_client.tsx
git commit -m "feat(plans): support ?preset= prefill on /trainer/plans/new"
```

---

## Phase C — Landing Components

### Task C1: `ActivityStrip` component with three sub-states

**Files:**
- Create: `src/components/self-tracking/activity-strip.tsx`
- Test: `__tests__/components/self-tracking/activity-strip.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/self-tracking/activity-strip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ActivityStrip } from '@/components/self-tracking/activity-strip';

describe('ActivityStrip', () => {
  it('renders heatmap + month stats in Full state', () => {
    render(
      <ActivityStrip
        state="full"
        last14Days={[true, true, false, true, true, true, false, true, false, true, true, true, false, true]}
        monthStats={{ sessions: 9, sets: 412, avgRpe: 7.4, prs: 3 }}
      />,
    );
    expect(screen.getByText(/9/)).toBeInTheDocument();
    expect(screen.getByText(/sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('renders sparse heatmap + nudge in Light state', () => {
    render(
      <ActivityStrip
        state="light"
        last14Days={[false, false, false, true, false, false, false, false, true, false, false, false, false, false]}
        sessionCount={2}
      />,
    );
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/build a streak/i)).toBeInTheDocument();
  });

  it('renders 3-step onboarding in Empty state', () => {
    render(<ActivityStrip state="empty" />);
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a path/i)).toBeInTheDocument();
    expect(screen.getByText(/log sets/i)).toBeInTheDocument();
    expect(screen.getByText(/mark complete/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns activity-strip`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the component**

Create `src/components/self-tracking/activity-strip.tsx`:

```tsx
interface FullProps {
  state: 'full';
  last14Days: boolean[];
  monthStats: { sessions: number; sets: number; avgRpe: number; prs: number };
}
interface LightProps {
  state: 'light';
  last14Days: boolean[];
  sessionCount: number;
}
interface EmptyProps {
  state: 'empty';
}
type Props = FullProps | LightProps | EmptyProps;

export function ActivityStrip(props: Props) {
  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">
            Get started
          </span>
          <span className="text-[11px] text-foreground/30">3 quick steps · ~30s</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Step n={1} label="Pick a path" />
          <span className="text-foreground/30">›</span>
          <Step n={2} label="Log sets" />
          <span className="text-foreground/30">›</span>
          <Step n={3} label="Mark complete" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/30">
          Last 14 days
        </span>
        <div className="flex gap-[3px]">
          {props.last14Days.map((on, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-[3px] ${on ? 'bg-emerald-500/65' : 'bg-foreground/[0.05]'}`}
            />
          ))}
        </div>
      </div>
      {props.state === 'full' ? (
        <div className="flex items-center gap-4 text-[11px] tabular-nums text-foreground/65">
          <span><span className="text-foreground font-semibold">{props.monthStats.sessions}</span> sessions</span>
          <span><span className="text-foreground font-semibold">{props.monthStats.sets}</span> sets</span>
          <span><span className="text-foreground font-semibold">{props.monthStats.avgRpe.toFixed(1)}</span> avg RPE</span>
          <span className="text-amber-300/90"><span className="font-semibold">{props.monthStats.prs}</span> PRs</span>
        </div>
      ) : (
        <div className="text-[11px] tabular-nums text-foreground/65">
          <span className="text-foreground font-semibold">{props.sessionCount}</span> sessions
          <span className="text-foreground/30"> · </span>
          <span>Build a streak — log today.</span>
        </div>
      )}
    </div>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground/65">
      <span className="w-4 h-4 rounded-full ring-1 ring-foreground/10 text-[9px] tabular-nums font-bold flex items-center justify-center">{n}</span>
      {label}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest --testPathPatterns activity-strip`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/activity-strip.tsx __tests__/components/self-tracking/activity-strip.test.tsx
git commit -m "feat(self-tracking): ActivityStrip component (3-state)"
```

---

### Task C2: `TemplatePathCard` component with three sub-states

**Files:**
- Create: `src/components/self-tracking/template-path-card.tsx`
- Test: `__tests__/components/self-tracking/template-path-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/self-tracking/template-path-card.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatePathCard } from '@/components/self-tracking/template-path-card';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock('@/components/self-tracking/template-day-picker-dialog', () => ({
  TemplateDayPickerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="picker-dialog">picker open</div> : null,
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const sampleSet = {
  exerciseId: 'ex1',
  exerciseName: 'Bench',
  groupId: 'g1',
  isSuperset: false,
  isBodyweight: false,
  setNumber: 1,
  prescribedRepsMin: 6,
  prescribedRepsMax: 8,
  actualWeight: null,
  actualReps: null,
  completedAt: null,
};

describe('TemplatePathCard', () => {
  it('renders Full state with cycle-progress dots and Start button', () => {
    render(
      <TemplatePathCard
        state="full"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 3, dayName: 'Push' }}
        cycleSize={6}
        completedDayNumbers={[1, 2]}
        exercisePreview={[
          { name: 'Bench Press', prescribed: '4×6-8', lastWeight: 92.5 },
          { name: 'Overhead Press', prescribed: '3×8', lastWeight: 60 },
        ]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByText(/day 3/i)).toBeInTheDocument();
    expect(screen.getByText('Push · Pull · Legs')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start day 3/i })).toBeInTheDocument();
  });

  it('renders Light state without last weights', () => {
    render(
      <TemplatePathCard
        state="light"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 2, dayName: 'Pull' }}
        cycleSize={6}
        completedDayNumbers={[1]}
        exercisePreview={[{ name: 'Bench Press', prescribed: '4×6-8', lastWeight: null }]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByRole('button', { name: /start day 2/i })).toBeInTheDocument();
    expect(screen.queryByText(/last 9/)).not.toBeInTheDocument();
  });

  it('renders Empty state with preset list and Browse button', () => {
    render(<TemplatePathCard state="empty" basePath="/trainer/my-training" />);
    expect(screen.getByText(/pick a template/i)).toBeInTheDocument();
    expect(screen.getByText('Push · Pull · Legs')).toBeInTheDocument();
    expect(screen.getByText('Upper / Lower')).toBeInTheDocument();
    expect(screen.getByText('Full Body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse templates/i })).toBeInTheDocument();
  });

  it('"Start Day N" posts to /api/me/workout-logs and routes to the session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'log9' }) });
    render(
      <TemplatePathCard
        state="full"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 3, dayName: 'Push' }}
        cycleSize={6}
        completedDayNumbers={[1, 2]}
        exercisePreview={[]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /start day 3/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/workout-logs',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.dayName).toBe('Push');
    expect(body.sourceTemplateId).toBe('tpl1');
    expect(body.sourceTemplateDayNumber).toBe(3);
    expect(body.plannedSets).toHaveLength(1);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/trainer/my-training/session/log9'));
  });

  it('"Pick another day" opens the TemplateDayPickerDialog', () => {
    render(
      <TemplatePathCard
        state="full"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 3, dayName: 'Push' }}
        cycleSize={6}
        completedDayNumbers={[1, 2]}
        exercisePreview={[]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.queryByTestId('picker-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pick another day/i }));
    expect(screen.getByTestId('picker-dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns template-path-card`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the component**

Create `src/components/self-tracking/template-path-card.tsx`:

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PRESET_PLANS } from '@/lib/training/preset-plans';
import { TemplateDayPickerDialog } from '@/components/self-tracking/template-day-picker-dialog';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

type BasePath = '/trainer/my-training' | '/owner/my-training';

interface ExercisePreview {
  name: string;
  prescribed: string;
  lastWeight: number | null;
}
interface DataPropsBase {
  templateId: string;
  templateName: string;
  nextDay: { dayNumber: number; dayName: string };
  cycleSize: number;
  completedDayNumbers: number[];
  exercisePreview: ExercisePreview[];
  plannedSets: ISelfWorkoutSet[];
  basePath: BasePath;
}
interface FullProps extends DataPropsBase { state: 'full' }
interface LightProps extends DataPropsBase { state: 'light' }
interface EmptyProps {
  state: 'empty';
  basePath: BasePath;
}
type Props = FullProps | LightProps | EmptyProps;

export function TemplatePathCard(props: Props) {
  if (props.state === 'empty') return <EmptyCard {...props} />;
  return <DataCard {...props} />;
}

function DataCard(props: FullProps | LightProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const eyebrow = props.state === 'full' ? 'Next in rotation' : 'Repeat or rotate';

  async function start(payload: {
    templateId: string;
    dayNumber: number;
    dayName: string;
    plannedSets: ISelfWorkoutSet[];
  }) {
    setStarting(true);
    try {
      const res = await fetch('/api/me/workout-logs', {
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
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">{eyebrow}</span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/30">From template</span>
      </div>
      <div className="mb-1">
        <div className="text-[11px] text-foreground/50 tabular-nums">{props.templateName}</div>
        <h2 className="text-xl font-bold leading-tight mt-0.5">
          Day {props.nextDay.dayNumber} — {props.nextDay.dayName}
        </h2>
      </div>
      <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 space-y-1.5 my-3 bg-[#080808]">
        {props.exercisePreview.map((ex, i) => (
          <div key={i} className="flex items-center justify-between text-[12px] tabular-nums">
            <span>{ex.name}</span>
            <span className="text-foreground/50">{ex.prescribed}</span>
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
                  done ? 'bg-emerald-400' : isNext ? 'bg-emerald-400/40 ring-1 ring-emerald-400/40' : 'bg-foreground/10'
                }`}
              />
            );
          })}
        </div>
        <span className="text-[11px] text-foreground/65 tabular-nums">
          Day <span className="text-foreground font-semibold">{props.nextDay.dayNumber}</span> of {props.cycleSize}
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
        <Button variant="outline" onClick={() => setPickerOpen(true)}>
          Pick another day
        </Button>
      </div>
      <TemplateDayPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={async ({ templateId, dayNumber, dayName, plannedSets }) => {
          await start({ templateId, dayNumber, dayName, plannedSets });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function EmptyCard({ basePath }: EmptyProps) {
  const router = useRouter();
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-emerald-300">Follow a plan</span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/30">From template</span>
      </div>
      <div className="mb-3">
        <h2 className="text-xl font-bold leading-tight">Pick a template</h2>
        <p className="text-xs text-foreground/65 mt-1 leading-snug">
          Walk through prescribed exercises, sets, and reps. Best when you want structure or are starting a cycle.
        </p>
      </div>
      <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 space-y-1.5 mb-3 bg-[#080808]">
        {Object.entries(PRESET_PLANS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => router.push(`/trainer/plans/new?preset=${key}`)}
            className="w-full flex items-center justify-between text-[12px] hover:bg-foreground/[0.025] rounded px-1 py-0.5 -mx-1 transition-colors"
          >
            <div className="text-left">
              <div className="text-foreground">{p.name}</div>
              <div className="text-[10px] text-foreground/50 tabular-nums">{p.summary}</div>
            </div>
            <span className="text-foreground/30 text-sm">→</span>
          </button>
        ))}
      </div>
      <div className="text-[11px] text-foreground/50 mb-3">Or import one you've already built for a member.</div>
      <div className="mt-auto flex gap-2">
        <Button asChild className="flex-1">
          <Link href={basePath.replace('/my-training', '/plans')}>Browse templates →</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/trainer/plans/new">+ Create</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest --testPathPatterns template-path-card`
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/template-path-card.tsx __tests__/components/self-tracking/template-path-card.test.tsx
git commit -m "feat(self-tracking): TemplatePathCard with 3 sub-states"
```

---

### Task C3: `FreestylePathCard` component with three sub-states

**Files:**
- Create: `src/components/self-tracking/freestyle-path-card.tsx`
- Test: `__tests__/components/self-tracking/freestyle-path-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/self-tracking/freestyle-path-card.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FreestylePathCard } from '@/components/self-tracking/freestyle-path-card';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
global.fetch = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe('FreestylePathCard', () => {
  it('renders Full state with last freestyle echo + frequency', () => {
    render(
      <FreestylePathCard
        state="full"
        lastFreestyle={{
          dateLabel: 'Tue',
          durationMin: 45,
          rpe: 7,
          topSets: [
            { exerciseName: 'Squat', weight: 100, reps: 6, isPR: true },
            { exerciseName: 'Bench', weight: 95, reps: 5, isPR: false },
          ],
          remainingSets: 4,
        }}
        weeklyFrequency={2}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByText(/your last freestyle/i)).toBeInTheDocument();
    expect(screen.getByText(/100 kg × 6/)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ week/)).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('renders Light state without frequency and without PR badge', () => {
    render(
      <FreestylePathCard
        state="light"
        lastFreestyle={{
          dateLabel: 'Sat',
          durationMin: 32,
          rpe: 6,
          topSets: [{ exerciseName: 'Bench', weight: 85, reps: 5, isPR: false }],
          remainingSets: 0,
        }}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.queryByText(/per week/i)).not.toBeInTheDocument();
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });

  it('renders Empty state with what-you-can-do bullets', () => {
    render(<FreestylePathCard state="empty" basePath="/trainer/my-training" />);
    expect(screen.getByText(/pick exercises on the fly/i)).toBeInTheDocument();
    expect(screen.getByText(/save as a template/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start blank/i })).toBeInTheDocument();
  });

  it('Start blank posts to /api/me/workout-logs and routes to the session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'log123' }) });
    render(<FreestylePathCard state="empty" basePath="/trainer/my-training" />);
    fireEvent.click(screen.getByRole('button', { name: /start blank/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/workout-logs',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns freestyle-path-card`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the component**

Create `src/components/self-tracking/freestyle-path-card.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type BasePath = '/trainer/my-training' | '/owner/my-training';

interface TopSet {
  exerciseName: string;
  weight: number | null;
  reps: number | null;
  isPR: boolean;
}
interface LastFreestyle {
  dateLabel: string;
  durationMin: number;
  rpe: number | null;
  topSets: TopSet[];
  remainingSets: number;
}
interface FullProps {
  state: 'full';
  lastFreestyle: LastFreestyle;
  weeklyFrequency: number;
  basePath: BasePath;
}
interface LightProps {
  state: 'light';
  lastFreestyle: LastFreestyle;
  basePath: BasePath;
}
interface EmptyProps {
  state: 'empty';
  basePath: BasePath;
}
type Props = FullProps | LightProps | EmptyProps;

export function FreestylePathCard(props: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  async function startBlank() {
    setStarting(true);
    try {
      const res = await fetch('/api/me/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
      });
      if (res.ok) {
        const log = (await res.json()) as { _id: string };
        router.push(`${props.basePath}/session/${log._id}`);
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-sky-300">
          {props.state === 'empty' ? 'No plan, no pressure' : 'Log on the fly'}
        </span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/30">Freestyle</span>
      </div>
      <div className="mb-1">
        <div className="text-[11px] text-foreground/50">{props.state === 'empty' ? '' : 'No template, no plan'}</div>
        <h2 className="text-xl font-bold leading-tight mt-0.5">{props.state === 'empty' ? 'Blank session' : 'Blank session'}</h2>
      </div>
      <div className="text-xs text-foreground/65 mb-3">
        {props.state === 'empty'
          ? "Best when you don't know exactly what you'll do, or you just want to log what happens."
          : 'Pick exercises as you go. Save it as a template later if you want.'}
      </div>

      {props.state === 'empty' ? (
        <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 mb-3 bg-[#080808] space-y-1.5">
          <Bullet>Pick exercises on the fly</Bullet>
          <Bullet>Save as a template afterward</Bullet>
          <Bullet>RPE + note when you're done</Bullet>
        </div>
      ) : (
        <div className="rounded-lg ring-1 ring-foreground/10 p-2.5 mb-3 bg-[#080808]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/30">Your last freestyle</span>
            <span className="text-[11px] text-foreground/65 tabular-nums">
              {props.lastFreestyle.dateLabel} · {props.lastFreestyle.durationMin} min
              {props.lastFreestyle.rpe != null ? ` · RPE ${props.lastFreestyle.rpe}` : ''}
            </span>
          </div>
          <div className="space-y-1.5">
            {props.lastFreestyle.topSets.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[12px] tabular-nums">
                <span>{s.exerciseName}</span>
                <span className="text-foreground/65">
                  {s.weight != null && s.reps != null ? `${s.weight} kg × ${s.reps}` : '—'}
                </span>
                {props.state === 'full' && s.isPR ? (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30">
                    PR
                  </span>
                ) : (
                  <span className="text-[9px] text-foreground/22">·</span>
                )}
              </div>
            ))}
            {props.lastFreestyle.remainingSets > 0 && (
              <div className="text-[12px] text-foreground/50 italic">+ {props.lastFreestyle.remainingSets} more sets</div>
            )}
          </div>
        </div>
      )}

      {props.state === 'full' && (
        <div className="text-[11px] text-foreground/50 mb-3 tabular-nums">
          Recent freestyle frequency: <span className="text-foreground">{props.weeklyFrequency} / week</span>
        </div>
      )}

      <div className="mt-auto">
        <Button onClick={startBlank} disabled={starting} className="w-full">
          {starting ? 'Starting…' : 'Start blank →'}
        </Button>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-1 h-1 rounded-full bg-sky-400/70" />
      <span>{children}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest --testPathPatterns freestyle-path-card`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/freestyle-path-card.tsx __tests__/components/self-tracking/freestyle-path-card.test.tsx
git commit -m "feat(self-tracking): FreestylePathCard with 3 sub-states"
```

---

### Task C4: `RecentSessionsList` component

**Files:**
- Create: `src/components/self-tracking/recent-sessions-list.tsx`
- Test: `__tests__/components/self-tracking/recent-sessions-list.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/self-tracking/recent-sessions-list.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { RecentSessionsList } from '@/components/self-tracking/recent-sessions-list';

describe('RecentSessionsList', () => {
  it('renders rows in Full state', () => {
    render(
      <RecentSessionsList
        state="full"
        sessions={[
          { id: '1', dateLabel: 'Tue', dayName: 'PPL · Day 2 · Pull', setCount: 8, durationMin: 52, rpe: 8, hasPR: true },
          { id: '2', dateLabel: 'Sun', dayName: 'Freestyle', setCount: 5, durationMin: 35, rpe: 6, hasPR: false },
        ]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByText('PPL · Day 2 · Pull')).toBeInTheDocument();
    expect(screen.getByText('Freestyle')).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('renders rows + hint row in Light state', () => {
    render(
      <RecentSessionsList
        state="light"
        sessions={[
          { id: '1', dateLabel: 'Sat', dayName: 'Freestyle', setCount: 3, durationMin: 32, rpe: 6, hasPR: false },
        ]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByText(/newer sessions will land/i)).toBeInTheDocument();
  });

  it('renders dimmed example + explanation in Empty state', () => {
    render(<RecentSessionsList state="empty" basePath="/trainer/my-training" />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/once you finish/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns recent-sessions-list`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the component**

Create `src/components/self-tracking/recent-sessions-list.tsx`:

```tsx
import Link from 'next/link';

type BasePath = '/trainer/my-training' | '/owner/my-training';

export interface SessionRow {
  id: string;
  dateLabel: string;
  dayName: string;
  setCount: number;
  durationMin: number;
  rpe: number | null;
  hasPR: boolean;
}
interface DataProps {
  state: 'full' | 'light';
  sessions: SessionRow[];
  basePath: BasePath;
}
interface EmptyProps {
  state: 'empty';
  basePath: BasePath;
}
type Props = DataProps | EmptyProps;

export function RecentSessionsList(props: Props) {
  if (props.state === 'empty') {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5 flex items-center gap-4">
        <div className="rounded-lg ring-1 ring-foreground/10 bg-[#080808] p-3 text-[10px] tabular-nums text-foreground/30 leading-snug min-w-[140px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-foreground/22">Tue</span>
            <span className="text-foreground/22">RPE 7</span>
          </div>
          <div className="text-foreground/50">PPL · Day 2 · Pull</div>
          <div className="text-foreground/22 mt-0.5">8 sets · 52 min</div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/30 mb-1">Coming soon</p>
          <p className="text-xs text-foreground/65 leading-snug">
            Once you finish your first session, you'll see a recap row here. Each row shows date, what you trained, set count, duration, and RPE.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[1.4px] font-semibold text-foreground/65">Recent sessions</span>
        {props.state === 'full' ? (
          <Link href={`${props.basePath}?view=all`} className="text-[11px] text-foreground/65 hover:text-foreground">
            View all →
          </Link>
        ) : (
          <span className="text-[11px] text-foreground/30 tabular-nums">{props.sessions.length} logged</span>
        )}
      </div>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 divide-y divide-[rgba(255,255,255,0.04)]">
        {props.sessions.map((s) => (
          <Link
            key={s.id}
            href={`${props.basePath}/session/${s.id}`}
            className="flex items-center px-4 py-2.5 tabular-nums text-[12px] hover:bg-foreground/[0.025]"
          >
            <div className="w-12 text-foreground/65">{s.dateLabel}</div>
            <div className="flex-1">{s.dayName}</div>
            <div className="w-16 text-right text-foreground/65">{s.setCount} sets</div>
            <div className="w-16 text-right text-foreground/65">{s.durationMin} min</div>
            <div className="w-12 text-right text-foreground/65">{s.rpe != null ? `RPE ${s.rpe}` : '—'}</div>
            <div className="w-10 text-right">
              {s.hasPR && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold tracking-wider bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30">
                  PR
                </span>
              )}
            </div>
          </Link>
        ))}
        {props.state === 'light' && (
          <div className="flex items-center px-4 py-2.5 text-[11px] text-foreground/40 italic">
            Newer sessions will land here as you log them.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest --testPathPatterns recent-sessions-list`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/self-tracking/recent-sessions-list.tsx __tests__/components/self-tracking/recent-sessions-list.test.tsx
git commit -m "feat(self-tracking): RecentSessionsList with 3 sub-states"
```

---

### Task C5: `MyTrainingLanding` server component (state detection + composition)

**Files:**
- Create: `src/components/self-tracking/my-training-landing.tsx`
- Create: `src/lib/self-tracking/landing-state.ts` (pure helper for state detection — easier to unit-test)
- Test: `__tests__/lib/self-tracking/landing-state.test.ts`
- Test: `__tests__/components/self-tracking/my-training-landing.test.tsx`

- [ ] **Step 1: Write the failing test for the state detector**

Create `__tests__/lib/self-tracking/landing-state.test.ts`:

```ts
import { detectLandingState } from '@/lib/self-tracking/landing-state';

describe('detectLandingState', () => {
  it('returns empty when no completed sessions', () => {
    expect(detectLandingState({ completedSessionCount: 0, hasUsedTemplate: false })).toBe('empty');
  });

  it('returns light when 1-3 sessions', () => {
    expect(detectLandingState({ completedSessionCount: 1, hasUsedTemplate: true })).toBe('light');
    expect(detectLandingState({ completedSessionCount: 3, hasUsedTemplate: false })).toBe('light');
  });

  it('returns light when 4+ sessions but never used a template', () => {
    expect(detectLandingState({ completedSessionCount: 7, hasUsedTemplate: false })).toBe('light');
  });

  it('returns full when 4+ sessions and at least one used a template', () => {
    expect(detectLandingState({ completedSessionCount: 4, hasUsedTemplate: true })).toBe('full');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns landing-state`
Expected: FAIL — module not found

- [ ] **Step 3: Create the state detector**

Create `src/lib/self-tracking/landing-state.ts`:

```ts
export type LandingState = 'full' | 'light' | 'empty';

interface DetectInput {
  completedSessionCount: number;
  hasUsedTemplate: boolean;
}

export function detectLandingState(input: DetectInput): LandingState {
  if (input.completedSessionCount === 0) return 'empty';
  if (input.completedSessionCount >= 4 && input.hasUsedTemplate) return 'full';
  return 'light';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest --testPathPatterns landing-state`
Expected: PASS — 4 tests

- [ ] **Step 5: Write the failing test for the composing component**

Create `__tests__/components/self-tracking/my-training-landing.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MyTrainingLanding } from '@/components/self-tracking/my-training-landing';

jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { id: 'u1', role: 'trainer' } }) }));

const findActive = jest.fn();
const findByUserMonth = jest.fn();
const findRecent = jest.fn();
const findLastByTemplate = jest.fn();
const findByUser = jest.fn();
const findById = jest.fn();

jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn().mockImplementation(() => ({
    findActive, findByUserMonth, findRecent, findLastByTemplate,
  })),
}));
jest.mock('@/lib/repositories/self-personal-best.repository', () => ({
  MongoSelfPersonalBestRepository: jest.fn().mockImplementation(() => ({ findByUser })),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn().mockImplementation(() => ({ findById })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  findActive.mockResolvedValue(null);
  findByUserMonth.mockResolvedValue([]);
  findRecent.mockResolvedValue([]);
  findLastByTemplate.mockResolvedValue(null);
  findByUser.mockResolvedValue([]);
  findById.mockResolvedValue(null);
});

describe('MyTrainingLanding', () => {
  it('renders Empty state when user has no logs', async () => {
    const ui = await MyTrainingLanding({ basePath: '/trainer/my-training' });
    render(ui);
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a template/i)).toBeInTheDocument();
    expect(screen.getByText(/blank session/i)).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('renders Light state when user has 2 freestyle sessions and no template usage', async () => {
    findRecent.mockResolvedValue([
      { _id: 'a', dayName: 'Freestyle', completedAt: new Date(), startedAt: new Date(), sets: [], rpe: 6, sourceTemplateId: null },
      { _id: 'b', dayName: 'Freestyle', completedAt: new Date(), startedAt: new Date(), sets: [], rpe: 7, sourceTemplateId: null },
    ]);
    const ui = await MyTrainingLanding({ basePath: '/trainer/my-training' });
    render(ui);
    expect(screen.getByText(/build a streak/i)).toBeInTheDocument();
    expect(screen.getByText(/newer sessions will land/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm jest --testPathPatterns my-training-landing`
Expected: FAIL — module not found

- [ ] **Step 7: Implement the server component**

Create `src/components/self-tracking/my-training-landing.tsx`:

```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { ActivityStrip } from './activity-strip';
import { TemplatePathCard } from './template-path-card';
import { FreestylePathCard } from './freestyle-path-card';
import { RecentSessionsList, type SessionRow } from './recent-sessions-list';
import { PageHeader } from '@/components/shared/page-header';
import { WorkoutCalendarHeaderTrigger } from './workout-calendar-header-trigger';

type BasePath = '/trainer/my-training' | '/owner/my-training';

export async function MyTrainingLanding({ basePath }: { basePath: BasePath }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfWorkoutLogRepository();
  const pbRepo = new MongoSelfPersonalBestRepository();
  const templateRepo = new MongoPlanTemplateRepository();

  const now = new Date();
  const [active, monthLogs, recent, lastByTemplate, pbs] = await Promise.all([
    logRepo.findActive(userId),
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 10),
    logRepo.findLastByTemplate(userId),
    pbRepo.findByUser(userId),
  ]);

  const completedSessionCount = recent.length;
  const hasUsedTemplate = lastByTemplate !== null;
  const state = detectLandingState({ completedSessionCount, hasUsedTemplate });

  // last 14 days heatmap
  const last14Days: boolean[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    last14Days.push(
      recent.some((r) => r.completedAt && r.completedAt >= day && r.completedAt < next),
    );
  }

  // session rows for the recent list (top 5)
  const pbLogIds = new Set(pbs.map((pb) => pb.logId.toString()));
  const sessionRows: SessionRow[] = recent.slice(0, 5).map((r) => {
    const startedMs = r.startedAt.getTime();
    const endedMs = (r.completedAt ?? new Date()).getTime();
    const durationMin = Math.max(1, Math.round((endedMs - startedMs) / 60000));
    return {
      id: r._id.toString(),
      dateLabel: r.completedAt ? r.completedAt.toLocaleDateString('en-US', { weekday: 'short' }) : '—',
      dayName: r.dayName,
      setCount: r.sets.length,
      durationMin,
      rpe: r.rpe,
      hasPR: pbLogIds.has(r._id.toString()),
    };
  });

  // build hero card props
  const headerSubLine =
    state === 'full'
      ? `${recent.length} sessions in May`
      : state === 'light'
      ? `${completedSessionCount} sessions logged`
      : "Track your own sessions here — kept separate from your members'.";

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        subtitle={headerSubLine}
        actions={<WorkoutCalendarHeaderTrigger basePath={basePath} />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {state === 'full' && (
          <ActivityStrip
            state="full"
            last14Days={last14Days}
            monthStats={{
              sessions: monthLogs.length,
              sets: monthLogs.reduce((acc, l) => acc + l.sets.length, 0),
              avgRpe:
                monthLogs.filter((l) => l.rpe != null).reduce((acc, l) => acc + (l.rpe ?? 0), 0) /
                  Math.max(1, monthLogs.filter((l) => l.rpe != null).length) || 0,
              prs: pbs.filter((pb) => pb.achievedAt >= new Date(now.getFullYear(), now.getMonth(), 1)).length,
            }}
          />
        )}
        {state === 'light' && (
          <ActivityStrip state="light" last14Days={last14Days} sessionCount={completedSessionCount} />
        )}
        {state === 'empty' && <ActivityStrip state="empty" />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {state === 'empty' ? (
            <TemplatePathCard state="empty" basePath={basePath} />
          ) : await renderTemplateCard(state, lastByTemplate, templateRepo, basePath)}
          {state === 'empty' ? (
            <FreestylePathCard state="empty" basePath={basePath} />
          ) : (
            await renderFreestyleCard(state, recent, basePath)
          )}
        </div>

        {state === 'empty' ? (
          <RecentSessionsList state="empty" basePath={basePath} />
        ) : (
          <RecentSessionsList state={state} sessions={sessionRows} basePath={basePath} />
        )}
      </div>
    </div>
  );
}

async function renderTemplateCard(
  state: 'full' | 'light',
  lastByTemplate: Awaited<ReturnType<MongoSelfWorkoutLogRepository['findLastByTemplate']>>,
  templateRepo: MongoPlanTemplateRepository,
  basePath: BasePath,
) {
  if (!lastByTemplate || !lastByTemplate.sourceTemplateId) {
    return <TemplatePathCard state="empty" basePath={basePath} />;
  }
  const tpl = await templateRepo.findById(lastByTemplate.sourceTemplateId.toString());
  if (!tpl) return <TemplatePathCard state="empty" basePath={basePath} />;

  const lastDayNumber = lastByTemplate.sourceTemplateDayNumber ?? 1;
  const nextDayNumber = (lastDayNumber % tpl.days.length) + 1;
  const nextDay = tpl.days.find((d) => d.dayNumber === nextDayNumber) ?? tpl.days[0];

  const exercisePreview = nextDay.exercises.slice(0, 4).map((ex) => ({
    name: ex.exerciseName,
    prescribed: `${ex.sets}×${ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}-${ex.repsMax}`}`,
    lastWeight: null as number | null,
  }));

  // Build plannedSets in the exact shape the API + the existing TemplateDayPickerDialog use.
  // Reference: src/components/self-tracking/template-day-picker-dialog.tsx pickDay()
  const plannedSets = nextDay.exercises.flatMap((ex) =>
    Array.from({ length: ex.sets }, (_, i) => ({
      exerciseId: ex.exerciseId,
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

  return (
    <TemplatePathCard
      state={state}
      templateId={tpl._id.toString()}
      templateName={tpl.name}
      nextDay={{ dayNumber: nextDay.dayNumber, dayName: nextDay.name }}
      cycleSize={tpl.days.length}
      completedDayNumbers={[lastDayNumber]}
      exercisePreview={exercisePreview}
      plannedSets={JSON.parse(JSON.stringify(plannedSets))}
      basePath={basePath}
    />
  );
}

async function renderFreestyleCard(
  state: 'full' | 'light',
  recent: Awaited<ReturnType<MongoSelfWorkoutLogRepository['findRecent']>>,
  basePath: BasePath,
) {
  const lastFreestyleLog = recent.find((r) => r.sourceTemplateId == null);
  if (!lastFreestyleLog) return <FreestylePathCard state="empty" basePath={basePath} />;

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

  const lastFreestyle = {
    dateLabel,
    durationMin,
    rpe: lastFreestyleLog.rpe,
    topSets,
    remainingSets,
  };

  if (state === 'full') {
    const freestyleCount = recent.filter((r) => r.sourceTemplateId == null).length;
    return (
      <FreestylePathCard
        state="full"
        lastFreestyle={lastFreestyle}
        weeklyFrequency={Math.round((freestyleCount / 14) * 7)}
        basePath={basePath}
      />
    );
  }

  return <FreestylePathCard state="light" lastFreestyle={lastFreestyle} basePath={basePath} />;
}
```

- [ ] **Step 8: Run all landing tests**

Run: `pnpm jest --testPathPatterns "landing-state|my-training-landing"`
Expected: PASS — all tests

- [ ] **Step 9: Commit**

```bash
git add src/components/self-tracking/my-training-landing.tsx src/lib/self-tracking/landing-state.ts __tests__/lib/self-tracking/landing-state.test.ts __tests__/components/self-tracking/my-training-landing.test.tsx
git commit -m "feat(self-tracking): MyTrainingLanding server composition + state detection"
```

---

## Phase D — Wire-Up

### Task D1: Replace `/trainer/my-training/page.tsx` and `/owner/my-training/page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/trainer/my-training/page.tsx`
- Modify: `src/app/(dashboard)/owner/my-training/page.tsx`

- [ ] **Step 1: Replace trainer page**

Edit `src/app/(dashboard)/trainer/my-training/page.tsx`:

```tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyTrainingLanding } from '@/components/self-tracking/my-training-landing';

export default async function TrainerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  return <MyTrainingLanding basePath="/trainer/my-training" />;
}
```

- [ ] **Step 2: Replace owner page**

Edit `src/app/(dashboard)/owner/my-training/page.tsx`:

```tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyTrainingLanding } from '@/components/self-tracking/my-training-landing';

export default async function OwnerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  return <MyTrainingLanding basePath="/owner/my-training" />;
}
```

- [ ] **Step 3: Manual smoke check**

Run `pnpm dev`. As a trainer, visit `/trainer/my-training`. Verify the cockpit renders. As an owner, visit `/owner/my-training`. Same.

- [ ] **Step 4: Run lint + full test suite**

Run: `pnpm lint && pnpm test`
Expected: lint clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/trainer/my-training/page.tsx src/app/\(dashboard\)/owner/my-training/page.tsx
git commit -m "feat(my-training): wire MyTrainingLanding into trainer + owner pages"
```

---

### Task D2: Delete legacy `StartWorkoutCard`

**Files:**
- Delete: `src/components/self-tracking/start-workout-card.tsx`
- Delete: `__tests__/components/self-tracking/start-workout-card.test.tsx` (if it exists)

- [ ] **Step 1: Verify no other references**

Run: `grep -rn "StartWorkoutCard\|start-workout-card" src/ __tests__/`
Expected: only the file itself and its test. If anything else references it, address that first.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/self-tracking/start-workout-card.tsx
git rm -f __tests__/components/self-tracking/start-workout-card.test.tsx 2>/dev/null || true
```

- [ ] **Step 3: Run lint + full test suite to confirm no broken imports**

Run: `pnpm lint && pnpm test`
Expected: lint clean, all tests pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(self-tracking): drop legacy StartWorkoutCard"
```

---

### Task D3: E2E coverage

**Files:**
- Create: `e2e/trainer/my-training-cockpit.spec.ts`

- [ ] **Step 1: Read an existing trainer E2E spec to match auth + setup conventions**

Run: `ls e2e/trainer/ | head` and pick one (e.g. `e2e/trainer/plans.spec.ts` if it exists). Read the first 40 lines to see how the suite logs in and seeds.

- [ ] **Step 2: Write the spec**

Create `e2e/trainer/my-training-cockpit.spec.ts`. Use the existing trainer fixture pattern (the file you just read shows it). The body of the tests:

```ts
import { test, expect } from '@playwright/test';

test.describe('My Training Cockpit', () => {
  test('Empty state — clicking PPL preset routes to plans-new with prefill', async ({ page, trainerLogin }) => {
    await trainerLogin();
    await page.goto('/trainer/my-training');
    await expect(page.getByText(/get started/i)).toBeVisible();
    await page.getByText('Push · Pull · Legs').click();
    await expect(page).toHaveURL(/\/trainer\/plans\/new\?preset=ppl/);
    await expect(page.getByLabel(/plan name/i)).toHaveValue('Push · Pull · Legs');
  });

  test('Freestyle path creates a log and routes to the session page', async ({ page, trainerLogin }) => {
    await trainerLogin();
    await page.goto('/trainer/my-training');
    await page.getByRole('button', { name: /start blank/i }).click();
    await expect(page).toHaveURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);
  });

  test('Full state — Start Day N button starts a template-derived session', async ({ page, trainerLogin, seedTrainerWithTemplateLogs }) => {
    await trainerLogin();
    await seedTrainerWithTemplateLogs(); // helper: seeds 4+ self-workout-logs with sourceTemplateId on a known template
    await page.goto('/trainer/my-training');
    await page.getByRole('button', { name: /start day \d/i }).click();
    await expect(page).toHaveURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);
  });
});
```

If `trainerLogin` / `seedTrainerWithTemplateLogs` fixtures don't exist with those exact names in your project, mirror the names/patterns from the existing trainer E2E suite — the goal is just three end-to-end coverage points: empty→preset, freestyle start, template Day N start.

- [ ] **Step 3: Run E2E**

Run: `pnpm test:e2e -- my-training-cockpit`
Expected: all 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/trainer/my-training-cockpit.spec.ts
git commit -m "test(self-tracking): e2e for cockpit preset + freestyle + template paths"
```

---

## Final Verification

- [ ] **Lint clean**

Run: `pnpm lint`
Expected: no warnings, no errors.

- [ ] **All Jest tests pass**

Run: `pnpm test`
Expected: 100% pass.

- [ ] **Production build works**

Run: `pnpm build`
Expected: clean build.

- [ ] **Manual visual check across 3 states**

In dev:
1. As a brand-new trainer (empty DB) → Empty cascade renders.
2. After 1-2 freestyle sessions → Light cascade renders.
3. After 5+ template-derived sessions → Full cascade renders.

If any region collapses to a placeholder dash, return to the relevant Phase C task and patch.

- [ ] **Update INDEX.md status to `In Progress` then `Approved` once shipped**

Edit `docs/INDEX.md`:
- During execution: row stays at `Draft`/`In Progress`.
- When merged to main: change to `Approved`.

- [ ] **Run `/simplify` before declaring done**

Per `CLAUDE.md`, run `/simplify` over the diff to catch any duplicated logic, redundant state, or N+1 patterns. Address findings inline.
