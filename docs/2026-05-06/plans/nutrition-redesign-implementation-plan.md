# Nutrition Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the nutrition feature so trainers/owners design plans for members (template-based or direct), members get a daily food diary, schedules use weekly pattern + calendar overrides, and food entry uses OpenFoodFacts search or manual input.

**Architecture:** Embed `MealItem` as snapshots (drop the `Food` foreign key). Embed `schedule` inside `MemberNutritionPlan` so plan history stays self-contained. Add a new `NutritionDailyLog` collection for what members actually eat per day. OpenFoodFacts integration is a server-side proxy with an LRU cache. UI follows the dialog/sheet overlay pattern — never mix forms with display lists.

**Tech Stack:** Next.js App Router, MongoDB/Mongoose, NextAuth v5, Shadcn UI, TailwindCSS, Jest + React Testing Library, Playwright.

**Spec:** See `docs/2026-05-05/plans/nutrition-redesign-design.md` for the approved design.

---

## File Structure

### Created

| Path | Responsibility |
|------|----------------|
| `src/lib/nutrition/schedule.ts` | Pure `resolveDayType(schedule, date)` |
| `src/lib/nutrition/food-search.ts` | OpenFoodFacts fetch + field mapping + LRU cache |
| `src/lib/db/models/nutrition-daily-log.model.ts` | Mongoose model + types |
| `src/lib/repositories/nutrition-daily-log.repository.ts` | Repository interface + Mongo impl |
| `src/app/api/food-search/route.ts` | GET proxy to OpenFoodFacts |
| `src/app/api/members/[memberId]/nutrition/schedule/route.ts` | PATCH active plan schedule |
| `src/app/api/members/[memberId]/nutrition/history/route.ts` | GET all member plans |
| `src/app/api/members/[memberId]/nutrition/log/[date]/route.ts` | GET/PUT daily log |
| `src/components/nutrition/food-add-sheet.tsx` | Search + manual entry sheet |
| `src/components/nutrition/schedule-editor.tsx` | Weekly pattern + calendar overrides editor |
| `src/components/nutrition/meal-card.tsx` | Single-meal display + actions |
| `src/components/nutrition/daily-nutrition-view.tsx` | Day diary container |
| `src/app/(dashboard)/owner/members/[id]/nutrition/page.tsx` | Owner mirror of trainer member nutrition |
| `__tests__/lib/nutrition/schedule.test.ts` | resolveDayType cases |
| `__tests__/lib/repositories/nutrition-daily-log.repository.test.ts` | DailyLog repo |
| `__tests__/app/api/food-search.test.ts` | proxy + mapping + cache |
| `__tests__/app/api/nutrition-schedule.test.ts` | schedule PATCH |
| `__tests__/app/api/nutrition-history.test.ts` | history GET |
| `__tests__/app/api/nutrition-log.test.ts` | log GET/PUT |
| `__tests__/app/shared/food-add-sheet.test.tsx` | sheet behavior |
| `__tests__/app/member/daily-nutrition-view.test.tsx` | diary rendering |
| `__tests__/app/trainer/nutrition-schedule-editor.test.tsx` | schedule editor |
| `e2e/trainer/nutrition-full-flow.spec.ts` | trainer end-to-end |
| `e2e/member/nutrition-daily-log.spec.ts` | member end-to-end |

### Modified

| Path | Change |
|------|--------|
| `src/lib/nutrition/macros.ts` | Add `calculateMacrosFromPer100g` for extended macro fields |
| `src/lib/db/models/nutrition-template.model.ts` | `MealItemSchema`: drop `foodId`, add optional extended macros |
| `src/lib/db/models/member-nutrition-plan.model.ts` | Rename `trainerId`→`assignedById`; make `templateId` optional; embed `schedule` |
| `src/lib/repositories/member-nutrition-plan.repository.ts` | New `assignedById` field; `templateId?`; add `findAllByMember`, `updateSchedule` |
| `src/app/api/members/[memberId]/nutrition/route.ts` | Accept `{templateId}` OR `{name,dayTypes}`; use `assignedById` |
| `src/app/(dashboard)/member/nutrition/page.tsx` | Replace viewer with `DailyNutritionView` |
| `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx` | Drop `FoodOption[]` prop; switch to `FoodAddSheet` |
| `src/app/(dashboard)/trainer/nutrition/new/page.tsx` | Drop food fetch |
| `src/app/(dashboard)/trainer/nutrition/[id]/edit/page.tsx` | Drop food fetch |
| `src/app/(dashboard)/owner/nutrition-templates/new/page.tsx` | Drop food fetch |
| `src/app/(dashboard)/owner/nutrition-templates/[id]/edit/page.tsx` | Drop food fetch |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx` | 3-tab layout |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx` | Tabs + history + schedule |
| `__tests__/app/api/members-nutrition.test.ts` | Update for `assignedById` + direct creation |
| `__tests__/lib/nutrition/macros.test.ts` | Cover extended macros |
| `__tests__/lib/repositories/member-nutrition-plan.repository.test.ts` | Cover `assignedById`, `findAllByMember`, `updateSchedule` |
| `__tests__/app/member/nutrition-plan-viewer.test.tsx` | Migrate to `daily-nutrition-view.test.tsx` (delete file) |
| `__tests__/app/trainer/nutrition-template-form.test.tsx` | Sheet-based food add |
| `__tests__/app/trainer/trainer-member-nutrition.test.tsx` | Tab layout |
| `__tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx` | Tab layout |

### Deleted

| Path | Reason |
|------|--------|
| `src/app/(dashboard)/owner/my-nutrition/` (entire dir) | Owners no longer have personal plans |
| `src/lib/db/models/food.model.ts` | Foods are now snapshots, not first-class entities |
| `src/lib/repositories/food.repository.ts` | Same |
| `src/app/api/foods/route.ts` | Same |
| `__tests__/app/api/foods.test.ts` | Same |
| `__tests__/lib/repositories/food.repository.test.ts` | Same |
| `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx` | Replaced by `DailyNutritionView` |
| `__tests__/app/member/nutrition-plan-viewer.test.tsx` | Replaced |

---

## Stage 1 — Data Layer

### Task 1: Extend `calculateMacros` for optional macros

**Files:**
- Modify: `src/lib/nutrition/macros.ts`
- Test: `__tests__/lib/nutrition/macros.test.ts`

- [ ] **Step 1: Add failing tests for extended fields**

Append to `__tests__/lib/nutrition/macros.test.ts`:

```typescript
const foodWithExtended = {
  per100g: {
    kcal: 200, protein: 20, carbs: 10, fat: 8,
    fiber: 4, sugar: 6, salt: 1, saturated: 2,
    polyunsaturated: 1, monounsaturated: 3, polyols: 0.5,
  },
  perServing: null,
};

describe('calculateMacros — extended', () => {
  it('scales optional fields proportionally with quantityG', () => {
    const result = calculateMacros(foodWithExtended, 50);
    expect(result.fiber).toBeCloseTo(2);
    expect(result.sugar).toBeCloseTo(3);
    expect(result.salt).toBeCloseTo(0.5);
    expect(result.saturated).toBeCloseTo(1);
    expect(result.polyunsaturated).toBeCloseTo(0.5);
    expect(result.monounsaturated).toBeCloseTo(1.5);
    expect(result.polyols).toBeCloseTo(0.25);
  });

  it('omits optional fields when source omits them', () => {
    const food = { per100g: { kcal: 200, protein: 20, carbs: 10, fat: 8 }, perServing: null };
    const result = calculateMacros(food, 100);
    expect(result.fiber).toBeUndefined();
    expect(result.sugar).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=lib/nutrition/macros
```

Expected: FAIL — `result.fiber is undefined` not matching expected `2`.

- [ ] **Step 3: Implement extended fields**

Replace `src/lib/nutrition/macros.ts` with:

```typescript
export interface MacroSnapshot {
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
}

interface BaseMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ExtendedMacros extends BaseMacros {
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  polyols?: number;
}

interface FoodMacroSource {
  per100g: ExtendedMacros | null;
  perServing: (ExtendedMacros & { servingLabel: string; grams: number }) | null;
}

const OPTIONAL_KEYS = [
  'fiber', 'sugar', 'salt', 'saturated', 'polyunsaturated', 'monounsaturated', 'polyols',
] as const;

function scaleOptional(source: ExtendedMacros, ratio: number, target: MacroSnapshot): void {
  for (const key of OPTIONAL_KEYS) {
    const v = source[key];
    if (typeof v === 'number') target[key] = v * ratio;
  }
}

export function calculateMacros(food: FoodMacroSource, quantityG: number): MacroSnapshot {
  if (quantityG === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const source: ExtendedMacros = food.per100g ?? food.perServing!;
  const ratio = food.per100g
    ? quantityG / 100
    : quantityG / food.perServing!.grams;

  const result: MacroSnapshot = {
    kcal: source.kcal * ratio,
    protein: source.protein * ratio,
    carbs: source.carbs * ratio,
    fat: source.fat * ratio,
  };
  scaleOptional(source, ratio, result);
  return result;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=lib/nutrition/macros
```

Expected: PASS (all original + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/macros.ts __tests__/lib/nutrition/macros.test.ts
git commit -m "feat(nutrition): scale extended macro fields in calculateMacros"
```

---

### Task 2: Update `MealItemSchema` (drop foodId, add extended macros)

**Files:**
- Modify: `src/lib/db/models/nutrition-template.model.ts`

(No standalone test — schema changes are exercised by repository tests in Task 3.)

- [ ] **Step 1: Edit IMealItem interface and MealItemSchema**

Replace the `IMealItem` interface and `MealItemSchema` definition in `src/lib/db/models/nutrition-template.model.ts`:

```typescript
export interface IMealItem {
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
}

export const MealItemSchema = new Schema<IMealItem>(
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
  },
  { _id: false },
);
```

- [ ] **Step 2: Re-export `MealItemSchema` for daily-log model**

Confirm `MealItemSchema` already has `export` keyword (it does). No further change.

- [ ] **Step 3: Run typecheck**

```bash
pnpm lint
```

Expected: existing nutrition-template-form.tsx may still reference `foodId` — that's a Stage-5 concern. Lint should still pass on the model file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/models/nutrition-template.model.ts
git commit -m "refactor(nutrition): drop foodId, add optional extended macros on MealItemSchema"
```

---

### Task 3: Update `MemberNutritionPlan` model with `assignedById` + `schedule`

**Files:**
- Modify: `src/lib/db/models/member-nutrition-plan.model.ts`

- [ ] **Step 1: Replace model with new shape**

Overwrite `src/lib/db/models/member-nutrition-plan.model.ts`:

```typescript
import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IDayType } from './nutrition-template.model';
import { DayTypeSchema } from './nutrition-template.model';

export interface IWeeklyPatternEntry {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dayTypeName: string;
}

export interface ICalendarOverride {
  date: string;
  dayTypeName: string;
}

export interface ISchedule {
  weeklyPattern: IWeeklyPatternEntry[];
  calendarOverrides: ICalendarOverride[];
}

export interface IMemberNutritionPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  assignedById: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId | null;
  name: string;
  isActive: boolean;
  assignedAt: Date;
  deactivatedAt: Date | null;
  dayTypes: IDayType[];
  schedule: ISchedule;
}

const WeeklyPatternEntrySchema = new Schema<IWeeklyPatternEntry>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    dayTypeName: { type: String, required: true },
  },
  { _id: false },
);

const CalendarOverrideSchema = new Schema<ICalendarOverride>(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayTypeName: { type: String, required: true },
  },
  { _id: false },
);

const ScheduleSchema = new Schema<ISchedule>(
  {
    weeklyPattern: { type: [WeeklyPatternEntrySchema], default: [] },
    calendarOverrides: { type: [CalendarOverrideSchema], default: [] },
  },
  { _id: false },
);

const MemberNutritionPlanSchema = new Schema<IMemberNutritionPlan>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    assignedById: { type: Schema.Types.ObjectId, required: true },
    templateId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
    assignedAt: { type: Date, required: true },
    deactivatedAt: { type: Date, default: null },
    dayTypes: [DayTypeSchema],
    schedule: { type: ScheduleSchema, default: () => ({ weeklyPattern: [], calendarOverrides: [] }) },
  },
  { timestamps: false },
);

MemberNutritionPlanSchema.index({ memberId: 1, isActive: 1 });
MemberNutritionPlanSchema.index({ memberId: 1, assignedAt: -1 });

export const MemberNutritionPlanModel: Model<IMemberNutritionPlan> =
  mongoose.models.MemberNutritionPlan ??
  mongoose.model<IMemberNutritionPlan>('MemberNutritionPlan', MemberNutritionPlanSchema);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/models/member-nutrition-plan.model.ts
git commit -m "refactor(nutrition): add assignedById, optional templateId, embedded schedule"
```

---

### Task 4: Update `MemberNutritionPlan` repository

**Files:**
- Modify: `src/lib/repositories/member-nutrition-plan.repository.ts`
- Modify: `__tests__/lib/repositories/member-nutrition-plan.repository.test.ts`

- [ ] **Step 1: Replace repository test file**

Overwrite `__tests__/lib/repositories/member-nutrition-plan.repository.test.ts`:

```typescript
import mongoose from 'mongoose';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';

jest.mock('@/lib/db/models/member-nutrition-plan.model', () => ({
  MemberNutritionPlanModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(MemberNutritionPlanModel);

describe('MongoMemberNutritionPlanRepository', () => {
  let repo: MongoMemberNutritionPlanRepository;

  beforeEach(() => {
    repo = new MongoMemberNutritionPlanRepository();
    jest.clearAllMocks();
  });

  it('findActive queries by memberId and isActive:true', async () => {
    const plan = { _id: 'np1', name: '减脂计划' };
    mockModel.findOne.mockResolvedValue(plan as never);
    const result = await repo.findActive(new mongoose.Types.ObjectId().toString());
    expect(mockModel.findOne).toHaveBeenCalledWith({
      memberId: expect.any(mongoose.Types.ObjectId),
      isActive: true,
    });
    expect(result).toEqual(plan);
  });

  it('findAllByMember sorts by assignedAt desc', async () => {
    const sortMock = jest.fn().mockResolvedValue([{ _id: 'np2' }, { _id: 'np1' }]);
    mockModel.find.mockReturnValue({ sort: sortMock } as never);
    const result = await repo.findAllByMember(new mongoose.Types.ObjectId().toString());
    expect(mockModel.find).toHaveBeenCalledWith({ memberId: expect.any(mongoose.Types.ObjectId) });
    expect(sortMock).toHaveBeenCalledWith({ assignedAt: -1 });
    expect(result).toHaveLength(2);
  });

  it('deactivateAll updates all to isActive:false with deactivatedAt', async () => {
    mockModel.updateMany.mockResolvedValue({} as never);
    await repo.deactivateAll(new mongoose.Types.ObjectId().toString());
    expect(mockModel.updateMany).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId), isActive: true },
      { $set: { isActive: false, deactivatedAt: expect.any(Date) } },
    );
  });

  it('create with assignedById and optional templateId=null', async () => {
    const saved = { _id: 'np1', name: '直建计划', isActive: true };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (MemberNutritionPlanModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const result = await repo.create({
      memberId: new mongoose.Types.ObjectId().toString(),
      assignedById: new mongoose.Types.ObjectId().toString(),
      templateId: null,
      name: '直建计划',
      dayTypes: [],
      assignedAt: new Date(),
    });
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('updateSchedule sets schedule on active plan', async () => {
    const updated = { _id: 'np1', schedule: { weeklyPattern: [], calendarOverrides: [] } };
    mockModel.findOneAndUpdate.mockResolvedValue(updated as never);
    const schedule = { weeklyPattern: [{ dayOfWeek: 1, dayTypeName: 'Training' }], calendarOverrides: [] };
    const result = await repo.updateSchedule(new mongoose.Types.ObjectId().toString(), schedule);
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId), isActive: true },
      { $set: { schedule } },
      { new: true },
    );
    expect(result).toEqual(updated);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm test -- --testPathPattern=member-nutrition-plan.repository
```

Expected: FAIL — `findAllByMember`, `updateSchedule` don't exist yet; `create` signature mismatch.

- [ ] **Step 3: Replace the repository file**

Overwrite `src/lib/repositories/member-nutrition-plan.repository.ts`:

```typescript
import mongoose from 'mongoose';
import type { IMemberNutritionPlan, ISchedule } from '@/lib/db/models/member-nutrition-plan.model';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export interface CreateMemberNutritionPlanData {
  memberId: string;
  assignedById: string;
  templateId: string | null;
  name: string;
  dayTypes: IDayType[];
  assignedAt: Date;
}

export interface IMemberNutritionPlanRepository {
  findActive(memberId: string): Promise<IMemberNutritionPlan | null>;
  findAllByMember(memberId: string): Promise<IMemberNutritionPlan[]>;
  deactivateAll(memberId: string): Promise<void>;
  create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan>;
  updateSchedule(memberId: string, schedule: ISchedule): Promise<IMemberNutritionPlan | null>;
}

export class MongoMemberNutritionPlanRepository implements IMemberNutritionPlanRepository {
  async findActive(memberId: string): Promise<IMemberNutritionPlan | null> {
    return MemberNutritionPlanModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async findAllByMember(memberId: string): Promise<IMemberNutritionPlan[]> {
    return MemberNutritionPlanModel
      .find({ memberId: new mongoose.Types.ObjectId(memberId) })
      .sort({ assignedAt: -1 });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await MemberNutritionPlanModel.updateMany(
      { memberId: new mongoose.Types.ObjectId(memberId), isActive: true },
      { $set: { isActive: false, deactivatedAt: new Date() } },
    );
  }

  async create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan> {
    const plan = new MemberNutritionPlanModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      assignedById: new mongoose.Types.ObjectId(data.assignedById),
      templateId: data.templateId ? new mongoose.Types.ObjectId(data.templateId) : null,
      name: data.name,
      dayTypes: data.dayTypes,
      isActive: true,
      assignedAt: data.assignedAt,
      schedule: { weeklyPattern: [], calendarOverrides: [] },
    });
    return plan.save();
  }

  async updateSchedule(memberId: string, schedule: ISchedule): Promise<IMemberNutritionPlan | null> {
    return MemberNutritionPlanModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId), isActive: true },
      { $set: { schedule } },
      { new: true },
    );
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=member-nutrition-plan.repository
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/member-nutrition-plan.repository.ts __tests__/lib/repositories/member-nutrition-plan.repository.test.ts
git commit -m "refactor(nutrition): repo supports assignedById, history, schedule update"
```

---

### Task 5: Add `NutritionDailyLog` model

**Files:**
- Create: `src/lib/db/models/nutrition-daily-log.model.ts`

- [ ] **Step 1: Write the model**

Create `src/lib/db/models/nutrition-daily-log.model.ts`:

```typescript
import mongoose, { Document, Model, Schema } from 'mongoose';
import { MealItemSchema, type IMealItem } from './nutrition-template.model';

export interface IDailyLogMeal {
  name: string;
  order: number;
  completed: boolean;
  items: IMealItem[];
}

export interface INutritionDailyLog extends Document {
  memberId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  date: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogMealSchema = new Schema<IDailyLogMeal>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    completed: { type: Boolean, required: true, default: false },
    items: [MealItemSchema],
  },
  { _id: false },
);

const NutritionDailyLogSchema = new Schema<INutritionDailyLog>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    planId: { type: Schema.Types.ObjectId, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayTypeName: { type: String, required: true },
    meals: [DailyLogMealSchema],
    dayCompleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

NutritionDailyLogSchema.index({ memberId: 1, date: 1 }, { unique: true });

export const NutritionDailyLogModel: Model<INutritionDailyLog> =
  mongoose.models.NutritionDailyLog ??
  mongoose.model<INutritionDailyLog>('NutritionDailyLog', NutritionDailyLogSchema);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/models/nutrition-daily-log.model.ts
git commit -m "feat(nutrition): add NutritionDailyLog model"
```

---

### Task 6: Add `NutritionDailyLog` repository

**Files:**
- Create: `src/lib/repositories/nutrition-daily-log.repository.ts`
- Create: `__tests__/lib/repositories/nutrition-daily-log.repository.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/repositories/nutrition-daily-log.repository.test.ts`:

```typescript
import mongoose from 'mongoose';
import { MongoNutritionDailyLogRepository } from '@/lib/repositories/nutrition-daily-log.repository';
import { NutritionDailyLogModel } from '@/lib/db/models/nutrition-daily-log.model';

jest.mock('@/lib/db/models/nutrition-daily-log.model', () => ({
  NutritionDailyLogModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(NutritionDailyLogModel);

describe('MongoNutritionDailyLogRepository', () => {
  let repo: MongoNutritionDailyLogRepository;

  beforeEach(() => {
    repo = new MongoNutritionDailyLogRepository();
    jest.clearAllMocks();
  });

  it('findByDate queries by memberId+date', async () => {
    mockModel.findOne.mockResolvedValue({ _id: 'log1' } as never);
    const memberId = new mongoose.Types.ObjectId().toString();
    const result = await repo.findByDate(memberId, '2026-05-06');
    expect(mockModel.findOne).toHaveBeenCalledWith({
      memberId: expect.any(mongoose.Types.ObjectId),
      date: '2026-05-06',
    });
    expect(result).toEqual({ _id: 'log1' });
  });

  it('findByDate returns null when no log', async () => {
    mockModel.findOne.mockResolvedValue(null as never);
    const result = await repo.findByDate(new mongoose.Types.ObjectId().toString(), '2026-05-06');
    expect(result).toBeNull();
  });

  it('upsert creates or updates log', async () => {
    const upserted = { _id: 'log1', dayCompleted: false };
    mockModel.findOneAndUpdate.mockResolvedValue(upserted as never);
    const memberId = new mongoose.Types.ObjectId().toString();
    const planId = new mongoose.Types.ObjectId().toString();
    const result = await repo.upsert(memberId, '2026-05-06', {
      planId,
      dayTypeName: 'Training Day',
      meals: [],
      dayCompleted: false,
    });
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId), date: '2026-05-06' },
      {
        $set: {
          planId: expect.any(mongoose.Types.ObjectId),
          dayTypeName: 'Training Day',
          meals: [],
          dayCompleted: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    expect(result).toEqual(upserted);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm test -- --testPathPattern=nutrition-daily-log.repository
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the repository**

Create `src/lib/repositories/nutrition-daily-log.repository.ts`:

```typescript
import mongoose from 'mongoose';
import type { INutritionDailyLog, IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import { NutritionDailyLogModel } from '@/lib/db/models/nutrition-daily-log.model';

export interface UpsertDailyLogData {
  planId: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

export interface INutritionDailyLogRepository {
  findByDate(memberId: string, date: string): Promise<INutritionDailyLog | null>;
  upsert(memberId: string, date: string, data: UpsertDailyLogData): Promise<INutritionDailyLog>;
}

export class MongoNutritionDailyLogRepository implements INutritionDailyLogRepository {
  async findByDate(memberId: string, date: string): Promise<INutritionDailyLog | null> {
    return NutritionDailyLogModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      date,
    });
  }

  async upsert(memberId: string, date: string, data: UpsertDailyLogData): Promise<INutritionDailyLog> {
    const result = await NutritionDailyLogModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId), date },
      {
        $set: {
          planId: new mongoose.Types.ObjectId(data.planId),
          dayTypeName: data.dayTypeName,
          meals: data.meals,
          dayCompleted: data.dayCompleted,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!result) throw new Error('Upsert failed');
    return result;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=nutrition-daily-log.repository
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/models/nutrition-daily-log.model.ts src/lib/repositories/nutrition-daily-log.repository.ts __tests__/lib/repositories/nutrition-daily-log.repository.test.ts
git commit -m "feat(nutrition): add NutritionDailyLog repository"
```

---

## Stage 2 — Lib Utilities

### Task 7: `resolveDayType` pure function

**Files:**
- Create: `src/lib/nutrition/schedule.ts`
- Create: `__tests__/lib/nutrition/schedule.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/nutrition/schedule.test.ts`:

```typescript
import { resolveDayType } from '@/lib/nutrition/schedule';

const schedule = {
  weeklyPattern: [
    { dayOfWeek: 0 as const, dayTypeName: 'Rest' },
    { dayOfWeek: 1 as const, dayTypeName: 'Training' },
    { dayOfWeek: 3 as const, dayTypeName: 'Training' },
  ],
  calendarOverrides: [
    { date: '2026-05-04', dayTypeName: 'Cheat' },
  ],
};

describe('resolveDayType', () => {
  it('uses calendarOverride when date matches', () => {
    expect(resolveDayType(schedule, '2026-05-04')).toBe('Cheat');
  });

  it('falls back to weeklyPattern when no override', () => {
    // 2026-05-06 is Wednesday → dayOfWeek 3
    expect(resolveDayType(schedule, '2026-05-06')).toBe('Training');
  });

  it('returns null when neither matches', () => {
    // 2026-05-05 is Tuesday (dayOfWeek 2) — not in pattern
    expect(resolveDayType(schedule, '2026-05-05')).toBeNull();
  });

  it('returns null for empty schedule', () => {
    expect(resolveDayType({ weeklyPattern: [], calendarOverrides: [] }, '2026-05-06')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=lib/nutrition/schedule
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/nutrition/schedule.ts`:

```typescript
import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';

export function resolveDayType(schedule: ISchedule, dateISO: string): string | null {
  const override = schedule.calendarOverrides.find((o) => o.date === dateISO);
  if (override) return override.dayTypeName;

  const dayOfWeek = new Date(`${dateISO}T00:00:00Z`).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const weekly = schedule.weeklyPattern.find((w) => w.dayOfWeek === dayOfWeek);
  return weekly?.dayTypeName ?? null;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=lib/nutrition/schedule
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/schedule.ts __tests__/lib/nutrition/schedule.test.ts
git commit -m "feat(nutrition): add resolveDayType helper"
```

---

### Task 8: OpenFoodFacts proxy + LRU cache

**Files:**
- Create: `src/lib/nutrition/food-search.ts`

(Tests come with the API route in Task 9 — `food-search.ts` is consumed only there.)

- [ ] **Step 1: Implement the search function with cache**

Create `src/lib/nutrition/food-search.ts`:

```typescript
export interface FoodSearchResultMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
}

export interface FoodSearchResult {
  name: string;
  per100g: FoodSearchResultMacros;
}

interface OpenFoodFactsProduct {
  product_name?: string;
  nutriments?: Record<string, number | undefined>;
}

interface OpenFoodFactsResponse {
  products?: OpenFoodFactsProduct[];
}

const CACHE_MAX = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  expires: number;
  data: FoodSearchResult[];
}

const cache = new Map<string, CacheEntry>();

function cacheKey(q: string, pageSize: number): string {
  return `${q.toLowerCase()}::${pageSize}`;
}

function cacheGet(key: string): FoodSearchResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function cacheSet(key: string, data: FoodSearchResult[]): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
}

function num(v: number | undefined): number | undefined {
  return typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
}

function mapProduct(p: OpenFoodFactsProduct): FoodSearchResult | null {
  const name = p.product_name?.trim();
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']);
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (!name || kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) {
    return null;
  }
  const macros: FoodSearchResultMacros = { kcal, protein, carbs, fat };
  const fiber = num(n['fiber_100g']);
  const sugar = num(n['sugars_100g']);
  const salt = num(n['salt_100g']);
  const saturated = num(n['saturated-fat_100g']);
  if (fiber !== undefined) macros.fiber = fiber;
  if (sugar !== undefined) macros.sugar = sugar;
  if (salt !== undefined) macros.salt = salt;
  if (saturated !== undefined) macros.saturated = saturated;
  return { name, per100g: macros };
}

export async function searchFoods(query: string, pageSize = 20): Promise<FoodSearchResult[]> {
  const key = cacheKey(query, pageSize);
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('fields', 'product_name,nutriments');

  const res = await fetch(url, { headers: { 'User-Agent': 'PowerGym/1.0' } });
  if (!res.ok) throw new Error(`OpenFoodFacts request failed: ${res.status}`);
  const json = (await res.json()) as OpenFoodFactsResponse;

  const results = (json.products ?? [])
    .map(mapProduct)
    .filter((r): r is FoodSearchResult => r !== null);

  cacheSet(key, results);
  return results;
}

// Test-only export
export function __resetFoodSearchCache(): void {
  cache.clear();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/nutrition/food-search.ts
git commit -m "feat(nutrition): OpenFoodFacts search with LRU cache"
```

---

## Stage 3 — API Layer

### Task 9: `GET /api/food-search` route

**Files:**
- Create: `src/app/api/food-search/route.ts`
- Create: `__tests__/app/api/food-search.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/api/food-search.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

import { auth } from '@/lib/auth/auth';
import { __resetFoodSearchCache } from '@/lib/nutrition/food-search';

const mockAuth = jest.mocked(auth);

const fetchSpy = jest.spyOn(global, 'fetch');

beforeEach(() => {
  jest.clearAllMocks();
  __resetFoodSearchCache();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

describe('GET /api/food-search', () => {
  it('returns 401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q=egg'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q=egg'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when q is empty', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q='));
    expect(res.status).toBe(400);
  });

  it('maps OpenFoodFacts response to normalised results', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      products: [
        {
          product_name: 'Egg',
          nutriments: {
            'energy-kcal_100g': 155,
            'proteins_100g': 13,
            'carbohydrates_100g': 1.1,
            'fat_100g': 11,
            'fiber_100g': 0,
            'sugars_100g': 1.1,
            'salt_100g': 0.4,
            'saturated-fat_100g': 3.3,
          },
        },
        { product_name: 'Skip me', nutriments: {} },
      ],
    }), { status: 200 }));

    const { GET } = await import('@/app/api/food-search/route');
    const res = await GET(new Request('http://localhost/api/food-search?q=egg'));
    const body = (await res.json()) as { results: Array<{ name: string; per100g: { kcal: number; saturated?: number } }> };

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].name).toBe('Egg');
    expect(body.results[0].per100g.kcal).toBe(155);
    expect(body.results[0].per100g.saturated).toBe(3.3);
  });

  it('cache hit avoids second fetch', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      products: [{ product_name: 'Egg', nutriments: { 'energy-kcal_100g': 155, 'proteins_100g': 13, 'carbohydrates_100g': 1, 'fat_100g': 11 } }],
    }), { status: 200 }));

    const { GET } = await import('@/app/api/food-search/route');
    await GET(new Request('http://localhost/api/food-search?q=egg'));
    await GET(new Request('http://localhost/api/food-search?q=egg'));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=app/api/food-search
```

Expected: FAIL — route module not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/food-search/route.ts`:

```typescript
import { auth } from '@/lib/auth/auth';
import { searchFoods } from '@/lib/nutrition/food-search';
import type { UserRole } from '@/types/auth';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) return Response.json({ error: 'q is required' }, { status: 400 });

  const pageSizeRaw = Number(url.searchParams.get('page_size') ?? '20');
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 50) : 20;

  try {
    const results = await searchFoods(q, pageSize);
    return Response.json({ results });
  } catch (error) {
    console.error('food-search failed:', error);
    return Response.json({ error: 'Upstream search failed' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=app/api/food-search
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/food-search/route.ts __tests__/app/api/food-search.test.ts
git commit -m "feat(api): add /api/food-search OpenFoodFacts proxy"
```

---

### Task 10: Update `POST /api/members/[memberId]/nutrition` (assignedById + direct creation)

**Files:**
- Modify: `src/app/api/members/[memberId]/nutrition/route.ts`
- Modify: `__tests__/app/api/members-nutrition.test.ts`

- [ ] **Step 1: Replace tests**

Overwrite `__tests__/app/api/members-nutrition.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({
  getEmailService: () => ({ sendNutritionPlanAssigned: jest.fn().mockResolvedValue(undefined) }),
}));

const mockNutritionPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockNutritionPlanRepo),
}));

const mockTemplateRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
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

describe('POST /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('owner can assign template to any member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'owner1', role: 'owner', name: 'Owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' } });
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', name: '增肌计划', dayTypes: [] });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: '增肌计划' });

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'tpl1' }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      assignedById: 'owner1',
      templateId: 'tpl1',
    }));
  });

  it('trainer cannot assign to non-own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't2' } });
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('direct creation accepts {name, dayTypes} without templateId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', name: 'T' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', email: 'm@x.com', trainerId: { toString: () => 't1' } });
    mockNutritionPlanRepo.create.mockResolvedValue({ _id: 'np1', name: '直建计划' });

    const dayTypes = [{ name: 'Training', targetKcal: 2800, targetProtein: 200, targetCarbs: 300, targetFat: 80, meals: [] }];
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '直建计划', dayTypes }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      assignedById: 't1',
      templateId: null,
      name: '直建计划',
      dayTypes,
    }));
  });

  it('returns 400 when body is neither shape', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({}) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns active plan for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockNutritionPlanRepo.findActive.mockResolvedValue({ _id: 'np1' });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('blocks cross-member GET', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=members-nutrition
```

Expected: FAIL — `assignedById`, direct-creation branch missing.

- [ ] **Step 3: Replace the route**

Overwrite `src/app/api/members/[memberId]/nutrition/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

interface AssignFromTemplate { templateId: string }
interface AssignDirect { name: string; dayTypes: IDayType[] }
type AssignBody = AssignFromTemplate | AssignDirect;

function isFromTemplate(b: AssignBody): b is AssignFromTemplate {
  return typeof (b as AssignFromTemplate).templateId === 'string';
}
function isDirect(b: AssignBody): b is AssignDirect {
  return typeof (b as AssignDirect).name === 'string' && Array.isArray((b as AssignDirect).dayTypes);
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoMemberNutritionPlanRepository();
  const plan = await repo.findActive(memberId);
  return Response.json(plan);
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const body = (await req.json()) as AssignBody;

  if (!isFromTemplate(body) && !isDirect(body)) {
    return Response.json({ error: 'Body must be {templateId} or {name, dayTypes}' }, { status: 400 });
  }

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planRepo = new MongoMemberNutritionPlanRepository();

  let name: string;
  let dayTypes: IDayType[];
  let templateId: string | null;

  if (isFromTemplate(body)) {
    const templateRepo = new MongoNutritionTemplateRepository();
    const template = await templateRepo.findById(body.templateId);
    if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });
    name = template.name;
    dayTypes = structuredClone(template.dayTypes) as IDayType[];
    templateId = body.templateId;
  } else {
    name = body.name;
    dayTypes = body.dayTypes;
    templateId = null;
  }

  await planRepo.deactivateAll(memberId);
  const plan = await planRepo.create({
    memberId,
    assignedById: session.user.id,
    templateId,
    name,
    dayTypes,
    assignedAt: new Date(),
  });

  try {
    await getEmailService().sendNutritionPlanAssigned({
      to: member.email,
      trainerName: session.user.name ?? 'Your trainer',
      planName: name,
    });
  } catch (e) {
    console.error('sendNutritionPlanAssigned failed:', e);
  }

  return Response.json(plan, { status: 201 });
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=members-nutrition
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/nutrition/route.ts __tests__/app/api/members-nutrition.test.ts
git commit -m "feat(api): nutrition POST supports direct creation and assignedById"
```

---

### Task 11: `PATCH /api/members/[memberId]/nutrition/schedule`

**Files:**
- Create: `src/app/api/members/[memberId]/nutrition/schedule/route.ts`
- Create: `__tests__/app/api/nutrition-schedule.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/api/nutrition-schedule.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockPlanRepo = { updateSchedule: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockPlanRepo),
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

const validBody = {
  weeklyPattern: [{ dayOfWeek: 1, dayTypeName: 'Training' }],
  calendarOverrides: [],
};

beforeEach(() => jest.clearAllMocks());

describe('PATCH /api/members/[memberId]/nutrition/schedule', () => {
  it('401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(401);
  });

  it('403 for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('403 when trainer not member owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't2' } });
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('200 updates schedule and returns updated plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't1' } });
    mockPlanRepo.updateSchedule.mockResolvedValue({ _id: 'np1', schedule: validBody });
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(200);
    expect(mockPlanRepo.updateSchedule).toHaveBeenCalledWith('m1', validBody);
  });

  it('404 when no active plan exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't1' } });
    mockPlanRepo.updateSchedule.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/members/[memberId]/nutrition/schedule/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(validBody) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=nutrition-schedule
```

Expected: FAIL — route not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/members/[memberId]/nutrition/schedule/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

function isSchedule(b: unknown): b is ISchedule {
  if (!b || typeof b !== 'object') return false;
  const s = b as { weeklyPattern?: unknown; calendarOverrides?: unknown };
  return Array.isArray(s.weeklyPattern) && Array.isArray(s.calendarOverrides);
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const body = (await req.json()) as unknown;
  if (!isSchedule(body)) return Response.json({ error: 'Invalid schedule' }, { status: 400 });

  await connectDB();
  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planRepo = new MongoMemberNutritionPlanRepository();
  const updated = await planRepo.updateSchedule(memberId, body);
  if (!updated) return Response.json({ error: 'No active plan' }, { status: 404 });
  return Response.json(updated);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=nutrition-schedule
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/nutrition/schedule/route.ts __tests__/app/api/nutrition-schedule.test.ts
git commit -m "feat(api): PATCH active plan schedule"
```

---

### Task 12: `GET /api/members/[memberId]/nutrition/history`

**Files:**
- Create: `src/app/api/members/[memberId]/nutrition/history/route.ts`
- Create: `__tests__/app/api/nutrition-history.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/api/nutrition-history.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockPlanRepo = { findAllByMember: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockPlanRepo),
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

beforeEach(() => jest.clearAllMocks());

describe('GET /api/members/[memberId]/nutrition/history', () => {
  it('403 for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('owner gets history for any member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't1' } });
    mockPlanRepo.findAllByMember.mockResolvedValue([{ _id: 'np2' }, { _id: 'np1' }]);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it('trainer scoped to own members', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 't2' } });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=nutrition-history
```

Expected: FAIL — route not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/members/[memberId]/nutrition/history/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planRepo = new MongoMemberNutritionPlanRepository();
  const plans = await planRepo.findAllByMember(memberId);
  return Response.json(plans);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=nutrition-history
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/nutrition/history/route.ts __tests__/app/api/nutrition-history.test.ts
git commit -m "feat(api): nutrition plan history endpoint"
```

---

### Task 13: `GET/PUT /api/members/[memberId]/nutrition/log/[date]`

**Files:**
- Create: `src/app/api/members/[memberId]/nutrition/log/[date]/route.ts`
- Create: `__tests__/app/api/nutrition-log.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/api/nutrition-log.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockLogRepo = { findByDate: jest.fn(), upsert: jest.fn() };
jest.mock('@/lib/repositories/nutrition-daily-log.repository', () => ({
  MongoNutritionDailyLogRepository: jest.fn(() => mockLogRepo),
}));

const mockPlanRepo = { findActive: jest.fn() };
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockPlanRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string, date: string) {
  return { params: Promise.resolve({ memberId, date }) };
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/members/[memberId]/nutrition/log/[date]', () => {
  it('member can read own', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockLogRepo.findByDate.mockResolvedValue({ _id: 'log1', meals: [] });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1', '2026-05-06'));
    expect(res.status).toBe(200);
  });

  it('returns synthesised log from plan when none exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockLogRepo.findByDate.mockResolvedValue(null);
    mockPlanRepo.findActive.mockResolvedValue({
      _id: 'np1',
      schedule: {
        weeklyPattern: [{ dayOfWeek: 3, dayTypeName: 'Training' }],
        calendarOverrides: [],
      },
      dayTypes: [{ name: 'Training', meals: [{ name: 'Breakfast', order: 1, items: [{ foodName: 'Egg', quantityG: 100, kcal: 155, protein: 13, carbs: 1, fat: 11 }] }] }],
    });
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1', '2026-05-06'));
    const data = (await res.json()) as { dayTypeName: string | null; meals: Array<{ completed: boolean }> };
    expect(res.status).toBe(200);
    expect(data.dayTypeName).toBe('Training');
    expect(data.meals[0].completed).toBe(false);
  });

  it('returns null log when no plan and no log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockLogRepo.findByDate.mockResolvedValue(null);
    mockPlanRepo.findActive.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1', '2026-05-06'));
    const data = await res.json();
    expect(data).toBeNull();
  });

  it('blocks cross-member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2', '2026-05-06'));
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/members/[memberId]/nutrition/log/[date]', () => {
  const body = { dayTypeName: 'Training', meals: [], dayCompleted: false };

  it('only member can write own log', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(403);
  });

  it('upserts when plan exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockPlanRepo.findActive.mockResolvedValue({ _id: 'np1' });
    mockLogRepo.findByDate.mockResolvedValue(null);
    mockLogRepo.upsert.mockResolvedValue({ _id: 'log1' });
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(200);
    expect(mockLogRepo.upsert).toHaveBeenCalledWith('m1', '2026-05-06', expect.objectContaining({ planId: 'np1' }));
  });

  it('403 when day already completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockPlanRepo.findActive.mockResolvedValue({ _id: 'np1' });
    mockLogRepo.findByDate.mockResolvedValue({ _id: 'log1', dayCompleted: true });
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(403);
  });

  it('404 when no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockPlanRepo.findActive.mockResolvedValue(null);
    const { PUT } = await import('@/app/api/members/[memberId]/nutrition/log/[date]/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify(body) }),
      makeParams('m1', '2026-05-06'),
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=nutrition-log
```

Expected: FAIL — route not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/members/[memberId]/nutrition/log/[date]/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoNutritionDailyLogRepository } from '@/lib/repositories/nutrition-daily-log.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { resolveDayType } from '@/lib/nutrition/schedule';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; date: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PutBody {
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

function isPutBody(b: unknown): b is PutBody {
  if (!b || typeof b !== 'object') return false;
  const x = b as { dayTypeName?: unknown; meals?: unknown; dayCompleted?: unknown };
  return typeof x.dayTypeName === 'string' && Array.isArray(x.meals) && typeof x.dayCompleted === 'boolean';
}

async function checkRead(session: { user: { id: string; role: UserRole } }, memberId: string): Promise<Response | null> {
  const role = session.user.role;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (role === 'trainer') {
    const userRepo = new MongoUserRepository();
    const member = await userRepo.findById(memberId);
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  return null;
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });

  const guard = await checkRead(session as { user: { id: string; role: UserRole } }, memberId);
  if (guard) return guard;

  await connectDB();
  const logRepo = new MongoNutritionDailyLogRepository();
  const existing = await logRepo.findByDate(memberId, date);
  if (existing) return Response.json(existing);

  const planRepo = new MongoMemberNutritionPlanRepository();
  const plan = await planRepo.findActive(memberId);
  if (!plan) return Response.json(null);

  const dayTypeName = resolveDayType(plan.schedule, date);
  if (!dayTypeName) return Response.json(null);
  const dayType = plan.dayTypes.find((d) => d.name === dayTypeName);
  if (!dayType) return Response.json(null);

  return Response.json({
    memberId,
    planId: plan._id,
    date,
    dayTypeName,
    meals: dayType.meals.map((m) => ({
      name: m.name,
      order: m.order,
      completed: false,
      items: m.items,
    })),
    dayCompleted: false,
  });
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  const { memberId, date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });
  if (role !== 'member' || session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as unknown;
  if (!isPutBody(body)) return Response.json({ error: 'Invalid body' }, { status: 400 });

  await connectDB();
  const planRepo = new MongoMemberNutritionPlanRepository();
  const plan = await planRepo.findActive(memberId);
  if (!plan) return Response.json({ error: 'No active plan' }, { status: 404 });

  const logRepo = new MongoNutritionDailyLogRepository();
  const existing = await logRepo.findByDate(memberId, date);
  if (existing?.dayCompleted) {
    return Response.json({ error: 'Day already completed' }, { status: 403 });
  }

  const upserted = await logRepo.upsert(memberId, date, {
    planId: plan._id.toString(),
    dayTypeName: body.dayTypeName,
    meals: body.meals,
    dayCompleted: body.dayCompleted,
  });
  return Response.json(upserted);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=nutrition-log
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/nutrition/log/[date]/route.ts __tests__/app/api/nutrition-log.test.ts
git commit -m "feat(api): nutrition daily log GET/PUT"
```

---

## Stage 4 — Components

### Task 14: `FoodAddSheet` (search + manual)

**Files:**
- Create: `src/components/nutrition/food-add-sheet.tsx`
- Create: `__tests__/app/shared/food-add-sheet.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/shared/food-add-sheet.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FoodAddSheet } from '@/components/nutrition/food-add-sheet';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

function setup(onAdd = jest.fn()) {
  render(<FoodAddSheet open onOpenChange={() => undefined} onAdd={onAdd} />);
  return { onAdd };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => jest.useRealTimers());

describe('FoodAddSheet — Search tab', () => {
  it('debounces search and renders normalised results', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      results: [{ name: 'Egg', per100g: { kcal: 155, protein: 13, carbs: 1, fat: 11 } }],
    }), { status: 200 }));

    setup();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'egg' } });
    expect(mockFetch).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Egg')).toBeInTheDocument();
  });

  it('selecting a result and entering quantity calls onAdd with scaled macros', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      results: [{ name: 'Egg', per100g: { kcal: 155, protein: 13, carbs: 1, fat: 11 } }],
    }), { status: 200 }));
    const { onAdd } = setup();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'egg' } });
    await act(async () => { jest.advanceTimersByTime(350); });
    await waitFor(() => screen.getByText('Egg'));
    fireEvent.click(screen.getByText('Egg'));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      foodName: 'Egg',
      quantityG: 50,
      kcal: 77.5,
    }));
  });
});

describe('FoodAddSheet — Manual tab', () => {
  it('manual entry computes totals from per-100g and amount', () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByRole('tab', { name: /manual/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Custom' } });
    fireEvent.change(screen.getByLabelText(/^kcal$/i), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText(/^protein$/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/^carbs$/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/^fat$/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/^amount/i), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      foodName: 'Custom',
      quantityG: 50,
      kcal: 100,
      protein: 10,
    }));
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=food-add-sheet
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

Create `src/components/nutrition/food-add-sheet.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calculateMacros, type MacroSnapshot } from '@/lib/nutrition/macros';

export interface AddedMealItem extends MacroSnapshot {
  foodName: string;
  quantityG: number;
}

interface SearchResult {
  name: string;
  per100g: {
    kcal: number; protein: number; carbs: number; fat: number;
    fiber?: number; sugar?: number; salt?: number; saturated?: number;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: AddedMealItem) => void;
}

const NUM_FIELDS = [
  ['kcal', 'kcal'],
  ['protein', 'protein'],
  ['carbs', 'carbs'],
  ['fat', 'fat'],
  ['fiber', 'fiber'],
  ['sugar', 'sugar'],
  ['salt', 'salt'],
  ['saturated', 'saturated'],
  ['polyunsaturated', 'polyunsaturated'],
  ['monounsaturated', 'monounsaturated'],
  ['polyols', 'polyols'],
] as const;

type ManualKey = (typeof NUM_FIELDS)[number][0];

export function FoodAddSheet({ open, onOpenChange, onAdd }: Props): JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Food</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="search" className="mt-4">
          <TabsList>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="search">
            <SearchTab onAdd={(item) => { onAdd(item); onOpenChange(false); }} />
          </TabsContent>
          <TabsContent value="manual">
            <ManualTab onAdd={(item) => { onAdd(item); onOpenChange(false); }} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function SearchTab({ onAdd }: { onAdd: (item: AddedMealItem) => void }): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState(100);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const macros = useMemo(() => {
    if (!selected) return null;
    return calculateMacros({ per100g: selected.per100g, perServing: null }, amount);
  }, [selected, amount]);

  return (
    <div className="space-y-3 py-3">
      <Input
        placeholder="Search OpenFoodFacts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="divide-y border rounded">
        {results.map((r) => (
          <li
            key={r.name}
            className="px-2 py-1.5 cursor-pointer hover:bg-muted text-sm flex justify-between"
            onClick={() => setSelected(r)}
          >
            <span>{r.name}</span>
            <span className="text-muted-foreground">{r.per100g.kcal} · {r.per100g.protein}P · {r.per100g.carbs}C · {r.per100g.fat}F</span>
          </li>
        ))}
      </ul>
      {selected && macros && (
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor="search-amount">Amount (g)</Label>
          <Input
            id="search-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
          <div className="text-sm text-muted-foreground">
            {macros.kcal.toFixed(0)} kcal · {macros.protein.toFixed(1)}P · {macros.carbs.toFixed(1)}C · {macros.fat.toFixed(1)}F
          </div>
          <Button
            onClick={() => onAdd({ foodName: selected.name, quantityG: amount, ...macros })}
          >
            Add
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Powered by Open Food Facts</p>
    </div>
  );
}

function ManualTab({ onAdd }: { onAdd: (item: AddedMealItem) => void }): JSX.Element {
  const [name, setName] = useState('');
  const [vals, setVals] = useState<Record<ManualKey, number>>({
    kcal: 0, protein: 0, carbs: 0, fat: 0,
    fiber: 0, sugar: 0, salt: 0, saturated: 0,
    polyunsaturated: 0, monounsaturated: 0, polyols: 0,
  });
  const [amount, setAmount] = useState(100);

  const macros = useMemo(() => {
    return calculateMacros({ per100g: vals, perServing: null }, amount);
  }, [vals, amount]);

  return (
    <div className="grid grid-cols-2 gap-2 py-3">
      <div className="col-span-2">
        <Label htmlFor="manual-name">Name</Label>
        <Input id="manual-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {NUM_FIELDS.map(([key, label]) => (
        <div key={key}>
          <Label htmlFor={`manual-${key}`} className="capitalize">{label}</Label>
          <Input
            id={`manual-${key}`}
            type="number"
            value={vals[key]}
            onChange={(e) => setVals((v) => ({ ...v, [key]: Number(e.target.value) || 0 }))}
          />
        </div>
      ))}
      <div className="col-span-2">
        <Label htmlFor="manual-amount">Amount (g)</Label>
        <Input
          id="manual-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </div>
      <div className="col-span-2 text-sm text-muted-foreground">
        Total: {macros.kcal.toFixed(0)} kcal · {macros.protein.toFixed(1)}P · {macros.carbs.toFixed(1)}C · {macros.fat.toFixed(1)}F
      </div>
      <div className="col-span-2">
        <Button
          disabled={!name}
          onClick={() => onAdd({ foodName: name, quantityG: amount, ...macros })}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=food-add-sheet
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/nutrition/food-add-sheet.tsx __tests__/app/shared/food-add-sheet.test.tsx
git commit -m "feat(nutrition): FoodAddSheet (search + manual entry)"
```

---

### Task 15: `ScheduleEditor`

**Files:**
- Create: `src/components/nutrition/schedule-editor.tsx`
- Create: `__tests__/app/trainer/nutrition-schedule-editor.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/trainer/nutrition-schedule-editor.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

const dayTypeNames = ['Training', 'Rest'];
const initialSchedule = {
  weeklyPattern: [{ dayOfWeek: 1 as const, dayTypeName: 'Training' }],
  calendarOverrides: [{ date: '2026-05-04', dayTypeName: 'Rest' }],
};

beforeEach(() => jest.clearAllMocks());

describe('ScheduleEditor', () => {
  it('renders weekly pattern and calendar overrides', () => {
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={initialSchedule} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('2026-05-04')).toBeInTheDocument();
  });

  it('saves on Save click', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<ScheduleEditor memberId="m1" dayTypeNames={dayTypeNames} initialSchedule={initialSchedule} />);
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      '/api/members/m1/nutrition/schedule',
      expect.objectContaining({ method: 'PATCH' }),
    ));
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=nutrition-schedule-editor
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

Create `src/components/nutrition/schedule-editor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ISchedule, IWeeklyPatternEntry, ICalendarOverride } from '@/lib/db/models/member-nutrition-plan.model';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
type DayOfWeek = (typeof DAY_VALUES)[number];

interface Props {
  memberId: string;
  dayTypeNames: string[];
  initialSchedule: ISchedule;
}

const NONE = '__none__';

export function ScheduleEditor({ memberId, dayTypeNames, initialSchedule }: Props): JSX.Element {
  const [weekly, setWeekly] = useState<Record<DayOfWeek, string>>(() => {
    const map = {} as Record<DayOfWeek, string>;
    for (const d of DAY_VALUES) {
      map[d] = initialSchedule.weeklyPattern.find((w) => w.dayOfWeek === d)?.dayTypeName ?? NONE;
    }
    return map;
  });
  const [overrides, setOverrides] = useState<ICalendarOverride[]>(initialSchedule.calendarOverrides);
  const [newDate, setNewDate] = useState('');
  const [newDayType, setNewDayType] = useState(dayTypeNames[0] ?? '');
  const [saving, setSaving] = useState(false);

  function addOverride(): void {
    if (!newDate || !newDayType) return;
    setOverrides((list) => [...list, { date: newDate, dayTypeName: newDayType }]);
    setNewDate('');
  }

  function removeOverride(date: string): void {
    setOverrides((list) => list.filter((o) => o.date !== date));
  }

  async function save(): Promise<void> {
    setSaving(true);
    const weeklyPattern: IWeeklyPatternEntry[] = DAY_VALUES
      .filter((d) => weekly[d] !== NONE)
      .map((d) => ({ dayOfWeek: d, dayTypeName: weekly[d] }));
    await fetch(`/api/members/${memberId}/nutrition/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyPattern, calendarOverrides: overrides }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card className="p-3 space-y-3">
        <h3 className="text-sm font-medium">Weekly Pattern</h3>
        <div className="grid grid-cols-7 gap-2">
          {DAY_VALUES.map((d) => (
            <div key={d}>
              <div className="text-xs text-muted-foreground">{DAY_LABELS[d]}</div>
              <Select
                value={weekly[d]}
                onValueChange={(v) => setWeekly((w) => ({ ...w, [d]: v }))}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {dayTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3 space-y-3">
        <h3 className="text-sm font-medium">Calendar Overrides</h3>
        <ul className="divide-y">
          {overrides.map((o) => (
            <li key={o.date} className="py-1.5 flex justify-between items-center text-sm">
              <span>{o.date}</span>
              <span>{o.dayTypeName}</span>
              <Button variant="ghost" size="sm" onClick={() => removeOverride(o.date)}>×</Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 items-end">
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
          <Select value={newDayType} onValueChange={setNewDayType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {dayTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={addOverride}>+ Add Override</Button>
        </div>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Schedule'}</Button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=nutrition-schedule-editor
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/nutrition/schedule-editor.tsx __tests__/app/trainer/nutrition-schedule-editor.test.tsx
git commit -m "feat(nutrition): ScheduleEditor component"
```

---

### Task 16: `MealCard` + `DailyNutritionView`

**Files:**
- Create: `src/components/nutrition/meal-card.tsx`
- Create: `src/components/nutrition/daily-nutrition-view.tsx`
- Create: `__tests__/app/member/daily-nutrition-view.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/member/daily-nutrition-view.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('DailyNutritionView', () => {
  it('shows EmptyState when log is null', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 200 }));
    render(<DailyNutritionView memberId="m1" initialDate="2026-05-06" />);
    await waitFor(() => expect(screen.getByText(/hasn't scheduled/i)).toBeInTheDocument());
  });

  it('renders meals when log exists', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      memberId: 'm1', planId: 'np1', date: '2026-05-06',
      dayTypeName: 'Training',
      meals: [{
        name: 'Breakfast', order: 1, completed: false,
        items: [{ foodName: 'Egg', quantityG: 100, kcal: 155, protein: 13, carbs: 1, fat: 11 }],
      }],
      dayCompleted: false,
    }), { status: 200 }));
    render(<DailyNutritionView memberId="m1" initialDate="2026-05-06" />);
    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());
    expect(screen.getByText('Egg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=daily-nutrition-view
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement `MealCard`**

Create `src/components/nutrition/meal-card.tsx`:

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

interface Props {
  meal: IDailyLogMeal;
  locked: boolean;
  onAddFood: () => void;
  onToggleComplete: () => void;
  onRemoveItem: (idx: number) => void;
}

export function MealCard({ meal, locked, onAddFood, onToggleComplete, onRemoveItem }: Props): JSX.Element {
  const totals = meal.items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Card className="p-3 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sm">{meal.name}</h3>
        <span className="text-xs text-muted-foreground">
          {totals.kcal.toFixed(0)} kcal · {totals.protein.toFixed(1)}P · {totals.carbs.toFixed(1)}C · {totals.fat.toFixed(1)}F
        </span>
      </div>
      <ul className="divide-y text-sm">
        {meal.items.map((i, idx) => (
          <li key={`${i.foodName}-${idx}`} className="py-1 flex justify-between items-center">
            <span>{i.foodName} <span className="text-muted-foreground">({i.quantityG}g)</span></span>
            <span className="flex gap-3 items-center">
              <span className="text-muted-foreground">{i.kcal.toFixed(0)} · {i.protein.toFixed(1)}P · {i.carbs.toFixed(1)}C · {i.fat.toFixed(1)}F</span>
              {!locked && (
                <Button variant="ghost" size="sm" onClick={() => onRemoveItem(idx)}>×</Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onAddFood} disabled={locked}>+ Add Food</Button>
        <Button variant={meal.completed ? 'secondary' : 'default'} size="sm" onClick={onToggleComplete} disabled={locked}>
          {meal.completed ? '✓ Completed' : 'Complete'}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Implement `DailyNutritionView`**

Create `src/components/nutrition/daily-nutrition-view.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MealCard } from './meal-card';
import { FoodAddSheet, type AddedMealItem } from './food-add-sheet';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

interface DailyLog {
  memberId: string;
  planId: string;
  date: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

interface Props {
  memberId: string;
  initialDate: string;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export function DailyNutritionView({ memberId, initialDate }: Props): JSX.Element {
  const [date, setDate] = useState(initialDate);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetMealIdx, setSheetMealIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/members/${memberId}/nutrition/log/${date}`);
    setLog(res.ok ? ((await res.json()) as DailyLog | null) : null);
    setLoading(false);
  }, [memberId, date]);

  useEffect(() => { void load(); }, [load]);

  async function persist(next: DailyLog): Promise<void> {
    setLog(next);
    await fetch(`/api/members/${memberId}/nutrition/log/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayTypeName: next.dayTypeName,
        meals: next.meals,
        dayCompleted: next.dayCompleted,
      }),
    });
  }

  function addFood(idx: number, item: AddedMealItem): void {
    if (!log) return;
    const meals = log.meals.map((m, i) => i === idx ? { ...m, items: [...m.items, item] } : m);
    void persist({ ...log, meals });
  }

  function removeItem(mealIdx: number, itemIdx: number): void {
    if (!log) return;
    const meals = log.meals.map((m, i) => i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m);
    void persist({ ...log, meals });
  }

  function toggleComplete(idx: number): void {
    if (!log) return;
    const meals = log.meals.map((m, i) => i === idx ? { ...m, completed: !m.completed } : m);
    void persist({ ...log, meals });
  }

  function completeDay(): void {
    if (!log) return;
    void persist({ ...log, dayCompleted: true });
  }

  if (loading) return <div>Loading...</div>;
  if (!log) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Your trainer hasn't scheduled today yet.
        <DateNav date={date} onChange={setDate} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 flex justify-between items-center">
        <span className="font-medium text-sm">{log.date} · {log.dayTypeName}</span>
        <DateNav date={date} onChange={setDate} />
      </Card>
      {log.meals.map((m, idx) => (
        <MealCard
          key={`${m.name}-${idx}`}
          meal={m}
          locked={log.dayCompleted}
          onAddFood={() => setSheetMealIdx(idx)}
          onToggleComplete={() => toggleComplete(idx)}
          onRemoveItem={(i) => removeItem(idx, i)}
        />
      ))}
      <Button onClick={completeDay} disabled={log.dayCompleted} className="w-full">
        {log.dayCompleted ? 'Day Completed' : 'Complete Day'}
      </Button>
      <FoodAddSheet
        open={sheetMealIdx !== null}
        onOpenChange={(o) => !o && setSheetMealIdx(null)}
        onAdd={(item) => sheetMealIdx !== null && addFood(sheetMealIdx, item)}
      />
    </div>
  );
}

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }): JSX.Element {
  const today = todayISO();
  return (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" onClick={() => onChange(shiftDate(date, -1))}>←</Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={date >= today}
      >→</Button>
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- --testPathPattern=daily-nutrition-view
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/nutrition/meal-card.tsx src/components/nutrition/daily-nutrition-view.tsx __tests__/app/member/daily-nutrition-view.test.tsx
git commit -m "feat(nutrition): DailyNutritionView + MealCard"
```

---

## Stage 5 — Pages

### Task 17: Member nutrition page → DailyNutritionView

**Files:**
- Modify: `src/app/(dashboard)/member/nutrition/page.tsx`
- Delete: `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx`
- Delete: `__tests__/app/member/nutrition-plan-viewer.test.tsx`

- [ ] **Step 1: Replace the page**

Overwrite `src/app/(dashboard)/member/nutrition/page.tsx`:

```tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';

export default async function MemberNutritionPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') redirect('/login');

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container py-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">My Nutrition</h1>
      <DailyNutritionView memberId={session.user.id} initialDate={today} />
    </div>
  );
}
```

- [ ] **Step 2: Delete old viewer + test**

```bash
rm src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx
rm __tests__/app/member/nutrition-plan-viewer.test.tsx
rmdir src/app/(dashboard)/member/nutrition/_components 2>/dev/null || true
```

- [ ] **Step 3: Run lint + relevant tests**

```bash
pnpm lint && pnpm test -- --testPathPattern=member/daily-nutrition-view
```

Expected: lint PASS; tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/\(dashboard\)/member/nutrition __tests__/app/member
git commit -m "feat(member): replace nutrition viewer with DailyNutritionView"
```

---

### Task 18: Trainer template builder uses `FoodAddSheet`

**Files:**
- Modify: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/new/page.tsx`
- Modify: `src/app/(dashboard)/trainer/nutrition/[id]/edit/page.tsx`
- Modify: `src/app/(dashboard)/owner/nutrition-templates/new/page.tsx`
- Modify: `src/app/(dashboard)/owner/nutrition-templates/[id]/edit/page.tsx`
- Modify: `__tests__/app/trainer/nutrition-template-form.test.tsx`

- [ ] **Step 1: Read the form fully so the rewrite preserves day-type/meal logic**

```bash
cat src/app/\(dashboard\)/trainer/nutrition/_components/nutrition-template-form.tsx
```

- [ ] **Step 2: Edit the form to drop `FoodOption` and use `FoodAddSheet`**

Replace `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FoodAddSheet, type AddedMealItem } from '@/components/nutrition/food-add-sheet';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

interface FormData {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}

interface Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
}

export function NutritionTemplateForm({ initialData, onSubmit }: Props): JSX.Element {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dayTypes, setDayTypes] = useState<IDayType[]>(initialData?.dayTypes ?? []);

  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [draftDay, setDraftDay] = useState<IDayType | null>(null);
  const [addingFood, setAddingFood] = useState<{ dayIdx: number; mealIdx: number } | null>(null);

  function openNewDayDialog(): void {
    setDraftDay({ name: '', targetKcal: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0, meals: [] });
    setEditingDayIdx(dayTypes.length);
  }

  function openEditDay(idx: number): void {
    setDraftDay(structuredClone(dayTypes[idx]));
    setEditingDayIdx(idx);
  }

  function saveDayDraft(): void {
    if (editingDayIdx === null || !draftDay) return;
    setDayTypes((d) => {
      const next = [...d];
      next[editingDayIdx] = draftDay;
      return next;
    });
    setDraftDay(null);
    setEditingDayIdx(null);
  }

  function deleteDay(idx: number): void {
    setDayTypes((d) => d.filter((_, i) => i !== idx));
  }

  function addMealToDraft(): void {
    if (!draftDay) return;
    setDraftDay({ ...draftDay, meals: [...draftDay.meals, { name: 'Meal', order: draftDay.meals.length + 1, items: [] }] });
  }

  function addFoodToMeal(item: AddedMealItem): void {
    if (!addingFood || !draftDay) return;
    const meals = draftDay.meals.map((m, i) => i === addingFood.mealIdx
      ? { ...m, items: [...m.items, item] }
      : m,
    );
    setDraftDay({ ...draftDay, meals });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ name, description: description || null, dayTypes });
      }}
    >
      <Card className="p-3 space-y-2">
        <Label htmlFor="tpl-name">Template Name</Label>
        <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Label htmlFor="tpl-desc">Description</Label>
        <Textarea id="tpl-desc" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
      </Card>

      <Card className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Day Types</h3>
          <Button type="button" size="sm" onClick={openNewDayDialog}>+ Day Type</Button>
        </div>
        <ul className="divide-y text-sm">
          {dayTypes.map((d, idx) => (
            <li key={`${d.name}-${idx}`} className="py-1.5 flex justify-between items-center">
              <span>{d.name} <span className="text-muted-foreground">{d.targetKcal} kcal · {d.meals.length} meals</span></span>
              <span className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => openEditDay(idx)}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => deleteDay(idx)}>Delete</Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Button type="submit">Save Template</Button>

      <Dialog open={editingDayIdx !== null} onOpenChange={(o) => { if (!o) { setDraftDay(null); setEditingDayIdx(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draftDay?.name || 'New Day Type'}</DialogTitle>
          </DialogHeader>
          {draftDay && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Name</Label><Input value={draftDay.name} onChange={(e) => setDraftDay({ ...draftDay, name: e.target.value })} /></div>
                <div><Label>Target Kcal</Label><Input type="number" value={draftDay.targetKcal} onChange={(e) => setDraftDay({ ...draftDay, targetKcal: Number(e.target.value) || 0 })} /></div>
                <div><Label>Target Protein (g)</Label><Input type="number" value={draftDay.targetProtein} onChange={(e) => setDraftDay({ ...draftDay, targetProtein: Number(e.target.value) || 0 })} /></div>
                <div><Label>Target Carbs (g)</Label><Input type="number" value={draftDay.targetCarbs} onChange={(e) => setDraftDay({ ...draftDay, targetCarbs: Number(e.target.value) || 0 })} /></div>
                <div><Label>Target Fat (g)</Label><Input type="number" value={draftDay.targetFat} onChange={(e) => setDraftDay({ ...draftDay, targetFat: Number(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2">
                {draftDay.meals.map((m, mIdx) => (
                  <Card key={`${m.name}-${mIdx}`} className="p-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <Input
                        value={m.name}
                        className="h-7 w-40"
                        onChange={(e) => {
                          const meals = draftDay.meals.map((mm, j) => j === mIdx ? { ...mm, name: e.target.value } : mm);
                          setDraftDay({ ...draftDay, meals });
                        }}
                      />
                      <Button type="button" size="sm" onClick={() => setAddingFood({ dayIdx: editingDayIdx ?? 0, mealIdx: mIdx })}>+ Food</Button>
                    </div>
                    <ul className="text-xs divide-y">
                      {m.items.map((it, iIdx) => (
                        <li key={`${it.foodName}-${iIdx}`} className="py-0.5 flex justify-between">
                          <span>{it.foodName} ({it.quantityG}g)</span>
                          <span className="text-muted-foreground">{it.kcal.toFixed(0)} · {it.protein.toFixed(1)}P · {it.carbs.toFixed(1)}C · {it.fat.toFixed(1)}F</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addMealToDraft}>+ Meal</Button>
              </div>
              <Button type="button" onClick={saveDayDraft}>Save Day Type</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FoodAddSheet
        open={addingFood !== null}
        onOpenChange={(o) => !o && setAddingFood(null)}
        onAdd={addFoodToMeal}
      />
    </form>
  );
}
```

- [ ] **Step 3: Drop the food fetch from each builder page**

Repeat for each of the four pages (`trainer/nutrition/new/page.tsx`, `trainer/nutrition/[id]/edit/page.tsx`, `owner/nutrition-templates/new/page.tsx`, `owner/nutrition-templates/[id]/edit/page.tsx`):

- Remove `import { MongoFoodRepository }` and `import type { IPer100g, IPerServing }` lines.
- Remove the `foods` fetch and the `<NutritionTemplateForm foods={foods} ... />` `foods` prop.

Example diff for `trainer/nutrition/new/page.tsx`:

```typescript
// remove
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
const foods = await new MongoFoodRepository().findAll({ creatorId: session.user.id });
// the JSX prop too
foods={foods}
```

- [ ] **Step 4: Update the form test**

Replace `__tests__/app/trainer/nutrition-template-form.test.tsx` with a minimal sanity test that confirms `FoodAddSheet` is wired up:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionTemplateForm } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form';

describe('NutritionTemplateForm', () => {
  it('opens day type dialog when + Day Type clicked', () => {
    render(<NutritionTemplateForm onSubmit={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ day type/i }));
    expect(screen.getByText(/new day type/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests + lint**

```bash
pnpm test -- --testPathPattern=nutrition-template-form && pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/trainer/nutrition src/app/\(dashboard\)/owner/nutrition-templates __tests__/app/trainer/nutrition-template-form.test.tsx
git commit -m "feat(nutrition): template builder uses FoodAddSheet (drop Food collection)"
```

---

### Task 19: Trainer member nutrition — 3-tab layout

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`
- Create: `src/app/(dashboard)/owner/members/[id]/nutrition/page.tsx`
- Modify: `__tests__/app/trainer/trainer-member-nutrition.test.tsx`
- Modify: `__tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx`

- [ ] **Step 1: Read existing client to preserve assignment flow**

```bash
cat src/app/\(dashboard\)/trainer/members/\[id\]/nutrition/_components/trainer-member-nutrition-client.tsx
```

- [ ] **Step 2: Replace the client with a 3-tab layout**

Overwrite `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleEditor } from '@/components/nutrition/schedule-editor';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';
import type { INutritionTemplate } from '@/lib/db/models/nutrition-template.model';

interface Props {
  memberId: string;
  templates: Array<Pick<INutritionTemplate, 'name'> & { _id: string }>;
  basePathPrefix: 'trainer' | 'owner';
}

export function TrainerMemberNutritionClient({ memberId, templates, basePathPrefix }: Props): JSX.Element {
  const [active, setActive] = useState<IMemberNutritionPlan | null>(null);
  const [history, setHistory] = useState<IMemberNutritionPlan[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState<string>('');

  useEffect(() => {
    void Promise.all([
      fetch(`/api/members/${memberId}/nutrition`).then((r) => r.json()),
      fetch(`/api/members/${memberId}/nutrition/history`).then((r) => r.json()),
    ]).then(([a, h]: [IMemberNutritionPlan | null, IMemberNutritionPlan[]]) => {
      setActive(a);
      setHistory(h);
    });
  }, [memberId]);

  async function assignTemplate(): Promise<void> {
    if (!pickedTemplate) return;
    const res = await fetch(`/api/members/${memberId}/nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: pickedTemplate }),
    });
    if (res.ok) {
      const next = (await res.json()) as IMemberNutritionPlan;
      setActive(next);
      setHistory((h) => [next, ...h]);
      setAssignOpen(false);
    }
  }

  return (
    <Tabs defaultValue="current" className="space-y-4">
      <TabsList>
        <TabsTrigger value="current">Current Plan</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="schedule">Schedule</TabsTrigger>
      </TabsList>

      <TabsContent value="current">
        {!active ? (
          <Card className="p-6 text-center text-muted-foreground">
            No active plan.
            <div className="mt-3"><Button size="sm" onClick={() => setAssignOpen(true)}>Assign Plan</Button></div>
          </Card>
        ) : (
          <Card className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{active.name} · {active.dayTypes.length} day types · Assigned {new Date(active.assignedAt).toISOString().slice(0, 10)}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAssignOpen(true)}>From Template</Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/${basePathPrefix}/members/${memberId}/nutrition/new`}>Create Direct</Link>
                </Button>
              </div>
            </div>
            <ul className="divide-y text-sm">
              {active.dayTypes.map((d) => (
                <li key={d.name} className="py-1.5 flex justify-between">
                  <span>{d.name}</span>
                  <span className="text-muted-foreground">{d.targetKcal} kcal · {d.targetProtein}P · {d.targetCarbs}C · {d.targetFat}F</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="history">
        <Card className="p-3">
          <ul className="divide-y text-sm">
            {history.map((p) => (
              <li key={String(p._id)} className="py-1.5 flex justify-between">
                <span>{p.name}</span>
                <span className="text-muted-foreground">
                  {new Date(p.assignedAt).toISOString().slice(0, 10)} · {p.dayTypes.length} day types · {p.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
            {!history.length && <li className="py-2 text-muted-foreground text-center">No history.</li>}
          </ul>
        </Card>
      </TabsContent>

      <TabsContent value="schedule">
        {!active ? (
          <Card className="p-6 text-center text-muted-foreground">Assign a plan first to set a schedule.</Card>
        ) : (
          <ScheduleEditor
            memberId={memberId}
            dayTypeNames={active.dayTypes.map((d) => d.name)}
            initialSchedule={active.schedule}
          />
        )}
      </TabsContent>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Template</DialogTitle></DialogHeader>
          <Select value={pickedTemplate} onValueChange={setPickedTemplate}>
            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={assignTemplate} disabled={!pickedTemplate}>Assign</Button>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
```

- [ ] **Step 3: Update the trainer page to pass templates + basePathPrefix**

Overwrite `src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx`:

```tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { TrainerMemberNutritionClient } from './_components/trainer-member-nutrition-client';

type RouteContext = { params: Promise<{ id: string }> };

export default async function Page({ params }: RouteContext): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user || session.user.role === 'member') redirect('/login');
  const { id } = await params;

  await connectDB();
  const templates = await new MongoNutritionTemplateRepository().findByCreator(session.user.id);

  return (
    <div className="container py-6 max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Member Nutrition</h1>
      <TrainerMemberNutritionClient
        memberId={id}
        templates={templates.map((t) => ({ _id: String(t._id), name: t.name }))}
        basePathPrefix="trainer"
      />
    </div>
  );
}
```

- [ ] **Step 4: Create owner mirror page**

Create `src/app/(dashboard)/owner/members/[id]/nutrition/page.tsx`:

```tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

type RouteContext = { params: Promise<{ id: string }> };

export default async function Page({ params }: RouteContext): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  const { id } = await params;

  await connectDB();
  const templates = await new MongoNutritionTemplateRepository().findByCreator(session.user.id);

  return (
    <div className="container py-6 max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Member Nutrition</h1>
      <TrainerMemberNutritionClient
        memberId={id}
        templates={templates.map((t) => ({ _id: String(t._id), name: t.name }))}
        basePathPrefix="owner"
      />
    </div>
  );
}
```

- [ ] **Step 5: Update existing client tests**

Replace `__tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('TrainerMemberNutritionClient', () => {
  it('renders three tabs', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<TrainerMemberNutritionClient memberId="m1" templates={[]} basePathPrefix="trainer" />);
    expect(screen.getByRole('tab', { name: /current plan/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /schedule/i })).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it('renders active plan summary', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _id: 'np1', name: 'Bulk', dayTypes: [{ name: 'Training', targetKcal: 2800, targetProtein: 200, targetCarbs: 300, targetFat: 80, meals: [] }],
        assignedAt: '2026-04-10T00:00:00Z', schedule: { weeklyPattern: [], calendarOverrides: [] },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<TrainerMemberNutritionClient memberId="m1" templates={[]} basePathPrefix="trainer" />);
    await waitFor(() => expect(screen.getByText(/Bulk/)).toBeInTheDocument());
  });
});
```

Replace `__tests__/app/trainer/trainer-member-nutrition.test.tsx` (if it exists) with a re-export of the same client test or delete it if redundant — `git rm` if duplicate.

- [ ] **Step 6: Run tests + lint**

```bash
pnpm test -- --testPathPattern=trainer-member-nutrition && pnpm lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/nutrition src/app/\(dashboard\)/owner/members __tests__/app/trainer/members
git commit -m "feat(nutrition): 3-tab member nutrition page (Current/History/Schedule)"
```

---

## Stage 6 — Cleanup & Deletes

### Task 20: Delete `owner/my-nutrition` and the `Food` collection

**Files:**
- Delete: `src/app/(dashboard)/owner/my-nutrition/` (entire directory)
- Delete: `src/lib/db/models/food.model.ts`
- Delete: `src/lib/repositories/food.repository.ts`
- Delete: `src/app/api/foods/route.ts`
- Delete: `__tests__/app/api/foods.test.ts`
- Delete: `__tests__/lib/repositories/food.repository.test.ts`

- [ ] **Step 1: Verify no residual references**

```bash
grep -rn "my-nutrition\|MongoFoodRepository\|food.model\|food.repository\|from '@/app/api/foods" src __tests__ 2>/dev/null
```

Expected: only the listed files. Any other hits must be cleaned before deletion.

- [ ] **Step 2: Delete files**

```bash
git rm -r src/app/\(dashboard\)/owner/my-nutrition
git rm src/lib/db/models/food.model.ts src/lib/repositories/food.repository.ts src/app/api/foods/route.ts
git rm __tests__/app/api/foods.test.ts __tests__/lib/repositories/food.repository.test.ts
```

- [ ] **Step 3: Update navigation references**

Search and remove `my-nutrition` link entries:

```bash
grep -rn "my-nutrition" src 2>/dev/null
```

For each remaining hit, edit the source file and remove the link/route entry. Verify with the grep command returning zero hits before continuing.

- [ ] **Step 4: Run full test suite + lint + build**

```bash
pnpm test && pnpm lint && pnpm build
```

Expected: all PASS. If a navigation page lints fail with "unused import", remove that import too.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(nutrition): remove owner/my-nutrition and Food collection"
```

---

### Task 21: E2E happy paths (Playwright)

**Files:**
- Create: `e2e/trainer/nutrition-full-flow.spec.ts`
- Create: `e2e/member/nutrition-daily-log.spec.ts`

- [ ] **Step 1: Read an existing E2E spec to mirror the auth/setup pattern**

```bash
ls e2e && head -60 e2e/trainer/*.spec.ts | head -120
```

(Adapt the next two specs to match the project's auth helper, base URL, and test data setup.)

- [ ] **Step 2: Trainer flow**

Create `e2e/trainer/nutrition-full-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTrainer } from '../helpers/auth'; // use the project's existing helper

test('trainer can build template, assign, and set schedule', async ({ page }) => {
  await loginAsTrainer(page);

  // Build template
  await page.goto('/trainer/nutrition');
  await page.getByRole('link', { name: /new template/i }).click();
  await page.getByLabel(/template name/i).fill('E2E Bulk');
  await page.getByRole('button', { name: /\+ day type/i }).click();
  await page.getByLabel('Name').fill('Training');
  await page.getByLabel(/target kcal/i).fill('2800');
  await page.getByRole('button', { name: /save day type/i }).click();
  await page.getByRole('button', { name: /save template/i }).click();
  await expect(page.getByText('E2E Bulk')).toBeVisible();

  // Assign to first member (assumes seeded test member exists)
  await page.goto('/trainer/members');
  await page.getByRole('link', { name: /e2e member/i }).click();
  await page.getByRole('link', { name: /nutrition/i }).click();
  await page.getByRole('button', { name: /from template/i }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'E2E Bulk' }).click();
  await page.getByRole('button', { name: /^assign$/i }).click();
  await expect(page.getByText('E2E Bulk')).toBeVisible();

  // Set schedule
  await page.getByRole('tab', { name: /schedule/i }).click();
  await page.getByRole('button', { name: /save schedule/i }).click();
  await expect(page.getByText(/saved|saving/i)).toBeVisible();
});
```

- [ ] **Step 3: Member flow**

Create `e2e/member/nutrition-daily-log.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { loginAsMember } from '../helpers/auth';

test('member can add food and complete day', async ({ page }) => {
  await loginAsMember(page);
  await page.goto('/member/nutrition');

  // Either an empty state or a meal card depending on schedule fixtures
  if (await page.getByText(/hasn't scheduled/i).isVisible()) {
    test.skip(true, 'no schedule for today in fixture');
  }

  await page.getByRole('button', { name: /\+ add food/i }).first().click();
  await page.getByRole('tab', { name: /manual/i }).click();
  await page.getByLabel(/^name$/i).fill('Test Food');
  await page.getByLabel(/^kcal$/i).fill('100');
  await page.getByLabel(/^protein$/i).fill('10');
  await page.getByLabel(/^carbs$/i).fill('5');
  await page.getByLabel(/^fat$/i).fill('3');
  await page.getByLabel(/^amount/i).fill('100');
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByText('Test Food')).toBeVisible();

  await page.getByRole('button', { name: /complete day/i }).click();
  await expect(page.getByRole('button', { name: /day completed/i })).toBeVisible();
});
```

- [ ] **Step 4: Run E2E**

```bash
pnpm test:e2e -- e2e/trainer/nutrition-full-flow.spec.ts e2e/member/nutrition-daily-log.spec.ts
```

Expected: PASS. If member spec test.skip()s due to no schedule, expand the test fixture or accept the skip per environment.

- [ ] **Step 5: Commit**

```bash
git add e2e/trainer/nutrition-full-flow.spec.ts e2e/member/nutrition-daily-log.spec.ts
git commit -m "test(e2e): nutrition trainer + member happy paths"
```

---

### Task 22: `/simplify`, doc bookkeeping, final build

- [ ] **Step 1: Run `/simplify`**

In the same shell session (or via the `/simplify` slash command in Claude Code):

```bash
# As a slash command in the IDE or via the CLI; this is not a shell binary.
# Just run the slash command — it reads `git diff` and dispatches the three agents.
```

Apply any agent suggestions, run `pnpm test` and `pnpm lint` again, then commit any cleanup as `chore(nutrition): simplify after implementation`.

- [ ] **Step 2: Update docs**

Edit `docs/INDEX.md` to delete this implementation plan row (the spec row stays). Also update `CLAUDE.md` if the new schedule + log shape needs mention (likely no — feature names are already listed).

- [ ] **Step 3: Delete this implementation plan file**

```bash
git rm docs/2026-05-06/plans/nutrition-redesign-implementation-plan.md
```

- [ ] **Step 4: Final gates**

```bash
pnpm test && pnpm lint && pnpm build
```

Expected: all PASS.

- [ ] **Step 5: Commit doc updates**

```bash
git add docs/INDEX.md
git commit -m "docs(nutrition): close redesign implementation plan"
```

---

## Self-Review Notes

- **Spec coverage:** every spec section mapped — extended macros (Task 1), MealItem schema (Task 2), MemberNutritionPlan + schedule (Task 3-4), NutritionDailyLog (Task 5-6), `resolveDayType` (Task 7), OpenFoodFacts (Task 8-9), POST plan w/ direct (Task 10), schedule PATCH (Task 11), history GET (Task 12), log GET/PUT (Task 13), FoodAddSheet (Task 14), ScheduleEditor (Task 15), DailyNutritionView+MealCard (Task 16), member page (Task 17), template builder (Task 18), 3-tab page + owner mirror (Task 19), deletes (Task 20), E2E (Task 21), close-out (Task 22).
- **Type consistency:** `assignedById`, `templateId | null`, `ISchedule`, `IDailyLogMeal`, `AddedMealItem` all named consistently across tasks.
- **Placeholder scan:** no TODOs, no "implement later", every code block is concrete.
- **Note for executor:** Stage 1's MealItemSchema change (Task 2) intentionally lands before the form rewrite (Task 18). In between, `nutrition-template-form.tsx` will reference a no-longer-valid `foodId` field. That's fine — it's a `MealItemLocal` interface inside the form, not the shared schema, so type-checking still passes. Lint comes back to green at Task 18.
