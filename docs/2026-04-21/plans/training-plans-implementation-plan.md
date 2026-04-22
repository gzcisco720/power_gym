# Training Plans & Performance Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Training Plans & Performance Tracking: trainers create plan templates, assign deep-copy instances to members, members log sets in real time, personal bests tracked per exercise with Epley 1RM estimation.

**Architecture:** Template model (PlanTemplate → deep-copy MemberPlan on assignment). WorkoutSession embeds set logs. PersonalBest collection is an upserted cache for fast reads. All DB access via repository pattern. API routes are Next.js Route Handlers using `auth()` from Auth.js v5.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, MongoDB/Mongoose, Auth.js v5 (`next-auth@beta`), Jest + React Testing Library, pnpm

---

## File Map

### lib
| File | Responsibility |
|------|----------------|
| `src/lib/training/epley.ts` | Pure Epley 1RM formula |
| `src/lib/db/models/exercise.model.ts` | Exercise schema + IExercise |
| `src/lib/db/models/plan-template.model.ts` | PlanTemplate schema (nested days/exercises) |
| `src/lib/db/models/member-plan.model.ts` | MemberPlan schema (deep copy of days) |
| `src/lib/db/models/workout-session.model.ts` | WorkoutSession schema (embedded sets) |
| `src/lib/db/models/personal-best.model.ts` | PersonalBest schema |
| `src/lib/repositories/exercise.repository.ts` | IExerciseRepository + MongoExerciseRepository |
| `src/lib/repositories/plan-template.repository.ts` | IPlanTemplateRepository + Mongo impl |
| `src/lib/repositories/member-plan.repository.ts` | IMemberPlanRepository + Mongo impl |
| `src/lib/repositories/workout-session.repository.ts` | IWorkoutSessionRepository + Mongo impl |
| `src/lib/repositories/personal-best.repository.ts` | IPersonalBestRepository + Mongo impl |

### API routes
| File | Responsibility |
|------|----------------|
| `src/app/api/exercises/route.ts` | GET + POST /api/exercises |
| `src/app/api/plan-templates/route.ts` | GET + POST /api/plan-templates |
| `src/app/api/plan-templates/[id]/route.ts` | GET + PUT + DELETE /api/plan-templates/[id] |
| `src/app/api/members/[memberId]/plan/route.ts` | GET + POST /api/members/[memberId]/plan |
| `src/app/api/members/[memberId]/pbs/route.ts` | GET /api/members/[memberId]/pbs |
| `src/app/api/sessions/route.ts` | POST /api/sessions + GET /api/sessions?memberId |
| `src/app/api/sessions/[id]/route.ts` | GET /api/sessions/[id] |
| `src/app/api/sessions/[id]/sets/route.ts` | POST /api/sessions/[id]/sets (add extra set) |
| `src/app/api/sessions/[id]/sets/[setIndex]/route.ts` | PATCH (log a set + upsert PB) |
| `src/app/api/sessions/[id]/complete/route.ts` | POST /api/sessions/[id]/complete |

### UI pages
| File | Responsibility |
|------|----------------|
| `src/app/(dashboard)/layout.tsx` | Auth-protected layout with role nav |
| `src/app/(dashboard)/trainer/plans/page.tsx` | Template list |
| `src/app/(dashboard)/trainer/plans/new/page.tsx` | Create template |
| `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx` | Edit template |
| `src/app/(dashboard)/trainer/members/[id]/plan/page.tsx` | Assign plan + member history |
| `src/app/(dashboard)/member/plan/page.tsx` | Active plan overview |
| `src/app/(dashboard)/member/plan/session/new/page.tsx` | Confirm start session |
| `src/app/(dashboard)/member/plan/session/[id]/page.tsx` | Live logging |
| `src/app/(dashboard)/member/pbs/page.tsx` | PB board |

### Test files
| File | What it tests |
|------|--------------|
| `__tests__/lib/training/epley.test.ts` | Epley formula edge cases |
| `__tests__/lib/repositories/exercise.repository.test.ts` | MongoExerciseRepository |
| `__tests__/lib/repositories/plan-template.repository.test.ts` | MongoPlanTemplateRepository |
| `__tests__/lib/repositories/member-plan.repository.test.ts` | MongoMemberPlanRepository |
| `__tests__/lib/repositories/workout-session.repository.test.ts` | MongoWorkoutSessionRepository |
| `__tests__/lib/repositories/personal-best.repository.test.ts` | MongoPersonalBestRepository |
| `__tests__/app/api/exercises.test.ts` | /api/exercises |
| `__tests__/app/api/plan-templates.test.ts` | /api/plan-templates |
| `__tests__/app/api/plan-templates-id.test.ts` | /api/plan-templates/[id] |
| `__tests__/app/api/members-plan.test.ts` | /api/members/[memberId]/plan |
| `__tests__/app/api/sessions.test.ts` | POST + GET /api/sessions |
| `__tests__/app/api/sessions-id.test.ts` | GET /api/sessions/[id] |
| `__tests__/app/api/sessions-sets.test.ts` | PATCH set + POST extra set |
| `__tests__/app/api/sessions-complete.test.ts` | POST complete |
| `__tests__/app/api/members-pbs.test.ts` | /api/members/[memberId]/pbs |

---

## Task 1: Epley Formula

**Files:**
- Create: `src/lib/training/epley.ts`
- Test: `__tests__/lib/training/epley.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/training/epley.test.ts
import { estimatedOneRM } from '@/lib/training/epley';

describe('estimatedOneRM', () => {
  it('calculates Epley 1RM: 100kg × 10 reps ≈ 133.33', () => {
    expect(estimatedOneRM(100, 10)).toBeCloseTo(133.33, 2);
  });

  it('returns weight × (1 + 1/30) for 1 rep', () => {
    expect(estimatedOneRM(100, 1)).toBeCloseTo(103.33, 2);
  });

  it('returns 0 when weight is 0', () => {
    expect(estimatedOneRM(0, 10)).toBe(0);
  });

  it('returns weight unchanged when reps is 0', () => {
    expect(estimatedOneRM(80, 0)).toBe(80);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern=epley
```
Expected: FAIL — `Cannot find module '@/lib/training/epley'`

- [ ] **Step 3: Implement**

```ts
// src/lib/training/epley.ts
export function estimatedOneRM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern=epley
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/training/epley.ts __tests__/lib/training/epley.test.ts
git commit -m "feat: add Epley 1RM formula"
```

---

## Task 2: Mongoose Models (schema definitions)

Models have no business logic — their correctness is verified by the repository tests in Tasks 3–7. Implement all five directly.

**Files:**
- Create: `src/lib/db/models/exercise.model.ts`
- Create: `src/lib/db/models/plan-template.model.ts`
- Create: `src/lib/db/models/member-plan.model.ts`
- Create: `src/lib/db/models/workout-session.model.ts`
- Create: `src/lib/db/models/personal-best.model.ts`

- [ ] **Step 1: Create exercise.model.ts**

```ts
// src/lib/db/models/exercise.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExercise extends Document {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  imageUrl: string | null;
  isBodyweight: boolean;
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
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ExerciseSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const ExerciseModel: Model<IExercise> =
  mongoose.models.Exercise ?? mongoose.model<IExercise>('Exercise', ExerciseSchema);
```

- [ ] **Step 2: Create plan-template.model.ts**

```ts
// src/lib/db/models/plan-template.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPlanDayExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export interface IPlanDay {
  dayNumber: number;
  name: string;
  exercises: IPlanDayExercise[];
}

export interface IPlanTemplate extends Document {
  name: string;
  description: string | null;
  createdBy: mongoose.Types.ObjectId;
  days: IPlanDay[];
  createdAt: Date;
}

const PlanDayExerciseSchema = new Schema<IPlanDayExercise>(
  {
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    imageUrl: { type: String, default: null },
    isBodyweight: { type: Boolean, required: true, default: false },
    sets: { type: Number, required: true },
    repsMin: { type: Number, required: true },
    repsMax: { type: Number, required: true },
    restSeconds: { type: Number, default: null },
  },
  { _id: false },
);

const PlanDaySchema = new Schema<IPlanDay>(
  {
    dayNumber: { type: Number, required: true },
    name: { type: String, required: true },
    exercises: [PlanDayExerciseSchema],
  },
  { _id: false },
);

const PlanTemplateSchema = new Schema<IPlanTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    days: [PlanDaySchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PlanTemplateModel: Model<IPlanTemplate> =
  mongoose.models.PlanTemplate ??
  mongoose.model<IPlanTemplate>('PlanTemplate', PlanTemplateSchema);
```

- [ ] **Step 3: Create member-plan.model.ts**

MemberPlan days are a deep copy of PlanTemplate days — same sub-schema structure.

```ts
// src/lib/db/models/member-plan.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IPlanDay } from './plan-template.model';

export interface IMemberPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  name: string;
  days: IPlanDay[];
  isActive: boolean;
  assignedAt: Date;
}

const MemberPlanDayExerciseSchema = new Schema(
  {
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    imageUrl: { type: String, default: null },
    isBodyweight: { type: Boolean, required: true, default: false },
    sets: { type: Number, required: true },
    repsMin: { type: Number, required: true },
    repsMax: { type: Number, required: true },
    restSeconds: { type: Number, default: null },
  },
  { _id: false },
);

const MemberPlanDaySchema = new Schema(
  {
    dayNumber: { type: Number, required: true },
    name: { type: String, required: true },
    exercises: [MemberPlanDayExerciseSchema],
  },
  { _id: false },
);

const MemberPlanSchema = new Schema<IMemberPlan>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    templateId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    days: [MemberPlanDaySchema],
    isActive: { type: Boolean, required: true, default: true },
    assignedAt: { type: Date, required: true },
  },
);

MemberPlanSchema.index({ memberId: 1, isActive: 1 });

export const MemberPlanModel: Model<IMemberPlan> =
  mongoose.models.MemberPlan ??
  mongoose.model<IMemberPlan>('MemberPlan', MemberPlanSchema);
```

- [ ] **Step 4: Create workout-session.model.ts**

```ts
// src/lib/db/models/workout-session.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISessionSet {
  exerciseId: mongoose.Types.ObjectId;
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
  completedAt: Date | null;
}

export interface IWorkoutSession extends Document {
  memberId: mongoose.Types.ObjectId;
  memberPlanId: mongoose.Types.ObjectId;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  completedAt: Date | null;
  sets: ISessionSet[];
}

const SessionSetSchema = new Schema<ISessionSet>(
  {
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    isBodyweight: { type: Boolean, required: true, default: false },
    setNumber: { type: Number, required: true },
    prescribedRepsMin: { type: Number, required: true },
    prescribedRepsMax: { type: Number, required: true },
    isExtraSet: { type: Boolean, required: true, default: false },
    actualWeight: { type: Number, default: null },
    actualReps: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

const WorkoutSessionSchema = new Schema<IWorkoutSession>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    memberPlanId: { type: Schema.Types.ObjectId, required: true },
    dayNumber: { type: Number, required: true },
    dayName: { type: String, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    sets: [SessionSetSchema],
  },
);

WorkoutSessionSchema.index({ memberId: 1, startedAt: -1 });

export const WorkoutSessionModel: Model<IWorkoutSession> =
  mongoose.models.WorkoutSession ??
  mongoose.model<IWorkoutSession>('WorkoutSession', WorkoutSessionSchema);
```

- [ ] **Step 5: Create personal-best.model.ts**

```ts
// src/lib/db/models/personal-best.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPersonalBest extends Document {
  memberId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: Date;
  sessionId: mongoose.Types.ObjectId;
}

const PersonalBestSchema = new Schema<IPersonalBest>({
  memberId: { type: Schema.Types.ObjectId, required: true },
  exerciseId: { type: Schema.Types.ObjectId, required: true },
  exerciseName: { type: String, required: true },
  bestWeight: { type: Number, required: true },
  bestReps: { type: Number, required: true },
  estimatedOneRM: { type: Number, required: true },
  achievedAt: { type: Date, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true },
});

PersonalBestSchema.index({ memberId: 1, exerciseId: 1 }, { unique: true });

export const PersonalBestModel: Model<IPersonalBest> =
  mongoose.models.PersonalBest ??
  mongoose.model<IPersonalBest>('PersonalBest', PersonalBestSchema);
```

- [ ] **Step 6: Confirm TypeScript compiles**

```bash
pnpm build 2>&1 | head -20
```
Expected: no TypeScript errors for the new model files (build may warn about missing pages — that's fine).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/models/
git commit -m "feat: add Mongoose models for training plans feature"
```

---

## Task 3: ExerciseRepository

**Files:**
- Create: `src/lib/repositories/exercise.repository.ts`
- Test: `__tests__/lib/repositories/exercise.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/exercise.repository.test.ts
import mongoose from 'mongoose';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { ExerciseModel } from '@/lib/db/models/exercise.model';

jest.mock('@/lib/db/models/exercise.model', () => ({
  ExerciseModel: Object.assign(jest.fn(), {
    find: jest.fn(),
  }),
}));

const mockModel = jest.mocked(ExerciseModel);

describe('MongoExerciseRepository', () => {
  let repo: MongoExerciseRepository;

  beforeEach(() => {
    repo = new MongoExerciseRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('queries only isGlobal when no creatorId provided', async () => {
      mockModel.find.mockResolvedValue([] as never);
      await repo.findAll({});
      expect(mockModel.find).toHaveBeenCalledWith({ isGlobal: true });
    });

    it('queries isGlobal OR createdBy when creatorId provided', async () => {
      mockModel.find.mockResolvedValue([] as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findAll({ creatorId: id });
      expect(mockModel.find).toHaveBeenCalledWith({
        $or: [{ isGlobal: true }, { createdBy: expect.any(mongoose.Types.ObjectId) }],
      });
    });

    it('returns exercises from model', async () => {
      const exercises = [{ _id: 'e1', name: 'Bench Press' }];
      mockModel.find.mockResolvedValue(exercises as never);
      const result = await repo.findAll({});
      expect(result).toEqual(exercises);
    });
  });

  describe('create', () => {
    it('saves and returns new exercise', async () => {
      const saved = { _id: 'e1', name: 'Squat' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (ExerciseModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        name: 'Squat',
        muscleGroup: 'Quads',
        isGlobal: false,
        createdBy: 'trainer-id',
        imageUrl: null,
        isBodyweight: false,
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern=exercise.repository
```
Expected: FAIL — `Cannot find module '@/lib/repositories/exercise.repository'`

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/exercise.repository.ts
import mongoose from 'mongoose';
import type { IExercise } from '@/lib/db/models/exercise.model';
import { ExerciseModel } from '@/lib/db/models/exercise.model';

export interface CreateExerciseData {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: string | null;
  imageUrl: string | null;
  isBodyweight: boolean;
}

export interface FindExercisesOptions {
  creatorId?: string | null;
}

export interface IExerciseRepository {
  findAll(options: FindExercisesOptions): Promise<IExercise[]>;
  create(data: CreateExerciseData): Promise<IExercise>;
}

export class MongoExerciseRepository implements IExerciseRepository {
  async findAll({ creatorId }: FindExercisesOptions = {}): Promise<IExercise[]> {
    const query = creatorId
      ? { $or: [{ isGlobal: true }, { createdBy: new mongoose.Types.ObjectId(creatorId) }] }
      : { isGlobal: true };
    return ExerciseModel.find(query);
  }

  async create(data: CreateExerciseData): Promise<IExercise> {
    const exercise = new ExerciseModel({
      ...data,
      createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : null,
    });
    return exercise.save();
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern=exercise.repository
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/exercise.repository.ts __tests__/lib/repositories/exercise.repository.test.ts
git commit -m "feat: add ExerciseRepository"
```

---

## Task 4: PlanTemplateRepository

**Files:**
- Create: `src/lib/repositories/plan-template.repository.ts`
- Test: `__tests__/lib/repositories/plan-template.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/plan-template.repository.test.ts
import mongoose from 'mongoose';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { PlanTemplateModel } from '@/lib/db/models/plan-template.model';

jest.mock('@/lib/db/models/plan-template.model', () => ({
  PlanTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

const mockModel = jest.mocked(PlanTemplateModel);

describe('MongoPlanTemplateRepository', () => {
  let repo: MongoPlanTemplateRepository;

  beforeEach(() => {
    repo = new MongoPlanTemplateRepository();
    jest.clearAllMocks();
  });

  describe('findByCreator', () => {
    it('queries by createdBy ObjectId', async () => {
      mockModel.find.mockResolvedValue([] as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findByCreator(id);
      expect(mockModel.find).toHaveBeenCalledWith({
        createdBy: expect.any(mongoose.Types.ObjectId),
      });
    });
  });

  describe('findById', () => {
    it('calls findById with id', async () => {
      mockModel.findById.mockResolvedValue(null as never);
      await repo.findById('abc');
      expect(mockModel.findById).toHaveBeenCalledWith('abc');
    });
  });

  describe('create', () => {
    it('saves and returns new template', async () => {
      const saved = { _id: 't1', name: 'Push Pull Legs' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (PlanTemplateModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        name: 'Push Pull Legs',
        description: null,
        createdBy: new mongoose.Types.ObjectId().toString(),
        days: [],
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  describe('update', () => {
    it('calls findByIdAndUpdate with id and data', async () => {
      const updated = { _id: 't1', name: 'New Name' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      const result = await repo.update('t1', { name: 'New Name' });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        't1',
        { $set: { name: 'New Name' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteById', () => {
    it('returns true when document deleted', async () => {
      mockModel.findOneAndDelete.mockResolvedValue({ _id: 't1' } as never);
      const result = await repo.deleteById('t1', 'creator-id');
      expect(result).toBe(true);
    });

    it('returns false when document not found', async () => {
      mockModel.findOneAndDelete.mockResolvedValue(null as never);
      const result = await repo.deleteById('t1', 'creator-id');
      expect(result).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern=plan-template.repository
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/plan-template.repository.ts
import mongoose from 'mongoose';
import type { IPlanTemplate, IPlanDay } from '@/lib/db/models/plan-template.model';
import { PlanTemplateModel } from '@/lib/db/models/plan-template.model';

export interface CreatePlanTemplateData {
  name: string;
  description: string | null;
  createdBy: string;
  days: IPlanDay[];
}

export interface UpdatePlanTemplateData {
  name?: string;
  description?: string | null;
  days?: IPlanDay[];
}

export interface IPlanTemplateRepository {
  findByCreator(createdBy: string): Promise<IPlanTemplate[]>;
  findById(id: string): Promise<IPlanTemplate | null>;
  create(data: CreatePlanTemplateData): Promise<IPlanTemplate>;
  update(id: string, data: UpdatePlanTemplateData): Promise<IPlanTemplate | null>;
  deleteById(id: string, createdBy: string): Promise<boolean>;
}

export class MongoPlanTemplateRepository implements IPlanTemplateRepository {
  async findByCreator(createdBy: string): Promise<IPlanTemplate[]> {
    return PlanTemplateModel.find({ createdBy: new mongoose.Types.ObjectId(createdBy) });
  }

  async findById(id: string): Promise<IPlanTemplate | null> {
    return PlanTemplateModel.findById(id);
  }

  async create(data: CreatePlanTemplateData): Promise<IPlanTemplate> {
    const template = new PlanTemplateModel({
      ...data,
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
    });
    return template.save();
  }

  async update(id: string, data: UpdatePlanTemplateData): Promise<IPlanTemplate | null> {
    return PlanTemplateModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string, createdBy: string): Promise<boolean> {
    const result = await PlanTemplateModel.findOneAndDelete({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
    return result !== null;
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern=plan-template.repository
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/plan-template.repository.ts __tests__/lib/repositories/plan-template.repository.test.ts
git commit -m "feat: add PlanTemplateRepository"
```

---

## Task 5: MemberPlanRepository

**Files:**
- Create: `src/lib/repositories/member-plan.repository.ts`
- Test: `__tests__/lib/repositories/member-plan.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/member-plan.repository.test.ts
import mongoose from 'mongoose';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MemberPlanModel } from '@/lib/db/models/member-plan.model';

jest.mock('@/lib/db/models/member-plan.model', () => ({
  MemberPlanModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    updateMany: jest.fn(),
  }),
}));

const mockModel = jest.mocked(MemberPlanModel);

describe('MongoMemberPlanRepository', () => {
  let repo: MongoMemberPlanRepository;

  beforeEach(() => {
    repo = new MongoMemberPlanRepository();
    jest.clearAllMocks();
  });

  describe('findActive', () => {
    it('queries memberId + isActive: true', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findActive(id);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
        isActive: true,
      });
    });

    it('returns the active plan when found', async () => {
      const plan = { _id: 'p1', isActive: true };
      mockModel.findOne.mockResolvedValue(plan as never);
      const result = await repo.findActive('member-id');
      expect(result).toEqual(plan);
    });
  });

  describe('deactivateAll', () => {
    it('calls updateMany to set isActive false', async () => {
      mockModel.updateMany.mockResolvedValue({} as never);
      await repo.deactivateAll('member-id');
      expect(mockModel.updateMany).toHaveBeenCalledWith(
        { memberId: expect.any(mongoose.Types.ObjectId) },
        { $set: { isActive: false } },
      );
    });
  });

  describe('create', () => {
    it('saves and returns new member plan', async () => {
      const saved = { _id: 'mp1', name: 'PPL' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (MemberPlanModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        memberId: new mongoose.Types.ObjectId().toString(),
        trainerId: new mongoose.Types.ObjectId().toString(),
        templateId: new mongoose.Types.ObjectId().toString(),
        name: 'PPL',
        days: [],
        assignedAt: new Date(),
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern=member-plan.repository
```

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/member-plan.repository.ts
import mongoose from 'mongoose';
import type { IMemberPlan } from '@/lib/db/models/member-plan.model';
import { MemberPlanModel } from '@/lib/db/models/member-plan.model';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

export interface CreateMemberPlanData {
  memberId: string;
  trainerId: string;
  templateId: string;
  name: string;
  days: IPlanDay[];
  assignedAt: Date;
}

export interface IMemberPlanRepository {
  findActive(memberId: string): Promise<IMemberPlan | null>;
  deactivateAll(memberId: string): Promise<void>;
  create(data: CreateMemberPlanData): Promise<IMemberPlan>;
}

export class MongoMemberPlanRepository implements IMemberPlanRepository {
  async findActive(memberId: string): Promise<IMemberPlan | null> {
    return MemberPlanModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await MemberPlanModel.updateMany(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: { isActive: false } },
    );
  }

  async create(data: CreateMemberPlanData): Promise<IMemberPlan> {
    const plan = new MemberPlanModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
      templateId: new mongoose.Types.ObjectId(data.templateId),
      name: data.name,
      days: data.days,
      isActive: true,
      assignedAt: data.assignedAt,
    });
    return plan.save();
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern=member-plan.repository
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/member-plan.repository.ts __tests__/lib/repositories/member-plan.repository.test.ts
git commit -m "feat: add MemberPlanRepository"
```

---

## Task 6: WorkoutSessionRepository

**Files:**
- Create: `src/lib/repositories/workout-session.repository.ts`
- Test: `__tests__/lib/repositories/workout-session.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/workout-session.repository.test.ts
import mongoose from 'mongoose';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

jest.mock('@/lib/db/models/workout-session.model', () => ({
  WorkoutSessionModel: Object.assign(jest.fn(), {
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(WorkoutSessionModel);

describe('MongoWorkoutSessionRepository', () => {
  let repo: MongoWorkoutSessionRepository;

  beforeEach(() => {
    repo = new MongoWorkoutSessionRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('saves and returns the session', async () => {
      const saved = { _id: 's1', dayNumber: 1 };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (WorkoutSessionModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        memberId: new mongoose.Types.ObjectId().toString(),
        memberPlanId: new mongoose.Types.ObjectId().toString(),
        dayNumber: 1,
        dayName: 'Day 1 — Push',
        startedAt: new Date(),
        sets: [],
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  describe('findById', () => {
    it('calls findById with id', async () => {
      mockModel.findById.mockResolvedValue(null as never);
      await repo.findById('session-id');
      expect(mockModel.findById).toHaveBeenCalledWith('session-id');
    });
  });

  describe('findByMember', () => {
    it('queries by memberId sorted by startedAt desc', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      mockModel.find.mockReturnValue({ sort: sortMock } as never);
      await repo.findByMember('member-id');
      expect(mockModel.find).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
      });
      expect(sortMock).toHaveBeenCalledWith({ startedAt: -1 });
    });
  });

  describe('updateSet', () => {
    it('calls findByIdAndUpdate with positional set update', async () => {
      const updated = { _id: 's1' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      await repo.updateSet('s1', 2, { actualWeight: 100, actualReps: 8 });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        {
          $set: {
            'sets.2.actualWeight': 100,
            'sets.2.actualReps': 8,
            'sets.2.completedAt': expect.any(Date),
          },
        },
        { new: true },
      );
    });
  });

  describe('addExtraSet', () => {
    it('calls findByIdAndUpdate with $push', async () => {
      const updated = { _id: 's1' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      const extraSet = {
        exerciseId: new mongoose.Types.ObjectId(),
        exerciseName: 'Bench',
        groupId: 'A',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 4,
        prescribedRepsMin: 8,
        prescribedRepsMax: 10,
        isExtraSet: true,
        actualWeight: null,
        actualReps: null,
        completedAt: null,
      };

      await repo.addExtraSet('s1', extraSet);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        { $push: { sets: extraSet } },
        { new: true },
      );
    });
  });

  describe('complete', () => {
    it('sets completedAt on the session', async () => {
      mockModel.findByIdAndUpdate.mockResolvedValue({ _id: 's1', completedAt: new Date() } as never);

      await repo.complete('s1');

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        { $set: { completedAt: expect.any(Date) } },
        { new: true },
      );
    });
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern=workout-session.repository
```

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/workout-session.repository.ts
import mongoose from 'mongoose';
import type { IWorkoutSession, ISessionSet } from '@/lib/db/models/workout-session.model';
import { WorkoutSessionModel } from '@/lib/db/models/workout-session.model';

export interface CreateSessionData {
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  sets: Omit<ISessionSet, 'completedAt'>[];
}

export interface UpdateSetData {
  actualWeight: number | null;
  actualReps: number | null;
}

export interface IWorkoutSessionRepository {
  create(data: CreateSessionData): Promise<IWorkoutSession>;
  findById(id: string): Promise<IWorkoutSession | null>;
  findByMember(memberId: string): Promise<IWorkoutSession[]>;
  updateSet(id: string, setIndex: number, data: UpdateSetData): Promise<IWorkoutSession | null>;
  addExtraSet(id: string, extraSet: ISessionSet): Promise<IWorkoutSession | null>;
  complete(id: string): Promise<IWorkoutSession | null>;
}

export class MongoWorkoutSessionRepository implements IWorkoutSessionRepository {
  async create(data: CreateSessionData): Promise<IWorkoutSession> {
    const session = new WorkoutSessionModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      memberPlanId: new mongoose.Types.ObjectId(data.memberPlanId),
      dayNumber: data.dayNumber,
      dayName: data.dayName,
      startedAt: data.startedAt,
      completedAt: null,
      sets: data.sets,
    });
    return session.save();
  }

  async findById(id: string): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findById(id);
  }

  async findByMember(memberId: string): Promise<IWorkoutSession[]> {
    return WorkoutSessionModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ startedAt: -1 });
  }

  async updateSet(id: string, setIndex: number, data: UpdateSetData): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          [`sets.${setIndex}.actualWeight`]: data.actualWeight,
          [`sets.${setIndex}.actualReps`]: data.actualReps,
          [`sets.${setIndex}.completedAt`]: new Date(),
        },
      },
      { new: true },
    );
  }

  async addExtraSet(id: string, extraSet: ISessionSet): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      { $push: { sets: extraSet } },
      { new: true },
    );
  }

  async complete(id: string): Promise<IWorkoutSession | null> {
    return WorkoutSessionModel.findByIdAndUpdate(
      id,
      { $set: { completedAt: new Date() } },
      { new: true },
    );
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern=workout-session.repository
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/workout-session.repository.ts __tests__/lib/repositories/workout-session.repository.test.ts
git commit -m "feat: add WorkoutSessionRepository"
```

---

## Task 7: PersonalBestRepository

**Files:**
- Create: `src/lib/repositories/personal-best.repository.ts`
- Test: `__tests__/lib/repositories/personal-best.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/personal-best.repository.test.ts
import mongoose from 'mongoose';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';

jest.mock('@/lib/db/models/personal-best.model', () => ({
  PersonalBestModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(PersonalBestModel);

describe('MongoPersonalBestRepository', () => {
  let repo: MongoPersonalBestRepository;

  beforeEach(() => {
    repo = new MongoPersonalBestRepository();
    jest.clearAllMocks();
  });

  describe('findByMember', () => {
    it('queries by memberId', async () => {
      mockModel.find.mockResolvedValue([] as never);
      await repo.findByMember('member-id');
      expect(mockModel.find).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
      });
    });
  });

  describe('upsertIfBetter', () => {
    const base = {
      memberId: new mongoose.Types.ObjectId().toString(),
      exerciseId: new mongoose.Types.ObjectId().toString(),
      exerciseName: 'Bench Press',
      sessionId: new mongoose.Types.ObjectId().toString(),
    };

    it('does not upsert when new 1RM is lower than existing', async () => {
      mockModel.findOne.mockResolvedValue({ estimatedOneRM: 150 } as never);

      // weight=80, reps=8 → 1RM = 80*(1+8/30) ≈ 101.3
      await repo.upsertIfBetter({ ...base, weight: 80, reps: 8 });

      expect(mockModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('upserts when new 1RM exceeds existing', async () => {
      mockModel.findOne.mockResolvedValue({ estimatedOneRM: 100 } as never);

      // weight=100, reps=10 → 1RM = 100*(1+10/30) ≈ 133.3
      await repo.upsertIfBetter({ ...base, weight: 100, reps: 10 });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('upserts when no existing record (null)', async () => {
      mockModel.findOne.mockResolvedValue(null as never);

      await repo.upsertIfBetter({ ...base, weight: 100, reps: 10 });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('passes correct estimatedOneRM when upserting', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      mockModel.findOneAndUpdate.mockResolvedValue({} as never);

      await repo.upsertIfBetter({ ...base, weight: 100, reps: 10 });

      const call = mockModel.findOneAndUpdate.mock.calls[0];
      const update = call[1] as Record<string, unknown>;
      expect((update as { estimatedOneRM: number }).estimatedOneRM).toBeCloseTo(133.33, 2);
    });
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern=personal-best.repository
```

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/personal-best.repository.ts
import mongoose from 'mongoose';
import type { IPersonalBest } from '@/lib/db/models/personal-best.model';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';
import { estimatedOneRM } from '@/lib/training/epley';

export interface UpsertPBData {
  memberId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sessionId: string;
}

export interface IPersonalBestRepository {
  findByMember(memberId: string): Promise<IPersonalBest[]>;
  upsertIfBetter(data: UpsertPBData): Promise<void>;
}

export class MongoPersonalBestRepository implements IPersonalBestRepository {
  async findByMember(memberId: string): Promise<IPersonalBest[]> {
    return PersonalBestModel.find({ memberId: new mongoose.Types.ObjectId(memberId) });
  }

  async upsertIfBetter(data: UpsertPBData): Promise<void> {
    const newEstimated = estimatedOneRM(data.weight, data.reps);

    const existing = await PersonalBestModel.findOne({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      exerciseId: new mongoose.Types.ObjectId(data.exerciseId),
    });

    if (existing && newEstimated <= existing.estimatedOneRM) return;

    await PersonalBestModel.findOneAndUpdate(
      {
        memberId: new mongoose.Types.ObjectId(data.memberId),
        exerciseId: new mongoose.Types.ObjectId(data.exerciseId),
      },
      {
        exerciseName: data.exerciseName,
        bestWeight: data.weight,
        bestReps: data.reps,
        estimatedOneRM: newEstimated,
        achievedAt: new Date(),
        sessionId: new mongoose.Types.ObjectId(data.sessionId),
      },
      { upsert: true, new: true },
    );
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern=personal-best.repository
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/personal-best.repository.ts __tests__/lib/repositories/personal-best.repository.test.ts
git commit -m "feat: add PersonalBestRepository with Epley upsert logic"
```

---

## Task 8: GET + POST /api/exercises

**Files:**
- Create: `src/app/api/exercises/route.ts`
- Test: `__tests__/app/api/exercises.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/exercises.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockExerciseRepo = {
  findAll: jest.fn(),
  create: jest.fn(),
};
jest.mock('@/lib/repositories/exercise.repository', () => ({
  MongoExerciseRepository: jest.fn(() => mockExerciseRepo),
}));

const mockUserRepo = {
  findById: jest.fn(),
};
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/exercises', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/exercises/route');
    const res = await GET(new Request('http://localhost/api/exercises'));
    expect(res.status).toBe(401);
  });

  it('returns exercises for trainer (global + own)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    const exercises = [{ name: 'Bench' }, { name: 'Squat' }];
    mockExerciseRepo.findAll.mockResolvedValue(exercises);

    const { GET } = await import('@/app/api/exercises/route');
    const res = await GET(new Request('http://localhost/api/exercises'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockExerciseRepo.findAll).toHaveBeenCalledWith({ creatorId: 't1' });
    expect(data).toEqual(exercises);
  });

  it('returns exercises for member using their trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 'trainer1' } } as never);
    mockExerciseRepo.findAll.mockResolvedValue([]);

    const { GET } = await import('@/app/api/exercises/route');
    await GET(new Request('http://localhost/api/exercises'));

    expect(mockExerciseRepo.findAll).toHaveBeenCalledWith({ creatorId: 'trainer1' });
  });
});

describe('POST /api/exercises', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to create', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: null } } as never);
    const { POST } = await import('@/app/api/exercises/route');
    const res = await POST(new Request('http://localhost/api/exercises', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', isBodyweight: false }),
    }));
    expect(res.status).toBe(403);
  });

  it('creates exercise for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    const created = { _id: 'e1', name: 'Custom Curl' };
    mockExerciseRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/exercises/route');
    const res = await POST(new Request('http://localhost/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Custom Curl', muscleGroup: 'Biceps', isBodyweight: false }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockExerciseRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Custom Curl',
      isGlobal: false,
      createdBy: 't1',
    }));
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="exercises.test"
```

- [ ] **Step 3: Add `findById` to IUserRepository and MongoUserRepository**

The GET /api/exercises route needs to look up a member's trainerId. Add `findById` to the existing user repository:

```ts
// src/lib/repositories/user.repository.ts — add to interface and class:
async findById(id: string): Promise<IUser | null> {
  return UserModel.findById(id);
}
```

Also add `findById(id: string): Promise<IUser | null>;` to `IUserRepository`.

- [ ] **Step 4: Implement the route**

```ts
// src/app/api/exercises/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import type { UserRole } from '@/types/auth';

export async function GET(_req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const exerciseRepo = new MongoExerciseRepository();
  const role = session.user.role as UserRole;

  let creatorId: string | null = null;
  if (role === 'member') {
    creatorId = session.user.trainerId ?? null;
  } else {
    creatorId = session.user.id;
  }

  const exercises = await exerciseRepo.findAll({ creatorId });
  return Response.json(exercises);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = (await req.json()) as {
    name: string;
    muscleGroup?: string | null;
    imageUrl?: string | null;
    isBodyweight?: boolean;
  };

  const exerciseRepo = new MongoExerciseRepository();
  const exercise = await exerciseRepo.create({
    name: body.name,
    muscleGroup: body.muscleGroup ?? null,
    imageUrl: body.imageUrl ?? null,
    isBodyweight: body.isBodyweight ?? false,
    isGlobal: false,
    createdBy: session.user.id,
  });

  return Response.json(exercise, { status: 201 });
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="exercises.test"
```
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/exercises/route.ts __tests__/app/api/exercises.test.ts src/lib/repositories/user.repository.ts
git commit -m "feat: add GET/POST /api/exercises"
```

---

## Task 9: GET + POST /api/plan-templates

**Files:**
- Create: `src/app/api/plan-templates/route.ts`
- Test: `__tests__/app/api/plan-templates.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/plan-templates.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockTemplateRepo = { findByCreator: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/plan-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/plan-templates/route');
    const res = await GET(new Request('http://localhost/api/plan-templates'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/plan-templates/route');
    const res = await GET(new Request('http://localhost/api/plan-templates'));
    expect(res.status).toBe(403);
  });

  it('returns templates for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const templates = [{ name: 'PPL' }];
    mockTemplateRepo.findByCreator.mockResolvedValue(templates);

    const { GET } = await import('@/app/api/plan-templates/route');
    const res = await GET(new Request('http://localhost/api/plan-templates'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockTemplateRepo.findByCreator).toHaveBeenCalledWith('t1');
    expect(data).toEqual(templates);
  });
});

describe('POST /api/plan-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates template for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const created = { _id: 'tpl1', name: 'Push Pull Legs' };
    mockTemplateRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/plan-templates/route');
    const res = await POST(new Request('http://localhost/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Push Pull Legs', description: null, days: [] }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockTemplateRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Push Pull Legs',
      createdBy: 't1',
    }));
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="plan-templates.test"
```

- [ ] **Step 3: Implement**

```ts
// src/app/api/plan-templates/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import type { UserRole } from '@/types/auth';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

function requireTrainerOrOwner(role: UserRole): Response | null {
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(_req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const repo = new MongoPlanTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  return Response.json(templates);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const body = (await req.json()) as {
    name: string;
    description?: string | null;
    days?: IPlanDay[];
  };

  const repo = new MongoPlanTemplateRepository();
  const template = await repo.create({
    name: body.name,
    description: body.description ?? null,
    createdBy: session.user.id,
    days: body.days ?? [],
  });

  return Response.json(template, { status: 201 });
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="plan-templates.test"
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/plan-templates/route.ts __tests__/app/api/plan-templates.test.ts
git commit -m "feat: add GET/POST /api/plan-templates"
```

---

## Task 10: GET + PUT + DELETE /api/plan-templates/[id]

**Files:**
- Create: `src/app/api/plan-templates/[id]/route.ts`
- Test: `__tests__/app/api/plan-templates-id.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/plan-templates-id.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockTemplateRepo = {
  findById: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
};
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/plan-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when template not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue(null);

    const { GET } = await import('@/app/api/plan-templates/[id]/route');
    const res = await GET(new Request('http://localhost/api/plan-templates/tpl1'), makeParams('tpl1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses another trainer template', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't2' } });

    const { GET } = await import('@/app/api/plan-templates/[id]/route');
    const res = await GET(new Request('http://localhost/api/plan-templates/tpl1'), makeParams('tpl1'));
    expect(res.status).toBe(403);
  });

  it('returns template when found and authorized', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const template = { _id: 'tpl1', createdBy: { toString: () => 't1' }, name: 'PPL' };
    mockTemplateRepo.findById.mockResolvedValue(template);

    const { GET } = await import('@/app/api/plan-templates/[id]/route');
    const res = await GET(new Request('http://localhost/api/plan-templates/tpl1'), makeParams('tpl1'));
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/plan-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns updated template', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't1' } });
    const updated = { _id: 'tpl1', name: 'New Name' };
    mockTemplateRepo.update.mockResolvedValue(updated);

    const { PUT } = await import('@/app/api/plan-templates/[id]/route');
    const res = await PUT(
      new Request('http://localhost/api/plan-templates/tpl1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      }),
      makeParams('tpl1'),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(updated);
  });
});

describe('DELETE /api/plan-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 on successful delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't1' } });
    mockTemplateRepo.deleteById.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/plan-templates/[id]/route');
    const res = await DELETE(new Request('http://localhost/api/plan-templates/tpl1'), makeParams('tpl1'));
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="plan-templates-id"
```

- [ ] **Step 3: Implement**

```ts
// src/app/api/plan-templates/[id]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import type { UserRole } from '@/types/auth';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

type RouteContext = { params: Promise<{ id: string }> };

async function getAuthorizedTemplate(id: string, userId: string, role: UserRole) {
  const repo = new MongoPlanTemplateRepository();
  const template = await repo.findById(id);
  if (!template) return { template: null, repo, error: Response.json({ error: 'Not found' }, { status: 404 }) };

  if (role !== 'owner' && template.createdBy.toString() !== userId) {
    return { template: null, repo, error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { template, repo, error: null };
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user.role as UserRole) === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const { template, error } = await getAuthorizedTemplate(id, session.user.id, session.user.role as UserRole);
  if (error) return error;

  return Response.json(template);
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user.role as UserRole) === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const { repo, error } = await getAuthorizedTemplate(id, session.user.id, session.user.role as UserRole);
  if (error) return error;

  const body = (await req.json()) as { name?: string; description?: string | null; days?: IPlanDay[] };
  const updated = await repo.update(id, body);
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user.role as UserRole) === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const { repo, error } = await getAuthorizedTemplate(id, session.user.id, session.user.role as UserRole);
  if (error) return error;

  await repo.deleteById(id, session.user.id);
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="plan-templates-id"
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/plan-templates/[id]/route.ts __tests__/app/api/plan-templates-id.test.ts
git commit -m "feat: add GET/PUT/DELETE /api/plan-templates/[id]"
```

---

## Task 11: GET + POST /api/members/[memberId]/plan

**Files:**
- Create: `src/app/api/members/[memberId]/plan/route.ts`
- Test: `__tests__/app/api/members-plan.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/members-plan.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockMemberPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

const mockTemplateRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

describe('GET /api/members/[memberId]/plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 't1' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns active plan for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 't1' } } as never);
    const plan = { _id: 'mp1', name: 'PPL', isActive: true };
    mockMemberPlanRepo.findActive.mockResolvedValue(plan);

    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(plan);
  });

  it('returns null when member has no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 't1' } } as never);
    mockMemberPlanRepo.findActive.mockResolvedValue(null);

    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toBeNull();
  });
});

describe('POST /api/members/[memberId]/plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: null } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ templateId: 't1' }),
    }), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('assigns template as deep copy to member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 'trainer1' } });
    const template = {
      _id: 'tpl1',
      name: 'Push Pull Legs',
      days: [{ dayNumber: 1, name: 'Day 1 — Push', exercises: [] }],
    };
    mockTemplateRepo.findById.mockResolvedValue(template);
    mockMemberPlanRepo.deactivateAll.mockResolvedValue(undefined);
    const created = { _id: 'mp1', name: 'Push Pull Legs', isActive: true };
    mockMemberPlanRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'tpl1' }),
    }), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockMemberPlanRepo.deactivateAll).toHaveBeenCalledWith('m1');
    expect(mockMemberPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      trainerId: 'trainer1',
      name: 'Push Pull Legs',
    }));
    expect(data).toEqual(created);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="members-plan"
```

- [ ] **Step 3: Implement**

```ts
// src/app/api/members/[memberId]/plan/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoMemberPlanRepository();
  const plan = await repo.findActive(memberId);
  return Response.json(plan);
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const body = (await req.json()) as { templateId: string };

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const templateRepo = new MongoPlanTemplateRepository();
  const template = await templateRepo.findById(body.templateId);
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  const memberPlanRepo = new MongoMemberPlanRepository();
  await memberPlanRepo.deactivateAll(memberId);

  const plan = await memberPlanRepo.create({
    memberId,
    trainerId: session.user.id,
    templateId: body.templateId,
    name: template.name,
    days: JSON.parse(JSON.stringify(template.days)) as typeof template.days,
    assignedAt: new Date(),
  });

  return Response.json(plan, { status: 201 });
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="members-plan"
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/plan/route.ts __tests__/app/api/members-plan.test.ts
git commit -m "feat: add GET/POST /api/members/[memberId]/plan"
```

---

## Task 12: POST /api/sessions + GET /api/sessions?memberId

**Files:**
- Create: `src/app/api/sessions/route.ts`
- Test: `__tests__/app/api/sessions.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/sessions.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { create: jest.fn(), findByMember: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockMemberPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

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

  it('returns 403 when trainer tries to start session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST(new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberPlanId: 'p1', dayNumber: 1 }),
    }));
    expect(res.status).toBe(403);
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

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="sessions.test"
```

- [ ] **Step 3: Implement**

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

  const role = session.user.role as UserRole;
  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

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

  const role = session.user.role as UserRole;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const sessions = await sessionRepo.findByMember(memberId);
  return Response.json(sessions);
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="sessions.test"
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sessions/route.ts __tests__/app/api/sessions.test.ts
git commit -m "feat: add POST/GET /api/sessions"
```

---

## Task 13: GET /api/sessions/[id]

**Files:**
- Create: `src/app/api/sessions/[id]/route.ts`
- Test: `__tests__/app/api/sessions-id.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/sessions-id.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when session not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when member accesses another member session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm2' },
    });
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(403);
  });

  it('returns session for member who owns it', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const session = { _id: 's1', memberId: { toString: () => 'm1' }, sets: [] };
    mockSessionRepo.findById.mockResolvedValue(session);
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="sessions-id"
```

- [ ] **Step 3: Implement**

```ts
// src/app/api/sessions/[id]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);

  if (!workoutSession) return Response.json({ error: 'Not found' }, { status: 404 });

  const role = session.user.role as UserRole;
  if (role === 'member' && workoutSession.memberId.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return Response.json(workoutSession);
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="sessions-id"
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sessions/[id]/route.ts __tests__/app/api/sessions-id.test.ts
git commit -m "feat: add GET /api/sessions/[id]"
```

---

## Task 14: PATCH /api/sessions/[id]/sets/[setIndex] + POST /api/sessions/[id]/sets

**Files:**
- Create: `src/app/api/sessions/[id]/sets/[setIndex]/route.ts`
- Create: `src/app/api/sessions/[id]/sets/route.ts`
- Test: `__tests__/app/api/sessions-sets.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/sessions-sets.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = {
  findById: jest.fn(),
  updateSet: jest.fn(),
  addExtraSet: jest.fn(),
};
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

const mockPBRepo = { upsertIfBetter: jest.fn() };
jest.mock('@/lib/repositories/personal-best.repository', () => ({
  MongoPersonalBestRepository: jest.fn(() => mockPBRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makePatchParams(id: string, setIndex: string) {
  return { params: Promise.resolve({ id, setIndex }) };
}

function makePostParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/sessions/[id]/sets/[setIndex]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: '{}' }),
      makePatchParams('s1', '0'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-owner member tries to log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm2' },
      completedAt: null,
    });
    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: 100, actualReps: 8 }),
      }),
      makePatchParams('s1', '0'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 409 when session already completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: new Date(),
    });
    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: 100, actualReps: 8 }),
      }),
      makePatchParams('s1', '0'),
    );
    expect(res.status).toBe(409);
  });

  it('logs set and upserts PB when weight and reps provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const workoutSession = {
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: null,
      sets: [
        {
          exerciseId: { toString: () => 'e1' },
          exerciseName: 'Bench Press',
          setNumber: 1,
          isBodyweight: false,
          actualWeight: null,
          actualReps: null,
        },
      ],
    };
    mockSessionRepo.findById.mockResolvedValue(workoutSession);
    const updated = { ...workoutSession, sets: [{ ...workoutSession.sets[0], actualWeight: 100, actualReps: 8 }] };
    mockSessionRepo.updateSet.mockResolvedValue(updated);
    mockPBRepo.upsertIfBetter.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: 100, actualReps: 8 }),
      }),
      makePatchParams('s1', '0'),
    );

    expect(res.status).toBe(200);
    expect(mockSessionRepo.updateSet).toHaveBeenCalledWith('s1', 0, { actualWeight: 100, actualReps: 8 });
    expect(mockPBRepo.upsertIfBetter).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      exerciseId: 'e1',
      exerciseName: 'Bench Press',
      weight: 100,
      reps: 8,
    }));
  });

  it('does not upsert PB for bodyweight exercise with null weight', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: null,
      sets: [{
        exerciseId: { toString: () => 'e1' },
        exerciseName: 'Pull-up',
        setNumber: 1,
        isBodyweight: true,
      }],
    });
    mockSessionRepo.updateSet.mockResolvedValue({});

    const { PATCH } = await import('@/app/api/sessions/[id]/sets/[setIndex]/route');
    await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeight: null, actualReps: 12 }),
      }),
      makePatchParams('s1', '0'),
    );

    expect(mockPBRepo.upsertIfBetter).not.toHaveBeenCalled();
  });
});

describe('POST /api/sessions/[id]/sets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds extra set and returns updated session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const workoutSession = {
      _id: 's1',
      memberId: { toString: () => 'm1' },
      completedAt: null,
      sets: [
        { exerciseId: { toString: () => 'e1' }, exerciseName: 'Bench', groupId: 'A', isSuperset: false, isBodyweight: false, setNumber: 1 },
        { exerciseId: { toString: () => 'e1' }, exerciseName: 'Bench', groupId: 'A', isSuperset: false, isBodyweight: false, setNumber: 2 },
        { exerciseId: { toString: () => 'e1' }, exerciseName: 'Bench', groupId: 'A', isSuperset: false, isBodyweight: false, setNumber: 3 },
      ],
    };
    mockSessionRepo.findById.mockResolvedValue(workoutSession);
    const updated = { ...workoutSession, sets: [...workoutSession.sets, { setNumber: 4 }] };
    mockSessionRepo.addExtraSet.mockResolvedValue(updated);

    const { POST } = await import('@/app/api/sessions/[id]/sets/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: 'e1', prescribedRepsMin: 8, prescribedRepsMax: 10 }),
      }),
      makePostParams('s1'),
    );

    expect(res.status).toBe(201);
    const addCall = mockSessionRepo.addExtraSet.mock.calls[0][1];
    expect(addCall.setNumber).toBe(4);
    expect(addCall.isExtraSet).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="sessions-sets"
```

- [ ] **Step 3: Implement PATCH route**

```ts
// src/app/api/sessions/[id]/sets/[setIndex]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';

type RouteContext = { params: Promise<{ id: string; setIndex: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id, setIndex } = await params;
  const idx = parseInt(setIndex, 10);

  const repo = new MongoWorkoutSessionRepository();
  const workoutSession = await repo.findById(id);
  if (!workoutSession) return Response.json({ error: 'Not found' }, { status: 404 });

  if (workoutSession.memberId.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (workoutSession.completedAt) {
    return Response.json({ error: 'Session already completed' }, { status: 409 });
  }

  const body = (await req.json()) as { actualWeight: number | null; actualReps: number | null };
  const updated = await repo.updateSet(id, idx, {
    actualWeight: body.actualWeight,
    actualReps: body.actualReps,
  });

  const targetSet = workoutSession.sets[idx];
  if (body.actualWeight !== null && body.actualReps !== null && !targetSet.isBodyweight) {
    const pbRepo = new MongoPersonalBestRepository();
    await pbRepo.upsertIfBetter({
      memberId: session.user.id,
      exerciseId: targetSet.exerciseId.toString(),
      exerciseName: targetSet.exerciseName,
      weight: body.actualWeight,
      reps: body.actualReps,
      sessionId: id,
    });
  }

  return Response.json(updated);
}
```

- [ ] **Step 4: Implement POST extra set route**

```ts
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
    prescribedRepsMin: number;
    prescribedRepsMax: number;
  };

  const exerciseOId = new mongoose.Types.ObjectId(body.exerciseId);
  const existingSets = workoutSession.sets.filter(
    (s) => s.exerciseId.toString() === body.exerciseId,
  );
  const ref = existingSets[0];
  if (!ref) return Response.json({ error: 'Exercise not found in session' }, { status: 404 });

  const nextSetNumber = Math.max(...existingSets.map((s) => s.setNumber)) + 1;

  const extraSet = {
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

  const updated = await repo.addExtraSet(id, extraSet);
  return Response.json(updated, { status: 201 });
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="sessions-sets"
```
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/sessions/[id]/sets/ __tests__/app/api/sessions-sets.test.ts
git commit -m "feat: add PATCH set logging and POST extra set routes"
```

---

## Task 15: POST /api/sessions/[id]/complete + GET /api/members/[memberId]/pbs

**Files:**
- Create: `src/app/api/sessions/[id]/complete/route.ts`
- Create: `src/app/api/members/[memberId]/pbs/route.ts`
- Test: `__tests__/app/api/sessions-complete.test.ts`
- Test: `__tests__/app/api/members-pbs.test.ts`

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

function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

describe('POST /api/sessions/[id]/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when non-owner tries to complete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm2' }, completedAt: null });

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST' }), makeParams('s1'));
    expect(res.status).toBe(403);
  });

  it('returns 409 when session already completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm1' }, completedAt: new Date() });

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST' }), makeParams('s1'));
    expect(res.status).toBe(409);
  });

  it('completes session and returns updated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm1' }, completedAt: null });
    const completed = { _id: 's1', completedAt: new Date() };
    mockSessionRepo.complete.mockResolvedValue(completed);

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST' }), makeParams('s1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSessionRepo.complete).toHaveBeenCalledWith('s1');
    expect(data).toEqual(completed);
  });
});
```

```ts
// __tests__/app/api/members-pbs.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockPBRepo = { findByMember: jest.fn() };
jest.mock('@/lib/repositories/personal-best.repository', () => ({
  MongoPersonalBestRepository: jest.fn(() => mockPBRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) { return { params: Promise.resolve({ memberId }) }; }

describe('GET /api/members/[memberId]/pbs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member accesses another member PBs', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/pbs/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns PBs for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const pbs = [{ exerciseName: 'Bench Press', estimatedOneRM: 133 }];
    mockPBRepo.findByMember.mockResolvedValue(pbs);

    const { GET } = await import('@/app/api/members/[memberId]/pbs/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(pbs);
  });

  it('allows trainer to read member PBs', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockPBRepo.findByMember.mockResolvedValue([]);

    const { GET } = await import('@/app/api/members/[memberId]/pbs/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
pnpm test -- --testPathPattern="sessions-complete|members-pbs"
```

- [ ] **Step 3: Implement complete route**

```ts
// src/app/api/sessions/[id]/complete/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteContext): Promise<Response> {
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
    return Response.json({ error: 'Already completed' }, { status: 409 });
  }

  const completed = await repo.complete(id);
  return Response.json(completed);
}
```

- [ ] **Step 4: Implement PBs route**

```ts
// src/app/api/members/[memberId]/pbs/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoPersonalBestRepository();
  const pbs = await repo.findByMember(memberId);
  return Response.json(pbs);
}
```

- [ ] **Step 5: Run tests — confirm GREEN**

```bash
pnpm test -- --testPathPattern="sessions-complete|members-pbs"
```
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/sessions/[id]/complete/route.ts src/app/api/members/[memberId]/pbs/route.ts __tests__/app/api/sessions-complete.test.ts __tests__/app/api/members-pbs.test.ts
git commit -m "feat: add session complete route and member PBs route"
```

---

## Task 16: Dashboard Layout + Trainer Plan Templates Page

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/trainer/plans/page.tsx`
- Create: `src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx`

No dedicated test for layout (server component). Test the interactive list component.

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/trainer/plan-template-list.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanTemplateList } from '@/app/(dashboard)/trainer/plans/_components/plan-template-list';

const mockTemplates = [
  { _id: 'tpl1', name: 'Push Pull Legs', description: 'Classic PPL split', days: [] },
  { _id: 'tpl2', name: 'Upper Lower', description: null, days: [] },
];

describe('PlanTemplateList', () => {
  it('renders all template names', () => {
    render(<PlanTemplateList templates={mockTemplates} />);
    expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
    expect(screen.getByText('Upper Lower')).toBeInTheDocument();
  });

  it('shows description when present', () => {
    render(<PlanTemplateList templates={mockTemplates} />);
    expect(screen.getByText('Classic PPL split')).toBeInTheDocument();
  });

  it('shows "新建计划" link', () => {
    render(<PlanTemplateList templates={mockTemplates} />);
    expect(screen.getByRole('link', { name: /新建计划/i })).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    render(<PlanTemplateList templates={[]} />);
    expect(screen.getByText(/还没有训练计划/i)).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    render(<PlanTemplateList templates={mockTemplates} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /删除/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('tpl1'));
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="plan-template-list"
```

- [ ] **Step 3: Create dashboard layout**

```tsx
// src/app/(dashboard)/layout.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { UserRole } from '@/types/auth';

const NAV: Record<UserRole, { href: string; label: string }[]> = {
  owner: [
    { href: '/dashboard/trainer/plans', label: '训练计划' },
    { href: '/dashboard/member/plan', label: '我的计划' },
    { href: '/dashboard/member/pbs', label: '个人记录' },
  ],
  trainer: [
    { href: '/dashboard/trainer/plans', label: '训练计划' },
  ],
  member: [
    { href: '/dashboard/member/plan', label: '我的计划' },
    { href: '/dashboard/member/pbs', label: '个人记录' },
  ],
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as UserRole;
  const navLinks = NAV[role] ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">POWER GYM</span>
        <nav className="flex gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="text-sm text-muted-foreground">{session.user.name}</span>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create PlanTemplateList client component**

```tsx
// src/app/(dashboard)/trainer/plans/_components/plan-template-list.tsx
'use client';

import Link from 'next/link';

interface Template {
  _id: string;
  name: string;
  description: string | null;
  days: unknown[];
}

interface Props {
  templates: Template[];
  onDelete?: (id: string) => Promise<void>;
}

export function PlanTemplateList({ templates, onDelete }: Props) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>还没有训练计划</p>
        <Link href="/dashboard/trainer/plans/new" className="mt-4 inline-block text-primary underline">
          新建计划
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">训练计划模板</h1>
        <Link
          href="/dashboard/trainer/plans/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          新建计划
        </Link>
      </div>
      <ul className="space-y-3">
        {templates.map((t) => (
          <li key={t._id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Link href={`/dashboard/trainer/plans/${t._id}/edit`} className="font-medium hover:underline">
                {t.name}
              </Link>
              {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{t.days.length} 天</p>
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(t._id)}
                className="text-sm text-destructive hover:underline"
              >
                删除
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Create trainer plans page (Server Component)**

```tsx
// src/app/(dashboard)/trainer/plans/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { PlanTemplateList } from './_components/plan-template-list';
import { revalidatePath } from 'next/cache';

export default async function TrainerPlansPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoPlanTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  const plain = JSON.parse(JSON.stringify(templates)) as typeof templates;

  async function handleDelete(id: string) {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    await connectDB();
    const r = new MongoPlanTemplateRepository();
    await r.deleteById(id, s.user.id);
    revalidatePath('/dashboard/trainer/plans');
  }

  return <PlanTemplateList templates={plain} onDelete={handleDelete} />;
}
```

- [ ] **Step 6: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="plan-template-list"
```
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/layout.tsx src/app/(dashboard)/trainer/plans/
git commit -m "feat: add dashboard layout and trainer plans list page"
```

---

## Task 17: Trainer Plan New/Edit Pages

**Files:**
- Create: `src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx`
- Create: `src/app/(dashboard)/trainer/plans/new/page.tsx`
- Create: `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/trainer/plan-template-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanTemplateForm } from '@/app/(dashboard)/trainer/plans/_components/plan-template-form';

describe('PlanTemplateForm', () => {
  it('renders name and description fields', () => {
    render(<PlanTemplateForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/计划名称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/描述/i)).toBeInTheDocument();
  });

  it('can add a day', async () => {
    render(<PlanTemplateForm onSubmit={jest.fn()} />);
    const addDayBtn = screen.getByRole('button', { name: /添加训练日/i });
    fireEvent.click(addDayBtn);
    expect(screen.getByPlaceholderText(/Day 1/i)).toBeInTheDocument();
  });

  it('calls onSubmit with plan data on save', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<PlanTemplateForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/计划名称/i), 'Push Pull Legs');
    fireEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Push Pull Legs' }),
    ));
  });

  it('pre-fills fields when initialData provided', () => {
    render(<PlanTemplateForm
      onSubmit={jest.fn()}
      initialData={{ name: 'Existing Plan', description: 'A desc', days: [] }}
    />);
    expect(screen.getByDisplayValue('Existing Plan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A desc')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="plan-template-form"
```

- [ ] **Step 3: Implement PlanTemplateForm**

```tsx
// src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx
'use client';

import { useState } from 'react';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

interface FormData {
  name: string;
  description: string | null;
  days: IPlanDay[];
}

interface Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
}

export function PlanTemplateForm({ initialData, onSubmit }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [days, setDays] = useState<IPlanDay[]>(initialData?.days ?? []);
  const [saving, setSaving] = useState(false);

  function addDay() {
    const num = days.length + 1;
    setDays([...days, { dayNumber: num, name: `Day ${num}`, exercises: [] }]);
  }

  function updateDayName(index: number, value: string) {
    const updated = [...days];
    updated[index] = { ...updated[index], name: value };
    setDays(updated);
  }

  function removeDay(index: number) {
    setDays(days.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name, description: description || null, days });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label htmlFor="plan-name" className="text-sm font-medium">计划名称</label>
        <input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="plan-desc" className="text-sm font-medium">描述</label>
        <textarea
          id="plan-desc"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">训练日</h2>
          <button type="button" onClick={addDay} className="text-sm text-primary hover:underline">
            + 添加训练日
          </button>
        </div>
        {days.map((day, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <input
                placeholder={`Day ${i + 1}`}
                value={day.name}
                onChange={(e) => updateDayName(i, e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => removeDay(i)} className="text-sm text-destructive">
                删除
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{day.exercises.length} 个动作（编辑后可在此添加动作）</p>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create new template page**

```tsx
// src/app/(dashboard)/trainer/plans/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { PlanTemplateForm } from '../_components/plan-template-form';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

export default function NewPlanPage() {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch('/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) router.push('/dashboard/trainer/plans');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新建训练计划</h1>
      <PlanTemplateForm onSubmit={handleSubmit} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit template page**

```tsx
// src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlanTemplateForm } from '../../_components/plan-template-form';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

interface Template {
  _id: string;
  name: string;
  description: string | null;
  days: IPlanDay[];
}

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [id, setId] = useState('');

  useEffect(() => {
    params.then(({ id: resolvedId }) => {
      setId(resolvedId);
      fetch(`/api/plan-templates/${resolvedId}`)
        .then((r) => r.json())
        .then((data: Template) => setTemplate(data));
    });
  }, [params]);

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch(`/api/plan-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) router.push('/dashboard/trainer/plans');
  }

  if (!template) return <p>加载中...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">编辑训练计划</h1>
      <PlanTemplateForm initialData={template} onSubmit={handleSubmit} />
    </div>
  );
}
```

- [ ] **Step 6: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="plan-template-form"
```
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/trainer/plans/
git commit -m "feat: add trainer plan new/edit pages with form component"
```

---

## Task 18: Trainer Member Plan Page

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/plan/page.tsx`

This page allows a trainer to assign a plan to a member and view their session history and PBs.

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/trainer/trainer-member-plan.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerMemberPlanClient } from '@/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client';

const mockTemplates = [
  { _id: 'tpl1', name: 'Push Pull Legs' },
  { _id: 'tpl2', name: 'Upper Lower' },
];

const mockActivePlan = {
  _id: 'mp1',
  name: 'Push Pull Legs',
  days: [
    { dayNumber: 1, name: 'Day 1 — Push', exercises: [] },
    { dayNumber: 2, name: 'Day 2 — Pull', exercises: [] },
  ],
  assignedAt: new Date().toISOString(),
};

describe('TrainerMemberPlanClient', () => {
  it('shows current active plan when present', () => {
    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={mockActivePlan}
        sessions={[]}
        pbs={[]}
      />,
    );
    expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
  });

  it('shows "未分配计划" when no active plan', () => {
    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={null}
        sessions={[]}
        pbs={[]}
      />,
    );
    expect(screen.getByText(/未分配计划/i)).toBeInTheDocument();
  });

  it('shows template select and assign button', () => {
    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={null}
        sessions={[]}
        pbs={[]}
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /分配计划/i })).toBeInTheDocument();
  });

  it('calls assign API when button clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={null}
        sessions={[]}
        pbs={[]}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tpl1' } });
    fireEvent.click(screen.getByRole('button', { name: /分配计划/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/members/m1/plan',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="trainer-member-plan"
```

- [ ] **Step 3: Implement client component**

```tsx
// src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Template { _id: string; name: string; }
interface ActivePlan { _id: string; name: string; days: { dayNumber: number; name: string; exercises: unknown[] }[]; assignedAt: string; }
interface Session { _id: string; dayName: string; startedAt: string; completedAt: string | null; }
interface PB { exerciseName: string; bestWeight: number; bestReps: number; estimatedOneRM: number; }

interface Props {
  memberId: string;
  templates: Template[];
  activePlan: ActivePlan | null;
  sessions: Session[];
  pbs: PB[];
}

export function TrainerMemberPlanClient({ memberId, templates, activePlan, sessions, pbs }: Props) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function assignPlan() {
    if (!selectedTemplate) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/members/${memberId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (res.ok) router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-3">当前计划</h2>
        {activePlan ? (
          <div className="rounded-lg border p-4">
            <p className="font-medium">{activePlan.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{activePlan.days.length} 天</p>
            <p className="text-xs text-muted-foreground">分配于 {new Date(activePlan.assignedAt).toLocaleDateString('zh-CN')}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">未分配计划</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">分配新计划</h2>
        <div className="flex gap-3 items-center">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">选择计划模板</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={assignPlan}
            disabled={!selectedTemplate || assigning}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {assigning ? '分配中...' : '分配计划'}
          </button>
        </div>
      </section>

      {pbs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">个人记录</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">动作</th>
                <th className="py-2 pr-4">最佳重量</th>
                <th className="py-2 pr-4">组次</th>
                <th className="py-2">估计1RM</th>
              </tr>
            </thead>
            <tbody>
              {pbs.map((pb) => (
                <tr key={pb.exerciseName} className="border-b">
                  <td className="py-2 pr-4">{pb.exerciseName}</td>
                  <td className="py-2 pr-4">{pb.bestWeight} kg</td>
                  <td className="py-2 pr-4">{pb.bestReps}</td>
                  <td className="py-2">{pb.estimatedOneRM.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {sessions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">训练历史</h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s._id} className="text-sm border rounded-md p-3">
                <span className="font-medium">{s.dayName}</span>
                <span className="ml-3 text-muted-foreground">
                  {new Date(s.startedAt).toLocaleDateString('zh-CN')}
                </span>
                {!s.completedAt && <span className="ml-2 text-yellow-600">进行中</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create page (Server Component)**

```tsx
// src/app/(dashboard)/trainer/members/[id]/plan/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { TrainerMemberPlanClient } from './_components/trainer-member-plan-client';

export default async function TrainerMemberPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const [templates, activePlan, sessions, pbs] = await Promise.all([
    new MongoPlanTemplateRepository().findByCreator(session.user.id),
    new MongoMemberPlanRepository().findActive(memberId),
    new MongoWorkoutSessionRepository().findByMember(memberId),
    new MongoPersonalBestRepository().findByMember(memberId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">学员训练管理</h1>
      <TrainerMemberPlanClient
        memberId={memberId}
        templates={JSON.parse(JSON.stringify(templates))}
        activePlan={JSON.parse(JSON.stringify(activePlan))}
        sessions={JSON.parse(JSON.stringify(sessions))}
        pbs={JSON.parse(JSON.stringify(pbs))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="trainer-member-plan"
```
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/trainer/members/
git commit -m "feat: add trainer member plan page"
```

---

## Task 19: Member Plan Overview Page

**Files:**
- Create: `src/app/(dashboard)/member/plan/page.tsx`
- Create: `src/app/(dashboard)/member/plan/_components/plan-overview.tsx`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/member/plan-overview.test.tsx
import { render, screen } from '@testing-library/react';
import { PlanOverview } from '@/app/(dashboard)/member/plan/_components/plan-overview';

const mockPlan = {
  _id: 'mp1',
  name: 'Push Pull Legs',
  days: [
    { dayNumber: 1, name: 'Day 1 — Push', exercises: [{ exerciseName: 'Bench Press' }] },
    { dayNumber: 2, name: 'Day 2 — Pull', exercises: [{ exerciseName: 'Pull-up' }] },
    { dayNumber: 3, name: 'Day 3 — Legs', exercises: [] },
  ],
};

describe('PlanOverview', () => {
  it('shows plan name', () => {
    render(<PlanOverview plan={mockPlan} />);
    expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
  });

  it('renders a card for each day', () => {
    render(<PlanOverview plan={mockPlan} />);
    expect(screen.getByText('Day 1 — Push')).toBeInTheDocument();
    expect(screen.getByText('Day 2 — Pull')).toBeInTheDocument();
    expect(screen.getByText('Day 3 — Legs')).toBeInTheDocument();
  });

  it('shows "开始训练" link for each day', () => {
    render(<PlanOverview plan={mockPlan} />);
    const links = screen.getAllByRole('link', { name: /开始训练/i });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/dashboard/member/plan/session/new?day=1');
  });

  it('shows empty state when no active plan', () => {
    render(<PlanOverview plan={null} />);
    expect(screen.getByText(/暂无训练计划/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="plan-overview"
```

- [ ] **Step 3: Implement PlanOverview component**

```tsx
// src/app/(dashboard)/member/plan/_components/plan-overview.tsx
import Link from 'next/link';

interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: { exerciseName: string }[];
}

interface Plan {
  _id: string;
  name: string;
  days: PlanDay[];
}

interface Props {
  plan: Plan | null;
}

export function PlanOverview({ plan }: Props) {
  if (!plan) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>暂无训练计划</p>
        <p className="text-sm mt-2">请联系您的教练分配计划</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{plan.name}</h1>
      <p className="text-muted-foreground mb-6">{plan.days.length} 天计划</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plan.days.map((day) => (
          <div key={day.dayNumber} className="rounded-lg border p-4 space-y-3">
            <div>
              <p className="font-medium">{day.name}</p>
              <p className="text-sm text-muted-foreground">{day.exercises.length} 个动作</p>
            </div>
            <Link
              href={`/dashboard/member/plan/session/new?day=${day.dayNumber}`}
              className="block text-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              开始训练
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create page (Server Component)**

```tsx
// src/app/(dashboard)/member/plan/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { PlanOverview } from './_components/plan-overview';

export default async function MemberPlanPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoMemberPlanRepository();
  const plan = await repo.findActive(session.user.id);

  return <PlanOverview plan={JSON.parse(JSON.stringify(plan))} />;
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="plan-overview"
```
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/member/plan/
git commit -m "feat: add member plan overview page"
```

---

## Task 20: Member Session New + Live Logging Pages

**Files:**
- Create: `src/app/(dashboard)/member/plan/session/new/page.tsx`
- Create: `src/app/(dashboard)/member/plan/session/[id]/page.tsx`
- Create: `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/member/session-logger.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionLogger } from '@/app/(dashboard)/member/plan/session/[id]/_components/session-logger';

const mockSession = {
  _id: 's1',
  memberId: 'm1',
  dayName: 'Day 1 — Push',
  completedAt: null,
  sets: [
    {
      exerciseId: 'e1',
      exerciseName: 'Bench Press',
      groupId: 'A',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    },
    {
      exerciseId: 'e1',
      exerciseName: 'Bench Press',
      groupId: 'A',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 2,
      prescribedRepsMin: 8,
      prescribedRepsMax: 10,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    },
  ],
};

describe('SessionLogger', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockSession }),
    });
  });

  it('shows day name and exercise name', () => {
    render(<SessionLogger session={mockSession} />);
    expect(screen.getByText('Day 1 — Push')).toBeInTheDocument();
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
  });

  it('shows prescribed reps range for each set', () => {
    render(<SessionLogger session={mockSession} />);
    expect(screen.getAllByText('8-10 次').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "完成训练" button when all sets done', () => {
    const completedSession = {
      ...mockSession,
      sets: mockSession.sets.map((s) => ({ ...s, completedAt: new Date().toISOString() })),
    };
    render(<SessionLogger session={completedSession} />);
    expect(screen.getByRole('button', { name: /完成训练/i })).toBeInTheDocument();
  });

  it('does not show "完成训练" when sets remain', () => {
    render(<SessionLogger session={mockSession} />);
    expect(screen.queryByRole('button', { name: /完成训练/i })).not.toBeInTheDocument();
  });

  it('calls PATCH API when set marked complete', async () => {
    const user = userEvent.setup();
    render(<SessionLogger session={mockSession} />);

    const weightInputs = screen.getAllByPlaceholderText(/重量/i);
    const repsInputs = screen.getAllByPlaceholderText(/次数/i);

    await user.type(weightInputs[0], '80');
    await user.type(repsInputs[0], '10');

    const logButtons = screen.getAllByRole('button', { name: /记录/i });
    fireEvent.click(logButtons[0]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/s1/sets/0',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="session-logger"
```

- [ ] **Step 3: Implement SessionLogger**

```tsx
// src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  completedAt: string | null;
  sets: SessionSet[];
}

interface SetInputState {
  weight: string;
  reps: string;
}

export function SessionLogger({ session: initialSession }: { session: Session }) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [inputs, setInputs] = useState<SetInputState[]>(
    initialSession.sets.map(() => ({ weight: '', reps: '' })),
  );
  const [completing, setCompleting] = useState(false);

  const allDone = session.sets.every((s) => s.completedAt !== null);

  function groupedExercises() {
    const seen = new Set<string>();
    const exerciseIds: string[] = [];
    session.sets.forEach((s) => {
      if (!seen.has(s.exerciseId)) {
        seen.add(s.exerciseId);
        exerciseIds.push(s.exerciseId);
      }
    });
    return exerciseIds.map((id) => ({
      exerciseId: id,
      exerciseName: session.sets.find((s) => s.exerciseId === id)!.exerciseName,
      isBodyweight: session.sets.find((s) => s.exerciseId === id)!.isBodyweight,
      sets: session.sets.map((s, i) => ({ ...s, index: i })).filter((s) => s.exerciseId === id),
    }));
  }

  async function logSet(setIndex: number) {
    const input = inputs[setIndex];
    const set = session.sets[setIndex];
    const res = await fetch(`/api/sessions/${session._id}/sets/${setIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actualWeight: set.isBodyweight ? null : parseFloat(input.weight) || null,
        actualReps: parseInt(input.reps, 10) || null,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Session;
      setSession(updated);
    }
  }

  async function addSet(exerciseId: string) {
    const exercise = session.sets.find((s) => s.exerciseId === exerciseId);
    if (!exercise) return;
    const res = await fetch(`/api/sessions/${session._id}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId,
        prescribedRepsMin: exercise.prescribedRepsMin,
        prescribedRepsMax: exercise.prescribedRepsMax,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Session;
      setSession(updated);
      setInputs((prev) => [...prev, { weight: '', reps: '' }]);
    }
  }

  async function completeSession() {
    setCompleting(true);
    const res = await fetch(`/api/sessions/${session._id}/complete`, { method: 'POST' });
    if (res.ok) router.push('/dashboard/member/plan');
    else setCompleting(false);
  }

  function repsLabel(min: number, max: number) {
    return min === max ? `${min} 次` : `${min}-${max} 次`;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">{session.dayName}</h1>

      {groupedExercises().map(({ exerciseId, exerciseName, isBodyweight, sets }) => (
        <div key={exerciseId} className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">{exerciseName}</h2>
          {sets.map(({ index, setNumber, prescribedRepsMin, prescribedRepsMax, completedAt, isExtraSet }) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-12">组 {setNumber}{isExtraSet ? ' +' : ''}</span>
              <span className="text-sm text-muted-foreground w-16">{repsLabel(prescribedRepsMin, prescribedRepsMax)}</span>
              {completedAt ? (
                <span className="text-sm text-green-600">✓ {session.sets[index].actualWeight ? `${session.sets[index].actualWeight}kg × ` : ''}{session.sets[index].actualReps}次</span>
              ) : (
                <>
                  {!isBodyweight && (
                    <input
                      placeholder="重量"
                      value={inputs[index]?.weight ?? ''}
                      onChange={(e) => {
                        const next = [...inputs];
                        next[index] = { ...next[index], weight: e.target.value };
                        setInputs(next);
                      }}
                      className="w-20 rounded border px-2 py-1 text-sm"
                    />
                  )}
                  <input
                    placeholder="次数"
                    value={inputs[index]?.reps ?? ''}
                    onChange={(e) => {
                      const next = [...inputs];
                      next[index] = { ...next[index], reps: e.target.value };
                      setInputs(next);
                    }}
                    className="w-20 rounded border px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => logSet(index)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    记录
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => addSet(exerciseId)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            + 加组
          </button>
        </div>
      ))}

      {allDone && (
        <button
          onClick={completeSession}
          disabled={completing}
          className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {completing ? '提交中...' : '完成训练'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create session new page**

```tsx
// src/app/(dashboard)/member/plan/session/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export default async function SessionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { day } = await searchParams;
  const dayNumber = parseInt(day ?? '1', 10);

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);
  if (!plan) redirect('/dashboard/member/plan');

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect('/dashboard/member/plan');

  async function startSession() {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: '' },
      body: JSON.stringify({ memberPlanId: plan!._id.toString(), dayNumber }),
    });
    if (res.ok) {
      const data = (await res.json()) as { _id: string };
      redirect(`/dashboard/member/plan/session/${data._id}`);
    }
  }

  return (
    <div className="max-w-sm mx-auto text-center space-y-6 py-16">
      <h1 className="text-2xl font-bold">{planDay.name}</h1>
      <p className="text-muted-foreground">{planDay.exercises.length} 个动作</p>
      <form action={startSession}>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          开始训练
        </button>
      </form>
      <Link href="/dashboard/member/plan" className="text-sm text-muted-foreground hover:underline">
        返回
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Create live logging page**

```tsx
// src/app/(dashboard)/member/plan/session/[id]/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { SessionLogger } from './_components/session-logger';
import { notFound } from 'next/navigation';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  await connectDB();
  const workoutSession = await new MongoWorkoutSessionRepository().findById(id);

  if (!workoutSession) notFound();
  if (workoutSession.memberId.toString() !== session.user.id) notFound();

  return (
    <SessionLogger session={JSON.parse(JSON.stringify(workoutSession))} />
  );
}
```

- [ ] **Step 6: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="session-logger"
```
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/member/plan/session/
git commit -m "feat: add member session new and live logging pages"
```

---

## Task 21: Member PB Board

**Files:**
- Create: `src/app/(dashboard)/member/pbs/page.tsx`
- Create: `src/app/(dashboard)/member/pbs/_components/pb-board.tsx`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/member/pb-board.test.tsx
import { render, screen } from '@testing-library/react';
import { PBBoard } from '@/app/(dashboard)/member/pbs/_components/pb-board';

const mockPBs = [
  { exerciseName: 'Bench Press', bestWeight: 100, bestReps: 8, estimatedOneRM: 126.67, achievedAt: '2026-04-21T10:00:00.000Z' },
  { exerciseName: 'Squat', bestWeight: 140, bestReps: 5, estimatedOneRM: 163.33, achievedAt: '2026-04-20T10:00:00.000Z' },
];

describe('PBBoard', () => {
  it('renders exercise names', () => {
    render(<PBBoard pbs={mockPBs} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
  });

  it('shows estimated 1RM for each exercise', () => {
    render(<PBBoard pbs={mockPBs} />);
    expect(screen.getByText('126.7')).toBeInTheDocument();
    expect(screen.getByText('163.3')).toBeInTheDocument();
  });

  it('shows best weight and reps', () => {
    render(<PBBoard pbs={mockPBs} />);
    expect(screen.getByText('100 kg × 8')).toBeInTheDocument();
    expect(screen.getByText('140 kg × 5')).toBeInTheDocument();
  });

  it('shows empty state when no PBs', () => {
    render(<PBBoard pbs={[]} />);
    expect(screen.getByText(/还没有记录/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test -- --testPathPattern="pb-board"
```

- [ ] **Step 3: Implement PBBoard**

```tsx
// src/app/(dashboard)/member/pbs/_components/pb-board.tsx
interface PB {
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: string;
}

export function PBBoard({ pbs }: { pbs: PB[] }) {
  if (pbs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>还没有记录</p>
        <p className="text-sm mt-2">完成训练后，个人记录将自动更新</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">个人记录</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-3 pr-4">动作</th>
            <th className="py-3 pr-4">最佳记录</th>
            <th className="py-3 pr-4">估计1RM</th>
            <th className="py-3">日期</th>
          </tr>
        </thead>
        <tbody>
          {pbs.map((pb) => (
            <tr key={pb.exerciseName} className="border-b">
              <td className="py-3 pr-4 font-medium">{pb.exerciseName}</td>
              <td className="py-3 pr-4">{pb.bestWeight} kg × {pb.bestReps}</td>
              <td className="py-3 pr-4 font-semibold">{pb.estimatedOneRM.toFixed(1)}</td>
              <td className="py-3 text-muted-foreground">
                {new Date(pb.achievedAt).toLocaleDateString('zh-CN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create PBs page**

```tsx
// src/app/(dashboard)/member/pbs/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { PBBoard } from './_components/pb-board';

export default async function MemberPBsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const pbs = await new MongoPersonalBestRepository().findByMember(session.user.id);

  return <PBBoard pbs={JSON.parse(JSON.stringify(pbs))} />;
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test -- --testPathPattern="pb-board"
```
Expected: PASS (4 tests)

- [ ] **Step 6: Run full test suite**

```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Step 7: Run lint**

```bash
pnpm lint
```
Expected: No warnings or errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/(dashboard)/member/pbs/
git commit -m "feat: add member PB board page"
```

---

## Final Verification

- [ ] **Run complete test suite**

```bash
pnpm test
```
Expected: All tests pass (≥ 50 tests across all files).

- [ ] **Build check**

```bash
pnpm build
```
Expected: No TypeScript errors, successful build.

- [ ] **Update docs/INDEX.md**

Add row to Implementation Plans table:

```
| Training Plans & Performance | [training-plans-implementation-plan.md](2026-04-21/plans/training-plans-implementation-plan.md) | In Progress |
```

