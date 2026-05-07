# Owner / Trainer Self-Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 owner 和 trainer 能给自己打训练卡 / 饮食卡，可从 template 起手或 freestyle，可勾选保存为新 template，每个 domain 配独立历史 calendar。

**Architecture:** 全新独立 collection (`SelfWorkoutLog` / `SelfNutritionLog`)，独立 repository，独立 `/api/me/...` 路由族，独立 client component（位于 `src/components/self-tracking/`）；不复用 / 不修改 member 端的 `WorkoutSession` / `NutritionDailyLog` 模型。

**Tech Stack:** Next.js App Router, Mongoose, NextAuth, Jest + React Testing Library, Playwright, TailwindCSS + Shadcn/ui.

**Spec:** [docs/2026-05-08/plans/self-tracking-design.md](./self-tracking-design.md)

---

## Conventions reused throughout this plan

### Repository test boilerplate

每个 repository 测试文件顶部都用同一个 mock 风格（参考 `__tests__/lib/repositories/nutrition-daily-log.repository.test.ts`）：

```ts
jest.mock('@/lib/db/models/<model-file>', () => ({
  <ModelName>: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    create: jest.fn(),
  }),
}));
```

### API route role guard preamble

所有 `/api/me/...` handler 顶部使用同一段：

```ts
const session = await auth();
if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
const role = session.user.role as UserRole;
if (role !== 'owner' && role !== 'trainer') {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
const userId = session.user.id;
await connectDB();
```

第 4 个 task 会把这段抽成一个 helper `requireSelfTrackingRole`，之后所有路由都用 helper。

### Commit message 风格

跟项目历史一致（参考 `git log`）：`feat(self-tracking): ...`、`fix(self-tracking): ...`、`test(self-tracking): ...`。每个 task 收尾时一定单独 commit。

### 跑测试的命令

- 单文件：`pnpm test -- --testPathPattern=<path>`
- 全部：`pnpm test`
- Lint：`pnpm lint`
- Type 检查：`pnpm build`（或 `pnpm tsc --noEmit` 如有）

---

## File structure

### 新建（依赖关系从上到下）

| 路径 | 职责 |
|---|---|
| `src/lib/db/models/self-workout-log.model.ts` | Mongoose schema + interface for SelfWorkoutLog |
| `src/lib/db/models/self-nutrition-log.model.ts` | Mongoose schema + interface for SelfNutritionLog |
| `src/lib/repositories/self-workout-log.repository.ts` | CRUD + 月查询 + active 查询 |
| `src/lib/repositories/self-nutrition-log.repository.ts` | upsertByDate + 月查询 |
| `src/lib/auth/self-tracking-access.ts` | `requireSelfTrackingRole()` helper |
| `src/lib/self-tracking/template-snapshot.ts` | sets→IPlanDay、meals→IDayType 的转换 |
| `src/app/api/me/workout-logs/route.ts` | POST 创建 / GET 月列表 |
| `src/app/api/me/workout-logs/active/route.ts` | GET 当前未完成的 |
| `src/app/api/me/workout-logs/[id]/route.ts` | GET 详情 / DELETE |
| `src/app/api/me/workout-logs/[id]/sets/route.ts` | POST 新增 set |
| `src/app/api/me/workout-logs/[id]/sets/[setIndex]/route.ts` | PATCH 更新 set |
| `src/app/api/me/workout-logs/[id]/complete/route.ts` | POST 完成（含可选 saveAsTemplate）|
| `src/app/api/me/nutrition-logs/route.ts` | GET 月列表 |
| `src/app/api/me/nutrition-logs/[date]/route.ts` | GET / PUT（含可选 saveAsTemplate）/ DELETE |
| `src/app/(dashboard)/owner/my-training/page.tsx` | owner 训练主页 |
| `src/app/(dashboard)/owner/my-training/session/[id]/page.tsx` | owner 进行中 session 页 |
| `src/app/(dashboard)/owner/my-training/calendar/page.tsx` | owner 训练历史 calendar |
| `src/app/(dashboard)/owner/my-nutrition/page.tsx` | owner 饮食主页 |
| `src/app/(dashboard)/owner/my-nutrition/calendar/page.tsx` | owner 饮食历史 calendar |
| `src/app/(dashboard)/trainer/my-training/page.tsx` | trainer 同上结构 |
| `src/app/(dashboard)/trainer/my-training/session/[id]/page.tsx` |  |
| `src/app/(dashboard)/trainer/my-training/calendar/page.tsx` |  |
| `src/app/(dashboard)/trainer/my-nutrition/page.tsx` |  |
| `src/app/(dashboard)/trainer/my-nutrition/calendar/page.tsx` |  |
| `src/components/self-tracking/start-workout-card.tsx` | 主页顶部入口 |
| `src/components/self-tracking/template-day-picker-dialog.tsx` | template + day 选择对话框 |
| `src/components/self-tracking/self-workout-session.tsx` | session 页主体（仿 member 端 session 页） |
| `src/components/self-tracking/complete-workout-dialog.tsx` | 完成对话框 + saveAsTemplate |
| `src/components/self-tracking/self-workout-calendar.tsx` | 训练月视图 |
| `src/components/self-tracking/self-nutrition-day-view.tsx` | 饮食 day view |
| `src/components/self-tracking/self-nutrition-calendar.tsx` | 饮食月视图 |
| `src/components/self-tracking/save-as-template-checkbox.tsx` | 复用：勾上展开 name input |
| `__tests__/lib/repositories/self-workout-log.repository.test.ts` | repo 单测 |
| `__tests__/lib/repositories/self-nutrition-log.repository.test.ts` |  |
| `__tests__/lib/auth/self-tracking-access.test.ts` | guard 单测 |
| `__tests__/lib/self-tracking/template-snapshot.test.ts` | snapshot 转换单测 |
| `__tests__/app/api/me/workout-logs.test.ts` | POST + GET 列表 |
| `__tests__/app/api/me/workout-logs-id.test.ts` | GET 单条 + DELETE |
| `__tests__/app/api/me/workout-logs-sets.test.ts` | POST + PATCH set |
| `__tests__/app/api/me/workout-logs-complete.test.ts` | complete + saveAsTemplate |
| `__tests__/app/api/me/nutrition-logs.test.ts` | GET 月列表 |
| `__tests__/app/api/me/nutrition-logs-date.test.ts` | GET / PUT / DELETE 某天 |
| `__tests__/components/self-tracking/complete-workout-dialog.test.tsx` |  |
| `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx` |  |
| `e2e/self-tracking/trainer-freestyle-workout.spec.ts` |  |
| `e2e/self-tracking/trainer-template-workout.spec.ts` |  |
| `e2e/self-tracking/owner-nutrition-day.spec.ts` |  |
| `e2e/self-tracking/member-no-access.spec.ts` |  |

### 修改

| 路径 | 修改 |
|---|---|
| `src/components/shared/app-shell.tsx` | NAV 数组增加 owner PERSONAL 两条 + trainer 整组 PERSONAL |

---

## Stage 1 — Mongoose models

### Task 1.1: SelfWorkoutLog model

**Files:**
- Create: `src/lib/db/models/self-workout-log.model.ts`
- Test: `__tests__/lib/db/models/self-workout-log.model.test.ts`

- [ ] **Step 1.1.1: Write the failing test**

```ts
// __tests__/lib/db/models/self-workout-log.model.test.ts
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';

describe('SelfWorkoutLogModel', () => {
  it('exposes the expected schema paths', () => {
    const paths = SelfWorkoutLogModel.schema.paths;
    expect(paths.userId.instance).toBe('ObjectId');
    expect(paths.startedAt.instance).toBe('Date');
    expect(paths.completedAt.instance).toBe('Date');
    expect(paths.sourceTemplateId.instance).toBe('ObjectId');
    expect(paths.sourceTemplateDayNumber.instance).toBe('Number');
    expect(paths.dayName.instance).toBe('String');
    expect(paths.rpe.instance).toBe('Number');
    expect(paths.note.instance).toBe('String');
    expect(paths.sets).toBeDefined();
  });

  it('declares the indexes used by repo queries', () => {
    const indexes = SelfWorkoutLogModel.schema.indexes();
    const keys = indexes.map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining([
        { userId: 1, startedAt: -1 },
        { userId: 1, completedAt: 1 },
      ]),
    );
  });
});
```

- [ ] **Step 1.1.2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=self-workout-log.model
```
Expected: FAIL — module not found.

- [ ] **Step 1.1.3: Implement the model**

```ts
// src/lib/db/models/self-workout-log.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISelfWorkoutSet {
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number | null;
  prescribedRepsMax: number | null;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: Date | null;
}

export interface ISelfWorkoutLog extends Document {
  userId: mongoose.Types.ObjectId;
  startedAt: Date;
  completedAt: Date | null;
  sourceTemplateId: mongoose.Types.ObjectId | null;
  sourceTemplateDayNumber: number | null;
  dayName: string;
  sets: ISelfWorkoutSet[];
  rpe: number | null;
  note: string | null;
}

const SelfWorkoutSetSchema = new Schema<ISelfWorkoutSet>(
  {
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    isBodyweight: { type: Boolean, required: true, default: false },
    setNumber: { type: Number, required: true },
    prescribedRepsMin: { type: Number, default: null },
    prescribedRepsMax: { type: Number, default: null },
    actualWeight: { type: Number, default: null },
    actualReps: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

const SelfWorkoutLogSchema = new Schema<ISelfWorkoutLog>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    sourceTemplateId: { type: Schema.Types.ObjectId, default: null },
    sourceTemplateDayNumber: { type: Number, default: null },
    dayName: { type: String, required: true },
    sets: [SelfWorkoutSetSchema],
    rpe: { type: Number, default: null },
    note: { type: String, default: null },
  },
  { timestamps: false },
);

SelfWorkoutLogSchema.index({ userId: 1, startedAt: -1 });
SelfWorkoutLogSchema.index({ userId: 1, completedAt: 1 });

export const SelfWorkoutLogModel: Model<ISelfWorkoutLog> =
  mongoose.models.SelfWorkoutLog ??
  mongoose.model<ISelfWorkoutLog>('SelfWorkoutLog', SelfWorkoutLogSchema);
```

- [ ] **Step 1.1.4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=self-workout-log.model
```
Expected: PASS.

- [ ] **Step 1.1.5: Commit**

```bash
git add src/lib/db/models/self-workout-log.model.ts __tests__/lib/db/models/self-workout-log.model.test.ts
git commit -m "feat(self-tracking): add SelfWorkoutLog mongoose model"
```

---

### Task 1.2: SelfNutritionLog model

**Files:**
- Create: `src/lib/db/models/self-nutrition-log.model.ts`
- Test: `__tests__/lib/db/models/self-nutrition-log.model.test.ts`

- [ ] **Step 1.2.1: Write the failing test**

```ts
// __tests__/lib/db/models/self-nutrition-log.model.test.ts
import { SelfNutritionLogModel } from '@/lib/db/models/self-nutrition-log.model';

describe('SelfNutritionLogModel', () => {
  it('exposes the expected schema paths', () => {
    const paths = SelfNutritionLogModel.schema.paths;
    expect(paths.userId.instance).toBe('ObjectId');
    expect(paths.date.instance).toBe('String');
    expect(paths.sourceTemplateId.instance).toBe('ObjectId');
    expect(paths.sourceTemplateDayTypeName.instance).toBe('String');
    expect(paths.dayLabel.instance).toBe('String');
    expect(paths.dayCompleted.instance).toBe('Boolean');
    expect(paths.meals).toBeDefined();
  });

  it('declares a unique index on userId+date', () => {
    const indexes = SelfNutritionLogModel.schema.indexes();
    const match = indexes.find(([keys]) => keys.userId === 1 && keys.date === 1);
    expect(match).toBeDefined();
    expect(match?.[1]).toMatchObject({ unique: true });
  });
});
```

- [ ] **Step 1.2.2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=self-nutrition-log.model
```
Expected: FAIL — module not found.

- [ ] **Step 1.2.3: Implement the model**

```ts
// src/lib/db/models/self-nutrition-log.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISelfMealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  polyols?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  transFat?: number;
}

export interface ISelfMeal {
  name: string;
  order: number;
  completed: boolean;
  items: ISelfMealItem[];
}

export interface ISelfNutritionLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  sourceTemplateId: mongoose.Types.ObjectId | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

const SelfMealItemSchema = new Schema<ISelfMealItem>(
  {
    foodName: { type: String, required: true },
    quantityG: { type: Number, required: true },
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    fiber: { type: Number },
    sugar: { type: Number },
    salt: { type: Number },
    saturated: { type: Number },
    polyunsaturated: { type: Number },
    monounsaturated: { type: Number },
    polyols: { type: Number },
    cholesterol: { type: Number },
    sodium: { type: Number },
    potassium: { type: Number },
    transFat: { type: Number },
  },
  { _id: false },
);

const SelfMealSchema = new Schema<ISelfMeal>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    completed: { type: Boolean, required: true, default: false },
    items: [SelfMealItemSchema],
  },
  { _id: false },
);

const SelfNutritionLogSchema = new Schema<ISelfNutritionLog>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    sourceTemplateId: { type: Schema.Types.ObjectId, default: null },
    sourceTemplateDayTypeName: { type: String, default: null },
    dayLabel: { type: String, required: true },
    meals: [SelfMealSchema],
    dayCompleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

SelfNutritionLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const SelfNutritionLogModel: Model<ISelfNutritionLog> =
  mongoose.models.SelfNutritionLog ??
  mongoose.model<ISelfNutritionLog>('SelfNutritionLog', SelfNutritionLogSchema);
```

- [ ] **Step 1.2.4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=self-nutrition-log.model
```
Expected: PASS.

- [ ] **Step 1.2.5: Commit**

```bash
git add src/lib/db/models/self-nutrition-log.model.ts __tests__/lib/db/models/self-nutrition-log.model.test.ts
git commit -m "feat(self-tracking): add SelfNutritionLog mongoose model"
```

---

## Stage 2 — SelfWorkoutLog repository

整个 repository 只用一个 task，但拆成多个 step（每 step 内含 Red-Green）。这样能在一次 commit 内有完整可用的 repo。

### Task 2.1: SelfWorkoutLog repository (full CRUD)

**Files:**
- Create: `src/lib/repositories/self-workout-log.repository.ts`
- Test: `__tests__/lib/repositories/self-workout-log.repository.test.ts`

- [ ] **Step 2.1.1: Write the failing test (full file)**

```ts
// __tests__/lib/repositories/self-workout-log.repository.test.ts
jest.mock('@/lib/db/models/self-workout-log.model', () => ({
  SelfWorkoutLogModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

const mockModel = jest.mocked(SelfWorkoutLogModel) as jest.MockedFunction<typeof SelfWorkoutLogModel> & {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findOneAndDelete: jest.Mock;
};

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439099';
const LOG_ID = '507f1f77bcf86cd799439020';
const EX_ID = '507f1f77bcf86cd799439030';

const sampleSet: ISelfWorkoutSet = {
  exerciseId: new mongoose.Types.ObjectId(EX_ID),
  exerciseName: 'Bench Press',
  groupId: 'g1',
  isSuperset: false,
  isBodyweight: false,
  setNumber: 1,
  prescribedRepsMin: 5,
  prescribedRepsMax: 8,
  actualWeight: null,
  actualReps: null,
  completedAt: null,
};

describe('MongoSelfWorkoutLogRepository', () => {
  let repo: MongoSelfWorkoutLogRepository;
  let saveSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoSelfWorkoutLogRepository();
    saveSpy = jest.fn().mockResolvedValue({ _id: LOG_ID });
    (mockModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveSpy }));
  });

  describe('create', () => {
    it('constructs a doc with userId converted to ObjectId', async () => {
      await repo.create({
        userId: USER_A,
        startedAt: new Date('2026-05-08'),
        sourceTemplateId: null,
        sourceTemplateDayNumber: null,
        dayName: 'Freestyle',
        sets: [sampleSet],
      });
      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId),
          dayName: 'Freestyle',
        }),
      );
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('scopes by userId so user B cannot read user A logs', async () => {
      mockModel.findOne.mockResolvedValue({ _id: LOG_ID } as never);
      const result = await repo.findById(LOG_ID, USER_B);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        userId: expect.any(mongoose.Types.ObjectId),
      });
      expect(result).toEqual({ _id: LOG_ID });
    });
  });

  describe('findActive', () => {
    it('returns the latest open log scoped to userId', async () => {
      const sortFn = jest.fn().mockResolvedValue({ _id: LOG_ID });
      mockModel.findOne.mockReturnValue({ sort: sortFn } as never);
      const result = await repo.findActive(USER_A);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        userId: expect.any(mongoose.Types.ObjectId),
        completedAt: null,
      });
      expect(sortFn).toHaveBeenCalledWith({ startedAt: -1 });
      expect(result).toEqual({ _id: LOG_ID });
    });
  });

  describe('findByUserMonth', () => {
    it('queries with userId and a month range', async () => {
      const sortFn = jest.fn().mockResolvedValue([{ _id: LOG_ID }]);
      mockModel.find.mockReturnValue({ sort: sortFn } as never);
      await repo.findByUserMonth(USER_A, 2026, 5);
      const arg = mockModel.find.mock.calls[0][0] as { userId: unknown; completedAt: { $gte: Date; $lt: Date } };
      expect(arg.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(arg.completedAt.$gte).toEqual(new Date(2026, 4, 1));
      expect(arg.completedAt.$lt).toEqual(new Date(2026, 5, 1));
    });
  });

  describe('appendSet', () => {
    it('uses $push and scopes by userId', async () => {
      mockModel.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: LOG_ID }) as never;
      await repo.appendSet(LOG_ID, USER_A, sampleSet);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(mongoose.Types.ObjectId),
          userId: expect.any(mongoose.Types.ObjectId),
        },
        { $push: { sets: sampleSet } },
        { new: true },
      );
    });
  });

  describe('updateSet', () => {
    it('patches a specific set index and scopes by userId', async () => {
      mockModel.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: LOG_ID }) as never;
      const patch = { actualWeight: 100, actualReps: 5, completedAt: new Date('2026-05-08T10:00:00Z') };
      await repo.updateSet(LOG_ID, USER_A, 0, patch);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(mongoose.Types.ObjectId),
          userId: expect.any(mongoose.Types.ObjectId),
        },
        { $set: {
          'sets.0.actualWeight': 100,
          'sets.0.actualReps': 5,
          'sets.0.completedAt': patch.completedAt,
        } },
        { new: true },
      );
    });
  });

  describe('complete', () => {
    it('sets completedAt + rpe + note and scopes by userId', async () => {
      mockModel.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: LOG_ID }) as never;
      await repo.complete(LOG_ID, USER_A, 8, 'felt strong');
      const call = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(call[0]).toMatchObject({
        _id: expect.any(mongoose.Types.ObjectId),
        userId: expect.any(mongoose.Types.ObjectId),
      });
      expect(call[1].$set).toMatchObject({ rpe: 8, note: 'felt strong' });
      expect(call[1].$set.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('uses findOneAndDelete scoped by userId', async () => {
      mockModel.findOneAndDelete.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.delete(LOG_ID, USER_A);
      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        userId: expect.any(mongoose.Types.ObjectId),
      });
    });
  });
});
```

- [ ] **Step 2.1.2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=self-workout-log.repository
```
Expected: FAIL — module not found.

- [ ] **Step 2.1.3: Implement the repository**

```ts
// src/lib/repositories/self-workout-log.repository.ts
import mongoose from 'mongoose';
import type { ISelfWorkoutLog, ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';

export interface CreateSelfWorkoutLogData {
  userId: string;
  startedAt: Date;
  sourceTemplateId: string | null;
  sourceTemplateDayNumber: number | null;
  dayName: string;
  sets: ISelfWorkoutSet[];
}

export interface UpdateSelfSetData {
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: Date;
}

export interface ISelfWorkoutLogRepository {
  create(data: CreateSelfWorkoutLogData): Promise<ISelfWorkoutLog>;
  findById(id: string, userId: string): Promise<ISelfWorkoutLog | null>;
  findActive(userId: string): Promise<ISelfWorkoutLog | null>;
  findByUserMonth(userId: string, year: number, month: number): Promise<ISelfWorkoutLog[]>;
  appendSet(id: string, userId: string, set: ISelfWorkoutSet): Promise<ISelfWorkoutLog | null>;
  updateSet(id: string, userId: string, setIndex: number, patch: UpdateSelfSetData): Promise<ISelfWorkoutLog | null>;
  complete(id: string, userId: string, rpe: number | null, note: string | null): Promise<ISelfWorkoutLog | null>;
  delete(id: string, userId: string): Promise<boolean>;
}

const oid = (s: string) => new mongoose.Types.ObjectId(s);

export class MongoSelfWorkoutLogRepository implements ISelfWorkoutLogRepository {
  async create(data: CreateSelfWorkoutLogData): Promise<ISelfWorkoutLog> {
    const doc = new SelfWorkoutLogModel({
      userId: oid(data.userId),
      startedAt: data.startedAt,
      completedAt: null,
      sourceTemplateId: data.sourceTemplateId ? oid(data.sourceTemplateId) : null,
      sourceTemplateDayNumber: data.sourceTemplateDayNumber,
      dayName: data.dayName,
      sets: data.sets,
      rpe: null,
      note: null,
    });
    return doc.save();
  }

  async findById(id: string, userId: string): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOne({ _id: oid(id), userId: oid(userId) });
  }

  async findActive(userId: string): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOne({ userId: oid(userId), completedAt: null }).sort({ startedAt: -1 });
  }

  async findByUserMonth(userId: string, year: number, month: number): Promise<ISelfWorkoutLog[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return SelfWorkoutLogModel.find({
      userId: oid(userId),
      completedAt: { $gte: start, $lt: end },
    }).sort({ completedAt: 1 });
  }

  async appendSet(id: string, userId: string, set: ISelfWorkoutSet): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      { $push: { sets: set } },
      { new: true },
    );
  }

  async updateSet(
    id: string,
    userId: string,
    setIndex: number,
    patch: UpdateSelfSetData,
  ): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      {
        $set: {
          [`sets.${setIndex}.actualWeight`]: patch.actualWeight,
          [`sets.${setIndex}.actualReps`]: patch.actualReps,
          [`sets.${setIndex}.completedAt`]: patch.completedAt,
        },
      },
      { new: true },
    );
  }

  async complete(
    id: string,
    userId: string,
    rpe: number | null,
    note: string | null,
  ): Promise<ISelfWorkoutLog | null> {
    return SelfWorkoutLogModel.findOneAndUpdate(
      { _id: oid(id), userId: oid(userId) },
      { $set: { completedAt: new Date(), rpe, note } },
      { new: true },
    );
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await SelfWorkoutLogModel.findOneAndDelete({ _id: oid(id), userId: oid(userId) });
    return result !== null;
  }
}
```

- [ ] **Step 2.1.4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=self-workout-log.repository
```
Expected: PASS — all 8 cases.

- [ ] **Step 2.1.5: Lint check**

```bash
pnpm lint
```
Expected: 0 warnings.

- [ ] **Step 2.1.6: Commit**

```bash
git add src/lib/repositories/self-workout-log.repository.ts __tests__/lib/repositories/self-workout-log.repository.test.ts
git commit -m "feat(self-tracking): add SelfWorkoutLog repository"
```

---

## Stage 3 — SelfNutritionLog repository

### Task 3.1: SelfNutritionLog repository

**Files:**
- Create: `src/lib/repositories/self-nutrition-log.repository.ts`
- Test: `__tests__/lib/repositories/self-nutrition-log.repository.test.ts`

- [ ] **Step 3.1.1: Write the failing test**

```ts
// __tests__/lib/repositories/self-nutrition-log.repository.test.ts
jest.mock('@/lib/db/models/self-nutrition-log.model', () => ({
  SelfNutritionLogModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import { SelfNutritionLogModel } from '@/lib/db/models/self-nutrition-log.model';

const mockModel = jest.mocked(SelfNutritionLogModel) as unknown as {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findOneAndDelete: jest.Mock;
};

const USER_A = '507f1f77bcf86cd799439011';

describe('MongoSelfNutritionLogRepository', () => {
  let repo: MongoSelfNutritionLogRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoSelfNutritionLogRepository();
  });

  it('findByDate scopes by userId+date', async () => {
    mockModel.findOne.mockResolvedValue({ _id: 'log1' });
    const result = await repo.findByDate(USER_A, '2026-05-08');
    expect(mockModel.findOne).toHaveBeenCalledWith({
      userId: expect.any(mongoose.Types.ObjectId),
      date: '2026-05-08',
    });
    expect(result).toEqual({ _id: 'log1' });
  });

  it('upsertByDate uses findOneAndUpdate with upsert', async () => {
    mockModel.findOneAndUpdate.mockResolvedValue({ _id: 'log1' });
    const data = {
      sourceTemplateId: null,
      sourceTemplateDayTypeName: null,
      dayLabel: 'Freestyle',
      meals: [],
      dayCompleted: false,
    };
    const result = await repo.upsertByDate(USER_A, '2026-05-08', data);
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: expect.any(mongoose.Types.ObjectId), date: '2026-05-08' },
      { $set: expect.objectContaining({ dayLabel: 'Freestyle' }) },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    expect(result).toEqual({ _id: 'log1' });
  });

  it('upsertByDate converts sourceTemplateId to ObjectId when present', async () => {
    mockModel.findOneAndUpdate.mockResolvedValue({ _id: 'log1' });
    const tplId = '507f1f77bcf86cd799439040';
    await repo.upsertByDate(USER_A, '2026-05-08', {
      sourceTemplateId: tplId,
      sourceTemplateDayTypeName: 'Training Day',
      dayLabel: 'Training Day',
      meals: [],
      dayCompleted: false,
    });
    const call = mockModel.findOneAndUpdate.mock.calls[0];
    expect(call[1].$set.sourceTemplateId).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it('findByUserMonth filters by date range string', async () => {
    const sortFn = jest.fn().mockResolvedValue([{ _id: 'log1' }]);
    mockModel.find.mockReturnValue({ sort: sortFn });
    await repo.findByUserMonth(USER_A, 2026, 5);
    expect(mockModel.find).toHaveBeenCalledWith({
      userId: expect.any(mongoose.Types.ObjectId),
      date: { $gte: '2026-05-01', $lt: '2026-06-01' },
    });
    expect(sortFn).toHaveBeenCalledWith({ date: 1 });
  });

  it('delete uses findOneAndDelete scoped by userId+date', async () => {
    mockModel.findOneAndDelete.mockResolvedValue({ _id: 'log1' });
    const ok = await repo.delete(USER_A, '2026-05-08');
    expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
      userId: expect.any(mongoose.Types.ObjectId),
      date: '2026-05-08',
    });
    expect(ok).toBe(true);
  });
});
```

- [ ] **Step 3.1.2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=self-nutrition-log.repository
```
Expected: FAIL — module not found.

- [ ] **Step 3.1.3: Implement the repository**

```ts
// src/lib/repositories/self-nutrition-log.repository.ts
import mongoose from 'mongoose';
import type { ISelfNutritionLog, ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';
import { SelfNutritionLogModel } from '@/lib/db/models/self-nutrition-log.model';

export interface UpsertSelfNutritionLogData {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

export interface ISelfNutritionLogRepository {
  findByDate(userId: string, date: string): Promise<ISelfNutritionLog | null>;
  upsertByDate(userId: string, date: string, data: UpsertSelfNutritionLogData): Promise<ISelfNutritionLog>;
  findByUserMonth(userId: string, year: number, month: number): Promise<ISelfNutritionLog[]>;
  delete(userId: string, date: string): Promise<boolean>;
}

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const pad2 = (n: number) => n.toString().padStart(2, '0');

export class MongoSelfNutritionLogRepository implements ISelfNutritionLogRepository {
  async findByDate(userId: string, date: string): Promise<ISelfNutritionLog | null> {
    return SelfNutritionLogModel.findOne({ userId: oid(userId), date });
  }

  async upsertByDate(
    userId: string,
    date: string,
    data: UpsertSelfNutritionLogData,
  ): Promise<ISelfNutritionLog> {
    const result = await SelfNutritionLogModel.findOneAndUpdate(
      { userId: oid(userId), date },
      {
        $set: {
          sourceTemplateId: data.sourceTemplateId ? oid(data.sourceTemplateId) : null,
          sourceTemplateDayTypeName: data.sourceTemplateDayTypeName,
          dayLabel: data.dayLabel,
          meals: data.meals,
          dayCompleted: data.dayCompleted,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!result) throw new Error('Upsert failed');
    return result;
  }

  async findByUserMonth(userId: string, year: number, month: number): Promise<ISelfNutritionLog[]> {
    const startStr = `${year}-${pad2(month)}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;
    return SelfNutritionLogModel.find({
      userId: oid(userId),
      date: { $gte: startStr, $lt: nextMonth },
    }).sort({ date: 1 });
  }

  async delete(userId: string, date: string): Promise<boolean> {
    const result = await SelfNutritionLogModel.findOneAndDelete({ userId: oid(userId), date });
    return result !== null;
  }
}
```

- [ ] **Step 3.1.4: Run test + lint**

```bash
pnpm test -- --testPathPattern=self-nutrition-log.repository
pnpm lint
```
Expected: PASS, 0 warnings.

- [ ] **Step 3.1.5: Commit**

```bash
git add src/lib/repositories/self-nutrition-log.repository.ts __tests__/lib/repositories/self-nutrition-log.repository.test.ts
git commit -m "feat(self-tracking): add SelfNutritionLog repository"
```

---

## Stage 4 — Auth helper

### Task 4.1: `requireSelfTrackingRole` helper

**Files:**
- Create: `src/lib/auth/self-tracking-access.ts`
- Test: `__tests__/lib/auth/self-tracking-access.test.ts`

- [ ] **Step 4.1.1: Write the failing test**

```ts
// __tests__/lib/auth/self-tracking-access.test.ts
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

import { auth } from '@/lib/auth/auth';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';

const mockAuth = jest.mocked(auth);

describe('requireSelfTrackingRole', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 response when no session', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns 403 response when role is member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns ok with userId for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'owner' } } as never);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('u1');
      expect(result.role).toBe('owner');
    }
  });

  it('returns ok with userId for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u2', role: 'trainer' } } as never);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('u2');
      expect(result.role).toBe('trainer');
    }
  });
});
```

- [ ] **Step 4.1.2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=self-tracking-access
```
Expected: FAIL — module not found.

- [ ] **Step 4.1.3: Implement the helper**

```ts
// src/lib/auth/self-tracking-access.ts
import { auth } from '@/lib/auth/auth';
import type { UserRole } from '@/types/auth';

export type SelfTrackingAuthResult =
  | { ok: true; userId: string; role: 'owner' | 'trainer' }
  | { ok: false; response: Response };

export async function requireSelfTrackingRole(): Promise<SelfTrackingAuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = session.user.role as UserRole;
  if (role !== 'owner' && role !== 'trainer') {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: session.user.id, role };
}
```

- [ ] **Step 4.1.4: Run test + lint**

```bash
pnpm test -- --testPathPattern=self-tracking-access
pnpm lint
```
Expected: PASS, 0 warnings.

- [ ] **Step 4.1.5: Commit**

```bash
git add src/lib/auth/self-tracking-access.ts __tests__/lib/auth/self-tracking-access.test.ts
git commit -m "feat(self-tracking): add requireSelfTrackingRole auth helper"
```

---

## Stage 5 — Workout API routes

不含 saveAsTemplate，那部分留到 Stage 10。

### Task 5.1: `POST /api/me/workout-logs` + `GET /api/me/workout-logs`

**Files:**
- Create: `src/app/api/me/workout-logs/route.ts`
- Test: `__tests__/app/api/me/workout-logs.test.ts`

- [ ] **Step 5.1.1: Write the failing test**

```ts
// __tests__/app/api/me/workout-logs.test.ts
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

    it('creates a freestyle log when no sourceTemplateId given', async () => {
      mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
      const create = jest.fn().mockResolvedValue({ _id: 'log1' });
      mockSelfRepo.mockImplementation(() => ({ create } as unknown as MongoSelfWorkoutLogRepository));
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

- [ ] **Step 5.1.2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=workout-logs.test
```
Expected: FAIL — module not found.

- [ ] **Step 5.1.3: Implement the route**

```ts
// src/app/api/me/workout-logs/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
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

- [ ] **Step 5.1.4: Run test + lint + commit**

```bash
pnpm test -- --testPathPattern=workout-logs.test
pnpm lint
git add src/app/api/me/workout-logs/route.ts __tests__/app/api/me/workout-logs.test.ts
git commit -m "feat(self-tracking): add POST/GET /api/me/workout-logs"
```
Expected: PASS, 0 warnings.

---

### Task 5.2: `GET /api/me/workout-logs/active` + `GET/DELETE /api/me/workout-logs/[id]`

**Files:**
- Create: `src/app/api/me/workout-logs/active/route.ts`
- Create: `src/app/api/me/workout-logs/[id]/route.ts`
- Test: `__tests__/app/api/me/workout-logs-id.test.ts`

- [ ] **Step 5.2.1: Write the failing test**

```ts
// __tests__/app/api/me/workout-logs-id.test.ts
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { GET as activeGET } from '@/app/api/me/workout-logs/active/route';
import { GET as idGET, DELETE as idDELETE } from '@/app/api/me/workout-logs/[id]/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);

const USER = '507f1f77bcf86cd799439011';
const LOG_ID = '507f1f77bcf86cd799439020';

describe('/api/me/workout-logs id+active', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET active returns 200 with log when found', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findActive = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ findActive } as unknown as MongoSelfWorkoutLogRepository));
    const res = await activeGET();
    expect(res.status).toBe(200);
    expect(findActive).toHaveBeenCalledWith(USER);
  });

  it('GET active returns 200 with null when no active', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findActive = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ findActive } as unknown as MongoSelfWorkoutLogRepository));
    const res = await activeGET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toBeNull();
  });

  it('GET id returns 404 when not found / not owned', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findById = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ findById } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idGET(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(404);
  });

  it('GET id returns 200 with log', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const findById = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ findById } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idGET(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(200);
  });

  it('DELETE returns 204 on success', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const del = jest.fn().mockResolvedValue(true);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idDELETE(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(204);
  });

  it('DELETE returns 404 when nothing deleted', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const del = jest.fn().mockResolvedValue(false);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfWorkoutLogRepository));
    const res = await idDELETE(new Request('http://x'), { params: Promise.resolve({ id: LOG_ID }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 5.2.2: Run test, FAIL**

```bash
pnpm test -- --testPathPattern=workout-logs-id
```

- [ ] **Step 5.2.3: Implement `active/route.ts`**

```ts
// src/app/api/me/workout-logs/active/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

export async function GET(): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.findActive(guard.userId);
  return Response.json(log);
}
```

- [ ] **Step 5.2.4: Implement `[id]/route.ts`**

```ts
// src/app/api/me/workout-logs/[id]/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.findById(id, guard.userId);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const ok = await repo.delete(id, guard.userId);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 5.2.5: Run test + lint + commit**

```bash
pnpm test -- --testPathPattern=workout-logs-id
pnpm lint
git add src/app/api/me/workout-logs/active/route.ts src/app/api/me/workout-logs/[id]/route.ts __tests__/app/api/me/workout-logs-id.test.ts
git commit -m "feat(self-tracking): add active/get/delete routes for workout logs"
```

---

### Task 5.3: Sets — `POST /api/me/workout-logs/[id]/sets` + `PATCH .../sets/[setIndex]`

**Files:**
- Create: `src/app/api/me/workout-logs/[id]/sets/route.ts`
- Create: `src/app/api/me/workout-logs/[id]/sets/[setIndex]/route.ts`
- Test: `__tests__/app/api/me/workout-logs-sets.test.ts`

- [ ] **Step 5.3.1: Write the failing test**

```ts
// __tests__/app/api/me/workout-logs-sets.test.ts
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { POST as setsPOST } from '@/app/api/me/workout-logs/[id]/sets/route';
import { PATCH as setPATCH } from '@/app/api/me/workout-logs/[id]/sets/[setIndex]/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);

const USER = '507f1f77bcf86cd799439011';
const LOG_ID = '507f1f77bcf86cd799439020';

describe('/api/me/workout-logs/[id]/sets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST appends a set', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const appendSet = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ appendSet } as unknown as MongoSelfWorkoutLogRepository));
    const setBody = {
      exerciseId: '507f1f77bcf86cd799439030',
      exerciseName: 'Squat',
      groupId: 'g2',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: null,
      prescribedRepsMax: null,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    const res = await setsPOST(
      new Request('http://x', { method: 'POST', body: JSON.stringify(setBody) }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(200);
    expect(appendSet).toHaveBeenCalledWith(LOG_ID, USER, expect.objectContaining({ exerciseName: 'Squat' }));
  });

  it('PATCH updates a set', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const updateSet = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ updateSet } as unknown as MongoSelfWorkoutLogRepository));
    const res = await setPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ actualWeight: 100, actualReps: 5 }) }),
      { params: Promise.resolve({ id: LOG_ID, setIndex: '0' }) },
    );
    expect(res.status).toBe(200);
    expect(updateSet).toHaveBeenCalledWith(LOG_ID, USER, 0, expect.objectContaining({
      actualWeight: 100,
      actualReps: 5,
      completedAt: expect.any(Date),
    }));
  });

  it('PATCH returns 404 when log not found', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const updateSet = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ updateSet } as unknown as MongoSelfWorkoutLogRepository));
    const res = await setPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ actualWeight: null, actualReps: null }) }),
      { params: Promise.resolve({ id: LOG_ID, setIndex: '5' }) },
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 5.3.2: Run test, FAIL**

```bash
pnpm test -- --testPathPattern=workout-logs-sets
```

- [ ] **Step 5.3.3: Implement `sets/route.ts`**

```ts
// src/app/api/me/workout-logs/[id]/sets/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = (await req.json()) as ISelfWorkoutSet;
  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.appendSet(id, guard.userId, body);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}
```

- [ ] **Step 5.3.4: Implement `sets/[setIndex]/route.ts`**

```ts
// src/app/api/me/workout-logs/[id]/sets/[setIndex]/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

type RouteContext = { params: Promise<{ id: string; setIndex: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id, setIndex } = await params;
  const idx = parseInt(setIndex, 10);
  const body = (await req.json()) as { actualWeight: number | null; actualReps: number | null };

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.updateSet(id, guard.userId, idx, {
    actualWeight: body.actualWeight,
    actualReps: body.actualReps,
    completedAt: new Date(),
  });
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}
```

- [ ] **Step 5.3.5: Run test + lint + commit**

```bash
pnpm test -- --testPathPattern=workout-logs-sets
pnpm lint
git add src/app/api/me/workout-logs/[id]/sets __tests__/app/api/me/workout-logs-sets.test.ts
git commit -m "feat(self-tracking): add set append/patch routes for workout logs"
```

---

### Task 5.4: `POST /api/me/workout-logs/[id]/complete`（不含 saveAsTemplate）

**Files:**
- Create: `src/app/api/me/workout-logs/[id]/complete/route.ts`
- Test: `__tests__/app/api/me/workout-logs-complete.test.ts`

- [ ] **Step 5.4.1: Write the failing test**

```ts
// __tests__/app/api/me/workout-logs-complete.test.ts
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-workout-log.repository', () => ({
  MongoSelfWorkoutLogRepository: jest.fn(),
}));

import { POST } from '@/app/api/me/workout-logs/[id]/complete/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfWorkoutLogRepository);

const USER = '507f1f77bcf86cd799439011';
const LOG_ID = '507f1f77bcf86cd799439020';

describe('POST /api/me/workout-logs/[id]/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes the log with rpe + note', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest.fn().mockResolvedValue({ _id: LOG_ID, completedAt: new Date() });
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    const res = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ rpe: 8, note: 'good' }) }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(200);
    expect(complete).toHaveBeenCalledWith(LOG_ID, USER, 8, 'good');
  });

  it('returns 404 when log not found', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    const res = await POST(
      new Request('http://x', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(404);
  });

  it('accepts empty body and uses null defaults', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const complete = jest.fn().mockResolvedValue({ _id: LOG_ID });
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));
    await POST(
      new Request('http://x', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(complete).toHaveBeenCalledWith(LOG_ID, USER, null, null);
  });
});
```

- [ ] **Step 5.4.2: Run test, FAIL**

```bash
pnpm test -- --testPathPattern=workout-logs-complete
```

- [ ] **Step 5.4.3: Implement `complete/route.ts`**

```ts
// src/app/api/me/workout-logs/[id]/complete/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';

type RouteContext = { params: Promise<{ id: string }> };

interface CompleteBody {
  rpe?: number | null;
  note?: string | null;
  // saveAsTemplate handled in Stage 10
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = (await req.json()) as CompleteBody;

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.complete(id, guard.userId, body.rpe ?? null, body.note ?? null);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(log);
}
```

- [ ] **Step 5.4.4: Run test + lint + commit**

```bash
pnpm test -- --testPathPattern=workout-logs-complete
pnpm lint
git add src/app/api/me/workout-logs/[id]/complete __tests__/app/api/me/workout-logs-complete.test.ts
git commit -m "feat(self-tracking): add complete route for workout logs"
```

---

## Stage 6 — Nutrition API routes

不含 saveAsTemplate。

### Task 6.1: `GET /api/me/nutrition-logs`

**Files:**
- Create: `src/app/api/me/nutrition-logs/route.ts`
- Test: `__tests__/app/api/me/nutrition-logs.test.ts`

- [ ] **Step 6.1.1: Write the failing test**

```ts
// __tests__/app/api/me/nutrition-logs.test.ts
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-nutrition-log.repository', () => ({
  MongoSelfNutritionLogRepository: jest.fn(),
}));

import { GET } from '@/app/api/me/nutrition-logs/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfNutritionLogRepository);

const USER = '507f1f77bcf86cd799439011';

describe('GET /api/me/nutrition-logs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns guard response on guard fail', async () => {
    mockGuard.mockResolvedValue({ ok: false, response: Response.json({}, { status: 403 }) });
    const res = await GET(new Request('http://x?year=2026&month=5'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when year/month missing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const res = await GET(new Request('http://x'));
    expect(res.status).toBe(400);
  });

  it('returns month list', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const findByUserMonth = jest.fn().mockResolvedValue([{ _id: 'log1' }]);
    mockRepo.mockImplementation(
      () => ({ findByUserMonth } as unknown as MongoSelfNutritionLogRepository),
    );
    const res = await GET(new Request('http://x?year=2026&month=5'));
    expect(res.status).toBe(200);
    expect(findByUserMonth).toHaveBeenCalledWith(USER, 2026, 5);
  });
});
```

- [ ] **Step 6.1.2: Run test, FAIL**

```bash
pnpm test -- --testPathPattern=nutrition-logs.test
```

- [ ] **Step 6.1.3: Implement**

```ts
// src/app/api/me/nutrition-logs/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';

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
  const repo = new MongoSelfNutritionLogRepository();
  const logs = await repo.findByUserMonth(guard.userId, parseInt(yearParam, 10), parseInt(monthParam, 10));
  return Response.json(logs);
}
```

- [ ] **Step 6.1.4: Run test + lint + commit**

```bash
pnpm test -- --testPathPattern=nutrition-logs.test
pnpm lint
git add src/app/api/me/nutrition-logs/route.ts __tests__/app/api/me/nutrition-logs.test.ts
git commit -m "feat(self-tracking): add GET /api/me/nutrition-logs"
```

---

### Task 6.2: `GET / PUT / DELETE /api/me/nutrition-logs/[date]`

**Files:**
- Create: `src/app/api/me/nutrition-logs/[date]/route.ts`
- Test: `__tests__/app/api/me/nutrition-logs-date.test.ts`

- [ ] **Step 6.2.1: Write the failing test**

```ts
// __tests__/app/api/me/nutrition-logs-date.test.ts
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/self-tracking-access', () => ({ requireSelfTrackingRole: jest.fn() }));
jest.mock('@/lib/repositories/self-nutrition-log.repository', () => ({
  MongoSelfNutritionLogRepository: jest.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/me/nutrition-logs/[date]/route';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';

const mockGuard = jest.mocked(requireSelfTrackingRole);
const mockRepo = jest.mocked(MongoSelfNutritionLogRepository);

const USER = '507f1f77bcf86cd799439011';
const DATE = '2026-05-08';

describe('/api/me/nutrition-logs/[date]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET 200 with log', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const findByDate = jest.fn().mockResolvedValue({ _id: 'log1' });
    mockRepo.mockImplementation(() => ({ findByDate } as unknown as MongoSelfNutritionLogRepository));
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(200);
    expect(findByDate).toHaveBeenCalledWith(USER, DATE);
  });

  it('GET 200 with null when missing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const findByDate = jest.fn().mockResolvedValue(null);
    mockRepo.mockImplementation(() => ({ findByDate } as unknown as MongoSelfNutritionLogRepository));
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toBeNull();
  });

  it('PUT 400 when date format invalid', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ dayLabel: 'Freestyle', meals: [], dayCompleted: false }) }),
      { params: Promise.resolve({ date: 'not-a-date' }) },
    );
    expect(res.status).toBe(400);
  });

  it('PUT 200 upserts log', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const upsertByDate = jest.fn().mockResolvedValue({ _id: 'log1' });
    mockRepo.mockImplementation(() => ({ upsertByDate } as unknown as MongoSelfNutritionLogRepository));
    const body = {
      sourceTemplateId: null,
      sourceTemplateDayTypeName: null,
      dayLabel: 'Freestyle',
      meals: [],
      dayCompleted: false,
    };
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }),
      { params: Promise.resolve({ date: DATE }) },
    );
    expect(res.status).toBe(200);
    expect(upsertByDate).toHaveBeenCalledWith(USER, DATE, body);
  });

  it('DELETE 204 on success', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const del = jest.fn().mockResolvedValue(true);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfNutritionLogRepository));
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(204);
  });

  it('DELETE 404 when nothing deleted', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const del = jest.fn().mockResolvedValue(false);
    mockRepo.mockImplementation(() => ({ delete: del } as unknown as MongoSelfNutritionLogRepository));
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ date: DATE }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6.2.2: Run test, FAIL**

- [ ] **Step 6.2.3: Implement**

```ts
// src/app/api/me/nutrition-logs/[date]/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import type { ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';

type RouteContext = { params: Promise<{ date: string }> };

interface PutBody {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });
  await connectDB();
  const repo = new MongoSelfNutritionLogRepository();
  const log = await repo.findByDate(guard.userId, date);
  return Response.json(log);
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });
  const body = (await req.json()) as PutBody;
  await connectDB();
  const repo = new MongoSelfNutritionLogRepository();
  const log = await repo.upsertByDate(guard.userId, date, body);
  return Response.json(log);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });
  await connectDB();
  const repo = new MongoSelfNutritionLogRepository();
  const ok = await repo.delete(guard.userId, date);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 6.2.4: Run test + lint + commit**

```bash
pnpm test -- --testPathPattern=nutrition-logs-date
pnpm lint
git add src/app/api/me/nutrition-logs/[date] __tests__/app/api/me/nutrition-logs-date.test.ts
git commit -m "feat(self-tracking): add GET/PUT/DELETE /api/me/nutrition-logs/[date]"
```

---

## Stage 7 — Workout UI

UI 任务以"骨架 + 关键逻辑"形式给出。样式遵循项目 CLAUDE.md 设计准则（compact card、`text-foreground/65` 等）。`<ExerciseLibraryPicker>` 引用现有组件 — 实施前请先 grep `src/components` 找到准确路径，若不存在则使用现有 plan-template 编辑页内的同款 picker（参考 `src/app/(dashboard)/trainer/plans/_components/`）。

### Task 7.1: `start-workout-card.tsx`（主页入口卡）

**Files:**
- Create: `src/components/self-tracking/start-workout-card.tsx`

- [ ] **Step 7.1.1: Implement**

```tsx
// src/components/self-tracking/start-workout-card.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TemplateDayPickerDialog } from './template-day-picker-dialog';

interface ActiveLog {
  _id: string;
  dayName: string;
  startedAt: string;
}

interface Props {
  basePath: '/owner/my-training' | '/trainer/my-training';
}

export function StartWorkoutCard({ basePath }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveLog | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/me/workout-logs/active')
      .then((r) => r.json())
      .then((d: ActiveLog | null) => setActive(d));
  }, []);

  async function startFreestyle() {
    setCreating(true);
    const res = await fetch('/api/me/workout-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayName: 'Freestyle', plannedSets: [] }),
    });
    const log = (await res.json()) as { _id: string };
    router.push(`${basePath}/session/${log._id}`);
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Today
      </div>
      {active ? (
        <Button onClick={() => router.push(`${basePath}/session/${active._id}`)} className="w-full">
          Continue: {active.dayName}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button onClick={() => setPickerOpen(true)} variant="default" className="flex-1">
            From Template
          </Button>
          <Button onClick={startFreestyle} disabled={creating} variant="outline" className="flex-1">
            Freestyle
          </Button>
        </div>
      )}

      <TemplateDayPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={async ({ templateId, dayNumber, dayName, plannedSets }) => {
          const res = await fetch('/api/me/workout-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dayName,
              sourceTemplateId: templateId,
              sourceTemplateDayNumber: dayNumber,
              plannedSets,
            }),
          });
          const log = (await res.json()) as { _id: string };
          router.push(`${basePath}/session/${log._id}`);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 7.1.2: Lint + commit (no test yet — covered by E2E in Stage 12)**

```bash
pnpm lint
git add src/components/self-tracking/start-workout-card.tsx
git commit -m "feat(self-tracking): add StartWorkoutCard entry component"
```

---

### Task 7.2: `template-day-picker-dialog.tsx`

**Files:**
- Create: `src/components/self-tracking/template-day-picker-dialog.tsx`

- [ ] **Step 7.2.1: Implement**

```tsx
// src/components/self-tracking/template-day-picker-dialog.tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

interface PlanTemplate {
  _id: string;
  name: string;
  days: { dayNumber: number; name: string; exercises: TemplateExercise[] }[];
}

interface TemplateExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}

interface PickResult {
  templateId: string;
  dayNumber: number;
  dayName: string;
  plannedSets: ISelfWorkoutSet[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (result: PickResult) => void;
}

export function TemplateDayPickerDialog({ open, onOpenChange, onPick }: Props) {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<PlanTemplate | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reuse existing endpoint — list templates created by the current user.
    // The existing /api/plan-templates GET already filters by createdBy = session.user.id.
    fetch('/api/plan-templates')
      .then((r) => r.json())
      .then((d: PlanTemplate[]) => setTemplates(d));
    setSelectedTpl(null);
  }, [open]);

  function pickDay(day: PlanTemplate['days'][number]) {
    if (!selectedTpl) return;
    const plannedSets: ISelfWorkoutSet[] = day.exercises.flatMap((ex) =>
      Array.from({ length: ex.sets }, (_, i) => ({
        // ObjectId stays a string here; backend converts via repo
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
    onPick({
      templateId: selectedTpl._id,
      dayNumber: day.dayNumber,
      dayName: day.name,
      plannedSets,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedTpl ? `Pick a day from "${selectedTpl.name}"` : 'Pick a template'}</DialogTitle>
        </DialogHeader>
        {!selectedTpl ? (
          <div className="space-y-1.5">
            {templates.length === 0 ? (
              <div className="text-sm text-foreground/65 py-4 text-center">No templates yet.</div>
            ) : (
              templates.map((t) => (
                <Button
                  key={t._id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setSelectedTpl(t)}
                >
                  {t.name}
                </Button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedTpl.days.map((d) => (
              <Button
                key={d.dayNumber}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => pickDay(d)}
              >
                Day {d.dayNumber} — {d.name}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSelectedTpl(null)} className="text-foreground/65">
              ← Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7.2.2: Verify `/api/plan-templates` GET filters by `createdBy = session.user.id`**

```bash
grep -n "findByCreator\|createdBy" src/app/api/plan-templates/route.ts
```
Expected: confirms filter applied. If route returns all templates, fix the route in this same task to filter by `session.user.id` (it's likely already correct, but verify).

- [ ] **Step 7.2.3: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/template-day-picker-dialog.tsx
git commit -m "feat(self-tracking): add TemplateDayPickerDialog"
```

---

### Task 7.3: `self-workout-session.tsx`（session 页主体）

这是 self-tracking 整个 feature 里最大的组件。功能：每组 PATCH 实时保存；"Add Set" → POST 新增 set；"Add Exercise" → 在 freestyle 模式下加新动作。复杂逻辑分多个 step。

**Files:**
- Create: `src/components/self-tracking/self-workout-session.tsx`

- [ ] **Step 7.3.1: Implement skeleton (props + state + load)**

```tsx
// src/components/self-tracking/self-workout-session.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CompleteWorkoutDialog } from './complete-workout-dialog';
import type { ISelfWorkoutLog, ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

interface Props {
  logId: string;
  basePath: '/owner/my-training' | '/trainer/my-training';
}

export function SelfWorkoutSession({ logId, basePath }: Props) {
  const router = useRouter();
  const [log, setLog] = useState<ISelfWorkoutLog | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/me/workout-logs/${logId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ISelfWorkoutLog | null) => setLog(d));
  }, [logId]);

  if (!log) return <div className="p-6 text-foreground/65 text-sm">Loading…</div>;

  return (
    <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{log.dayName}</h1>
        <Button onClick={() => setCompleteOpen(true)} variant="default">
          Finish
        </Button>
      </div>

      {/* sets list rendered in next step */}
      {/* TODO step 7.3.2: render grouped sets */}

      <CompleteWorkoutDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        logId={logId}
        domain="workout"
        onCompleted={() => router.push(`${basePath}/calendar`)}
      />
    </div>
  );
}
```

- [ ] **Step 7.3.2: Render sets grouped by `groupId`，with PATCH on edit**

替换 `{/* sets list rendered in next step */}` 这段及其后注释，加入：

```tsx
      <div className="space-y-3">
        {groupSetsByGroupId(log.sets).map((group, gi) => (
          <div key={gi} className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2">
            <div className="text-sm font-medium">
              {group[0].exerciseName}
              {group[0].isSuperset && <span className="ml-2 text-[10px] text-foreground/65">superset</span>}
            </div>
            <div className="mt-1.5 space-y-1">
              {group.map((s) => (
                <SetRow
                  key={s.setNumber}
                  set={s}
                  setIndex={log.sets.indexOf(s)}
                  onSave={async (actualWeight, actualReps) => {
                    const res = await fetch(`/api/me/workout-logs/${logId}/sets/${log.sets.indexOf(s)}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ actualWeight, actualReps }),
                    });
                    if (res.ok) setLog(await res.json());
                  }}
                />
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1.5 text-foreground/65"
              onClick={async () => {
                const last = group[group.length - 1];
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
                if (res.ok) setLog(await res.json());
              }}
            >
              + Add Set
            </Button>
          </div>
        ))}
      </div>

      {/* Add Exercise button shown for freestyle (no sourceTemplateId) */}
      {log.sourceTemplateId === null && (
        <AddExerciseButton
          onPick={async (ex) => {
            const newSet: ISelfWorkoutSet = {
              exerciseId: ex.exerciseId as unknown as ISelfWorkoutSet['exerciseId'],
              exerciseName: ex.exerciseName,
              groupId: `g-${Date.now()}`,
              isSuperset: false,
              isBodyweight: ex.isBodyweight,
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
            if (res.ok) setLog(await res.json());
          }}
        />
      )}
```

并在文件顶部添加 helper 与子组件：

```tsx
function groupSetsByGroupId(sets: ISelfWorkoutSet[]): ISelfWorkoutSet[][] {
  const map = new Map<string, ISelfWorkoutSet[]>();
  for (const s of sets) {
    const arr = map.get(s.groupId) ?? [];
    arr.push(s);
    map.set(s.groupId, arr);
  }
  return Array.from(map.values());
}

interface SetRowProps {
  set: ISelfWorkoutSet;
  setIndex: number;
  onSave: (weight: number | null, reps: number | null) => Promise<void>;
}

function SetRow({ set, onSave }: SetRowProps) {
  const [w, setW] = useState<string>(set.actualWeight?.toString() ?? '');
  const [r, setR] = useState<string>(set.actualReps?.toString() ?? '');

  const isCompleted = set.completedAt !== null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-foreground/65">#{set.setNumber}</span>
      {set.prescribedRepsMin !== null && set.prescribedRepsMax !== null && (
        <span className="w-16 text-foreground/65">
          {set.prescribedRepsMin}-{set.prescribedRepsMax}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        placeholder="kg"
        value={w}
        onChange={(e) => setW(e.target.value)}
        onBlur={() => onSave(w === '' ? null : parseFloat(w), r === '' ? null : parseInt(r, 10))}
        className="w-16 bg-background ring-1 ring-foreground/10 rounded px-2 py-1"
      />
      <span className="text-foreground/65">×</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="reps"
        value={r}
        onChange={(e) => setR(e.target.value)}
        onBlur={() => onSave(w === '' ? null : parseFloat(w), r === '' ? null : parseInt(r, 10))}
        className="w-14 bg-background ring-1 ring-foreground/10 rounded px-2 py-1"
      />
      {isCompleted && <span className="text-emerald-500 ml-1">✓</span>}
    </div>
  );
}

interface AddExerciseButtonProps {
  onPick: (ex: { exerciseId: string; exerciseName: string; isBodyweight: boolean }) => Promise<void>;
}

function AddExerciseButton({ onPick }: AddExerciseButtonProps) {
  const [open, setOpen] = useState(false);
  // Reuse the existing exercise picker used in plan-template editing.
  // Implementation: import the project's existing picker and render in a Sheet/Dialog.
  // Replace the placeholder below with the actual picker import once located.
  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        + Add Exercise
      </Button>
      {/* Integrate the project's existing exercise picker here.
          Discovery commands (run before writing this part):
            grep -rn "ExerciseLibrary\|ExercisePicker" src 2>/dev/null
            grep -rn "exerciseId" src/components 2>/dev/null | head -20
            ls src/app/\(dashboard\)/trainer/plans/_components 2>/dev/null
          Render the picker inside a Sheet or Dialog controlled by `open`.
          On selection: call `onPick({ exerciseId, exerciseName, isBodyweight })`
          and `setOpen(false)`. */}
    </>
  );
}
```

执行者注：`AddExerciseButton` 需要把项目里现有的 exercise picker 接进来。在实施时，先 grep 找：

```bash
grep -rn "exerciseId" src/components 2>/dev/null | head -20
grep -rn "ExerciseLibrary\|ExercisePicker" src 2>/dev/null | head -20
```

若发现已有 `<ExerciseLibraryPicker />`，直接 import 并接 `onSelect → onPick`；若不存在，使用 plan-template 编辑页中的同款实现（在 `src/app/(dashboard)/trainer/plans/_components/`），先 read 该文件再回来填这部分。

- [ ] **Step 7.3.3: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/self-workout-session.tsx
git commit -m "feat(self-tracking): add SelfWorkoutSession session-page component"
```

---

### Task 7.4: `complete-workout-dialog.tsx`（不含 saveAsTemplate；Stage 10 再加）

**Files:**
- Create: `src/components/self-tracking/complete-workout-dialog.tsx`
- Test: `__tests__/components/self-tracking/complete-workout-dialog.test.tsx`

- [ ] **Step 7.4.1: Write the failing test**

```tsx
// __tests__/components/self-tracking/complete-workout-dialog.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompleteWorkoutDialog } from '@/components/self-tracking/complete-workout-dialog';

describe('CompleteWorkoutDialog', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ _id: 'log1' }) });
  });

  it('submits with rpe and note', async () => {
    const onCompleted = jest.fn();
    render(
      <CompleteWorkoutDialog
        open={true}
        onOpenChange={() => undefined}
        logId="log1"
        domain="workout"
        onCompleted={onCompleted}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /finish workout/i }));

    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/me/workout-logs/log1/complete',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

- [ ] **Step 7.4.2: Run test, FAIL**

```bash
pnpm test -- --testPathPattern=complete-workout-dialog
```

- [ ] **Step 7.4.3: Implement (saveAsTemplate stub for now — Stage 10 fills in)**

```tsx
// src/components/self-tracking/complete-workout-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logId: string;
  domain: 'workout' | 'nutrition';
  date?: string;                  // for nutrition
  onCompleted: () => void;
  // Stage 10 will add: extraBody?: object (passed through into body)
}

export function CompleteWorkoutDialog({
  open,
  onOpenChange,
  logId,
  domain,
  date,
  onCompleted,
}: Props) {
  const [rpe, setRpe] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const url =
      domain === 'workout'
        ? `/api/me/workout-logs/${logId}/complete`
        : `/api/me/nutrition-logs/${date}`;
    const body =
      domain === 'workout'
        ? { rpe: rpe === '' ? null : parseInt(rpe, 10), note: note === '' ? null : note }
        : { /* nutrition body filled by parent — this dialog only used for workout in Stage 7 */ };
    const res = await fetch(url, {
      method: domain === 'workout' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (res.ok) {
      onOpenChange(false);
      onCompleted();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish workout</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-xs text-foreground/65 block">
            RPE (optional)
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
            />
          </label>
          <label className="text-xs text-foreground/65 block">
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
            />
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} className="flex-1">
            Finish workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7.4.4: Run test, PASS + lint + commit**

```bash
pnpm test -- --testPathPattern=complete-workout-dialog
pnpm lint
git add src/components/self-tracking/complete-workout-dialog.tsx __tests__/components/self-tracking/complete-workout-dialog.test.tsx
git commit -m "feat(self-tracking): add CompleteWorkoutDialog"
```

---

### Task 7.5: `my-training/page.tsx` + `my-training/session/[id]/page.tsx` (owner & trainer)

**Files:**
- Create: `src/app/(dashboard)/owner/my-training/page.tsx`
- Create: `src/app/(dashboard)/owner/my-training/session/[id]/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-training/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-training/session/[id]/page.tsx`

- [ ] **Step 7.5.1: Implement owner main page**

```tsx
// src/app/(dashboard)/owner/my-training/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { StartWorkoutCard } from '@/components/self-tracking/start-workout-card';

export default async function OwnerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        actions={
          <Link href="/owner/my-training/calendar" className="text-[11px] text-foreground/65 hover:text-foreground transition-colors">
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <StartWorkoutCard basePath="/owner/my-training" />
      </div>
    </div>
  );
}
```

- [ ] **Step 7.5.2: Implement owner session page**

```tsx
// src/app/(dashboard)/owner/my-training/session/[id]/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SelfWorkoutSession } from '@/components/self-tracking/self-workout-session';

export default async function OwnerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  const { id } = await params;
  return <SelfWorkoutSession logId={id} basePath="/owner/my-training" />;
}
```

- [ ] **Step 7.5.3: Implement trainer counterparts (identical except role check + basePath)**

```tsx
// src/app/(dashboard)/trainer/my-training/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { StartWorkoutCard } from '@/components/self-tracking/start-workout-card';

export default async function TrainerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        actions={
          <Link href="/trainer/my-training/calendar" className="text-[11px] text-foreground/65 hover:text-foreground transition-colors">
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <StartWorkoutCard basePath="/trainer/my-training" />
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/trainer/my-training/session/[id]/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SelfWorkoutSession } from '@/components/self-tracking/self-workout-session';

export default async function TrainerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  const { id } = await params;
  return <SelfWorkoutSession logId={id} basePath="/trainer/my-training" />;
}
```

- [ ] **Step 7.5.4: Lint + commit**

```bash
pnpm lint
git add src/app/\(dashboard\)/owner/my-training src/app/\(dashboard\)/trainer/my-training
git commit -m "feat(self-tracking): add my-training pages for owner + trainer"
```

---

## Stage 8 — Workout calendar

### Task 8.1: `self-workout-calendar.tsx`

**Files:**
- Create: `src/components/self-tracking/self-workout-calendar.tsx`

- [ ] **Step 8.1.1: Implement (close clone of `WorkoutCalendar`, but reads self log shape)**

```tsx
// src/components/self-tracking/self-workout-calendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelfLogSummary {
  _id: string;
  dayName: string;
  completedAt: string;
  rpe: number | null;
  sets: { exerciseId: string }[];
}

interface Props {
  logs: SelfLogSummary[];
  onSelect: (log: SelfLogSummary) => void;
  selectedId?: string | null;
  onMonthChange?: (year: number, month: number) => void;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  return { startOffset, daysInMonth };
}

export function SelfWorkoutCalendar({ logs, onSelect, selectedId, onMonthChange }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const logsByDay = useMemo(() => {
    const map = new Map<number, SelfLogSummary>();
    for (const l of logs) {
      const d = new Date(l.completedAt);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        map.set(d.getDate(), l);
      }
    }
    return map;
  }, [logs, year, month]);

  function shiftMonth(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setYear(ny);
    setMonth(nm);
    onMonthChange?.(ny, nm);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shiftMonth(-1)} className="text-foreground/65 hover:text-foreground transition-colors" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button onClick={() => shiftMonth(1)} className="text-foreground/65 hover:text-foreground transition-colors" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-foreground/65 py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const log = logsByDay.get(day);
          const isToday = now.getDate() === day && now.getMonth() + 1 === month && now.getFullYear() === year;
          const isSelected = log && log._id === selectedId;
          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => log && onSelect(log)}
                disabled={!log}
                className={cn(
                  'w-8 h-8 rounded-full text-[11px] flex items-center justify-center transition-colors',
                  log && isSelected && 'bg-foreground text-background font-bold',
                  log && !isSelected && 'bg-foreground/10 text-foreground font-semibold hover:bg-foreground/20',
                  !log && isToday && 'ring-1 ring-foreground/25 text-foreground/65',
                  !log && !isToday && 'text-foreground/40',
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

- [ ] **Step 8.1.2: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/self-workout-calendar.tsx
git commit -m "feat(self-tracking): add SelfWorkoutCalendar component"
```

---

### Task 8.2: Calendar pages (owner + trainer)

**Files:**
- Create: `src/app/(dashboard)/owner/my-training/calendar/page.tsx`
- Create: `src/app/(dashboard)/owner/my-training/calendar/_components/calendar-client.tsx`
- Create: `src/app/(dashboard)/trainer/my-training/calendar/page.tsx`

- [ ] **Step 8.2.1: Implement client component**

```tsx
// src/app/(dashboard)/owner/my-training/calendar/_components/calendar-client.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfWorkoutCalendar } from '@/components/self-tracking/self-workout-calendar';
import { SessionDetailPanel } from '@/components/calendar/session-detail-panel';

interface SetSummary {
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

interface SelfLog {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  note: string | null;
  sets: SetSummary[];
}

interface Props {
  backHref: string;
}

export function MyTrainingCalendarClient({ backHref }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState<SelfLog[]>([]);
  const [selected, setSelected] = useState<SelfLog | null>(null);

  useEffect(() => {
    fetch(`/api/me/workout-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d: SelfLog[]) => setLogs(d));
  }, [year, month]);

  // SessionDetailPanel expects an imageUrl on every set, but ISelfWorkoutSet
  // does not include imageUrl. Backfill imageUrl: null when adapting.
  const detailShape = selected
    ? {
        _id: selected._id,
        dayName: selected.dayName,
        startedAt: selected.startedAt,
        completedAt: selected.completedAt,
        rpe: selected.rpe,
        memberNote: selected.note,
        sets: selected.sets.map((s) => ({ ...s, imageUrl: s.imageUrl ?? null })),
      }
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Training Calendar"
        actions={
          <Link href={backHref} className="text-[11px] text-foreground/65 hover:text-foreground transition-colors">
            ← Back
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
        <SelfWorkoutCalendar
          logs={logs.filter((l) => l.completedAt !== null) as (SelfLog & { completedAt: string })[]}
          onSelect={(l) => setSelected(l as SelfLog)}
          selectedId={selected?._id}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        {detailShape && <SessionDetailPanel session={detailShape} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2.2: Implement owner page wrapper**

```tsx
// src/app/(dashboard)/owner/my-training/calendar/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyTrainingCalendarClient } from './_components/calendar-client';

export default async function OwnerTrainingCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  return <MyTrainingCalendarClient backHref="/owner/my-training" />;
}
```

- [ ] **Step 8.2.3: Implement trainer page (re-imports the same client component)**

```tsx
// src/app/(dashboard)/trainer/my-training/calendar/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyTrainingCalendarClient } from '@/app/(dashboard)/owner/my-training/calendar/_components/calendar-client';

export default async function TrainerTrainingCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  return <MyTrainingCalendarClient backHref="/trainer/my-training" />;
}
```

> 注：trainer 复用 owner 的 client component。这种跨 owner/trainer 共享 client component 在本项目并非常见做法 — 若 owner 那个目录后续被改名/删除，trainer 这条会断。**实施时**：把这个 client component 移到 `src/components/self-tracking/my-training-calendar-client.tsx`，两个 page 都从 `@/components/...` 导入。下一步立刻做这个迁移。

- [ ] **Step 8.2.4: Move client component to shared location**

```bash
mv src/app/\(dashboard\)/owner/my-training/calendar/_components/calendar-client.tsx \
   src/components/self-tracking/my-training-calendar-client.tsx
rmdir src/app/\(dashboard\)/owner/my-training/calendar/_components
```

更新两个 page 的 import 为：

```ts
import { MyTrainingCalendarClient } from '@/components/self-tracking/my-training-calendar-client';
```

- [ ] **Step 8.2.5: Lint + commit**

```bash
pnpm lint
git add -A
git commit -m "feat(self-tracking): add my-training calendar pages for owner + trainer"
```

---

## Stage 9 — Nutrition UI

### Task 9.1: `self-nutrition-day-view.tsx`

**Files:**
- Create: `src/components/self-tracking/self-nutrition-day-view.tsx`

- [ ] **Step 9.1.1: Implement**

```tsx
// src/components/self-tracking/self-nutrition-day-view.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';
import { MealSection } from '@/components/nutrition/meal-section';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import type { ISelfMeal, ISelfMealItem } from '@/lib/db/models/self-nutrition-log.model';
import type { MacroSnapshot } from '@/lib/nutrition/macros';

const OPTIONAL_MACRO_KEYS = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated',
  'polyols', 'cholesterol', 'sodium', 'potassium', 'transFat',
] as const;

const DEFAULT_MEALS: ISelfMeal[] = [
  { name: 'Breakfast', order: 0, completed: false, items: [] },
  { name: 'Lunch', order: 1, completed: false, items: [] },
  { name: 'Dinner', order: 2, completed: false, items: [] },
  { name: 'Snack', order: 3, completed: false, items: [] },
];

interface SelfNutritionLog {
  date: string;
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

interface Props {
  initialDate: string;
  readOnly?: boolean;
}

function aggregate(meals: ISelfMeal[]): MacroSnapshot {
  const totals: MacroSnapshot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of meals) {
    for (const i of m.items) {
      totals.kcal += i.kcal;
      totals.protein += i.protein;
      totals.carbs += i.carbs;
      totals.fat += i.fat;
      for (const k of OPTIONAL_MACRO_KEYS) {
        const v = i[k];
        if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v;
      }
    }
  }
  return totals;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SelfNutritionDayView({ initialDate, readOnly = false }: Props) {
  const [date, setDate] = useState(initialDate);
  const [log, setLog] = useState<SelfNutritionLog | null>(null);
  const [pickerForMeal, setPickerForMeal] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/me/nutrition-logs/${date}`);
    const data = (await res.json()) as SelfNutritionLog | null;
    setLog(
      data ?? {
        date,
        sourceTemplateId: null,
        sourceTemplateDayTypeName: null,
        dayLabel: 'Freestyle',
        meals: DEFAULT_MEALS,
        dayCompleted: false,
      },
    );
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => (log ? aggregate(log.meals) : { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [log]);

  async function persist(next: SelfNutritionLog) {
    setLog(next);
    if (readOnly) return;
    await fetch(`/api/me/nutrition-logs/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceTemplateId: next.sourceTemplateId,
        sourceTemplateDayTypeName: next.sourceTemplateDayTypeName,
        dayLabel: next.dayLabel,
        meals: next.meals,
        dayCompleted: next.dayCompleted,
      }),
    });
  }

  if (!log) return <div className="p-4 text-foreground/65 text-sm">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setDate(shiftDate(date, -1))} disabled={readOnly}>
          ← {shiftDate(date, -1)}
        </Button>
        <span className="text-sm font-semibold">{date}</span>
        <Button variant="ghost" size="sm" onClick={() => setDate(shiftDate(date, 1))} disabled={readOnly}>
          {shiftDate(date, 1)} →
        </Button>
      </div>

      <MacroSummaryCard totals={totals} />

      <div className="space-y-3">
        {log.meals.map((m, i) => (
          <MealSection
            key={i}
            meal={m as unknown as Parameters<typeof MealSection>[0]['meal']}
            readOnly={readOnly}
            onAddItem={() => setPickerForMeal(i)}
            onToggleCompleted={() => {
              const next = { ...log, meals: log.meals.map((mm, j) => j === i ? { ...mm, completed: !mm.completed } : mm) };
              void persist(next);
            }}
            onRemoveItem={(itemIdx) => {
              const next = { ...log, meals: log.meals.map((mm, j) => j === i ? { ...mm, items: mm.items.filter((_, k) => k !== itemIdx) } : mm) };
              void persist(next);
            }}
          />
        ))}
      </div>

      <FoodPickerDialog
        open={pickerForMeal !== null}
        onOpenChange={(o) => { if (!o) setPickerForMeal(null); }}
        onPick={(item: ISelfMealItem) => {
          if (pickerForMeal === null) return;
          const next = {
            ...log,
            meals: log.meals.map((mm, j) => j === pickerForMeal ? { ...mm, items: [...mm.items, item] } : mm),
          };
          setPickerForMeal(null);
          void persist(next);
        }}
      />
    </div>
  );
}
```

> **执行者注**：`MealSection` 当前 prop 形状是为 `IDailyLogMeal` 写的。若 type 不匹配（`completed` / `items` 字段一致就没问题），把 `as unknown as ...` 这一行删掉；若需要小改 `MealSection` 的 prop 接受更宽 type，那也可以 — 但把改动限制在最小、不要让它从 member 端的 model 强耦合到 self 端。同样 `FoodPickerDialog` 的 `onPick` 输出形状若不是 `ISelfMealItem`，加一个 mapper。

- [ ] **Step 9.1.2: Lint + commit**

```bash
pnpm lint
git add src/components/self-tracking/self-nutrition-day-view.tsx
git commit -m "feat(self-tracking): add SelfNutritionDayView"
```

---

### Task 9.2: `self-nutrition-calendar.tsx`

**Files:**
- Create: `src/components/self-tracking/self-nutrition-calendar.tsx`
- Test: `__tests__/components/self-tracking/self-nutrition-calendar.test.tsx`

- [ ] **Step 9.2.1: Write the failing test**

```tsx
// __tests__/components/self-tracking/self-nutrition-calendar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SelfNutritionCalendar } from '@/components/self-tracking/self-nutrition-calendar';

const sample = [
  { date: new Date().toISOString().slice(0, 10), kcal: 2000, dayLabel: 'Freestyle' },
];

describe('SelfNutritionCalendar', () => {
  it('highlights days with logs and triggers onSelect', () => {
    const onSelect = jest.fn();
    render(<SelfNutritionCalendar entries={sample} onSelect={onSelect} />);
    const dayBtn = screen.getByRole('button', { name: new RegExp(`${new Date().getDate()}`) });
    fireEvent.click(dayBtn);
    expect(onSelect).toHaveBeenCalledWith(sample[0]);
  });
});
```

- [ ] **Step 9.2.2: Run test, FAIL**

```bash
pnpm test -- --testPathPattern=self-nutrition-calendar
```

- [ ] **Step 9.2.3: Implement**

```tsx
// src/components/self-tracking/self-nutrition-calendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NutritionDayEntry {
  date: string;       // 'YYYY-MM-DD'
  kcal: number;
  dayLabel: string;
}

interface Props {
  entries: NutritionDayEntry[];
  onSelect: (entry: NutritionDayEntry) => void;
  selectedDate?: string;
  onMonthChange?: (year: number, month: number) => void;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  return { startOffset: (firstDay + 6) % 7, daysInMonth };
}

export function SelfNutritionCalendar({ entries, onSelect, selectedDate, onMonthChange }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { startOffset, daysInMonth } = getMonthDays(year, month);

  const entriesByDay = useMemo(() => {
    const map = new Map<number, NutritionDayEntry>();
    for (const e of entries) {
      const [y, m, d] = e.date.split('-').map(Number);
      if (y === year && m === month) map.set(d, e);
    }
    return map;
  }, [entries, year, month]);

  function shift(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setYear(ny);
    setMonth(nm);
    onMonthChange?.(ny, nm);
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="text-foreground/65 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold">{monthName}</span>
        <button onClick={() => shift(1)} aria-label="Next month" className="text-foreground/65 hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((l, i) => (
          <div key={i} className="text-center text-[9px] text-foreground/65 py-1">{l}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const entry = entriesByDay.get(day);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = entry && dateStr === selectedDate;
          return (
            <div key={day} className="flex justify-center">
              <button
                onClick={() => entry && onSelect(entry)}
                disabled={!entry}
                aria-label={`Day ${day}`}
                className={cn(
                  'w-8 h-8 rounded-full text-[11px] flex items-center justify-center transition-colors',
                  entry && isSelected && 'bg-foreground text-background font-bold',
                  entry && !isSelected && 'bg-foreground/10 text-foreground font-semibold hover:bg-foreground/20',
                  !entry && 'text-foreground/40',
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

- [ ] **Step 9.2.4: Run test, PASS + lint + commit**

```bash
pnpm test -- --testPathPattern=self-nutrition-calendar
pnpm lint
git add src/components/self-tracking/self-nutrition-calendar.tsx __tests__/components/self-tracking/self-nutrition-calendar.test.tsx
git commit -m "feat(self-tracking): add SelfNutritionCalendar"
```

---

### Task 9.3: Nutrition pages (owner + trainer)

**Files:**
- Create: `src/app/(dashboard)/owner/my-nutrition/page.tsx`
- Create: `src/app/(dashboard)/owner/my-nutrition/calendar/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-nutrition/page.tsx`
- Create: `src/app/(dashboard)/trainer/my-nutrition/calendar/page.tsx`
- Create: `src/components/self-tracking/my-nutrition-calendar-client.tsx`

- [ ] **Step 9.3.1: Implement owner main**

```tsx
// src/app/(dashboard)/owner/my-nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

export default async function OwnerMyNutritionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        actions={
          <Link href="/owner/my-nutrition/calendar" className="text-[11px] text-foreground/65 hover:text-foreground transition-colors">
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayView initialDate={today} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9.3.2: Implement nutrition calendar client**

```tsx
// src/components/self-tracking/my-nutrition-calendar-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionCalendar, type NutritionDayEntry } from './self-nutrition-calendar';
import { SelfNutritionDayView } from './self-nutrition-day-view';

interface RawLog {
  date: string;
  dayLabel: string;
  meals: { items: { kcal: number }[] }[];
}

interface Props {
  backHref: string;
  mainHref: string;
}

export function MyNutritionCalendarClient({ backHref, mainHref }: Props) {
  const router = useRouter();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<NutritionDayEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/me/nutrition-logs?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((logs: RawLog[]) => {
        setEntries(
          logs.map((l) => ({
            date: l.date,
            dayLabel: l.dayLabel,
            kcal: l.meals.flatMap((m) => m.items).reduce((s, it) => s + it.kcal, 0),
          })),
        );
      });
  }, [year, month]);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Nutrition Calendar"
        actions={
          <Link href={backHref} className="text-[11px] text-foreground/65 hover:text-foreground transition-colors">
            ← Back
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-4">
        <SelfNutritionCalendar
          entries={entries}
          onSelect={(e) => {
            if (e.date === today) {
              router.push(mainHref);
            } else {
              setSelectedDate(e.date);
            }
          }}
          selectedDate={selectedDate ?? undefined}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
        />
        {selectedDate && <SelfNutritionDayView initialDate={selectedDate} readOnly />}
      </div>
    </div>
  );
}
```

- [ ] **Step 9.3.3: Implement owner + trainer calendar pages and trainer main**

```tsx
// src/app/(dashboard)/owner/my-nutrition/calendar/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyNutritionCalendarClient } from '@/components/self-tracking/my-nutrition-calendar-client';

export default async function OwnerNutritionCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  return <MyNutritionCalendarClient backHref="/owner/my-nutrition" mainHref="/owner/my-nutrition" />;
}
```

```tsx
// src/app/(dashboard)/trainer/my-nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SelfNutritionDayView } from '@/components/self-tracking/self-nutrition-day-view';

export default async function TrainerMyNutritionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Nutrition"
        actions={
          <Link href="/trainer/my-nutrition/calendar" className="text-[11px] text-foreground/65 hover:text-foreground transition-colors">
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <SelfNutritionDayView initialDate={today} />
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/trainer/my-nutrition/calendar/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyNutritionCalendarClient } from '@/components/self-tracking/my-nutrition-calendar-client';

export default async function TrainerNutritionCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  return <MyNutritionCalendarClient backHref="/trainer/my-nutrition" mainHref="/trainer/my-nutrition" />;
}
```

- [ ] **Step 9.3.4: Lint + commit**

```bash
pnpm lint
git add src/app/\(dashboard\)/owner/my-nutrition src/app/\(dashboard\)/trainer/my-nutrition src/components/self-tracking/my-nutrition-calendar-client.tsx
git commit -m "feat(self-tracking): add my-nutrition pages for owner + trainer"
```

---

## Stage 10 — Save as template

把"完成时勾选 → 同步创建一份新 template"接入 workout complete 路由 与 nutrition PUT 路由。

### Task 10.1: `template-snapshot.ts` 转换 helper

**Files:**
- Create: `src/lib/self-tracking/template-snapshot.ts`
- Test: `__tests__/lib/self-tracking/template-snapshot.test.ts`

- [ ] **Step 10.1.1: Write the failing test**

```ts
// __tests__/lib/self-tracking/template-snapshot.test.ts
import mongoose from 'mongoose';
import { setsToPlanDays, mealsToDayType } from '@/lib/self-tracking/template-snapshot';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import type { ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';

const exA = new mongoose.Types.ObjectId();
const exB = new mongoose.Types.ObjectId();

const sets: ISelfWorkoutSet[] = [
  { exerciseId: exA, exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: 5, prescribedRepsMax: 8, actualWeight: 100, actualReps: 5, completedAt: new Date() },
  { exerciseId: exA, exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 2, prescribedRepsMin: 5, prescribedRepsMax: 8, actualWeight: 100, actualReps: 5, completedAt: new Date() },
  { exerciseId: exB, exerciseName: 'Row',   groupId: 'g2', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: 8, prescribedRepsMax: 12, actualWeight: 60,  actualReps: 8, completedAt: new Date() },
];

describe('setsToPlanDays', () => {
  it('produces a single day with grouped exercises and prescribed-only fields', () => {
    const days = setsToPlanDays(sets, 'Push Day');
    expect(days).toHaveLength(1);
    expect(days[0].name).toBe('Push Day');
    expect(days[0].dayNumber).toBe(1);
    expect(days[0].exercises).toHaveLength(2);
    expect(days[0].exercises[0]).toMatchObject({
      exerciseName: 'Bench',
      groupId: 'g1',
      sets: 2,
      repsMin: 5,
      repsMax: 8,
    });
    expect(days[0].exercises[1]).toMatchObject({
      exerciseName: 'Row',
      sets: 1,
      repsMin: 8,
      repsMax: 12,
    });
    // No actual* fields should be present
    expect(days[0].exercises[0]).not.toHaveProperty('actualWeight');
  });

  it('falls back to repsMin/Max=0 when prescribed is null (freestyle)', () => {
    const fs: ISelfWorkoutSet[] = [
      { exerciseId: exA, exerciseName: 'X', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: null, prescribedRepsMax: null, actualWeight: 50, actualReps: 5, completedAt: new Date() },
    ];
    const days = setsToPlanDays(fs, 'Freestyle');
    expect(days[0].exercises[0].repsMin).toBe(0);
    expect(days[0].exercises[0].repsMax).toBe(0);
  });
});

describe('mealsToDayType', () => {
  it('strips completed flag and returns IDayType-shaped data', () => {
    const meals: ISelfMeal[] = [
      { name: 'Breakfast', order: 0, completed: true, items: [{ foodName: 'Egg', quantityG: 100, kcal: 150, protein: 12, carbs: 1, fat: 10 }] },
    ];
    const dayType = mealsToDayType(meals, 'Training Day');
    expect(dayType.name).toBe('Training Day');
    expect(dayType.meals[0]).not.toHaveProperty('completed');
    expect(dayType.meals[0].items[0].foodName).toBe('Egg');
  });
});
```

- [ ] **Step 10.1.2: Run test, FAIL**

```bash
pnpm test -- --testPathPattern=template-snapshot
```

- [ ] **Step 10.1.3: Implement**

```ts
// src/lib/self-tracking/template-snapshot.ts
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import type { ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';
import type { IPlanDay, IPlanDayExercise } from '@/lib/db/models/plan-template.model';
import type { IDayType, IMeal, IMealItem } from '@/lib/db/models/nutrition-template.model';

export function setsToPlanDays(sets: ISelfWorkoutSet[], dayName: string): IPlanDay[] {
  const groups = new Map<string, ISelfWorkoutSet[]>();
  for (const s of sets) {
    const arr = groups.get(s.groupId) ?? [];
    arr.push(s);
    groups.set(s.groupId, arr);
  }

  const exercises: IPlanDayExercise[] = Array.from(groups.values()).map((groupSets) => {
    const first = groupSets[0];
    return {
      groupId: first.groupId,
      isSuperset: first.isSuperset,
      exerciseId: first.exerciseId,
      exerciseName: first.exerciseName,
      imageUrl: null,
      isBodyweight: first.isBodyweight,
      sets: groupSets.length,
      repsMin: first.prescribedRepsMin ?? 0,
      repsMax: first.prescribedRepsMax ?? 0,
      restSeconds: null,
    };
  });

  return [{ dayNumber: 1, name: dayName, exercises }];
}

export function mealsToDayType(meals: ISelfMeal[], dayTypeName: string): IDayType {
  const stripped: IMeal[] = meals.map((m) => ({
    name: m.name,
    order: m.order,
    items: m.items as unknown as IMealItem[],
  }));
  return { name: dayTypeName, meals: stripped };
}
```

- [ ] **Step 10.1.4: Run test, PASS + commit**

```bash
pnpm test -- --testPathPattern=template-snapshot
pnpm lint
git add src/lib/self-tracking __tests__/lib/self-tracking
git commit -m "feat(self-tracking): add template-snapshot helpers"
```

---

### Task 10.2: Wire `saveAsTemplate` into workout complete route

**Files:**
- Modify: `src/app/api/me/workout-logs/[id]/complete/route.ts`
- Modify: `__tests__/app/api/me/workout-logs-complete.test.ts`

- [ ] **Step 10.2.1: Add failing test for saveAsTemplate**

在 `workout-logs-complete.test.ts` 的 `describe(...)` block 内追加：

```ts
  it('creates a PlanTemplate when saveAsTemplate.name provided', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const completedLog = {
      _id: LOG_ID,
      dayName: 'Push Day',
      sets: [{
        exerciseId: '507f1f77bcf86cd799439030',
        exerciseName: 'Bench',
        groupId: 'g1',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 1,
        prescribedRepsMin: 5,
        prescribedRepsMax: 8,
        actualWeight: 100,
        actualReps: 5,
        completedAt: new Date(),
      }],
    };
    const complete = jest.fn().mockResolvedValue(completedLog);
    mockRepo.mockImplementation(() => ({ complete } as unknown as MongoSelfWorkoutLogRepository));

    const tplCreate = jest.fn().mockResolvedValue({ _id: 'tpl1' });
    jest.doMock('@/lib/repositories/plan-template.repository', () => ({
      MongoPlanTemplateRepository: jest.fn().mockImplementation(() => ({ create: tplCreate })),
    }));

    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ rpe: 8, note: null, saveAsTemplate: { name: 'My Push' } }),
      }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('createdTemplateId');
  });

  it('returns 400 when saveAsTemplate.name missing', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'trainer' });
    const res = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ saveAsTemplate: { name: '' } }) }),
      { params: Promise.resolve({ id: LOG_ID }) },
    );
    expect(res.status).toBe(400);
  });
```

> 注：`jest.doMock` 在 test 内部使用时需要在 import 前调用。如果上述 test 因 jest 模块缓存失败，把 PlanTemplateRepository 的 mock 提到文件顶部 `jest.mock()` 中。

- [ ] **Step 10.2.2: Run test, FAIL**

- [ ] **Step 10.2.3: Update complete route to support `saveAsTemplate`**

```ts
// src/app/api/me/workout-logs/[id]/complete/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { setsToPlanDays } from '@/lib/self-tracking/template-snapshot';

type RouteContext = { params: Promise<{ id: string }> };

interface SaveAsTemplate {
  name: string;
  description?: string;
}

interface CompleteBody {
  rpe?: number | null;
  note?: string | null;
  saveAsTemplate?: SaveAsTemplate;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const body = (await req.json()) as CompleteBody;

  if (body.saveAsTemplate !== undefined) {
    if (!body.saveAsTemplate.name || body.saveAsTemplate.name.trim() === '') {
      return Response.json({ error: 'Template name is required' }, { status: 400 });
    }
  }

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.complete(id, guard.userId, body.rpe ?? null, body.note ?? null);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });

  let createdTemplateId: string | undefined;
  if (body.saveAsTemplate) {
    const tplRepo = new MongoPlanTemplateRepository();
    const days = setsToPlanDays(log.sets, log.dayName);
    const tpl = await tplRepo.create({
      name: body.saveAsTemplate.name.trim(),
      description: body.saveAsTemplate.description ?? null,
      createdBy: guard.userId,
      days,
    });
    createdTemplateId = tpl._id.toString();
  }

  return Response.json({ ...log.toObject(), createdTemplateId });
}
```

- [ ] **Step 10.2.4: Run test, PASS + lint + commit**

```bash
pnpm test -- --testPathPattern=workout-logs-complete
pnpm lint
git add src/app/api/me/workout-logs/[id]/complete __tests__/app/api/me/workout-logs-complete.test.ts
git commit -m "feat(self-tracking): support saveAsTemplate in workout complete"
```

---

### Task 10.3: Wire `saveAsTemplate` into nutrition PUT route

**Files:**
- Modify: `src/app/api/me/nutrition-logs/[date]/route.ts`
- Modify: `__tests__/app/api/me/nutrition-logs-date.test.ts`

- [ ] **Step 10.3.1: Add failing test**

在 `nutrition-logs-date.test.ts` 中追加：

```ts
  it('PUT creates a NutritionTemplate when saveAsTemplate provided', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const upserted = {
      _id: 'log1',
      meals: [{ name: 'Breakfast', order: 0, completed: false, items: [{ foodName: 'Egg', quantityG: 100, kcal: 150, protein: 12, carbs: 1, fat: 10 }] }],
      dayLabel: 'Training Day',
      toObject() { return { _id: 'log1' }; },
    };
    const upsertByDate = jest.fn().mockResolvedValue(upserted);
    mockRepo.mockImplementation(() => ({ upsertByDate } as unknown as MongoSelfNutritionLogRepository));

    const tplCreate = jest.fn().mockResolvedValue({ _id: 'ntpl1' });
    jest.doMock('@/lib/repositories/nutrition-template.repository', () => ({
      MongoNutritionTemplateRepository: jest.fn().mockImplementation(() => ({ create: tplCreate })),
    }));

    const res = await PUT(
      new Request('http://x', {
        method: 'PUT',
        body: JSON.stringify({
          sourceTemplateId: null, sourceTemplateDayTypeName: null,
          dayLabel: 'Training Day', meals: upserted.meals, dayCompleted: true,
          saveAsTemplate: { name: 'My Diet' },
        }),
      }),
      { params: Promise.resolve({ date: DATE }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('createdTemplateId');
  });

  it('PUT 400 when saveAsTemplate.name empty', async () => {
    mockGuard.mockResolvedValue({ ok: true, userId: USER, role: 'owner' });
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({
        sourceTemplateId: null, sourceTemplateDayTypeName: null, dayLabel: 'X', meals: [], dayCompleted: false,
        saveAsTemplate: { name: '' },
      }) }),
      { params: Promise.resolve({ date: DATE }) },
    );
    expect(res.status).toBe(400);
  });
```

- [ ] **Step 10.3.2: Run test, FAIL**

- [ ] **Step 10.3.3: Update route**

```ts
// src/app/api/me/nutrition-logs/[date]/route.ts (replace previous PUT)
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { mealsToDayType } from '@/lib/self-tracking/template-snapshot';
import type { ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';

type RouteContext = { params: Promise<{ date: string }> };

interface PutBody {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
  saveAsTemplate?: { name: string; description?: string };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET and DELETE remain as in Task 6.2.

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });

  const body = (await req.json()) as PutBody;
  if (body.saveAsTemplate !== undefined) {
    if (!body.saveAsTemplate.name || body.saveAsTemplate.name.trim() === '') {
      return Response.json({ error: 'Template name is required' }, { status: 400 });
    }
  }

  await connectDB();
  const repo = new MongoSelfNutritionLogRepository();
  const log = await repo.upsertByDate(guard.userId, date, {
    sourceTemplateId: body.sourceTemplateId,
    sourceTemplateDayTypeName: body.sourceTemplateDayTypeName,
    dayLabel: body.dayLabel,
    meals: body.meals,
    dayCompleted: body.dayCompleted,
  });

  let createdTemplateId: string | undefined;
  if (body.saveAsTemplate) {
    const tplRepo = new MongoNutritionTemplateRepository();
    const dayType = mealsToDayType(log.meals, body.dayLabel);
    const tpl = await tplRepo.create({
      name: body.saveAsTemplate.name.trim(),
      description: body.saveAsTemplate.description ?? null,
      createdBy: guard.userId,
      dayTypes: [dayType],
    });
    createdTemplateId = tpl._id.toString();
  }

  return Response.json({ ...log.toObject(), createdTemplateId });
}
```

> **执行者注**：在写代码前 `cat src/lib/repositories/nutrition-template.repository.ts` 一下确认 `create()` 签名 — 字段命名应是 `name / description / createdBy / dayTypes`，与 `IPlanTemplateRepository.create` 同形态。如果签名不同，调整调用以匹配。

- [ ] **Step 10.3.4: Run test, PASS + lint + commit**

```bash
pnpm test -- --testPathPattern=nutrition-logs-date
pnpm lint
git add src/app/api/me/nutrition-logs/[date] __tests__/app/api/me/nutrition-logs-date.test.ts
git commit -m "feat(self-tracking): support saveAsTemplate in nutrition PUT"
```

---

### Task 10.4: `save-as-template-checkbox.tsx` + 接入两个完成对话框

**Files:**
- Create: `src/components/self-tracking/save-as-template-checkbox.tsx`
- Modify: `src/components/self-tracking/complete-workout-dialog.tsx`
- Modify: `src/components/self-tracking/self-nutrition-day-view.tsx`（加底部 "Save day as template" 按钮 + dialog）

- [ ] **Step 10.4.1: Implement the shared checkbox**

```tsx
// src/components/self-tracking/save-as-template-checkbox.tsx
'use client';

import { useState } from 'react';

interface Props {
  value: { name: string; description: string } | null;
  onChange: (next: { name: string; description: string } | null) => void;
}

export function SaveAsTemplateCheckbox({ value, onChange }: Props) {
  const [name, setName] = useState(value?.name ?? '');
  const [description, setDescription] = useState(value?.description ?? '');

  const checked = value !== null;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? { name, description } : null)}
          className="h-4 w-4"
        />
        Save as template
      </label>
      {checked && (
        <div className="space-y-2 pl-6">
          <input
            type="text"
            placeholder="Template name *"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onChange({ name: e.target.value, description });
            }}
            className="w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              onChange({ name, description: e.target.value });
            }}
            className="w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10.4.2: Update `CompleteWorkoutDialog` to include checkbox + extend test**

更新 dialog（替换 Task 7.4 写出的版本）：

```tsx
// src/components/self-tracking/complete-workout-dialog.tsx (replace previous)
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SaveAsTemplateCheckbox } from './save-as-template-checkbox';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logId: string;
  onCompleted: () => void;
}

export function CompleteWorkoutDialog({ open, onOpenChange, logId, onCompleted }: Props) {
  const [rpe, setRpe] = useState('');
  const [note, setNote] = useState('');
  const [save, setSave] = useState<{ name: string; description: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = save === null || save.name.trim() !== '';

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await fetch(`/api/me/workout-logs/${logId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rpe: rpe === '' ? null : parseInt(rpe, 10),
        note: note === '' ? null : note,
        saveAsTemplate: save ? { name: save.name.trim(), description: save.description.trim() || undefined } : undefined,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = (await res.json()) as { createdTemplateId?: string };
      if (data.createdTemplateId) toast.success('Saved as template');
      onOpenChange(false);
      onCompleted();
    } else {
      toast.error('Failed to finish workout');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish workout</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-xs text-foreground/65 block">
            RPE (optional)
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={rpe} onChange={(e) => setRpe(e.target.value)}
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
            />
          </label>
          <label className="text-xs text-foreground/65 block">
            Note (optional)
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full bg-background ring-1 ring-foreground/10 rounded px-2 py-1.5"
            />
          </label>
          <SaveAsTemplateCheckbox value={save} onChange={setSave} />
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          <Button onClick={submit} disabled={submitting || !canSubmit} className="flex-1">Finish workout</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

更新 `complete-workout-dialog.test.tsx` 加测试：

```tsx
  it('disables submit when save-as-template checked but name empty', async () => {
    render(
      <CompleteWorkoutDialog open={true} onOpenChange={() => undefined} logId="log1" onCompleted={() => undefined} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    const submitBtn = screen.getByRole('button', { name: /finish workout/i });
    expect(submitBtn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/template name/i), { target: { value: 'My Push' } });
    expect(submitBtn).not.toBeDisabled();
  });
```

> 注：删掉 Task 7.4 dialog 里 `domain` / `date` 这两个 prop（这个 dialog 现在专门给 workout 用）。如果 `SelfNutritionDayView` 之前 reused 它，请改用下一步独立的 nutrition save-as-template 流程。

**同时修改 Task 7.4 写出的测试** — 原 test 用 `domain="workout"` 这个 prop，现在 dialog 不再接受。把 `__tests__/components/self-tracking/complete-workout-dialog.test.tsx` 里的渲染调用改为：

```tsx
render(
  <CompleteWorkoutDialog
    open={true}
    onOpenChange={() => undefined}
    logId="log1"
    onCompleted={onCompleted}
  />,
);
```

并且因为原 test 也需要确认 `Finish workout` 按钮调用 fetch，无需改动这部分逻辑，只是把那两个 prop 移除。

- [ ] **Step 10.4.3: Add `Save day as template` button to `SelfNutritionDayView`**

在 `SelfNutritionDayView` 底部添加：

```tsx
{!readOnly && (
  <SaveDayAsTemplate
    onSubmit={async ({ name, description }) => {
      const res = await fetch(`/api/me/nutrition-logs/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTemplateId: log.sourceTemplateId,
          sourceTemplateDayTypeName: log.sourceTemplateDayTypeName,
          dayLabel: log.dayLabel,
          meals: log.meals,
          dayCompleted: log.dayCompleted,
          saveAsTemplate: { name: name.trim(), description: description.trim() || undefined },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { createdTemplateId?: string };
        if (data.createdTemplateId) toast.success('Saved as template');
      }
    }}
  />
)}
```

并在文件中加入 `SaveDayAsTemplate` 子组件：

```tsx
import { toast } from 'sonner';
import { SaveAsTemplateCheckbox } from './save-as-template-checkbox';

interface SaveDayAsTemplateProps {
  onSubmit: (v: { name: string; description: string }) => Promise<void>;
}

function SaveDayAsTemplate({ onSubmit }: SaveDayAsTemplateProps) {
  const [save, setSave] = useState<{ name: string; description: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = save !== null && save.name.trim() !== '';

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 space-y-3">
      <SaveAsTemplateCheckbox value={save} onChange={setSave} />
      <Button
        size="sm"
        disabled={!canSubmit || submitting}
        onClick={async () => {
          if (!save) return;
          setSubmitting(true);
          await onSubmit(save);
          setSubmitting(false);
          setSave(null);
        }}
      >
        Save as template
      </Button>
    </div>
  );
}
```

- [ ] **Step 10.4.4: Run all relevant tests + lint + commit**

```bash
pnpm test -- --testPathPattern="self-tracking|workout-logs-complete|nutrition-logs-date"
pnpm lint
git add src/components/self-tracking __tests__/components/self-tracking
git commit -m "feat(self-tracking): wire saveAsTemplate UI for workout + nutrition"
```

---

## Stage 11 — Sidebar navigation

### Task 11.1: Update `app-shell.tsx` NAV

**Files:**
- Modify: `src/components/shared/app-shell.tsx`

- [ ] **Step 11.1.1: Edit owner PERSONAL group + add trainer PERSONAL group**

在 `NAV.owner` 的 PERSONAL group 中（当前只有 Body Tests），改成：

```ts
    {
      group: 'PERSONAL',
      items: [
        { href: '/owner/my-training', label: 'My Training' },
        { href: '/owner/my-nutrition', label: 'My Nutrition' },
        { href: '/owner/my-body-tests', label: 'Body Tests' },
      ],
    },
```

在 `NAV.trainer` 现有 ACCOUNT group **之前**插入：

```ts
    {
      group: 'PERSONAL',
      items: [
        { href: '/trainer/my-training', label: 'My Training' },
        { href: '/trainer/my-nutrition', label: 'My Nutrition' },
      ],
    },
```

- [ ] **Step 11.1.2: Lint + commit**

```bash
pnpm lint
git add src/components/shared/app-shell.tsx
git commit -m "feat(self-tracking): add PERSONAL nav entries for owner + trainer"
```

---

## Stage 12 — E2E tests + smoke pass

### Task 12.1: `member-no-access.spec.ts`

**Files:**
- Create: `e2e/self-tracking/member-no-access.spec.ts`

- [ ] **Step 12.1.1: Implement**

```ts
// e2e/self-tracking/member-no-access.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth'; // existing helper — confirm path before writing

test.describe('member has no self-tracking access', () => {
  test('API returns 403', async ({ page, request }) => {
    await loginAs(page, 'member');
    const res = await request.get('/api/me/workout-logs?year=2026&month=5');
    expect(res.status()).toBe(403);
  });

  test('sidebar does not show My Training / My Nutrition', async ({ page }) => {
    await loginAs(page, 'member');
    await page.goto('/member/plan');
    await expect(page.getByRole('link', { name: 'My Training' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'My Nutrition' })).toHaveCount(0);
  });
});
```

> **执行者注**：项目已有 `loginAs` 类 helper。先 grep `e2e/` 确认它的真实导出名 / 路径再写：

```bash
grep -rn "export function loginAs\|export const loginAs" e2e 2>/dev/null
```

如果不存在，看 `e2e/` 下任意一个现有 spec 学其登录方式（如 storage state 注入）。

- [ ] **Step 12.1.2: Run**

```bash
pnpm test:e2e -- --grep "member has no self-tracking"
```
Expected: PASS（dev server 已启动，或 Playwright 配置自起）。

- [ ] **Step 12.1.3: Commit**

```bash
git add e2e/self-tracking/member-no-access.spec.ts
git commit -m "test(self-tracking): e2e member has no access"
```

---

### Task 12.2: `trainer-freestyle-workout.spec.ts`

**Files:**
- Create: `e2e/self-tracking/trainer-freestyle-workout.spec.ts`

- [ ] **Step 12.2.1: Implement**

```ts
// e2e/self-tracking/trainer-freestyle-workout.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('trainer freestyle workout flows through calendar', async ({ page }) => {
  await loginAs(page, 'trainer');
  await page.goto('/trainer/my-training');

  await page.getByRole('button', { name: 'Freestyle' }).click();

  // Wait for navigation to /session/[id]
  await page.waitForURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);

  // Add an exercise (assumes ExerciseLibraryPicker behavior)
  await page.getByRole('button', { name: '+ Add Exercise' }).click();
  await page.getByText('Bench Press').first().click(); // adjust if seed data differs

  // Fill weight + reps for the first set, blur to PATCH
  const weightInput = page.locator('input[placeholder="kg"]').first();
  await weightInput.fill('80');
  const repsInput = page.locator('input[placeholder="reps"]').first();
  await repsInput.fill('5');
  await repsInput.blur();

  // Finish
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('button', { name: /Finish workout/i }).click();

  // Should land on calendar; today's circle should be filled
  await page.waitForURL(/\/trainer\/my-training\/calendar/);
  const today = new Date().getDate();
  await expect(page.getByRole('button', { name: String(today) })).toBeVisible();
});
```

> **执行者注**：种子数据可能没有 `Bench Press`。在写测试前 grep `e2e/fixtures` 看现有 seed exercises 的名字。

- [ ] **Step 12.2.2: Run + commit**

```bash
pnpm test:e2e -- --grep "freestyle workout"
git add e2e/self-tracking/trainer-freestyle-workout.spec.ts
git commit -m "test(self-tracking): e2e trainer freestyle workout"
```

---

### Task 12.3: `trainer-template-workout.spec.ts` (saveAsTemplate)

**Files:**
- Create: `e2e/self-tracking/trainer-template-workout.spec.ts`

- [ ] **Step 12.3.1: Implement**

```ts
// e2e/self-tracking/trainer-template-workout.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('trainer can pick a template, finish workout, save as new template', async ({ page }) => {
  await loginAs(page, 'trainer');
  await page.goto('/trainer/my-training');
  await page.getByRole('button', { name: 'From Template' }).click();

  // Pick the first template, then the first day
  await page.getByRole('button', { name: /.+/ }).first().click();
  await page.getByRole('button', { name: /Day 1/i }).click();

  await page.waitForURL(/\/trainer\/my-training\/session\/[a-f0-9]+/);

  // Finish with saveAsTemplate
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('checkbox').check();
  await page.getByPlaceholder(/template name/i).fill('My Push Template — E2E');
  await page.getByRole('button', { name: /Finish workout/i }).click();

  // Verify template appears on /trainer/plans
  await page.goto('/trainer/plans');
  await expect(page.getByText('My Push Template — E2E')).toBeVisible();
});
```

- [ ] **Step 12.3.2: Run + commit**

```bash
pnpm test:e2e -- --grep "template workout"
git add e2e/self-tracking/trainer-template-workout.spec.ts
git commit -m "test(self-tracking): e2e template workout with saveAsTemplate"
```

---

### Task 12.4: `owner-nutrition-day.spec.ts`

**Files:**
- Create: `e2e/self-tracking/owner-nutrition-day.spec.ts`

- [ ] **Step 12.4.1: Implement**

```ts
// e2e/self-tracking/owner-nutrition-day.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

test('owner can log nutrition and save as template', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/owner/my-nutrition');

  // Add a food item to Breakfast
  const breakfast = page.locator('text=Breakfast').first().locator('..');
  await breakfast.getByRole('button', { name: /add/i }).click();
  await page.getByPlaceholder(/search/i).fill('Egg');
  await page.getByText('Egg').first().click();

  // Save as template
  await page.getByRole('checkbox').check();
  await page.getByPlaceholder(/template name/i).fill('My Diet — E2E');
  await page.getByRole('button', { name: /save as template/i }).click();

  await page.goto('/owner/nutrition-templates');
  await expect(page.getByText('My Diet — E2E')).toBeVisible();
});
```

- [ ] **Step 12.4.2: Run + commit**

```bash
pnpm test:e2e -- --grep "owner can log nutrition"
git add e2e/self-tracking/owner-nutrition-day.spec.ts
git commit -m "test(self-tracking): e2e owner nutrition day with saveAsTemplate"
```

---

### Task 12.5: Final smoke pass

- [ ] **Step 12.5.1: Run full test suite**

```bash
pnpm test
pnpm lint
pnpm build
```
Expected: all tests pass, 0 lint warnings, build succeeds.

- [ ] **Step 12.5.2: Run `/simplify`**

如果有任何 git diff 残留，跑 `/simplify` agent 让它检查 reuse / quality / efficiency 三项。把它发现的问题修掉再 commit。

- [ ] **Step 12.5.3: Update INDEX.md**

把 design doc 状态从 `Draft` 改为 `Approved`：

```bash
sed -i '' 's|Owner/Trainer Self-Tracking | Draft|Owner/Trainer Self-Tracking | Approved|' docs/INDEX.md
```

（macOS BSD sed — 如失败用 Edit tool 手动改。）

- [ ] **Step 12.5.4: Final commit + delete plan file**

```bash
rm docs/2026-05-08/plans/self-tracking-implementation-plan.md
# 也从 INDEX 移除该行（implementation plan 完成后按 CLAUDE.md 规范删除）
git add -A
git commit -m "chore(self-tracking): mark feature complete; remove implementation plan"
```

---

## Self-review checklist (跑过这个 plan 后，对照 spec 检查)

| Spec 段 | 对应 task |
|---|---|
| 数据模型 — SelfWorkoutLog | Task 1.1 |
| 数据模型 — SelfNutritionLog | Task 1.2 |
| Repository — SelfWorkout | Task 2.1 |
| Repository — SelfNutrition | Task 3.1 |
| Auth helper / 角色限制 | Task 4.1 |
| API — workout POST/GET | Task 5.1 |
| API — workout active / id GET / DELETE | Task 5.2 |
| API — workout sets POST / PATCH | Task 5.3 |
| API — workout complete | Task 5.4 (+ 10.2 for saveAsTemplate) |
| API — nutrition GET 月 | Task 6.1 |
| API — nutrition date GET / PUT / DELETE | Task 6.2 (+ 10.3 for saveAsTemplate) |
| UI — start card | Task 7.1 |
| UI — template/day picker | Task 7.2 |
| UI — workout session | Task 7.3 |
| UI — complete dialog | Task 7.4 (+ 10.4 for saveAsTemplate) |
| UI — workout pages | Task 7.5 |
| UI — workout calendar | Tasks 8.1–8.2 |
| UI — nutrition day view | Task 9.1 |
| UI — nutrition calendar | Tasks 9.2–9.3 |
| Snapshot helper | Task 10.1 |
| Save-as-template checkbox | Task 10.4 |
| Sidebar nav | Task 11.1 |
| E2E — member 无访问 | Task 12.1 |
| E2E — freestyle workout | Task 12.2 |
| E2E — template workout + save | Task 12.3 |
| E2E — nutrition + save | Task 12.4 |






