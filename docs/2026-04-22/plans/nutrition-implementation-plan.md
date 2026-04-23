# Nutrition Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Nutrition Plans: trainers create multi-day-type meal templates with food items and macro targets, assign deep-copy instances to members, members view their plan read-only.

**Architecture:** NutritionTemplate (trainer creates) → deep-copy on assignment → MemberNutritionPlan (member receives). Food collection stores reusable food items with per-100g and/or per-serving macros. `calculateMacros` converts quantity to macro snapshot. All DB access via repository pattern matching existing exercise/plan patterns.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, MongoDB/Mongoose, Auth.js v5 (`next-auth@beta`), Jest + React Testing Library, pnpm

---

## File Map

### lib
| File | Responsibility |
|------|----------------|
| `src/lib/nutrition/macros.ts` | Pure `calculateMacros` function |
| `src/lib/db/models/food.model.ts` | Food schema + IFood |
| `src/lib/db/models/nutrition-template.model.ts` | NutritionTemplate schema + interfaces |
| `src/lib/db/models/member-nutrition-plan.model.ts` | MemberNutritionPlan schema |
| `src/lib/repositories/food.repository.ts` | IFoodRepository + MongoFoodRepository |
| `src/lib/repositories/nutrition-template.repository.ts` | INutritionTemplateRepository + Mongo impl |
| `src/lib/repositories/member-nutrition-plan.repository.ts` | IMemberNutritionPlanRepository + Mongo impl |

### API routes
| File | Responsibility |
|------|----------------|
| `src/app/api/foods/route.ts` | GET + POST /api/foods |
| `src/app/api/nutrition-templates/route.ts` | GET + POST /api/nutrition-templates |
| `src/app/api/nutrition-templates/[id]/route.ts` | GET + PUT + DELETE /api/nutrition-templates/[id] |
| `src/app/api/members/[memberId]/nutrition/route.ts` | GET + POST /api/members/[memberId]/nutrition |

### UI pages
| File | Responsibility |
|------|----------------|
| `src/app/(dashboard)/trainer/nutrition/page.tsx` | Template list (Server) |
| `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx` | List client component |
| `src/app/(dashboard)/trainer/nutrition/new/page.tsx` | Create template (Client) |
| `src/app/(dashboard)/trainer/nutrition/[id]/edit/page.tsx` | Edit template (Client) |
| `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx` | Form client component |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx` | Member nutrition management (Server) |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx` | Assign plan client component |
| `src/app/(dashboard)/member/nutrition/page.tsx` | Member nutrition view (Server) |
| `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx` | Day-type tab viewer (Client) |

### Test files
| File | What it tests |
|------|--------------|
| `__tests__/lib/nutrition/macros.test.ts` | calculateMacros edge cases |
| `__tests__/lib/repositories/food.repository.test.ts` | MongoFoodRepository |
| `__tests__/lib/repositories/nutrition-template.repository.test.ts` | MongoNutritionTemplateRepository |
| `__tests__/lib/repositories/member-nutrition-plan.repository.test.ts` | MongoMemberNutritionPlanRepository |
| `__tests__/app/api/foods.test.ts` | /api/foods |
| `__tests__/app/api/nutrition-templates.test.ts` | /api/nutrition-templates |
| `__tests__/app/api/nutrition-templates-id.test.ts` | /api/nutrition-templates/[id] |
| `__tests__/app/api/members-nutrition.test.ts` | /api/members/[memberId]/nutrition |
| `__tests__/app/trainer/nutrition-template-list.test.tsx` | NutritionTemplateList |
| `__tests__/app/trainer/nutrition-template-form.test.tsx` | NutritionTemplateForm |
| `__tests__/app/trainer/trainer-member-nutrition.test.tsx` | TrainerMemberNutritionClient |
| `__tests__/app/member/nutrition-plan-viewer.test.tsx` | NutritionPlanViewer |

---

## Task 1: calculateMacros 纯函数

**Files:**
- Create: `src/lib/nutrition/macros.ts`
- Test: `__tests__/lib/nutrition/macros.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/nutrition/macros.test.ts
import { calculateMacros } from '@/lib/nutrition/macros';

const foodPer100g = {
  per100g: { kcal: 200, protein: 20, carbs: 10, fat: 8 },
  perServing: null,
};

const foodPerServingOnly = {
  per100g: null,
  perServing: { servingLabel: '1片', grams: 30, kcal: 60, protein: 6, carbs: 3, fat: 2.4 },
};

describe('calculateMacros', () => {
  it('calculates macros from per100g for given quantity', () => {
    const result = calculateMacros(foodPer100g, 150);
    expect(result.kcal).toBeCloseTo(300);
    expect(result.protein).toBeCloseTo(30);
    expect(result.carbs).toBeCloseTo(15);
    expect(result.fat).toBeCloseTo(12);
  });

  it('falls back to perServing when per100g is null', () => {
    // 90g = 3 servings of 30g
    const result = calculateMacros(foodPerServingOnly, 90);
    expect(result.kcal).toBeCloseTo(180);
    expect(result.protein).toBeCloseTo(18);
    expect(result.carbs).toBeCloseTo(9);
    expect(result.fat).toBeCloseTo(7.2);
  });

  it('returns zeros when quantityG is 0', () => {
    const result = calculateMacros(foodPer100g, 0);
    expect(result.kcal).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // 33g of 200kcal/100g food = 66 kcal
    const result = calculateMacros(foodPer100g, 33);
    expect(result.kcal).toBeCloseTo(66, 1);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/lib/nutrition/macros.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/nutrition/macros'`

- [ ] **Step 3: Implement**

```ts
// src/lib/nutrition/macros.ts
export interface MacroSnapshot {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodMacroSource {
  per100g: { kcal: number; protein: number; carbs: number; fat: number } | null;
  perServing: { servingLabel: string; grams: number; kcal: number; protein: number; carbs: number; fat: number } | null;
}

export function calculateMacros(food: FoodMacroSource, quantityG: number): MacroSnapshot {
  if (quantityG === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  if (food.per100g) {
    const ratio = quantityG / 100;
    return {
      kcal: food.per100g.kcal * ratio,
      protein: food.per100g.protein * ratio,
      carbs: food.per100g.carbs * ratio,
      fat: food.per100g.fat * ratio,
    };
  }

  const serving = food.perServing!;
  const ratio = quantityG / serving.grams;
  return {
    kcal: serving.kcal * ratio,
    protein: serving.protein * ratio,
    carbs: serving.carbs * ratio,
    fat: serving.fat * ratio,
  };
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test __tests__/lib/nutrition/macros.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/macros.ts __tests__/lib/nutrition/macros.test.ts
git commit -m "feat: add calculateMacros pure function"
```

---

## Task 2: Mongoose Models

Models have no business logic — correctness verified by repository tests. Implement all three directly.

**Files:**
- Create: `src/lib/db/models/food.model.ts`
- Create: `src/lib/db/models/nutrition-template.model.ts`
- Create: `src/lib/db/models/member-nutrition-plan.model.ts`

- [ ] **Step 1: Create food.model.ts**

```ts
// src/lib/db/models/food.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPer100g {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IPerServing {
  servingLabel: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IFood extends Document {
  name: string;
  brand: string | null;
  source: 'manual' | 'api';
  externalId: string | null;
  createdBy: mongoose.Types.ObjectId | null;
  isGlobal: boolean;
  per100g: IPer100g | null;
  perServing: IPerServing | null;
  createdAt: Date;
}

const Per100gSchema = new Schema<IPer100g>(
  { kcal: Number, protein: Number, carbs: Number, fat: Number },
  { _id: false },
);

const PerServingSchema = new Schema<IPerServing>(
  { servingLabel: String, grams: Number, kcal: Number, protein: Number, carbs: Number, fat: Number },
  { _id: false },
);

const FoodSchema = new Schema<IFood>(
  {
    name: { type: String, required: true },
    brand: { type: String, default: null },
    source: { type: String, enum: ['manual', 'api'], required: true, default: 'manual' },
    externalId: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, default: null },
    isGlobal: { type: Boolean, required: true, default: false },
    per100g: { type: Per100gSchema, default: null },
    perServing: { type: PerServingSchema, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

FoodSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const FoodModel: Model<IFood> =
  mongoose.models.Food ?? mongoose.model<IFood>('Food', FoodSchema);
```

- [ ] **Step 2: Create nutrition-template.model.ts**

```ts
// src/lib/db/models/nutrition-template.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMealItem {
  foodId: mongoose.Types.ObjectId;
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IMeal {
  name: string;
  order: number;
  items: IMealItem[];
}

export interface IDayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: IMeal[];
}

export interface INutritionTemplate extends Document {
  name: string;
  description: string | null;
  createdBy: mongoose.Types.ObjectId;
  dayTypes: IDayType[];
  createdAt: Date;
}

const MealItemSchema = new Schema<IMealItem>(
  {
    foodId: { type: Schema.Types.ObjectId, required: true },
    foodName: { type: String, required: true },
    quantityG: { type: Number, required: true },
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
  { _id: false },
);

const MealSchema = new Schema<IMeal>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    items: [MealItemSchema],
  },
  { _id: false },
);

const DayTypeSchema = new Schema<IDayType>(
  {
    name: { type: String, required: true },
    targetKcal: { type: Number, required: true },
    targetProtein: { type: Number, required: true },
    targetCarbs: { type: Number, required: true },
    targetFat: { type: Number, required: true },
    meals: [MealSchema],
  },
  { _id: false },
);

const NutritionTemplateSchema = new Schema<INutritionTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    dayTypes: [DayTypeSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const NutritionTemplateModel: Model<INutritionTemplate> =
  mongoose.models.NutritionTemplate ??
  mongoose.model<INutritionTemplate>('NutritionTemplate', NutritionTemplateSchema);
```

- [ ] **Step 3: Create member-nutrition-plan.model.ts**

```ts
// src/lib/db/models/member-nutrition-plan.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IDayType } from './nutrition-template.model';

export interface IMemberNutritionPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  assignedAt: Date;
  dayTypes: IDayType[];
}

const MealItemSchema = new Schema(
  {
    foodId: { type: Schema.Types.ObjectId, required: true },
    foodName: { type: String, required: true },
    quantityG: { type: Number, required: true },
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
  { _id: false },
);

const MealSchema = new Schema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    items: [MealItemSchema],
  },
  { _id: false },
);

const DayTypeSchema = new Schema(
  {
    name: { type: String, required: true },
    targetKcal: { type: Number, required: true },
    targetProtein: { type: Number, required: true },
    targetCarbs: { type: Number, required: true },
    targetFat: { type: Number, required: true },
    meals: [MealSchema],
  },
  { _id: false },
);

const MemberNutritionPlanSchema = new Schema<IMemberNutritionPlan>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    templateId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
    assignedAt: { type: Date, required: true },
    dayTypes: [DayTypeSchema],
  },
  { timestamps: false },
);

MemberNutritionPlanSchema.index({ memberId: 1, isActive: 1 });

export const MemberNutritionPlanModel: Model<IMemberNutritionPlan> =
  mongoose.models.MemberNutritionPlan ??
  mongoose.model<IMemberNutritionPlan>('MemberNutritionPlan', MemberNutritionPlanSchema);
```

- [ ] **Step 4: Confirm TypeScript compiles**

```bash
pnpm build 2>&1 | head -20
```
Expected: No TypeScript errors for the new model files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/models/food.model.ts src/lib/db/models/nutrition-template.model.ts src/lib/db/models/member-nutrition-plan.model.ts
git commit -m "feat: add Mongoose models for nutrition plans feature"
```

---

## Task 3: FoodRepository

**Files:**
- Create: `src/lib/repositories/food.repository.ts`
- Test: `__tests__/lib/repositories/food.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/food.repository.test.ts
import mongoose from 'mongoose';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { FoodModel } from '@/lib/db/models/food.model';

jest.mock('@/lib/db/models/food.model', () => ({
  FoodModel: Object.assign(jest.fn(), {
    find: jest.fn(),
  }),
}));

const mockModel = jest.mocked(FoodModel);

describe('MongoFoodRepository', () => {
  let repo: MongoFoodRepository;

  beforeEach(() => {
    repo = new MongoFoodRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('queries only isGlobal when no creatorId', async () => {
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

    it('returns foods from model', async () => {
      const foods = [{ _id: 'f1', name: '鸡胸肉' }];
      mockModel.find.mockResolvedValue(foods as never);
      const result = await repo.findAll({});
      expect(result).toEqual(foods);
    });
  });

  describe('create', () => {
    it('saves and returns new food', async () => {
      const saved = { _id: 'f1', name: '白米饭' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (FoodModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        name: '白米饭',
        brand: null,
        createdBy: 'trainer-id',
        isGlobal: false,
        per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
        perServing: null,
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/lib/repositories/food.repository.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/repositories/food.repository'`

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/food.repository.ts
import mongoose from 'mongoose';
import type { IFood, IPer100g, IPerServing } from '@/lib/db/models/food.model';
import { FoodModel } from '@/lib/db/models/food.model';

export interface CreateFoodData {
  name: string;
  brand: string | null;
  createdBy: string | null;
  isGlobal: boolean;
  per100g: IPer100g | null;
  perServing: IPerServing | null;
}

export interface FindFoodsOptions {
  creatorId?: string | null;
}

export interface IFoodRepository {
  findAll(options: FindFoodsOptions): Promise<IFood[]>;
  create(data: CreateFoodData): Promise<IFood>;
}

export class MongoFoodRepository implements IFoodRepository {
  async findAll({ creatorId }: FindFoodsOptions = {}): Promise<IFood[]> {
    const query = creatorId
      ? { $or: [{ isGlobal: true }, { createdBy: new mongoose.Types.ObjectId(creatorId) }] }
      : { isGlobal: true };
    return FoodModel.find(query);
  }

  async create(data: CreateFoodData): Promise<IFood> {
    const food = new FoodModel({
      ...data,
      source: 'manual',
      externalId: null,
      createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : null,
    });
    return food.save();
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test __tests__/lib/repositories/food.repository.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/food.repository.ts __tests__/lib/repositories/food.repository.test.ts
git commit -m "feat: add FoodRepository"
```

---

## Task 4: NutritionTemplateRepository

**Files:**
- Create: `src/lib/repositories/nutrition-template.repository.ts`
- Test: `__tests__/lib/repositories/nutrition-template.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/nutrition-template.repository.test.ts
import mongoose from 'mongoose';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { NutritionTemplateModel } from '@/lib/db/models/nutrition-template.model';

jest.mock('@/lib/db/models/nutrition-template.model', () => ({
  NutritionTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

const mockModel = jest.mocked(NutritionTemplateModel);

describe('MongoNutritionTemplateRepository', () => {
  let repo: MongoNutritionTemplateRepository;

  beforeEach(() => {
    repo = new MongoNutritionTemplateRepository();
    jest.clearAllMocks();
  });

  it('findByCreator queries by createdBy ObjectId', async () => {
    mockModel.find.mockResolvedValue([] as never);
    const id = new mongoose.Types.ObjectId().toString();
    await repo.findByCreator(id);
    expect(mockModel.find).toHaveBeenCalledWith({
      createdBy: expect.any(mongoose.Types.ObjectId),
    });
  });

  it('findById delegates to model', async () => {
    const template = { _id: 't1', name: '减脂计划' };
    mockModel.findById.mockResolvedValue(template as never);
    const result = await repo.findById('t1');
    expect(result).toEqual(template);
  });

  it('create saves and returns template', async () => {
    const saved = { _id: 't1', name: '增肌计划' };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (NutritionTemplateModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const result = await repo.create({
      name: '增肌计划',
      description: null,
      createdBy: 'trainer-id',
      dayTypes: [],
    });

    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('update calls findByIdAndUpdate with $set', async () => {
    const updated = { _id: 't1', name: 'Updated' };
    mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);
    const result = await repo.update('t1', { name: 'Updated' });
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('t1', { $set: { name: 'Updated' } }, { new: true });
    expect(result).toEqual(updated);
  });

  it('deleteById calls findOneAndDelete with createdBy check', async () => {
    mockModel.findOneAndDelete.mockResolvedValue({ _id: 't1' } as never);
    const result = await repo.deleteById('t1', 'trainer-id');
    expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: 't1',
      createdBy: expect.any(mongoose.Types.ObjectId),
    });
    expect(result).toBe(true);
  });

  it('deleteById returns false when not found', async () => {
    mockModel.findOneAndDelete.mockResolvedValue(null as never);
    const result = await repo.deleteById('t1', 'trainer-id');
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/lib/repositories/nutrition-template.repository.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/repositories/nutrition-template.repository'`

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/nutrition-template.repository.ts
import mongoose from 'mongoose';
import type { INutritionTemplate, IDayType } from '@/lib/db/models/nutrition-template.model';
import { NutritionTemplateModel } from '@/lib/db/models/nutrition-template.model';

export interface CreateNutritionTemplateData {
  name: string;
  description: string | null;
  createdBy: string;
  dayTypes: IDayType[];
}

export interface UpdateNutritionTemplateData {
  name?: string;
  description?: string | null;
  dayTypes?: IDayType[];
}

export interface INutritionTemplateRepository {
  findByCreator(createdBy: string): Promise<INutritionTemplate[]>;
  findById(id: string): Promise<INutritionTemplate | null>;
  create(data: CreateNutritionTemplateData): Promise<INutritionTemplate>;
  update(id: string, data: UpdateNutritionTemplateData): Promise<INutritionTemplate | null>;
  deleteById(id: string, createdBy: string): Promise<boolean>;
}

export class MongoNutritionTemplateRepository implements INutritionTemplateRepository {
  async findByCreator(createdBy: string): Promise<INutritionTemplate[]> {
    return NutritionTemplateModel.find({ createdBy: new mongoose.Types.ObjectId(createdBy) });
  }

  async findById(id: string): Promise<INutritionTemplate | null> {
    return NutritionTemplateModel.findById(id);
  }

  async create(data: CreateNutritionTemplateData): Promise<INutritionTemplate> {
    const template = new NutritionTemplateModel({
      ...data,
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
    });
    return template.save();
  }

  async update(id: string, data: UpdateNutritionTemplateData): Promise<INutritionTemplate | null> {
    return NutritionTemplateModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string, createdBy: string): Promise<boolean> {
    const result = await NutritionTemplateModel.findOneAndDelete({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
    return result !== null;
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test __tests__/lib/repositories/nutrition-template.repository.test.ts
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/nutrition-template.repository.ts __tests__/lib/repositories/nutrition-template.repository.test.ts
git commit -m "feat: add NutritionTemplateRepository"
```

---

## Task 5: MemberNutritionPlanRepository

**Files:**
- Create: `src/lib/repositories/member-nutrition-plan.repository.ts`
- Test: `__tests__/lib/repositories/member-nutrition-plan.repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/repositories/member-nutrition-plan.repository.test.ts
import mongoose from 'mongoose';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';

jest.mock('@/lib/db/models/member-nutrition-plan.model', () => ({
  MemberNutritionPlanModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    updateMany: jest.fn(),
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
    const result = await repo.findActive('member-id');
    expect(mockModel.findOne).toHaveBeenCalledWith({
      memberId: expect.any(mongoose.Types.ObjectId),
      isActive: true,
    });
    expect(result).toEqual(plan);
  });

  it('findActive returns null when no active plan', async () => {
    mockModel.findOne.mockResolvedValue(null as never);
    const result = await repo.findActive('member-id');
    expect(result).toBeNull();
  });

  it('deactivateAll calls updateMany with isActive:false', async () => {
    mockModel.updateMany.mockResolvedValue({} as never);
    await repo.deactivateAll('member-id');
    expect(mockModel.updateMany).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId) },
      { $set: { isActive: false } },
    );
  });

  it('create saves and returns new plan', async () => {
    const saved = { _id: 'np1', name: '增肌计划', isActive: true };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (MemberNutritionPlanModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const result = await repo.create({
      memberId: 'member-id',
      trainerId: 'trainer-id',
      templateId: 'template-id',
      name: '增肌计划',
      dayTypes: [],
      assignedAt: new Date(),
    });

    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/lib/repositories/member-nutrition-plan.repository.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/repositories/member-nutrition-plan.repository'`

- [ ] **Step 3: Implement**

```ts
// src/lib/repositories/member-nutrition-plan.repository.ts
import mongoose from 'mongoose';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export interface CreateMemberNutritionPlanData {
  memberId: string;
  trainerId: string;
  templateId: string;
  name: string;
  dayTypes: IDayType[];
  assignedAt: Date;
}

export interface IMemberNutritionPlanRepository {
  findActive(memberId: string): Promise<IMemberNutritionPlan | null>;
  deactivateAll(memberId: string): Promise<void>;
  create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan>;
}

export class MongoMemberNutritionPlanRepository implements IMemberNutritionPlanRepository {
  async findActive(memberId: string): Promise<IMemberNutritionPlan | null> {
    return MemberNutritionPlanModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await MemberNutritionPlanModel.updateMany(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: { isActive: false } },
    );
  }

  async create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan> {
    const plan = new MemberNutritionPlanModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
      templateId: new mongoose.Types.ObjectId(data.templateId),
      name: data.name,
      dayTypes: data.dayTypes,
      isActive: true,
      assignedAt: data.assignedAt,
    });
    return plan.save();
  }
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test __tests__/lib/repositories/member-nutrition-plan.repository.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/member-nutrition-plan.repository.ts __tests__/lib/repositories/member-nutrition-plan.repository.test.ts
git commit -m "feat: add MemberNutritionPlanRepository"
```

---

## Task 6: GET + POST /api/foods

**Files:**
- Create: `src/app/api/foods/route.ts`
- Test: `__tests__/app/api/foods.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/foods.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockFoodRepo = { findAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/food.repository', () => ({
  MongoFoodRepository: jest.fn(() => mockFoodRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/foods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    expect(res.status).toBe(401);
  });

  it('returns foods for trainer (global + own)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    const foods = [{ name: '鸡胸肉' }];
    mockFoodRepo.findAll.mockResolvedValue(foods);

    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockFoodRepo.findAll).toHaveBeenCalledWith({ creatorId: 't1' });
    expect(data).toEqual(foods);
  });

  it('returns foods for member using trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 'trainer1' } } as never);
    mockFoodRepo.findAll.mockResolvedValue([]);

    const { GET } = await import('@/app/api/foods/route');
    await GET(new Request('http://localhost/api/foods'));

    expect(mockFoodRepo.findAll).toHaveBeenCalledWith({ creatorId: 'trainer1' });
  });
});

describe('POST /api/foods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to create', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(new Request('http://localhost/api/foods', {
      method: 'POST',
      body: JSON.stringify({ name: '燕麦', per100g: { kcal: 370, protein: 13, carbs: 60, fat: 7 } }),
    }));
    expect(res.status).toBe(403);
  });

  it('creates food for trainer and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const created = { _id: 'f1', name: '燕麦' };
    mockFoodRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(new Request('http://localhost/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '燕麦',
        brand: null,
        per100g: { kcal: 370, protein: 13, carbs: 60, fat: 7 },
        perServing: null,
      }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockFoodRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: '燕麦',
      isGlobal: false,
      createdBy: 't1',
    }));
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/api/foods.test.ts
```
Expected: FAIL — `Cannot find module '@/app/api/foods/route'`

- [ ] **Step 3: Implement**

```ts
// src/app/api/foods/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import type { UserRole } from '@/types/auth';
import type { IPer100g, IPerServing } from '@/lib/db/models/food.model';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const repo = new MongoFoodRepository();
  const role = session.user.role as UserRole;

  const creatorId = role === 'member'
    ? (session.user.trainerId ?? null)
    : session.user.id;

  const foods = await repo.findAll({ creatorId });
  return Response.json(foods);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if ((session.user.role as UserRole) === 'member') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const body = (await req.json()) as {
    name: string;
    brand?: string | null;
    per100g?: IPer100g | null;
    perServing?: IPerServing | null;
  };

  const repo = new MongoFoodRepository();
  const food = await repo.create({
    name: body.name,
    brand: body.brand ?? null,
    createdBy: session.user.id,
    isGlobal: false,
    per100g: body.per100g ?? null,
    perServing: body.perServing ?? null,
  });

  return Response.json(food, { status: 201 });
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test __tests__/app/api/foods.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/foods/route.ts __tests__/app/api/foods.test.ts
git commit -m "feat: add GET+POST /api/foods"
```

---

## Task 7: GET + POST /api/nutrition-templates

**Files:**
- Create: `src/app/api/nutrition-templates/route.ts`
- Test: `__tests__/app/api/nutrition-templates.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/nutrition-templates.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockTemplateRepo = { findByCreator: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/nutrition-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/nutrition-templates/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/nutrition-templates/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns templates for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const templates = [{ _id: 't1', name: '减脂计划' }];
    mockTemplateRepo.findByCreator.mockResolvedValue(templates);

    const { GET } = await import('@/app/api/nutrition-templates/route');
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockTemplateRepo.findByCreator).toHaveBeenCalledWith('t1');
    expect(data).toEqual(templates);
  });
});

describe('POST /api/nutrition-templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member calls', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/nutrition-templates/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    }));
    expect(res.status).toBe(403);
  });

  it('creates template and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const created = { _id: 'tpl1', name: '增肌计划' };
    mockTemplateRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/nutrition-templates/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '增肌计划', description: null, dayTypes: [] }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockTemplateRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: '增肌计划',
      createdBy: 't1',
    }));
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/api/nutrition-templates.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/app/api/nutrition-templates/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import type { UserRole } from '@/types/auth';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

function requireTrainerOrOwner(role: UserRole): Response | null {
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = requireTrainerOrOwner(session.user.role as UserRole);
  if (denied) return denied;

  await connectDB();
  const repo = new MongoNutritionTemplateRepository();
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
    dayTypes?: IDayType[];
  };

  const repo = new MongoNutritionTemplateRepository();
  const template = await repo.create({
    name: body.name,
    description: body.description ?? null,
    createdBy: session.user.id,
    dayTypes: body.dayTypes ?? [],
  });

  return Response.json(template, { status: 201 });
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test __tests__/app/api/nutrition-templates.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/nutrition-templates/route.ts __tests__/app/api/nutrition-templates.test.ts
git commit -m "feat: add GET+POST /api/nutrition-templates"
```

---

## Task 8: GET + PUT + DELETE /api/nutrition-templates/[id]

**Files:**
- Create: `src/app/api/nutrition-templates/[id]/route.ts`
- Test: `__tests__/app/api/nutrition-templates-id.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/nutrition-templates-id.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockTemplateRepo = { findById: jest.fn(), update: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/nutrition-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when template not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue(null);

    const { GET } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses another trainer template', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't2' } });

    const { GET } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(403);
  });

  it('returns template when authorized', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const template = { _id: 'tpl1', createdBy: { toString: () => 't1' }, name: '减脂计划' };
    mockTemplateRepo.findById.mockResolvedValue(template);

    const { GET } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/nutrition-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns updated template', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't1' } });
    const updated = { _id: 'tpl1', name: '新名称' };
    mockTemplateRepo.update.mockResolvedValue(updated);

    const { PUT } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await PUT(
      new Request('http://localhost/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新名称' }),
      }),
      makeParams('tpl1'),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(updated);
  });
});

describe('DELETE /api/nutrition-templates/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 on successful delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', createdBy: { toString: () => 't1' } });
    mockTemplateRepo.deleteById.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/nutrition-templates/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('tpl1'));
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/api/nutrition-templates-id.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/app/api/nutrition-templates/[id]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import type { UserRole } from '@/types/auth';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

type RouteContext = { params: Promise<{ id: string }> };

async function getAuthorizedTemplate(id: string, userId: string, role: UserRole) {
  const repo = new MongoNutritionTemplateRepository();
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

  const body = (await req.json()) as { name?: string; description?: string | null; dayTypes?: IDayType[] };
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
pnpm test __tests__/app/api/nutrition-templates-id.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/nutrition-templates/[id]/route.ts __tests__/app/api/nutrition-templates-id.test.ts
git commit -m "feat: add GET+PUT+DELETE /api/nutrition-templates/[id]"
```

---

## Task 9: GET + POST /api/members/[memberId]/nutrition

**Files:**
- Create: `src/app/api/members/[memberId]/nutrition/route.ts`
- Test: `__tests__/app/api/members-nutrition.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/app/api/members-nutrition.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

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

describe('GET /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns active nutrition plan for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const plan = { _id: 'np1', name: '减脂计划', isActive: true };
    mockNutritionPlanRepo.findActive.mockResolvedValue(plan);

    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(plan);
  });

  it('returns null when no active plan', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockNutritionPlanRepo.findActive.mockResolvedValue(null);

    const { GET } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toBeNull();
  });
});

describe('POST /api/members/[memberId]/nutrition', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member calls POST', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('assigns template as deep copy to member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', trainerId: { toString: () => 'trainer1' } });
    const template = {
      _id: 'tpl1',
      name: '增肌计划',
      dayTypes: [{ name: '训练日', targetKcal: 3000, targetProtein: 200, targetCarbs: 300, targetFat: 80, meals: [] }],
    };
    mockTemplateRepo.findById.mockResolvedValue(template);
    mockNutritionPlanRepo.deactivateAll.mockResolvedValue(undefined);
    const created = { _id: 'np1', name: '增肌计划', isActive: true };
    mockNutritionPlanRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'tpl1' }),
      }),
      makeParams('m1'),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockNutritionPlanRepo.deactivateAll).toHaveBeenCalledWith('m1');
    expect(mockNutritionPlanRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1',
      trainerId: 'trainer1',
      name: '增肌计划',
    }));
    expect(data).toEqual(created);
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/api/members-nutrition.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/app/api/members/[memberId]/nutrition/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
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
  const body = (await req.json()) as { templateId: string };

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const templateRepo = new MongoNutritionTemplateRepository();
  const template = await templateRepo.findById(body.templateId);
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  const planRepo = new MongoMemberNutritionPlanRepository();
  await planRepo.deactivateAll(memberId);

  const plan = await planRepo.create({
    memberId,
    trainerId: session.user.id,
    templateId: body.templateId,
    name: template.name,
    dayTypes: JSON.parse(JSON.stringify(template.dayTypes)) as typeof template.dayTypes,
    assignedAt: new Date(),
  });

  return Response.json(plan, { status: 201 });
}
```

- [ ] **Step 4: Run test — confirm GREEN**

```bash
pnpm test __tests__/app/api/members-nutrition.test.ts
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/nutrition/route.ts __tests__/app/api/members-nutrition.test.ts
git commit -m "feat: add GET+POST /api/members/[memberId]/nutrition"
```

---

## Task 10: NutritionTemplateList 组件 + 训练师模板列表页

**Files:**
- Create: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx`
- Create: `src/app/(dashboard)/trainer/nutrition/page.tsx`
- Test: `__tests__/app/trainer/nutrition-template-list.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/app/trainer/nutrition-template-list.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionTemplateList } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list';

const mockTemplates = [
  { _id: 'tpl1', name: '减脂计划', description: '低热量方案', dayTypes: [{ name: '训练日' }, { name: '休息日' }] },
  { _id: 'tpl2', name: '增肌计划', description: null, dayTypes: [] },
];

describe('NutritionTemplateList', () => {
  it('renders all template names', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('减脂计划')).toBeInTheDocument();
    expect(screen.getByText('增肌计划')).toBeInTheDocument();
  });

  it('shows description when present', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('低热量方案')).toBeInTheDocument();
  });

  it('shows day type count', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('2 种天类型')).toBeInTheDocument();
  });

  it('shows "新建营养计划" link', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByRole('link', { name: /新建营养计划/i })).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    render(<NutritionTemplateList templates={[]} />);
    expect(screen.getByText(/还没有营养计划/i)).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    render(<NutritionTemplateList templates={mockTemplates} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /删除/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('tpl1'));
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/trainer/nutrition-template-list.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Implement NutritionTemplateList**

```tsx
// src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list.tsx
'use client';

import Link from 'next/link';

interface Template {
  _id: string;
  name: string;
  description: string | null;
  dayTypes: { name: string }[];
}

interface Props {
  templates: Template[];
  onDelete?: (id: string) => Promise<void>;
}

export function NutritionTemplateList({ templates, onDelete }: Props) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>还没有营养计划</p>
        <Link href="/dashboard/trainer/nutrition/new" className="mt-4 inline-block text-primary underline">
          新建营养计划
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">营养计划模板</h1>
        <Link
          href="/dashboard/trainer/nutrition/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          新建营养计划
        </Link>
      </div>
      <ul className="space-y-3">
        {templates.map((t) => (
          <li key={t._id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Link href={`/dashboard/trainer/nutrition/${t._id}/edit`} className="font-medium hover:underline">
                {t.name}
              </Link>
              {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{t.dayTypes.length} 种天类型</p>
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

- [ ] **Step 4: Create trainer nutrition page (Server Component)**

```tsx
// src/app/(dashboard)/trainer/nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { NutritionTemplateList } from './_components/nutrition-template-list';
import { revalidatePath } from 'next/cache';

export default async function TrainerNutritionPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoNutritionTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  const plain = JSON.parse(JSON.stringify(templates)) as { _id: string; name: string; description: string | null; dayTypes: { name: string }[] }[];

  async function handleDelete(id: string) {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    await connectDB();
    const r = new MongoNutritionTemplateRepository();
    await r.deleteById(id, s.user.id);
    revalidatePath('/dashboard/trainer/nutrition');
  }

  return <NutritionTemplateList templates={plain} onDelete={handleDelete} />;
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test __tests__/app/trainer/nutrition-template-list.test.tsx
```
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/trainer/nutrition/ __tests__/app/trainer/nutrition-template-list.test.tsx
git commit -m "feat: add trainer nutrition template list page"
```

---

## Task 11: NutritionTemplateForm 组件 + 新建/编辑页

**Files:**
- Create: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx`
- Create: `src/app/(dashboard)/trainer/nutrition/new/page.tsx`
- Create: `src/app/(dashboard)/trainer/nutrition/[id]/edit/page.tsx`
- Test: `__tests__/app/trainer/nutrition-template-form.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/app/trainer/nutrition-template-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NutritionTemplateForm } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('NutritionTemplateForm', () => {
  it('renders name and description fields', () => {
    render(<NutritionTemplateForm onSubmit={jest.fn()} foods={[]} />);
    expect(screen.getByLabelText(/计划名称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/描述/i)).toBeInTheDocument();
  });

  it('can add a day type', () => {
    render(<NutritionTemplateForm onSubmit={jest.fn()} foods={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /添加天类型/i }));
    expect(screen.getByPlaceholderText(/如：训练日/i)).toBeInTheDocument();
  });

  it('calls onSubmit with plan data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<NutritionTemplateForm onSubmit={onSubmit} foods={[]} />);

    await user.type(screen.getByLabelText(/计划名称/i), '减脂计划');
    fireEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: '减脂计划' }),
    ));
  });

  it('pre-fills fields when initialData provided', () => {
    render(
      <NutritionTemplateForm
        onSubmit={jest.fn()}
        foods={[]}
        initialData={{ name: '增肌计划', description: '高蛋白', dayTypes: [] }}
      />,
    );
    expect(screen.getByDisplayValue('增肌计划')).toBeInTheDocument();
    expect(screen.getByDisplayValue('高蛋白')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/trainer/nutrition-template-form.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Implement NutritionTemplateForm**

```tsx
// src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx
'use client';

import { useState } from 'react';
import type { IDayType, IMealItem } from '@/lib/db/models/nutrition-template.model';
import { calculateMacros } from '@/lib/nutrition/macros';
import type { IFood } from '@/lib/db/models/food.model';

interface FormData {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}

interface Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  foods: Pick<IFood, '_id' | 'name' | 'per100g' | 'perServing'>[];
}

export function NutritionTemplateForm({ initialData, onSubmit, foods }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dayTypes, setDayTypes] = useState<IDayType[]>(initialData?.dayTypes ?? []);
  const [saving, setSaving] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');

  function addDayType() {
    setDayTypes([...dayTypes, { name: '', targetKcal: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0, meals: [] }]);
  }

  function updateDayType(index: number, patch: Partial<IDayType>) {
    const updated = [...dayTypes];
    updated[index] = { ...updated[index], ...patch };
    setDayTypes(updated);
  }

  function removeDayType(index: number) {
    setDayTypes(dayTypes.filter((_, i) => i !== index));
  }

  function addMeal(dayIndex: number) {
    const day = dayTypes[dayIndex];
    const newMeal = { name: '', order: day.meals.length + 1, items: [] };
    updateDayType(dayIndex, { meals: [...day.meals, newMeal] });
  }

  function updateMealName(dayIndex: number, mealIndex: number, value: string) {
    const updated = [...dayTypes];
    updated[dayIndex].meals[mealIndex].name = value;
    setDayTypes(updated);
  }

  function addFoodToMeal(dayIndex: number, mealIndex: number, food: typeof foods[0], quantityG: number) {
    const macros = calculateMacros(food, quantityG);
    const item: IMealItem = {
      foodId: food._id as unknown as import('mongoose').Types.ObjectId,
      foodName: food.name as string,
      quantityG,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
    const updated = [...dayTypes];
    updated[dayIndex].meals[mealIndex].items = [...updated[dayIndex].meals[mealIndex].items, item];
    setDayTypes(updated);
  }

  const filteredFoods = foodSearch
    ? foods.filter((f) => (f.name as string).toLowerCase().includes(foodSearch.toLowerCase()))
    : foods.slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name, description: description || null, dayTypes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
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
          <h2 className="font-medium">天类型</h2>
          <button type="button" onClick={addDayType} className="text-sm text-primary hover:underline">
            + 添加天类型
          </button>
        </div>

        {dayTypes.map((day, di) => (
          <div key={di} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                placeholder="如：训练日"
                value={day.name}
                onChange={(e) => updateDayType(di, { name: e.target.value })}
                className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => removeDayType(di)} className="text-sm text-destructive">
                删除
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['targetKcal', 'targetProtein', 'targetCarbs', 'targetFat'] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {field === 'targetKcal' ? '千卡' : field === 'targetProtein' ? '蛋白质(g)' : field === 'targetCarbs' ? '碳水(g)' : '脂肪(g)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={day[field]}
                    onChange={(e) => updateDayType(di, { [field]: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">餐食</span>
                <button type="button" onClick={() => addMeal(di)} className="text-xs text-primary hover:underline">
                  + 添加餐食
                </button>
              </div>

              {day.meals.map((meal, mi) => (
                <div key={mi} className="rounded-md border p-3 space-y-2">
                  <input
                    placeholder="如：早餐"
                    value={meal.name}
                    onChange={(e) => updateMealName(di, mi, e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  {meal.items.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {meal.items.map((item, ii) => (
                        <li key={ii} className="text-muted-foreground">
                          {item.foodName} {item.quantityG}g — {item.kcal.toFixed(0)} kcal
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input
                      placeholder="搜索食物"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      className="flex-1 rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                    {filteredFoods.length > 0 && foodSearch && (
                      <select
                        className="rounded-md border px-2 py-1 text-xs"
                        onChange={(e) => {
                          const food = foods.find((f) => String(f._id) === e.target.value);
                          if (food) addFoodToMeal(di, mi, food, 100);
                          setFoodSearch('');
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>选择食物</option>
                        {filteredFoods.map((f) => (
                          <option key={String(f._id)} value={String(f._id)}>{f.name as string}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
// src/app/(dashboard)/trainer/nutrition/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { NewNutritionTemplateClient } from './_client';

export default async function NewNutritionTemplatePage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const foods = await new MongoFoodRepository().findAll({ creatorId: session.user.id });
  const plain = JSON.parse(JSON.stringify(foods));

  return <NewNutritionTemplateClient foods={plain} />;
}
```

```tsx
// src/app/(dashboard)/trainer/nutrition/new/_client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { NutritionTemplateForm } from '../_components/nutrition-template-form';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';
import type { IFood } from '@/lib/db/models/food.model';

export function NewNutritionTemplateClient({ foods }: { foods: Pick<IFood, '_id' | 'name' | 'per100g' | 'perServing'>[] }) {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; dayTypes: IDayType[] }) {
    const res = await fetch('/api/nutrition-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) router.push('/dashboard/trainer/nutrition');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新建营养计划</h1>
      <NutritionTemplateForm onSubmit={handleSubmit} foods={foods} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit template page**

```tsx
// src/app/(dashboard)/trainer/nutrition/[id]/edit/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { notFound } from 'next/navigation';
import { EditNutritionTemplateClient } from './_client';

export default async function EditNutritionTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  await connectDB();

  const [template, foods] = await Promise.all([
    new MongoNutritionTemplateRepository().findById(id),
    new MongoFoodRepository().findAll({ creatorId: session.user.id }),
  ]);

  if (!template) notFound();

  return (
    <EditNutritionTemplateClient
      id={id}
      initialData={JSON.parse(JSON.stringify(template))}
      foods={JSON.parse(JSON.stringify(foods))}
    />
  );
}
```

```tsx
// src/app/(dashboard)/trainer/nutrition/[id]/edit/_client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { NutritionTemplateForm } from '../../_components/nutrition-template-form';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';
import type { IFood } from '@/lib/db/models/food.model';

interface Props {
  id: string;
  initialData: { name: string; description: string | null; dayTypes: IDayType[] };
  foods: Pick<IFood, '_id' | 'name' | 'per100g' | 'perServing'>[];
}

export function EditNutritionTemplateClient({ id, initialData, foods }: Props) {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; dayTypes: IDayType[] }) {
    const res = await fetch(`/api/nutrition-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) router.push('/dashboard/trainer/nutrition');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">编辑营养计划</h1>
      <NutritionTemplateForm initialData={initialData} onSubmit={handleSubmit} foods={foods} />
    </div>
  );
}
```

- [ ] **Step 6: Run test — confirm GREEN**

```bash
pnpm test __tests__/app/trainer/nutrition-template-form.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/trainer/nutrition/ __tests__/app/trainer/nutrition-template-form.test.tsx
git commit -m "feat: add NutritionTemplateForm and new/edit pages"
```

---

## Task 12: 学员营养管理页（训练师端）

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx`
- Test: `__tests__/app/trainer/trainer-member-nutrition.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/app/trainer/trainer-member-nutrition.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockTemplates = [
  { _id: 'tpl1', name: '减脂计划' },
  { _id: 'tpl2', name: '增肌计划' },
];

const mockActivePlan = {
  _id: 'np1',
  name: '减脂计划',
  dayTypes: [{ name: '训练日' }, { name: '休息日' }],
  assignedAt: new Date().toISOString(),
};

describe('TrainerMemberNutritionClient', () => {
  it('shows current active nutrition plan when present', () => {
    render(
      <TrainerMemberNutritionClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={mockActivePlan}
      />,
    );
    expect(screen.getAllByText('减脂计划').length).toBeGreaterThan(0);
  });

  it('shows "未分配营养计划" when no active plan', () => {
    render(
      <TrainerMemberNutritionClient memberId="m1" templates={mockTemplates} activePlan={null} />,
    );
    expect(screen.getByText(/未分配营养计划/i)).toBeInTheDocument();
  });

  it('shows template select and assign button', () => {
    render(
      <TrainerMemberNutritionClient memberId="m1" templates={mockTemplates} activePlan={null} />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /分配计划/i })).toBeInTheDocument();
  });

  it('calls assign API when button clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(
      <TrainerMemberNutritionClient memberId="m1" templates={mockTemplates} activePlan={null} />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tpl1' } });
    fireEvent.click(screen.getByRole('button', { name: /分配计划/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/members/m1/nutrition',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/trainer/trainer-member-nutrition.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Implement client component**

```tsx
// src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Template { _id: string; name: string; }
interface ActivePlan { _id: string; name: string; dayTypes: { name: string }[]; assignedAt: string; }

interface Props {
  memberId: string;
  templates: Template[];
  activePlan: ActivePlan | null;
}

export function TrainerMemberNutritionClient({ memberId, templates, activePlan }: Props) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function assignPlan() {
    if (!selectedTemplate) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/members/${memberId}/nutrition`, {
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
        <h2 className="text-lg font-semibold mb-3">当前营养计划</h2>
        {activePlan ? (
          <div className="rounded-lg border p-4">
            <p className="font-medium">{activePlan.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{activePlan.dayTypes.length} 种天类型</p>
            <p className="text-xs text-muted-foreground">分配于 {new Date(activePlan.assignedAt).toLocaleDateString('zh-CN')}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">未分配营养计划</p>
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
            <option value="">选择营养计划模板</option>
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
    </div>
  );
}
```

- [ ] **Step 4: Create page (Server Component)**

```tsx
// src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { TrainerMemberNutritionClient } from './_components/trainer-member-nutrition-client';

export default async function TrainerMemberNutritionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const [templates, activePlan] = await Promise.all([
    new MongoNutritionTemplateRepository().findByCreator(session.user.id),
    new MongoMemberNutritionPlanRepository().findActive(memberId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">学员营养管理</h1>
      <TrainerMemberNutritionClient
        memberId={memberId}
        templates={JSON.parse(JSON.stringify(templates))}
        activePlan={JSON.parse(JSON.stringify(activePlan))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test __tests__/app/trainer/trainer-member-nutrition.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/trainer/members/[id]/nutrition/ __tests__/app/trainer/trainer-member-nutrition.test.tsx
git commit -m "feat: add trainer member nutrition page"
```

---

## Task 13: 会员营养计划查看页

**Files:**
- Create: `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx`
- Create: `src/app/(dashboard)/member/nutrition/page.tsx`
- Test: `__tests__/app/member/nutrition-plan-viewer.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/app/member/nutrition-plan-viewer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionPlanViewer } from '@/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer';

const mockPlan = {
  _id: 'np1',
  name: '减脂计划',
  dayTypes: [
    {
      name: '训练日',
      targetKcal: 2500,
      targetProtein: 180,
      targetCarbs: 250,
      targetFat: 60,
      meals: [
        {
          name: '早餐',
          order: 1,
          items: [
            { foodName: '燕麦', quantityG: 80, kcal: 296, protein: 10.4, carbs: 48, fat: 5.6 },
          ],
        },
      ],
    },
    {
      name: '休息日',
      targetKcal: 2000,
      targetProtein: 160,
      targetCarbs: 180,
      targetFat: 60,
      meals: [],
    },
  ],
};

describe('NutritionPlanViewer', () => {
  it('shows plan name', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByText('减脂计划')).toBeInTheDocument();
  });

  it('renders tab for each day type', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByRole('button', { name: '训练日' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '休息日' })).toBeInTheDocument();
  });

  it('shows macro targets for active day type', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByText('2500')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
  });

  it('switches day type on tab click', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    fireEvent.click(screen.getByRole('button', { name: '休息日' }));
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('shows meal and food items', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByText('早餐')).toBeInTheDocument();
    expect(screen.getByText('燕麦')).toBeInTheDocument();
  });

  it('shows empty state when no plan', () => {
    render(<NutritionPlanViewer plan={null} />);
    expect(screen.getByText(/暂无营养计划/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — confirm RED**

```bash
pnpm test __tests__/app/member/nutrition-plan-viewer.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Implement NutritionPlanViewer**

```tsx
// src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx
'use client';

import { useState } from 'react';

interface MealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  name: string;
  order: number;
  items: MealItem[];
}

interface DayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: Meal[];
}

interface Plan {
  _id: string;
  name: string;
  dayTypes: DayType[];
}

export function NutritionPlanViewer({ plan }: { plan: Plan | null }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!plan) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>暂无营养计划</p>
        <p className="text-sm mt-2">请联系您的教练分配营养计划</p>
      </div>
    );
  }

  const activeDayType = plan.dayTypes[activeIndex];
  const sortedMeals = [...(activeDayType?.meals ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{plan.name}</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {plan.dayTypes.map((dt, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              i === activeIndex
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-muted'
            }`}
          >
            {dt.name}
          </button>
        ))}
      </div>

      {activeDayType && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-lg border p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetKcal}</p>
              <p className="text-xs text-muted-foreground">千卡</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetProtein}</p>
              <p className="text-xs text-muted-foreground">蛋白质(g)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetCarbs}</p>
              <p className="text-xs text-muted-foreground">碳水(g)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{activeDayType.targetFat}</p>
              <p className="text-xs text-muted-foreground">脂肪(g)</p>
            </div>
          </div>

          <div className="space-y-4">
            {sortedMeals.map((meal, mi) => (
              <div key={mi} className="rounded-lg border p-4">
                <h2 className="font-semibold mb-3">{meal.name}</h2>
                {meal.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无食物</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-1 pr-4">食物</th>
                        <th className="py-1 pr-4">克数</th>
                        <th className="py-1 pr-4">千卡</th>
                        <th className="py-1 pr-4">蛋白质</th>
                        <th className="py-1 pr-4">碳水</th>
                        <th className="py-1">脂肪</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meal.items.map((item, ii) => (
                        <tr key={ii} className="border-b">
                          <td className="py-1 pr-4 font-medium">{item.foodName}</td>
                          <td className="py-1 pr-4">{item.quantityG}g</td>
                          <td className="py-1 pr-4">{item.kcal.toFixed(0)}</td>
                          <td className="py-1 pr-4">{item.protein.toFixed(1)}g</td>
                          <td className="py-1 pr-4">{item.carbs.toFixed(1)}g</td>
                          <td className="py-1">{item.fat.toFixed(1)}g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create member nutrition page**

```tsx
// src/app/(dashboard)/member/nutrition/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { NutritionPlanViewer } from './_components/nutrition-plan-viewer';

export default async function MemberNutritionPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberNutritionPlanRepository().findActive(session.user.id);

  return <NutritionPlanViewer plan={JSON.parse(JSON.stringify(plan))} />;
}
```

- [ ] **Step 5: Run test — confirm GREEN**

```bash
pnpm test __tests__/app/member/nutrition-plan-viewer.test.tsx
```
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/member/nutrition/ __tests__/app/member/nutrition-plan-viewer.test.tsx
git commit -m "feat: add member nutrition plan viewer page"
```

---

## Task 14: 全量验证

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```
Expected: All tests pass (existing 137 + new ~45 = ~182 total).

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```
Expected: No warnings, no errors.

- [ ] **Step 3: Build check**

```bash
pnpm build
```
Expected: Successful build, no TypeScript errors.

- [ ] **Step 4: Update docs/INDEX.md**

Add row to the index:

```markdown
| Nutrition Plans | [nutrition-implementation-plan.md](2026-04-22/plans/nutrition-implementation-plan.md) | In Progress |
```

- [ ] **Step 5: Final commit**

```bash
git add docs/INDEX.md
git commit -m "docs: update INDEX.md with nutrition plans implementation plan"
```
