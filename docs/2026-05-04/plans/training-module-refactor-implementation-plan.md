# Training Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Training module to add exercise images everywhere, RPE/note on session completion, a monthly training calendar, persistent trainer exercise notes, and trainer-on-behalf session logging — while removing the standalone Personal Bests nav entry.

**Architecture:** New `ExerciseNote` collection (keyed by memberId+exerciseId) decouples trainer notes from plans and sessions. `WorkoutSession` gains three fields (`loggedBy`, `rpe`, `memberNote`). A single `SessionLogger` component handles both member self-logging and trainer-on-behalf logging via a `mode` prop. All new pages reuse existing patterns (Server Component page → Client Component).

**Tech Stack:** Next.js App Router, TypeScript strict, MongoDB/Mongoose, Shadcn/ui, TailwindCSS, Jest + React Testing Library, ts-node for seed scripts.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/db/models/exercise-note.model.ts` | ExerciseNote Mongoose model + interfaces |
| `src/lib/repositories/exercise-note.repository.ts` | ExerciseNote repository interface + Mongo impl |
| `src/app/api/exercise-notes/route.ts` | GET + POST /api/exercise-notes |
| `src/app/api/exercise-notes/[entryId]/route.ts` | PATCH /api/exercise-notes/[entryId] |
| `src/components/training/workout-complete-modal.tsx` | RPE slider + memberNote textarea modal |
| `src/components/training/exercise-note-panel.tsx` | Inline trainer note history + add/edit |
| `src/components/calendar/workout-calendar.tsx` | Monthly calendar grid with session dots |
| `src/components/calendar/session-detail-panel.tsx` | Clicked-day session detail with exercise images |
| `src/app/(dashboard)/member/plan/calendar/page.tsx` | Member training calendar page |
| `src/app/(dashboard)/trainer/members/[id]/log/new/page.tsx` | Trainer creates session for member → redirects |
| `src/app/(dashboard)/trainer/members/[id]/log/[sessionId]/page.tsx` | Trainer session logger page |
| `scripts/seed-exercises.ts` | One-time seed: 873 exercises + equipment |
| `__tests__/lib/repositories/exercise-note.repository.test.ts` | ExerciseNote repository tests |
| `__tests__/app/api/exercise-notes.test.ts` | exercise-notes route tests |
| `__tests__/app/api/sessions-complete.test.ts` | sessions complete route tests (extended) |
| `__tests__/app/api/sessions-calendar.test.ts` | sessions GET calendar query tests |

### Modified files
| File | Change |
|------|--------|
| `src/lib/db/models/exercise.model.ts` | Add `bodyParts: string[]` field |
| `src/lib/db/models/workout-session.model.ts` | Add `loggedBy`, `rpe`, `memberNote` fields |
| `src/lib/repositories/exercise.repository.ts` | Add `bodyParts` to `CreateExerciseData` |
| `src/lib/repositories/workout-session.repository.ts` | Extend `CreateSessionData` (loggedBy), `complete()` (rpe, memberNote), add `findByMonth()` |
| `src/app/api/sessions/route.ts` | POST: accept trainer-created sessions; GET: accept year/month filter |
| `src/app/api/sessions/[id]/complete/route.ts` | Accept rpe + memberNote body fields |
| `src/components/training/session-logger.tsx` | Add `mode`/`loggedForMember` props; integrate ExerciseNotePanel + WorkoutCompleteModal |
| `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` | Add 📅 calendar icon link |
| `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx` | Add "Log Workout" button per day |
| `src/components/shared/app-shell.tsx` | Remove Personal Bests from all three role navs |

---

## Stage 1 — Data Layer

### Task 1: Add `bodyParts` to Exercise model and repository

**Files:**
- Modify: `src/lib/db/models/exercise.model.ts`
- Modify: `src/lib/repositories/exercise.repository.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/exercise.repository.test.ts
// Add to existing POST /api/exercises test or create standalone repo test:
it('creates exercise with bodyParts', async () => {
  const saveMock = jest.fn().mockResolvedValue({ _id: 'e1', name: 'Squat', bodyParts: ['quadriceps'] });
  (ExerciseModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

  const repo = new MongoExerciseRepository();
  const result = await repo.create({
    name: 'Squat',
    muscleGroup: null,
    isGlobal: true,
    createdBy: null,
    imageUrl: null,
    isBodyweight: false,
    bodyParts: ['quadriceps'],
  });

  expect(saveMock).toHaveBeenCalled();
  expect(result.bodyParts).toEqual(['quadriceps']);
});
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
pnpm test -- --testPathPattern=exercise.repository -t 'bodyParts'
```

- [ ] **Step 3: Add `bodyParts` to Exercise model**

In `src/lib/db/models/exercise.model.ts`, update the interface and schema:

```ts
export interface IExercise extends Document {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  imageUrl: string | null;
  isBodyweight: boolean;
  equipmentIds: mongoose.Types.ObjectId[];
  bodyParts: string[];   // ← new
  createdAt: Date;
}

const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    muscleGroup: { type: String, default: null },
    isGlobal: { type: Boolean, required: true, default: false },
    createdBy: { type: Schema.Types.ObjectId, default: null },
    imageUrl: { type: String, default: null },
    isBodyweight: { type: Boolean, required: true, default: false },
    equipmentIds: { type: [Schema.Types.ObjectId], ref: 'Equipment', default: [] },
    bodyParts: { type: [String], default: [] },  // ← new
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
```

- [ ] **Step 4: Add `bodyParts` to `CreateExerciseData`**

In `src/lib/repositories/exercise.repository.ts`:

```ts
export interface CreateExerciseData {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: string | null;
  imageUrl: string | null;
  isBodyweight: boolean;
  equipmentIds?: string[];
  bodyParts?: string[];  // ← new
}
```

In `MongoExerciseRepository.create()`, spread `bodyParts`:

```ts
async create(data: CreateExerciseData): Promise<IExercise> {
  const exercise = new ExerciseModel({
    ...data,
    createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : null,
    equipmentIds: (data.equipmentIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
    bodyParts: data.bodyParts ?? [],
  });
  return exercise.save();
}
```

- [ ] **Step 5: Run test — confirm PASS**

```bash
pnpm test -- --testPathPattern=exercise.repository
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/models/exercise.model.ts src/lib/repositories/exercise.repository.ts __tests__/lib/repositories/exercise.repository.test.ts
git commit -m "feat(data): add bodyParts field to Exercise model and repository"
```

---

### Task 2: Create ExerciseNote model

**Files:**
- Create: `src/lib/db/models/exercise-note.model.ts`

- [ ] **Step 1: Create the model file**

```ts
// src/lib/db/models/exercise-note.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExerciseNoteEntry {
  _id: mongoose.Types.ObjectId;
  content: string;
  sessionId: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

export interface IExerciseNote extends Document {
  memberId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  trainerId: mongoose.Types.ObjectId;
  entries: IExerciseNoteEntry[];
}

const ExerciseNoteEntrySchema = new Schema<IExerciseNoteEntry>(
  {
    content: { type: String, required: true },
    sessionId: { type: Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, required: true },
  },
  { _id: true },
);

const ExerciseNoteSchema = new Schema<IExerciseNote>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    entries: [ExerciseNoteEntrySchema],
  },
  { timestamps: false },
);

ExerciseNoteSchema.index({ memberId: 1, exerciseId: 1 });

export const ExerciseNoteModel: Model<IExerciseNote> =
  mongoose.models.ExerciseNote ??
  mongoose.model<IExerciseNote>('ExerciseNote', ExerciseNoteSchema);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/models/exercise-note.model.ts
git commit -m "feat(data): add ExerciseNote model"
```

---

### Task 3: Create ExerciseNote repository

**Files:**
- Create: `src/lib/repositories/exercise-note.repository.ts`
- Create: `__tests__/lib/repositories/exercise-note.repository.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/repositories/exercise-note.repository.test.ts
import mongoose from 'mongoose';
import { MongoExerciseNoteRepository } from '@/lib/repositories/exercise-note.repository';
import { ExerciseNoteModel } from '@/lib/db/models/exercise-note.model';

jest.mock('@/lib/db/models/exercise-note.model', () => ({
  ExerciseNoteModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(ExerciseNoteModel);

describe('MongoExerciseNoteRepository', () => {
  let repo: MongoExerciseNoteRepository;

  beforeEach(() => {
    repo = new MongoExerciseNoteRepository();
    jest.clearAllMocks();
  });

  describe('findByMemberAndExercise', () => {
    it('returns null when no note exists', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const result = await repo.findByMemberAndExercise('m1', 'e1');
      expect(result).toBeNull();
      expect(mockModel.findOne).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
        exerciseId: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('returns note document when found', async () => {
      const note = { _id: 'n1', entries: [] };
      mockModel.findOne.mockResolvedValue(note as never);
      const result = await repo.findByMemberAndExercise('m1', 'e1');
      expect(result).toEqual(note);
    });
  });

  describe('appendEntry', () => {
    it('upserts and appends the entry', async () => {
      const updated = { _id: 'n1', entries: [{ content: 'Good form' }] };
      mockModel.findByIdAndUpdate.mockResolvedValue(null as never);
      // upsert path uses findOneAndUpdate — mock it
      (mockModel as unknown as { findOneAndUpdate: jest.Mock }).findOneAndUpdate = jest.fn().mockResolvedValue(updated);

      const result = await repo.appendEntry({
        memberId: 'm1',
        exerciseId: 'e1',
        exerciseName: 'Bench Press',
        trainerId: 't1',
        content: 'Good form',
        sessionId: null,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('updateEntry', () => {
    it('calls findByIdAndUpdate with arrayFilter', async () => {
      const updated = { _id: 'n1', entries: [{ _id: 'entry1', content: 'Updated' }] };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      await repo.updateEntry('n1', 'entry1', 'Updated');
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'n1',
        { $set: { 'entries.$[elem].content': 'Updated' } },
        { arrayFilters: [{ 'elem._id': expect.any(mongoose.Types.ObjectId) }], new: true },
      );
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
pnpm test -- --testPathPattern=exercise-note.repository
```

- [ ] **Step 3: Create the repository file**

```ts
// src/lib/repositories/exercise-note.repository.ts
import mongoose from 'mongoose';
import type { IExerciseNote } from '@/lib/db/models/exercise-note.model';
import { ExerciseNoteModel } from '@/lib/db/models/exercise-note.model';

export interface AppendEntryData {
  memberId: string;
  exerciseId: string;
  exerciseName: string;
  trainerId: string;
  content: string;
  sessionId: string | null;
}

export interface IExerciseNoteRepository {
  findByMemberAndExercise(memberId: string, exerciseId: string): Promise<IExerciseNote | null>;
  appendEntry(data: AppendEntryData): Promise<IExerciseNote | null>;
  updateEntry(noteId: string, entryId: string, content: string): Promise<IExerciseNote | null>;
}

export class MongoExerciseNoteRepository implements IExerciseNoteRepository {
  async findByMemberAndExercise(memberId: string, exerciseId: string): Promise<IExerciseNote | null> {
    return ExerciseNoteModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      exerciseId: new mongoose.Types.ObjectId(exerciseId),
    });
  }

  async appendEntry(data: AppendEntryData): Promise<IExerciseNote | null> {
    const entry = {
      content: data.content,
      sessionId: data.sessionId ? new mongoose.Types.ObjectId(data.sessionId) : null,
      createdAt: new Date(),
    };
    return ExerciseNoteModel.findOneAndUpdate(
      {
        memberId: new mongoose.Types.ObjectId(data.memberId),
        exerciseId: new mongoose.Types.ObjectId(data.exerciseId),
      },
      {
        $setOnInsert: {
          exerciseName: data.exerciseName,
          trainerId: new mongoose.Types.ObjectId(data.trainerId),
        },
        $push: { entries: entry },
      },
      { upsert: true, new: true },
    );
  }

  async updateEntry(noteId: string, entryId: string, content: string): Promise<IExerciseNote | null> {
    return ExerciseNoteModel.findByIdAndUpdate(
      noteId,
      { $set: { 'entries.$[elem].content': content } },
      { arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(entryId) }], new: true },
    );
  }
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
pnpm test -- --testPathPattern=exercise-note.repository
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/exercise-note.repository.ts __tests__/lib/repositories/exercise-note.repository.test.ts
git commit -m "feat(data): add ExerciseNote repository"
```

---

### Task 4: Extend WorkoutSession model

**Files:**
- Modify: `src/lib/db/models/workout-session.model.ts`

- [ ] **Step 1: Add three new fields to the interface and schema**

```ts
// src/lib/db/models/workout-session.model.ts — full updated file

export interface IWorkoutSession extends Document {
  memberId: mongoose.Types.ObjectId;
  memberPlanId: mongoose.Types.ObjectId;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  completedAt: Date | null;
  sets: ISessionSet[];
  loggedBy: mongoose.Types.ObjectId | null;   // ← new: null = self-logged
  rpe: number | null;                          // ← new: 1–10
  memberNote: string | null;                   // ← new: note to coach
}

// In WorkoutSessionSchema, add after sets:
loggedBy: { type: Schema.Types.ObjectId, default: null },
rpe: { type: Number, default: null },
memberNote: { type: String, default: null },
```

Apply both the interface and schema changes to `src/lib/db/models/workout-session.model.ts`. Keep all existing fields unchanged.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -30
```

Expected: no new errors related to workout-session.model.ts.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/models/workout-session.model.ts
git commit -m "feat(data): add loggedBy, rpe, memberNote to WorkoutSession model"
```

---

### Task 5: Extend WorkoutSession repository

**Files:**
- Modify: `src/lib/repositories/workout-session.repository.ts`
- Modify: `__tests__/lib/repositories/workout-session.repository.test.ts`

- [ ] **Step 1: Write failing tests**

Add these tests to the existing `workout-session.repository.test.ts`:

```ts
describe('create with loggedBy', () => {
  it('passes loggedBy to the model when provided', async () => {
    const saved = { _id: 's1', loggedBy: 'trainer1' };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (WorkoutSessionModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    await repo.create({
      memberId: new mongoose.Types.ObjectId().toString(),
      memberPlanId: new mongoose.Types.ObjectId().toString(),
      dayNumber: 1,
      dayName: 'Pull Day',
      startedAt: new Date(),
      sets: [],
      loggedBy: 'trainer1',
    });

    expect(saveMock).toHaveBeenCalled();
  });
});

describe('complete with rpe and memberNote', () => {
  it('sets completedAt, rpe, and memberNote', async () => {
    const updated = { _id: 's1', completedAt: new Date(), rpe: 7, memberNote: 'Great session' };
    mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

    const result = await repo.complete('s1', { rpe: 7, memberNote: 'Great session' });

    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
      's1',
      { $set: { completedAt: expect.any(Date), rpe: 7, memberNote: 'Great session' } },
      { new: true },
    );
    expect(result).toEqual(updated);
  });
});

describe('findByMonth', () => {
  it('queries sessions within a calendar month', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    mockModel.find.mockReturnValue({ sort: sortMock } as never);

    await repo.findByMonth('m1', 2026, 5);

    expect(mockModel.find).toHaveBeenCalledWith(expect.objectContaining({
      memberId: expect.any(mongoose.Types.ObjectId),
      completedAt: { $gte: expect.any(Date), $lt: expect.any(Date) },
    }));
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
pnpm test -- --testPathPattern=workout-session.repository
```

- [ ] **Step 3: Update `CreateSessionData` and repository methods**

In `src/lib/repositories/workout-session.repository.ts`:

```ts
export interface CreateSessionData {
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  sets: Omit<ISessionSet, 'completedAt'>[];
  loggedBy?: string | null;  // ← new
}

export interface CompleteSessionData {
  rpe?: number | null;
  memberNote?: string | null;
}
```

Update the interface:

```ts
export interface IWorkoutSessionRepository {
  create(data: CreateSessionData): Promise<IWorkoutSession>;
  findById(id: string): Promise<IWorkoutSession | null>;
  findByMember(memberId: string): Promise<IWorkoutSession[]>;
  findByMonth(memberId: string, year: number, month: number): Promise<IWorkoutSession[]>;  // ← new
  updateSet(id: string, setIndex: number, data: UpdateSetData): Promise<IWorkoutSession | null>;
  addExtraSet(id: string, extraSet: ISessionSet): Promise<IWorkoutSession | null>;
  complete(id: string, data?: CompleteSessionData): Promise<IWorkoutSession | null>;  // ← extended
  countByMemberIdsSince(memberIds: string[], since: Date): Promise<number>;
  findCompletedDates(memberId: string, since: Date): Promise<Date[]>;
  findTrainedExercises(memberId: string): Promise<{ exerciseId: string; exerciseName: string }[]>;
  findExerciseHistory(memberId: string, exerciseId: string): Promise<{ date: Date; estimatedOneRM: number }[]>;
  findMemberStats(memberId: string): Promise<{ completedCount: number; lastCompletedAt: Date | null }>;
}
```

Update `MongoWorkoutSessionRepository`:

```ts
async create(data: CreateSessionData): Promise<IWorkoutSession> {
  const session = new WorkoutSessionModel({
    memberId: new mongoose.Types.ObjectId(data.memberId),
    memberPlanId: new mongoose.Types.ObjectId(data.memberPlanId),
    dayNumber: data.dayNumber,
    dayName: data.dayName,
    startedAt: data.startedAt,
    completedAt: null,
    sets: data.sets,
    loggedBy: data.loggedBy ? new mongoose.Types.ObjectId(data.loggedBy) : null,
  });
  return session.save();
}

async complete(id: string, data?: CompleteSessionData): Promise<IWorkoutSession | null> {
  return WorkoutSessionModel.findByIdAndUpdate(
    id,
    {
      $set: {
        completedAt: new Date(),
        rpe: data?.rpe ?? null,
        memberNote: data?.memberNote ?? null,
      },
    },
    { new: true },
  );
}

async findByMonth(memberId: string, year: number, month: number): Promise<IWorkoutSession[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return WorkoutSessionModel.find({
    memberId: new mongoose.Types.ObjectId(memberId),
    completedAt: { $gte: start, $lt: end },
  }).sort({ completedAt: 1 });
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
pnpm test -- --testPathPattern=workout-session.repository
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workout-session.repository.ts __tests__/lib/repositories/workout-session.repository.test.ts
git commit -m "feat(data): extend WorkoutSession repository (loggedBy, rpe, memberNote, findByMonth)"
```

---

### Task 6: Create exercise + equipment seed script

**Files:**
- Create: `scripts/seed-exercises.ts`

- [ ] **Step 1: Create the script**

```ts
// scripts/seed-exercises.ts
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { ExerciseModel } from '../src/lib/db/models/exercise.model';

interface RawExercise {
  id: string;
  name: string;
  body_parts: string[];
  image: string;
}

interface RawEquipment {
  id: string;
  name: string;
}

interface RawEquipmentFile {
  equipment: RawEquipment[];
}

const GymEquipmentSchema = new mongoose.Schema({
  externalId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});
const GymEquipmentModel =
  mongoose.models.GymEquipment ?? mongoose.model('GymEquipment', GymEquipmentSchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set — run with dotenv or set env var');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const exercisesPath = path.join(__dirname, '../context/data/exercises_catalog.json');
  const exercises: RawExercise[] = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));

  let exerciseUpserted = 0;
  for (const ex of exercises) {
    await ExerciseModel.updateOne(
      { name: ex.name },
      {
        $setOnInsert: {
          name: ex.name,
          isGlobal: true,
          createdBy: null,
          muscleGroup: ex.body_parts[0] ?? null,
          imageUrl: ex.image,
          isBodyweight: false,
          equipmentIds: [],
          bodyParts: ex.body_parts,
        },
      },
      { upsert: true },
    );
    exerciseUpserted++;
  }
  console.log(`Upserted ${exerciseUpserted} exercises`);

  const equipmentPath = path.join(__dirname, '../context/data/gym_equipment.json');
  const { equipment }: RawEquipmentFile = JSON.parse(fs.readFileSync(equipmentPath, 'utf-8'));

  let equipmentUpserted = 0;
  for (const eq of equipment) {
    await GymEquipmentModel.updateOne(
      { externalId: eq.id },
      { $setOnInsert: { externalId: eq.id, name: eq.name } },
      { upsert: true },
    );
    equipmentUpserted++;
  }
  console.log(`Upserted ${equipmentUpserted} equipment items`);

  await mongoose.disconnect();
  console.log('Done');
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add npm script to package.json**

In `package.json`, add to the `"scripts"` block:

```json
"seed:exercises": "ts-node --project tsconfig.scripts.json scripts/seed-exercises.ts"
```

- [ ] **Step 3: Run the seed (requires MONGODB_URI)**

```bash
MONGODB_URI=<your-connection-string> pnpm seed:exercises
```

Expected output:
```
Connected to MongoDB
Upserted 873 exercises
Upserted <N> equipment items
Done
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-exercises.ts package.json
git commit -m "feat(data): add seed script for exercises catalog and gym equipment"
```

---

## Stage 2 — API Layer

### Task 7: Create `/api/exercise-notes` GET + POST

**Files:**
- Create: `src/app/api/exercise-notes/route.ts`
- Create: `__tests__/app/api/exercise-notes.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/app/api/exercise-notes.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockNoteRepo = {
  findByMemberAndExercise: jest.fn(),
  appendEntry: jest.fn(),
  updateEntry: jest.fn(),
};
jest.mock('@/lib/repositories/exercise-note.repository', () => ({
  MongoExerciseNoteRepository: jest.fn(() => mockNoteRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/exercise-notes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1&exerciseId=e1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when memberId or exerciseId missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1'));
    expect(res.status).toBe(400);
  });

  it('returns 403 when member tries to access another member notes', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m2&exerciseId=e1'));
    expect(res.status).toBe(403);
  });

  it('returns note document for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const note = { _id: 'n1', entries: [{ content: 'Good form' }] };
    mockNoteRepo.findByMemberAndExercise.mockResolvedValue(note);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1&exerciseId=e1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(note);
  });

  it('returns null when no note exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockNoteRepo.findByMemberAndExercise.mockResolvedValue(null);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1&exerciseId=e1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toBeNull();
  });
});

describe('POST /api/exercise-notes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to post', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/exercise-notes/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1', exerciseId: 'e1', exerciseName: 'Squat', content: 'test' }),
    }));
    expect(res.status).toBe(403);
  });

  it('appends note entry for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const updated = { _id: 'n1', entries: [{ content: 'Great form' }] };
    mockNoteRepo.appendEntry.mockResolvedValue(updated);
    const { POST } = await import('@/app/api/exercise-notes/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'm1', exerciseId: 'e1', exerciseName: 'Squat', content: 'Great form', sessionId: null }),
    }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data).toEqual(updated);
    expect(mockNoteRepo.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1', exerciseId: 'e1', trainerId: 't1', content: 'Great form',
    }));
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
pnpm test -- --testPathPattern=exercise-notes.test
```

- [ ] **Step 3: Create the route file**

```ts
// src/app/api/exercise-notes/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoExerciseNoteRepository } from '@/lib/repositories/exercise-note.repository';
import type { UserRole } from '@/types/auth';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  const exerciseId = url.searchParams.get('exerciseId');
  if (!memberId || !exerciseId) return Response.json({ error: 'memberId and exerciseId required' }, { status: 400 });

  const role = session.user.role as UserRole;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoExerciseNoteRepository();
  const note = await repo.findByMemberAndExercise(memberId, exerciseId);
  return Response.json(note);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = (await req.json()) as {
    memberId: string;
    exerciseId: string;
    exerciseName: string;
    content: string;
    sessionId: string | null;
  };

  const repo = new MongoExerciseNoteRepository();
  const note = await repo.appendEntry({
    memberId: body.memberId,
    exerciseId: body.exerciseId,
    exerciseName: body.exerciseName,
    trainerId: session.user.id,
    content: body.content,
    sessionId: body.sessionId,
  });
  return Response.json(note, { status: 201 });
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
pnpm test -- --testPathPattern=exercise-notes.test
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/exercise-notes/route.ts __tests__/app/api/exercise-notes.test.ts
git commit -m "feat(api): add GET and POST /api/exercise-notes"
```

---

### Task 8: Create `/api/exercise-notes/[entryId]` PATCH

**Files:**
- Create: `src/app/api/exercise-notes/[entryId]/route.ts`

- [ ] **Step 1: Add test to existing exercise-notes test file**

```ts
// Add to __tests__/app/api/exercise-notes.test.ts

const mockNoteRepoForPatch = mockNoteRepo; // same mock

describe('PATCH /api/exercise-notes/[entryId]', () => {
  beforeEach(() => jest.clearAllMocks());

  function makeParams(entryId: string) {
    return { params: Promise.resolve({ entryId }) };
  }

  it('returns 403 for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { PATCH } = await import('@/app/api/exercise-notes/[entryId]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ noteId: 'n1', content: 'Updated' }) }),
      makeParams('entry1'),
    );
    expect(res.status).toBe(403);
  });

  it('updates the note entry for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const updated = { _id: 'n1', entries: [{ _id: 'entry1', content: 'Updated note' }] };
    mockNoteRepoForPatch.updateEntry.mockResolvedValue(updated);

    const { PATCH } = await import('@/app/api/exercise-notes/[entryId]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: 'n1', content: 'Updated note' }),
      }),
      makeParams('entry1'),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(updated);
    expect(mockNoteRepoForPatch.updateEntry).toHaveBeenCalledWith('n1', 'entry1', 'Updated note');
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
pnpm test -- --testPathPattern=exercise-notes.test
```

- [ ] **Step 3: Create the route file**

```ts
// src/app/api/exercise-notes/[entryId]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoExerciseNoteRepository } from '@/lib/repositories/exercise-note.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ entryId: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { entryId } = await params;
  const body = (await req.json()) as { noteId: string; content: string };

  await connectDB();
  const repo = new MongoExerciseNoteRepository();
  const updated = await repo.updateEntry(body.noteId, entryId, body.content);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
pnpm test -- --testPathPattern=exercise-notes.test
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/exercise-notes/[entryId]/route.ts __tests__/app/api/exercise-notes.test.ts
git commit -m "feat(api): add PATCH /api/exercise-notes/[entryId]"
```

---

### Task 9: Extend `POST /api/sessions` for trainer-created sessions

**Files:**
- Modify: `src/app/api/sessions/route.ts`
- Modify: `__tests__/app/api/sessions-calendar.test.ts` (new file, also covers GET)

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/sessions-calendar.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn(), findByMonth: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockMemberPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('POST /api/sessions — trainer creates for member', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows trainer to create session for a specific memberId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const plan = {
      _id: 'mp1',
      days: [{ dayNumber: 1, name: 'Push Day', exercises: [{ exerciseId: 'e1', exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 12 }] }],
    };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);
    const created = { _id: 's1' };
    mockSessionRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'm1', memberPlanId: 'mp1', dayNumber: 1 }),
    }));

    expect(res.status).toBe(201);
    expect(mockMemberPlanRepo.findActive).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      loggedBy: 't1',
    }));
  });
});

describe('GET /api/sessions — calendar month filter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls findByMonth when year and month params are provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const sessions = [{ _id: 's1', dayName: 'Pull Day' }];
    mockSessionRepo.findByMonth.mockResolvedValue(sessions);

    const { GET } = await import('@/app/api/sessions/route');
    const res = await GET(new Request('http://localhost/api/sessions?memberId=m1&year=2026&month=5'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSessionRepo.findByMonth).toHaveBeenCalledWith('m1', 2026, 5);
    expect(data).toEqual(sessions);
  });

  it('calls findByMember when no year/month provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockSessionRepo.findByMember.mockResolvedValue([]);

    const { GET } = await import('@/app/api/sessions/route');
    await GET(new Request('http://localhost/api/sessions?memberId=m1'));

    expect(mockSessionRepo.findByMember).toHaveBeenCalledWith('m1');
    expect(mockSessionRepo.findByMonth).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
pnpm test -- --testPathPattern=sessions-calendar
```

- [ ] **Step 3: Update `src/app/api/sessions/route.ts`**

Replace the entire file:

```ts
// src/app/api/sessions/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import type { UserRole } from '@/types/auth';

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const role = session.user.role as UserRole;
  const body = (await req.json()) as { memberId?: string; memberPlanId: string; dayNumber: number };

  // Trainers/owners supply memberId explicitly; members use their own id
  const memberId = role === 'member' ? session.user.id : (body.memberId ?? session.user.id);
  const loggedBy = role !== 'member' ? session.user.id : null;

  const memberPlanRepo = new MongoMemberPlanRepository();
  const plan = await memberPlanRepo.findActive(memberId);
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
    memberId,
    memberPlanId: body.memberPlanId,
    dayNumber: body.dayNumber,
    dayName: day.name,
    startedAt: new Date(),
    sets,
    loggedBy,
  });

  return Response.json(workoutSession, { status: 201 });
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  const role = session.user.role as UserRole;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');

  if (yearParam && monthParam) {
    const sessions = await sessionRepo.findByMonth(memberId, parseInt(yearParam, 10), parseInt(monthParam, 10));
    return Response.json(sessions);
  }

  const sessions = await sessionRepo.findByMember(memberId);
  return Response.json(sessions);
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
pnpm test -- --testPathPattern=sessions-calendar
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sessions/route.ts __tests__/app/api/sessions-calendar.test.ts
git commit -m "feat(api): extend POST /api/sessions for trainer-created sessions and GET calendar filter"
```

---

### Task 10: Extend `/api/sessions/[id]/complete` with rpe + memberNote

**Files:**
- Modify: `src/app/api/sessions/[id]/complete/route.ts`
- Create: `__tests__/app/api/sessions-complete.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/app/api/sessions-complete.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { findById: jest.fn(), complete: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/sessions/[id]/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when session belongs to different member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm2', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm1' }, completedAt: null });

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST', body: '{}' }), makeParams('s1'));
    expect(res.status).toBe(403);
  });

  it('completes session with rpe and memberNote', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm1' }, completedAt: null });
    const completed = { _id: 's1', completedAt: new Date(), rpe: 8, memberNote: 'Felt strong' };
    mockSessionRepo.complete.mockResolvedValue(completed);

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rpe: 8, memberNote: 'Felt strong' }),
      }),
      makeParams('s1'),
    );

    expect(res.status).toBe(200);
    expect(mockSessionRepo.complete).toHaveBeenCalledWith('s1', { rpe: 8, memberNote: 'Felt strong' });
  });

  it('completes without rpe/memberNote when body is empty', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm1' }, completedAt: null });
    mockSessionRepo.complete.mockResolvedValue({ _id: 's1', completedAt: new Date() });

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST' }), makeParams('s1'));

    expect(res.status).toBe(200);
    expect(mockSessionRepo.complete).toHaveBeenCalledWith('s1', { rpe: undefined, memberNote: undefined });
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
pnpm test -- --testPathPattern=sessions-complete
```

- [ ] **Step 3: Update the complete route**

Replace `src/app/api/sessions/[id]/complete/route.ts`:

```ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);

  if (!workoutSession) return Response.json({ error: 'Not found' }, { status: 404 });

  const role = session.user.role as UserRole;
  const isOwner = workoutSession.memberId.toString() === session.user.id;
  const isTrainerLogging = role !== 'member' && workoutSession.loggedBy?.toString() === session.user.id;
  if (!isOwner && !isTrainerLogging) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (workoutSession.completedAt) {
    return Response.json({ error: 'Already completed' }, { status: 409 });
  }

  let body: { rpe?: number; memberNote?: string } = {};
  try {
    body = (await req.json()) as { rpe?: number; memberNote?: string };
  } catch {
    // empty body is fine
  }

  const completed = await repo.complete(id, { rpe: body.rpe, memberNote: body.memberNote });
  return Response.json(completed);
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
pnpm test -- --testPathPattern=sessions-complete
```

- [ ] **Step 5: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (including the existing sessions/complete test that tested the old route).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/sessions/[id]/complete/route.ts __tests__/app/api/sessions-complete.test.ts
git commit -m "feat(api): extend POST /api/sessions/[id]/complete with rpe and memberNote"
```

---

## Stage 3 — Components

### Task 11: Create `WorkoutCompleteModal`

**Files:**
- Create: `src/components/training/workout-complete-modal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/training/workout-complete-modal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface WorkoutCompleteModalProps {
  onConfirm: (rpe: number | null, memberNote: string | null) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function WorkoutCompleteModal({ onConfirm, onCancel, isLoading }: WorkoutCompleteModalProps) {
  const [rpe, setRpe] = useState<number>(5);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0c0c0c] border border-[#1e1e1e] p-6 space-y-5">
        <div className="text-center">
          <div className="text-[20px] font-bold text-white mb-1">Workout Completed!</div>
          <div className="text-[12px] text-[#555]">Check your results here:</div>
        </div>

        {/* RPE slider */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
          <div className="text-[12px] text-[#ccc]">How hard was this workout?</div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[#444]">
            <span>Very easy</span>
            <span className="text-[14px] font-bold text-white">RPE {rpe}</span>
            <span>Very hard</span>
          </div>
        </div>

        {/* Note to coach */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-2">
          <div className="text-[12px] text-[#888]">Note for coach:</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Add a note for your coach..."
            className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#333] resize-none text-[12px]"
          />
        </div>

        <Button
          onClick={() => onConfirm(rpe, note.trim() || null)}
          disabled={isLoading}
          className="w-full bg-white text-black hover:bg-white/90 font-bold text-[13px] h-12 rounded-xl"
        >
          {isLoading ? 'Saving…' : 'Finish Workout'}
        </Button>

        <button
          onClick={onCancel}
          className="w-full text-[11px] text-[#555] hover:text-[#888] transition-colors text-center"
        >
          Cancel, go back
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/training/workout-complete-modal.tsx
git commit -m "feat(component): add WorkoutCompleteModal with RPE slider and coach note"
```

---

### Task 12: Create `ExerciseNotePanel`

**Files:**
- Create: `src/components/training/exercise-note-panel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/training/exercise-note-panel.tsx
'use client';

import { useState, useEffect } from 'react';

interface NoteEntry {
  _id: string;
  content: string;
  createdAt: string;
}

interface ExerciseNoteDoc {
  _id: string;
  entries: NoteEntry[];
}

interface ExerciseNotePanelProps {
  memberId: string;
  exerciseId: string;
  sessionId: string;
}

export function ExerciseNotePanel({ memberId, exerciseId, sessionId }: ExerciseNotePanelProps) {
  const [noteDoc, setNoteDoc] = useState<ExerciseNoteDoc | null>(null);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/exercise-notes?memberId=${memberId}&exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((data: ExerciseNoteDoc | null) => setNoteDoc(data))
      .catch(() => {});
  }, [memberId, exerciseId]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exercise-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          exerciseId,
          exerciseName: '',
          content: newNote.trim(),
          sessionId,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ExerciseNoteDoc;
        setNoteDoc(updated);
        setNewNote('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(entryId: string) {
    if (!noteDoc || !editContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/exercise-notes/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: noteDoc._id, content: editContent.trim() }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ExerciseNoteDoc;
        setNoteDoc(updated);
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t border-[#1e1e1e] pt-3 space-y-2">
      <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#93c5fd]">
        历史备注
      </div>

      {noteDoc?.entries.map((entry) => (
        <div key={entry._id} className="bg-[#0a0a0a] rounded-md p-2">
          <div className="text-[8px] text-[#444] mb-1">
            {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
          </div>
          {editingId === entry._id ? (
            <div className="space-y-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white p-1.5 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(entry._id)}
                  disabled={saving}
                  className="text-[9px] text-white hover:text-white/80"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-[9px] text-[#555] hover:text-[#888]"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-2">
              <div className="text-[10px] text-[#888]">{entry.content}</div>
              <button
                onClick={() => { setEditingId(entry._id); setEditContent(entry.content); }}
                className="text-[8px] text-[#444] hover:text-[#666] shrink-0"
              >
                编辑
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="添加今日备注..."
          onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
          className="flex-1 bg-[#0a0a0a] border border-dashed border-[#1e1e1e] rounded-md text-[10px] text-white placeholder:text-[#333] px-2 py-1.5 focus:outline-none focus:border-[#333]"
        />
        <button
          onClick={addNote}
          disabled={saving || !newNote.trim()}
          className="text-[9px] text-[#555] hover:text-[#888] disabled:opacity-30 shrink-0"
        >
          添加
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/training/exercise-note-panel.tsx
git commit -m "feat(component): add ExerciseNotePanel for inline trainer notes"
```

---

### Task 13: Update `SessionLogger` with `mode` prop

**Files:**
- Modify: `src/components/training/session-logger.tsx`

- [ ] **Step 1: Add `mode`, `loggedForMember`, and integrate new components**

Update the props interface at the top of `session-logger.tsx`:

```ts
export function SessionLogger({
  session: initialSession,
  backPath = '/member/plan',
  mode = 'member',
  loggedForMember,
}: {
  session: Session;
  backPath?: string;
  mode?: 'member' | 'trainer';
  loggedForMember?: { id: string; name: string };
})
```

- [ ] **Step 2: Add state for the complete modal**

Add after existing state declarations:

```ts
const [showCompleteModal, setShowCompleteModal] = useState(false);
```

- [ ] **Step 3: Replace `completeSession` to show modal first (member mode)**

```ts
async function completeSession(rpe: number | null, memberNote: string | null) {
  setCompleting(true);
  setShowCompleteModal(false);
  try {
    const res = await fetch(`/api/sessions/${session._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rpe, memberNote }),
    });
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
```

- [ ] **Step 4: Update the "Complete Workout" button to show modal**

Replace the sticky bottom bar button:

```tsx
{/* Sticky Complete Workout button */}
<div className="fixed bottom-0 left-0 right-0 lg:left-[220px] border-t border-[#0f0f0f] bg-[#050505] px-4 sm:px-8 py-3">
  <Button
    onClick={() => setShowCompleteModal(true)}
    disabled={completing}
    className="w-full bg-white text-black hover:bg-white/90 text-[13px] font-bold py-3 h-auto rounded-xl disabled:opacity-50"
  >
    {completing ? 'Saving…' : 'Complete Workout'}
  </Button>
</div>

{showCompleteModal && (
  <WorkoutCompleteModal
    onConfirm={(rpe, note) => completeSession(rpe, note)}
    onCancel={() => setShowCompleteModal(false)}
    isLoading={completing}
  />
)}
```

- [ ] **Step 5: Add trainer banner and ExerciseNotePanel to renderExerciseCard**

Below the session title in the header, add:

```tsx
{mode === 'trainer' && loggedForMember && (
  <div className="text-[10px] text-[#6ee7b7] mt-1">
    Logging for: {loggedForMember.name}
  </div>
)}
```

In `renderExerciseCard`, after the `+ Add Set` button, add:

```tsx
{mode === 'trainer' && loggedForMember && (
  <ExerciseNotePanel
    memberId={loggedForMember.id}
    exerciseId={exercise.exerciseId}
    sessionId={session._id}
  />
)}
```

- [ ] **Step 6: Add imports at the top**

```ts
import { WorkoutCompleteModal } from '@/components/training/workout-complete-modal';
import { ExerciseNotePanel } from '@/components/training/exercise-note-panel';
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|warning" | head -20
```

- [ ] **Step 8: Commit**

```bash
git add src/components/training/session-logger.tsx
git commit -m "feat(component): extend SessionLogger with mode prop, WorkoutCompleteModal, and ExerciseNotePanel"
```

---

### Task 14: Create `WorkoutCalendar` and `SessionDetailPanel`

**Files:**
- Create: `src/components/calendar/workout-calendar.tsx`
- Create: `src/components/calendar/session-detail-panel.tsx`

- [ ] **Step 1: Create `WorkoutCalendar`**

```tsx
// src/components/calendar/workout-calendar.tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionSummary {
  _id: string;
  dayName: string;
  completedAt: string;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface WorkoutCalendarProps {
  sessions: SessionSummary[];
  onSelectSession: (session: SessionSummary) => void;
  selectedSessionId?: string | null;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Monday = 0
  return { startOffset, daysInMonth };
}

export function WorkoutCalendar({ sessions, onSelectSession, selectedSessionId }: WorkoutCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const sessionsByDay = new Map<number, SessionSummary>();
  for (const s of sessions) {
    const d = new Date(s.completedAt);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      sessionsByDay.set(d.getDate(), s);
    }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-[#0c0c0c] border border-[#141414] rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-[#555] hover:text-[#888] transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-white">{monthName}</span>
        <button onClick={nextMonth} className="text-[#555] hover:text-[#888] transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-[#444] py-1">{l}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const session = sessionsByDay.get(day);
          const isToday = now.getDate() === day && now.getMonth() + 1 === month && now.getFullYear() === year;
          const isSelected = session && session._id === selectedSessionId;

          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => session && onSelectSession(session)}
                disabled={!session}
                className={cn(
                  'w-8 h-8 rounded-full text-[11px] flex items-center justify-center transition-colors',
                  session && isSelected && 'bg-white text-black font-bold',
                  session && !isSelected && 'bg-white/10 text-white font-semibold hover:bg-white/20',
                  !session && isToday && 'border border-[#333] text-[#555]',
                  !session && !isToday && 'text-[#444]',
                )}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `SessionDetailPanel`**

```tsx
// src/components/calendar/session-detail-panel.tsx
import { ExerciseThumbnail } from '@/components/training/exercise-thumbnail';

interface SessionSet {
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

interface SessionDetail {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  memberNote: string | null;
  sets: SessionSet[];
}

interface SessionDetailPanelProps {
  session: SessionDetail;
}

interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  sets: { setNumber: number; actualWeight: number | null; actualReps: number | null }[];
}

function buildExerciseSummaries(sets: SessionSet[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>();
  for (const s of sets) {
    if (!map.has(s.exerciseId)) {
      map.set(s.exerciseId, { exerciseId: s.exerciseId, exerciseName: s.exerciseName, imageUrl: s.imageUrl, sets: [] });
    }
    if (s.completedAt) {
      map.get(s.exerciseId)!.sets.push({ setNumber: s.setNumber, actualWeight: s.actualWeight, actualReps: s.actualReps });
    }
  }
  return Array.from(map.values());
}

function durationMinutes(start: string, end: string | null) {
  if (!end) return null;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export function SessionDetailPanel({ session }: SessionDetailPanelProps) {
  const exercises = buildExerciseSummaries(session.sets);
  const duration = durationMinutes(session.startedAt, session.completedAt);

  return (
    <div className="bg-[#0c0c0c] border border-[#141414] rounded-xl p-4 space-y-4">
      <div>
        <div className="text-[10px] text-[#555] mb-0.5">
          {new Date(session.completedAt ?? session.startedAt).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          })}
        </div>
        <div className="text-[16px] font-bold text-white">{session.dayName}</div>
        <div className="flex gap-3 mt-1">
          {duration && <span className="text-[10px] text-[#555]">{duration} min</span>}
          {session.rpe && <span className="text-[10px] text-[#555]">RPE {session.rpe}</span>}
        </div>
      </div>

      <div className="space-y-3">
        {exercises.map((ex) => (
          <div key={ex.exerciseId} className="flex items-start gap-3">
            <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.exerciseName} size={40} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white mb-1">{ex.exerciseName}</div>
              <div className="flex flex-wrap gap-1.5">
                {ex.sets.map((s) => (
                  <span key={s.setNumber} className="text-[9px] text-[#666] bg-[#141414] rounded px-1.5 py-0.5">
                    {s.actualWeight !== null ? `${s.actualWeight}kg × ` : ''}{s.actualReps ?? '–'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {session.memberNote && (
        <div className="border-t border-[#141414] pt-3">
          <div className="text-[9px] text-[#555] mb-1">Note</div>
          <div className="text-[11px] text-[#888]">{session.memberNote}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/workout-calendar.tsx src/components/calendar/session-detail-panel.tsx
git commit -m "feat(component): add WorkoutCalendar and SessionDetailPanel"
```

---

## Stage 4 — Pages

### Task 15: Create member training calendar page

**Files:**
- Create: `src/app/(dashboard)/member/plan/calendar/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(dashboard)/member/plan/calendar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutCalendar } from '@/components/calendar/workout-calendar';
import { SessionDetailPanel } from '@/components/calendar/session-detail-panel';
import { PageHeader } from '@/components/shared/page-header';

interface Session {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  memberNote: string | null;
  sets: {
    exerciseId: string;
    exerciseName: string;
    imageUrl: string | null;
    setNumber: number;
    actualWeight: number | null;
    actualReps: number | null;
    completedAt: string | null;
  }[];
}

export default function MemberCalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sessions?memberId=me&year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: Session[]) => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Training Calendar"
        action={
          <button
            onClick={() => router.push('/member/plan')}
            className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
          >
            ← Back to Plan
          </button>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
        <WorkoutCalendar
          sessions={sessions}
          onSelectSession={setSelected}
          selectedSessionId={selected?._id}
        />
        {loading && (
          <div className="text-[12px] text-[#555] text-center py-4">Loading…</div>
        )}
        {selected && <SessionDetailPanel session={selected} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Fix the `GET /api/sessions` memberId handling**

The calendar page uses `memberId=me` as a shortcut. Update the GET handler in `src/app/api/sessions/route.ts` to resolve `me` to the authenticated user's id:

```ts
const resolvedMemberId = memberId === 'me' ? session.user.id : memberId;
// then use resolvedMemberId everywhere memberId was used
```

> Note: Replace both uses of `memberId` in the GET handler with `resolvedMemberId`. The authorization check for members should use the original `memberId` param vs `session.user.id`.

- [ ] **Step 3: Update existing test for this change if needed**

Run existing sessions tests to confirm they still pass:

```bash
pnpm test -- --testPathPattern=sessions-calendar
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/member/plan/calendar/page.tsx src/app/api/sessions/route.ts
git commit -m "feat(page): add member training calendar page"
```

---

### Task 16: Create trainer log-session pages

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/log/new/page.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/log/[sessionId]/page.tsx`

- [ ] **Step 1: Create the "new" redirect page**

```tsx
// src/app/(dashboard)/trainer/members/[id]/log/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export default async function TrainerLogNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId } = await params;
  const { day } = await searchParams;
  const dayNumber = parseInt(day ?? '1', 10);

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(memberId);
  if (!plan) redirect(`/trainer/members/${memberId}/plan`);

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect(`/trainer/members/${memberId}/plan`);

  if (!process.env.AUTH_URL) redirect(`/trainer/members/${memberId}/plan`);

  const cookieStore = await cookies();
  const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ memberId, memberPlanId: plan._id.toString(), dayNumber }),
  });

  if (res.ok) {
    const data = (await res.json()) as { _id: string };
    redirect(`/trainer/members/${memberId}/log/${data._id}`);
  }

  redirect(`/trainer/members/${memberId}/plan`);
}
```

- [ ] **Step 2: Create the trainer session logger page**

```tsx
// src/app/(dashboard)/trainer/members/[id]/log/[sessionId]/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { SessionLogger } from '@/components/training/session-logger';

export default async function TrainerLogSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId, sessionId } = await params;

  await connectDB();
  const [workoutSession, member] = await Promise.all([
    new MongoWorkoutSessionRepository().findById(sessionId),
    new MongoUserRepository().findById(memberId),
  ]);

  if (!workoutSession) redirect(`/trainer/members/${memberId}/plan`);

  return (
    <SessionLogger
      session={JSON.parse(JSON.stringify(workoutSession))}
      backPath={`/trainer/members/${memberId}/plan`}
      mode="trainer"
      loggedForMember={{ id: memberId, name: member?.name ?? 'Member' }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/trainer/members/[id]/log/
git commit -m "feat(page): add trainer log-session pages (new + logger)"
```

---

### Task 17: Update `PlanOverview` — add calendar icon

**Files:**
- Modify: `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`

- [ ] **Step 1: Add the calendar icon link**

Add `CalendarDays` import from lucide-react, and in the plan name header section, add the icon:

```tsx
import { CalendarDays } from 'lucide-react';
```

In the plan header div (where `plan.name` is displayed), add:

```tsx
{/* Plan name header */}
<div className="px-4 sm:px-8 pt-6 pb-3 border-b border-[#0f0f0f]">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#555] mb-0.5">Training Plan</div>
      <div className="text-[18px] font-bold text-white">{plan.name}</div>
    </div>
    <a
      href={`${sessionBasePath}/calendar`}
      className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#888] border border-[#1e1e1e] rounded-lg px-3 py-1.5 transition-colors"
    >
      <CalendarDays className="h-3.5 w-3.5" />
      <span>Calendar</span>
    </a>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/member/plan/_components/plan-overview.tsx
git commit -m "feat(ui): add calendar icon link to PlanOverview header"
```

---

### Task 18: Update trainer member plan page — add "Log Workout" button

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx`

- [ ] **Step 1: Add day-selection dropdown and Log Workout button**

Update `TrainerMemberPlanClient`. Add a `dayNumber` state and a "Log Workout" button per day in the Current Plan section:

```tsx
const [selectedDay, setSelectedDay] = useState<number>(activePlan?.days[0]?.dayNumber ?? 1);

// In the Current Plan section, after the existing plan display:
{activePlan && (
  <div className="mt-4 space-y-2">
    <div className="flex items-center gap-3">
      <select
        value={selectedDay}
        onChange={(e) => setSelectedDay(Number(e.target.value))}
        className="flex-1 rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white focus:outline-none"
      >
        {activePlan.days.map((d) => (
          <option key={d.dayNumber} value={d.dayNumber}>
            Day {d.dayNumber} — {d.name}
          </option>
        ))}
      </select>
      <a
        href={`/trainer/members/${memberId}/log/new?day=${selectedDay}`}
        className="shrink-0 rounded-md bg-[#1a3a1a] border border-[#2a4a2a] px-4 py-2 text-[12px] font-semibold text-[#6ee7b7] hover:bg-[#1f4a1f] transition-colors"
      >
        Log Workout
      </a>
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx
git commit -m "feat(ui): add Log Workout button to trainer member plan page"
```

---

### Task 19: Remove Personal Bests from sidebar navigation

**Files:**
- Modify: `src/components/shared/app-shell.tsx`

- [ ] **Step 1: Remove PBs entries from all three roles**

In `src/components/shared/app-shell.tsx`, in the `NAV` constant:

**member** TRAINING group — remove:
```ts
{ href: '/member/pbs', label: 'Personal Bests' },
```

**trainer** TRAINING group — remove:
```ts
{ href: '/trainer/my-pbs', label: 'Personal Bests' },
```

**owner** TRAINING group — remove:
```ts
{ href: '/owner/my-pbs', label: 'Personal Bests' },
```

- [ ] **Step 2: Run full test suite + lint**

```bash
pnpm test && pnpm lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/app-shell.tsx
git commit -m "feat(nav): remove Personal Bests from sidebar for all roles"
```

---

## Stage 5 — Validation

### Task 20: Final validation

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: zero warnings, zero errors.

- [ ] **Step 3: Run production build**

```bash
pnpm build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Run exercise seed script against dev DB**

```bash
MONGODB_URI=<dev-connection-string> pnpm seed:exercises
```

Expected: 873 exercises and N equipment items upserted.

- [ ] **Step 5: Manual smoke test — Member flow**

1. Log in as a member → My Plan page → verify exercise images appear
2. Click "Log This Workout" → verify session logger opens with exercise images
3. Log a couple of sets → click "Complete Workout" → verify RPE slider + note modal appears
4. Submit → verify redirect back to plan page
5. Click 📅 Calendar icon → verify monthly calendar shows → click a day with a session → verify detail panel with exercise images

- [ ] **Step 6: Manual smoke test — Trainer flow**

1. Log in as a trainer → Members → select a member → Plan tab
2. Select a day → click "Log Workout" → verify redirect to trainer session logger
3. Log sets → verify ExerciseNotePanel appears below each exercise
4. Add a note → verify it saves and appears in history
5. Complete session → verify redirect back to member plan page

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: training module refactor complete — exercise images, RPE/note, calendar, trainer log, exercise notes"
```
