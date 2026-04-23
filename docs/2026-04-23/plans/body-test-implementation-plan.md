# Body Composition Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Body Composition Testing: trainers record skinfold measurements for members using 3-site / 7-site / 9-site / other protocols; the server computes body fat %, lean mass, and fat mass using published formulas and snapshots results; members view history and a Recharts trend chart.

**Architecture:** Single `BodyTest` collection with computed snapshot pattern — formulas run server-side at creation time, results are stored alongside inputs (no recomputation needed). Pure formula functions live in `src/lib/body-test/formulas.ts`. All DB access via repository pattern matching existing project conventions.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, MongoDB/Mongoose, Auth.js v5 (`next-auth@beta`), Jest + React Testing Library, Recharts (direct, not Shadcn chart), pnpm

---

## File Map

### lib
| File | Responsibility |
|------|----------------|
| `src/lib/body-test/formulas.ts` | Pure functions: `calculateBodyFat`, `calculateComposition` |
| `src/lib/db/models/body-test.model.ts` | BodyTest Mongoose schema + `IBodyTest` interface |
| `src/lib/repositories/body-test.repository.ts` | `IBodyTestRepository` + `MongoBodyTestRepository` |

### API routes
| File | Responsibility |
|------|----------------|
| `src/app/api/members/[memberId]/body-tests/route.ts` | GET + POST /api/members/[memberId]/body-tests |
| `src/app/api/members/[memberId]/body-tests/[testId]/route.ts` | DELETE /api/members/[memberId]/body-tests/[testId] |

### UI pages and components
| File | Responsibility |
|------|----------------|
| `src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx` | Trainer body test management (Server) |
| `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx` | Form + list (Client) |
| `src/app/(dashboard)/member/body-tests/page.tsx` | Member history view (Server) |
| `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx` | Cards + Recharts chart (Client) |

### Test files
| File | What it tests |
|------|--------------|
| `__tests__/lib/body-test/formulas.test.ts` | All protocol formulas and edge cases |
| `__tests__/lib/repositories/body-test.repository.test.ts` | MongoBodyTestRepository |
| `__tests__/app/api/members-body-tests.test.ts` | GET + POST /api/members/[memberId]/body-tests |
| `__tests__/app/api/members-body-tests-id.test.ts` | DELETE /api/members/[memberId]/body-tests/[testId] |
| `__tests__/app/trainer/body-test-client.test.tsx` | BodyTestClient form + list |
| `__tests__/app/member/body-test-viewer.test.tsx` | BodyTestViewer cards + chart |

---

## Task 0: Install Recharts

**Files:** none (dependency only)

- [ ] **Step 1: Install recharts**

```bash
pnpm add recharts
```

Expected: `recharts` appears in `package.json` dependencies and `pnpm-lock.yaml`.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
pnpm tsc --noEmit
```

Expected: no errors related to recharts.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add recharts dependency"
```

---

## Task 1: Formula Pure Functions

**Files:**
- Create: `src/lib/body-test/formulas.ts`
- Test: `__tests__/lib/body-test/formulas.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/body-test/formulas.test.ts
import { calculateBodyFat, calculateComposition } from '@/lib/body-test/formulas';

describe('calculateBodyFat — 3-site male (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // chest=10, abdominal=20, thigh=15, age=30
    // sum3=45, density=1.10938-0.0008267*45+0.0000016*45²-0.0002574*30
    // density ≈ 1.10938-0.037202+0.00324-0.007722 = 1.067696
    // BF% = 495/1.067696 - 450 ≈ 13.68
    const result = calculateBodyFat({
      protocol: '3site',
      sex: 'male',
      age: 30,
      chest: 10,
      abdominal: 20,
      thigh: 15,
    });
    expect(result).toBeCloseTo(13.68, 1);
  });
});

describe('calculateBodyFat — 3-site female (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // tricep=15, suprailiac=18, thigh=20, age=25
    // sum3=53
    // density=1.0994921-0.0009929*53+0.0000023*53²-0.0001392*25
    // density ≈ 1.0994921-0.052624+0.006459-0.003480 = 1.049848
    // BF% = 495/1.049848 - 450 ≈ 21.92
    const result = calculateBodyFat({
      protocol: '3site',
      sex: 'female',
      age: 25,
      tricep: 15,
      suprailiac: 18,
      thigh: 20,
    });
    expect(result).toBeCloseTo(21.92, 1);
  });
});

describe('calculateBodyFat — 7-site male (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // sum7=100, age=35
    // density=1.112-0.00043499*100+0.00000055*100²-0.00028826*35
    // density ≈ 1.112-0.043499+0.0055-0.010089 = 1.063912
    // BF% = 495/1.063912 - 450 ≈ 15.25
    const result = calculateBodyFat({
      protocol: '7site',
      sex: 'male',
      age: 35,
      chest: 15,
      midaxillary: 12,
      tricep: 13,
      subscapular: 14,
      abdominal: 18,
      suprailiac: 16,
      thigh: 12,
    });
    expect(result).toBeCloseTo(15.25, 1);
  });
});

describe('calculateBodyFat — 7-site female (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // sum7=100, age=30
    // density=1.097-0.00046971*100+0.00000056*100²-0.00012828*30
    // density ≈ 1.097-0.046971+0.0056-0.003849 = 1.05178
    // BF% = 495/1.05178 - 450 ≈ 20.73
    const result = calculateBodyFat({
      protocol: '7site',
      sex: 'female',
      age: 30,
      chest: 15,
      midaxillary: 12,
      tricep: 13,
      subscapular: 14,
      abdominal: 18,
      suprailiac: 16,
      thigh: 12,
    });
    expect(result).toBeCloseTo(20.73, 1);
  });
});

describe('calculateBodyFat — 9-site Parrillo', () => {
  it('returns correct BF% regardless of sex', () => {
    // sum9=120: BF% = 120*0.1051+2.585 = 12.612+2.585 = 15.197
    const result = calculateBodyFat({
      protocol: '9site',
      sex: 'male',
      age: 30,
      tricep: 12,
      chest: 14,
      subscapular: 13,
      abdominal: 16,
      suprailiac: 14,
      thigh: 13,
      midaxillary: 12,
      bicep: 13,
      lumbar: 13,
    });
    expect(result).toBeCloseTo(15.197, 2);
  });
});

describe('calculateBodyFat — other protocol', () => {
  it('returns the provided bodyFatPct directly', () => {
    const result = calculateBodyFat({ protocol: 'other', bodyFatPct: 22.5 });
    expect(result).toBe(22.5);
  });
});

describe('calculateComposition', () => {
  it('calculates fatMassKg and leanMassKg from weight and BF%', () => {
    const result = calculateComposition(80, 20);
    expect(result.fatMassKg).toBeCloseTo(16);
    expect(result.leanMassKg).toBeCloseTo(64);
  });

  it('handles 0% body fat edge case', () => {
    const result = calculateComposition(70, 0);
    expect(result.fatMassKg).toBeCloseTo(0);
    expect(result.leanMassKg).toBeCloseTo(70);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=__tests__/lib/body-test/formulas
```

Expected: FAIL — `Cannot find module '@/lib/body-test/formulas'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/body-test/formulas.ts
type Protocol = '3site' | '7site' | '9site' | 'other';

interface ThreeSiteMaleInput {
  protocol: '3site';
  sex: 'male';
  age: number;
  chest: number;
  abdominal: number;
  thigh: number;
}

interface ThreeSiteFemaleInput {
  protocol: '3site';
  sex: 'female';
  age: number;
  tricep: number;
  suprailiac: number;
  thigh: number;
}

interface SevenSiteInput {
  protocol: '7site';
  sex: 'male' | 'female';
  age: number;
  chest: number;
  midaxillary: number;
  tricep: number;
  subscapular: number;
  abdominal: number;
  suprailiac: number;
  thigh: number;
}

interface NineSiteInput {
  protocol: '9site';
  sex: 'male' | 'female';
  age: number;
  tricep: number;
  chest: number;
  subscapular: number;
  abdominal: number;
  suprailiac: number;
  thigh: number;
  midaxillary: number;
  bicep: number;
  lumbar: number;
}

interface OtherInput {
  protocol: 'other';
  bodyFatPct: number;
}

export type BodyFatInput =
  | ThreeSiteMaleInput
  | ThreeSiteFemaleInput
  | SevenSiteInput
  | NineSiteInput
  | OtherInput;

export interface CompositionResult {
  fatMassKg: number;
  leanMassKg: number;
}

function siriEquation(density: number): number {
  return 495 / density - 450;
}

export function calculateBodyFat(input: BodyFatInput): number {
  if (input.protocol === 'other') {
    return input.bodyFatPct;
  }

  if (input.protocol === '3site') {
    if (input.sex === 'male') {
      const sum = input.chest + input.abdominal + input.thigh;
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * input.age;
      return siriEquation(density);
    } else {
      const sum = input.tricep + input.suprailiac + input.thigh;
      const density =
        1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * input.age;
      return siriEquation(density);
    }
  }

  if (input.protocol === '7site') {
    const sum =
      input.chest +
      input.midaxillary +
      input.tricep +
      input.subscapular +
      input.abdominal +
      input.suprailiac +
      input.thigh;
    if (input.sex === 'male') {
      const density =
        1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * input.age;
      return siriEquation(density);
    } else {
      const density =
        1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * input.age;
      return siriEquation(density);
    }
  }

  // 9site — Parrillo (no gender distinction)
  const sum9 =
    input.tricep +
    input.chest +
    input.subscapular +
    input.abdominal +
    input.suprailiac +
    input.thigh +
    input.midaxillary +
    input.bicep +
    input.lumbar;
  return sum9 * 0.1051 + 2.585;
}

export function calculateComposition(weightKg: number, bodyFatPct: number): CompositionResult {
  const fatMassKg = weightKg * (bodyFatPct / 100);
  const leanMassKg = weightKg - fatMassKg;
  return { fatMassKg, leanMassKg };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=__tests__/lib/body-test/formulas
```

Expected: PASS — all 8 tests pass

- [ ] **Step 5: Lint**

```bash
pnpm lint src/lib/body-test/formulas.ts
```

Expected: no warnings or errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/body-test/formulas.ts __tests__/lib/body-test/formulas.test.ts
git commit -m "feat: add body composition formula pure functions (Jackson-Pollock 3/7-site, Parrillo 9-site)"
```

---

## Task 2: BodyTest Mongoose Model

**Files:**
- Create: `src/lib/db/models/body-test.model.ts`

> No separate test for the model: schema validation is tested implicitly through the repository tests.

- [ ] **Step 1: Write the model**

```ts
// src/lib/db/models/body-test.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBodyTest extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  date: Date;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  protocol: '3site' | '7site' | '9site' | 'other';
  tricep: number | null;
  chest: number | null;
  subscapular: number | null;
  abdominal: number | null;
  suprailiac: number | null;
  thigh: number | null;
  midaxillary: number | null;
  bicep: number | null;
  lumbar: number | null;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
  createdAt: Date;
}

const BodyTestSchema = new Schema<IBodyTest>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    date: { type: Date, required: true },
    age: { type: Number, required: true },
    sex: { type: String, enum: ['male', 'female'], required: true },
    weight: { type: Number, required: true },
    protocol: { type: String, enum: ['3site', '7site', '9site', 'other'], required: true },
    tricep: { type: Number, default: null },
    chest: { type: Number, default: null },
    subscapular: { type: Number, default: null },
    abdominal: { type: Number, default: null },
    suprailiac: { type: Number, default: null },
    thigh: { type: Number, default: null },
    midaxillary: { type: Number, default: null },
    bicep: { type: Number, default: null },
    lumbar: { type: Number, default: null },
    bodyFatPct: { type: Number, required: true },
    leanMassKg: { type: Number, required: true },
    fatMassKg: { type: Number, required: true },
    targetWeight: { type: Number, default: null },
    targetBodyFatPct: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

BodyTestSchema.index({ memberId: 1, date: -1 });

export const BodyTestModel: Model<IBodyTest> =
  mongoose.models.BodyTest ?? mongoose.model<IBodyTest>('BodyTest', BodyTestSchema);
```

- [ ] **Step 2: Lint**

```bash
pnpm lint src/lib/db/models/body-test.model.ts
```

Expected: no warnings or errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/models/body-test.model.ts
git commit -m "feat: add BodyTest Mongoose model"
```

---

## Task 3: BodyTest Repository

**Files:**
- Create: `src/lib/repositories/body-test.repository.ts`
- Test: `__tests__/lib/repositories/body-test.repository.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/repositories/body-test.repository.test.ts
/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { BodyTestModel } from '@/lib/db/models/body-test.model';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await BodyTestModel.deleteMany({});
});

function makeTestData(memberId: string, trainerId: string, date: Date) {
  return {
    memberId,
    trainerId,
    date,
    age: 30,
    sex: 'male' as const,
    weight: 80,
    protocol: 'other' as const,
    bodyFatPct: 15,
    leanMassKg: 68,
    fatMassKg: 12,
    targetWeight: null,
    targetBodyFatPct: null,
  };
}

describe('MongoBodyTestRepository', () => {
  const repo = new MongoBodyTestRepository();
  const memberId = new mongoose.Types.ObjectId().toString();
  const trainerId = new mongoose.Types.ObjectId().toString();

  describe('create', () => {
    it('saves a body test and returns it', async () => {
      const data = makeTestData(memberId, trainerId, new Date());
      const result = await repo.create(data);
      expect(result._id).toBeDefined();
      expect(result.bodyFatPct).toBe(15);
      expect(result.memberId.toString()).toBe(memberId);
    });
  });

  describe('findByMember', () => {
    it('returns tests in descending date order', async () => {
      const earlier = new Date('2026-01-01');
      const later = new Date('2026-03-01');
      await repo.create(makeTestData(memberId, trainerId, earlier));
      await repo.create(makeTestData(memberId, trainerId, later));

      const results = await repo.findByMember(memberId);
      expect(results).toHaveLength(2);
      expect(results[0].date.getTime()).toBeGreaterThan(results[1].date.getTime());
    });

    it('returns empty array when member has no tests', async () => {
      const otherId = new mongoose.Types.ObjectId().toString();
      const results = await repo.findByMember(otherId);
      expect(results).toEqual([]);
    });
  });

  describe('deleteById', () => {
    it('deletes a test that belongs to trainer', async () => {
      const created = await repo.create(makeTestData(memberId, trainerId, new Date()));
      const testId = created._id.toString();

      await repo.deleteById(testId, trainerId);
      const remaining = await repo.findByMember(memberId);
      expect(remaining).toHaveLength(0);
    });

    it('does not delete a test owned by a different trainer', async () => {
      const created = await repo.create(makeTestData(memberId, trainerId, new Date()));
      const testId = created._id.toString();
      const otherTrainerId = new mongoose.Types.ObjectId().toString();

      await repo.deleteById(testId, otherTrainerId);
      const remaining = await repo.findByMember(memberId);
      expect(remaining).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=__tests__/lib/repositories/body-test
```

Expected: FAIL — `Cannot find module '@/lib/repositories/body-test.repository'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/repositories/body-test.repository.ts
import mongoose from 'mongoose';
import { BodyTestModel, type IBodyTest } from '@/lib/db/models/body-test.model';

export interface CreateBodyTestData {
  memberId: string;
  trainerId: string;
  date: Date;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  protocol: '3site' | '7site' | '9site' | 'other';
  tricep?: number | null;
  chest?: number | null;
  subscapular?: number | null;
  abdominal?: number | null;
  suprailiac?: number | null;
  thigh?: number | null;
  midaxillary?: number | null;
  bicep?: number | null;
  lumbar?: number | null;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight?: number | null;
  targetBodyFatPct?: number | null;
}

export interface IBodyTestRepository {
  create(data: CreateBodyTestData): Promise<IBodyTest>;
  findByMember(memberId: string): Promise<IBodyTest[]>;
  deleteById(testId: string, trainerId: string): Promise<void>;
}

export class MongoBodyTestRepository implements IBodyTestRepository {
  async create(data: CreateBodyTestData): Promise<IBodyTest> {
    const test = new BodyTestModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
    });
    return test.save();
  }

  async findByMember(memberId: string): Promise<IBodyTest[]> {
    return BodyTestModel.find({ memberId: new mongoose.Types.ObjectId(memberId) }).sort({ date: -1 });
  }

  async deleteById(testId: string, trainerId: string): Promise<void> {
    await BodyTestModel.deleteOne({
      _id: new mongoose.Types.ObjectId(testId),
      trainerId: new mongoose.Types.ObjectId(trainerId),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=__tests__/lib/repositories/body-test
```

Expected: PASS — all 5 tests pass

- [ ] **Step 5: Lint**

```bash
pnpm lint src/lib/repositories/body-test.repository.ts
```

Expected: no warnings or errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/repositories/body-test.repository.ts __tests__/lib/repositories/body-test.repository.test.ts
git commit -m "feat: add BodyTestRepository with create/findByMember/deleteById"
```

---

## Task 4: GET + POST /api/members/[memberId]/body-tests

**Files:**
- Create: `src/app/api/members/[memberId]/body-tests/route.ts`
- Test: `__tests__/app/api/members-body-tests.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/app/api/members-body-tests.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { create: jest.fn(), findByMember: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
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

describe('GET /api/members/[memberId]/body-tests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns body tests for member viewing own history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const tests = [{ _id: 'bt1', bodyFatPct: 20 }];
    mockBodyTestRepo.findByMember.mockResolvedValue(tests);

    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(tests);
  });

  it('returns body tests when trainer accesses member history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const tests = [{ _id: 'bt1', bodyFatPct: 20 }];
    mockBodyTestRepo.findByMember.mockResolvedValue(tests);

    const { GET } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/members/[memberId]/body-tests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to POST', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ protocol: 'other', bodyFatPct: 20, weight: 80, age: 30, sex: 'male', date: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when member not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);

    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ protocol: 'other', bodyFatPct: 20, weight: 80, age: 30, sex: 'male', date: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });

    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ protocol: 'other', bodyFatPct: 20, weight: 80, age: 30, sex: 'male', date: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('creates body test for own member and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const created = { _id: 'bt1', bodyFatPct: 20, leanMassKg: 64, fatMassKg: 16 };
    mockBodyTestRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/members/[memberId]/body-tests/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'other',
          bodyFatPct: 20,
          weight: 80,
          age: 30,
          sex: 'male',
          date: new Date().toISOString(),
          targetWeight: null,
          targetBodyFatPct: null,
        }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.bodyFatPct).toBe(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/members-body-tests\.test
```

Expected: FAIL — `Cannot find module '@/app/api/members/[memberId]/body-tests/route'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/api/members/[memberId]/body-tests/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { calculateBodyFat, calculateComposition, type BodyFatInput } from '@/lib/body-test/formulas';
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
  const repo = new MongoBodyTestRepository();
  const tests = await repo.findByMember(memberId);
  return Response.json(tests);
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
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

  const body = (await req.json()) as Record<string, unknown>;

  const bodyFatPct = calculateBodyFat(body as unknown as BodyFatInput);
  const { fatMassKg, leanMassKg } = calculateComposition(body.weight as number, bodyFatPct);

  const repo = new MongoBodyTestRepository();
  const test = await repo.create({
    memberId,
    trainerId: session.user.id,
    date: new Date(body.date as string),
    age: body.age as number,
    sex: body.sex as 'male' | 'female',
    weight: body.weight as number,
    protocol: body.protocol as '3site' | '7site' | '9site' | 'other',
    tricep: (body.tricep as number | null) ?? null,
    chest: (body.chest as number | null) ?? null,
    subscapular: (body.subscapular as number | null) ?? null,
    abdominal: (body.abdominal as number | null) ?? null,
    suprailiac: (body.suprailiac as number | null) ?? null,
    thigh: (body.thigh as number | null) ?? null,
    midaxillary: (body.midaxillary as number | null) ?? null,
    bicep: (body.bicep as number | null) ?? null,
    lumbar: (body.lumbar as number | null) ?? null,
    bodyFatPct,
    leanMassKg,
    fatMassKg,
    targetWeight: (body.targetWeight as number | null) ?? null,
    targetBodyFatPct: (body.targetBodyFatPct as number | null) ?? null,
  });

  return Response.json(test, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/members-body-tests\.test
```

Expected: PASS — all 8 tests pass

- [ ] **Step 5: Lint**

```bash
pnpm lint src/app/api/members/[memberId]/body-tests/route.ts
```

Expected: no warnings or errors

- [ ] **Step 6: Commit**

```bash
git add src/app/api/members/[memberId]/body-tests/route.ts __tests__/app/api/members-body-tests.test.ts
git commit -m "feat: add GET+POST /api/members/[memberId]/body-tests with formula computation"
```

---

## Task 5: DELETE /api/members/[memberId]/body-tests/[testId]

**Files:**
- Create: `src/app/api/members/[memberId]/body-tests/[testId]/route.ts`
- Test: `__tests__/app/api/members-body-tests-id.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/app/api/members-body-tests-id.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { create: jest.fn(), findByMember: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string, testId: string) {
  return { params: Promise.resolve({ memberId, testId }) };
}

describe('DELETE /api/members/[memberId]/body-tests/[testId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member tries to DELETE', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(403);
  });

  it('calls deleteById and returns 204 for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockBodyTestRepo.deleteById.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(204);
    expect(mockBodyTestRepo.deleteById).toHaveBeenCalledWith('bt1', 't1');
  });

  it('calls deleteById and returns 204 for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockBodyTestRepo.deleteById.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/members-body-tests-id
```

Expected: FAIL — `Cannot find module '@/app/api/members/[memberId]/body-tests/[testId]/route'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/api/members/[memberId]/body-tests/[testId]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; testId: string }> };

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { testId } = await params;

  await connectDB();
  const repo = new MongoBodyTestRepository();
  await repo.deleteById(testId, session.user.id);

  return new Response(null, { status: 204 });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/members-body-tests-id
```

Expected: PASS — all 4 tests pass

- [ ] **Step 5: Lint**

```bash
pnpm lint src/app/api/members/[memberId]/body-tests/[testId]/route.ts
```

Expected: no warnings or errors

- [ ] **Step 6: Commit**

```bash
git add src/app/api/members/[memberId]/body-tests/[testId]/route.ts __tests__/app/api/members-body-tests-id.test.ts
git commit -m "feat: add DELETE /api/members/[memberId]/body-tests/[testId]"
```

---

## Task 6: Trainer UI — BodyTestClient (Form + List)

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx`
- Test: `__tests__/app/trainer/body-test-client.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/app/trainer/body-test-client.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BodyTestClient } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const memberId = 'm1';

const mockTests = [
  {
    _id: 'bt1',
    date: new Date('2026-04-01').toISOString(),
    protocol: 'other' as const,
    weight: 80,
    bodyFatPct: 20,
    leanMassKg: 64,
    fatMassKg: 16,
    targetWeight: null,
    targetBodyFatPct: null,
  },
];

describe('BodyTestClient', () => {
  it('renders existing body test records', () => {
    render(<BodyTestClient memberId={memberId} initialTests={mockTests} />);
    expect(screen.getByText(/20/)).toBeInTheDocument();
    expect(screen.getByText(/80/)).toBeInTheDocument();
  });

  it('shows "暂无体测记录" when no tests', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    expect(screen.getByText(/暂无体测记录/i)).toBeInTheDocument();
  });

  it('shows new test form with protocol select', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows bodyFatPct input when "other" protocol selected', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'other' } });
    expect(screen.getByLabelText(/体脂率/i)).toBeInTheDocument();
  });

  it('shows 3-site male fields when 3site protocol and male selected', () => {
    render(<BodyTestClient memberId={memberId} initialTests={[]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3site' } });
    // select male sex (default)
    expect(screen.getByLabelText(/胸部/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/腹部/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/大腿/i)).toBeInTheDocument();
  });

  it('submits form and calls refresh on success', async () => {
    const mockRefresh = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ refresh: mockRefresh });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(<BodyTestClient memberId={memberId} initialTests={[]} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'other' } });
    fireEvent.change(screen.getByLabelText(/体脂率/i), { target: { value: '20' } });

    fireEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/members/${memberId}/body-tests`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('calls DELETE API when delete button clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    render(<BodyTestClient memberId={memberId} initialTests={mockTests} />);
    fireEvent.click(screen.getByRole('button', { name: /删除/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/members/${memberId}/body-tests/bt1`,
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=__tests__/app/trainer/body-test-client
```

Expected: FAIL — `Cannot find module '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client'`

- [ ] **Step 3: Write the client component**

```tsx
// src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Protocol = '3site' | '7site' | '9site' | 'other';
type Sex = 'male' | 'female';

interface BodyTestRecord {
  _id: string;
  date: string;
  protocol: Protocol;
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

interface Props {
  memberId: string;
  initialTests: BodyTestRecord[];
}

const PROTOCOL_LABELS: Record<Protocol, string> = {
  '3site': '3点法 (Jackson-Pollock)',
  '7site': '7点法 (Jackson-Pollock)',
  '9site': '9点法 (Parrillo)',
  other: '直接输入体脂率',
};

function getRequiredSites(protocol: Protocol, sex: Sex): string[] {
  if (protocol === '3site' && sex === 'male') return ['chest', 'abdominal', 'thigh'];
  if (protocol === '3site' && sex === 'female') return ['tricep', 'suprailiac', 'thigh'];
  if (protocol === '7site') return ['chest', 'midaxillary', 'tricep', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
  if (protocol === '9site') return ['tricep', 'chest', 'subscapular', 'abdominal', 'suprailiac', 'thigh', 'midaxillary', 'bicep', 'lumbar'];
  return [];
}

const SITE_LABELS: Record<string, string> = {
  chest: '胸部',
  abdominal: '腹部',
  thigh: '大腿',
  tricep: '三头肌',
  suprailiac: '髂骨上',
  subscapular: '肩胛下',
  midaxillary: '腋中线',
  bicep: '二头肌',
  lumbar: '腰部',
};

export function BodyTestClient({ memberId, initialTests }: Props) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [protocol, setProtocol] = useState<Protocol>('other');
  const [sex, setSex] = useState<Sex>('male');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [sites, setSites] = useState<Record<string, string>>({});
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFatPct, setTargetBodyFatPct] = useState('');
  const [saving, setSaving] = useState(false);

  const requiredSites = getRequiredSites(protocol, sex);

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        protocol,
        sex,
        weight: parseFloat(weight),
        age: parseInt(age),
        date: new Date(date).toISOString(),
        targetWeight: targetWeight ? parseFloat(targetWeight) : null,
        targetBodyFatPct: targetBodyFatPct ? parseFloat(targetBodyFatPct) : null,
      };
      if (protocol === 'other') {
        payload.bodyFatPct = parseFloat(bodyFatPct);
      } else {
        requiredSites.forEach((site) => {
          payload[site] = parseFloat(sites[site] ?? '0');
        });
      }
      const res = await fetch(`/api/members/${memberId}/body-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = (await res.json()) as BodyTestRecord;
        setTests((prev) => [created, ...prev]);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(testId: string) {
    const res = await fetch(`/api/members/${memberId}/body-tests/${testId}`, { method: 'DELETE' });
    if (res.ok) {
      setTests((prev) => prev.filter((t) => t._id !== testId));
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">新建体测</h2>
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1">测试日期</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="protocol" className="block text-sm font-medium mb-1">测量协议</label>
              <select
                id="protocol"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as Protocol)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {(Object.entries(PROTOCOL_LABELS) as [Protocol, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="age" className="block text-sm font-medium mb-1">年龄</label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="岁"
              />
            </div>
            <div>
              <label htmlFor="sex" className="block text-sm font-medium mb-1">性别</label>
              <select
                id="sex"
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div>
              <label htmlFor="weight" className="block text-sm font-medium mb-1">体重 (kg)</label>
              <input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="kg"
              />
            </div>
          </div>

          {protocol === 'other' ? (
            <div>
              <label htmlFor="bodyFatPct" className="block text-sm font-medium mb-1">体脂率 (%)</label>
              <input
                id="bodyFatPct"
                type="number"
                step="0.1"
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="%"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {requiredSites.map((site) => (
                <div key={site}>
                  <label htmlFor={site} className="block text-sm font-medium mb-1">
                    {SITE_LABELS[site]} (mm)
                  </label>
                  <input
                    id={site}
                    type="number"
                    step="0.1"
                    value={sites[site] ?? ''}
                    onChange={(e) => setSites((prev) => ({ ...prev, [site]: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="mm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="targetWeight" className="block text-sm font-medium mb-1">目标体重 (kg, 可选)</label>
              <input
                id="targetWeight"
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="kg"
              />
            </div>
            <div>
              <label htmlFor="targetBodyFatPct" className="block text-sm font-medium mb-1">目标体脂率 (%, 可选)</label>
              <input
                id="targetBodyFatPct"
                type="number"
                step="0.1"
                value={targetBodyFatPct}
                onChange={(e) => setTargetBodyFatPct(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="%"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">体测记录</h2>
        {tests.length === 0 ? (
          <p className="text-muted-foreground">暂无体测记录</p>
        ) : (
          <div className="space-y-3">
            {tests.map((t) => (
              <div key={t._id} className="rounded-lg border p-4 flex items-start justify-between">
                <div>
                  <p className="font-medium">{new Date(t.date).toLocaleDateString('zh-CN')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    体重 {t.weight} kg · 体脂率 {t.bodyFatPct.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    瘦体重 {t.leanMassKg.toFixed(1)} kg · 脂肪量 {t.fatMassKg.toFixed(1)} kg
                  </p>
                  {(t.targetWeight ?? t.targetBodyFatPct) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      目标: {t.targetWeight ? `体重 ${t.targetWeight} kg` : ''}
                      {t.targetBodyFatPct ? ` 体脂率 ${t.targetBodyFatPct}%` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(t._id)}
                  className="text-sm text-destructive hover:underline ml-4"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Write the server page**

```tsx
// src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { BodyTestClient } from './_components/body-test-client';

export default async function TrainerMemberBodyTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const repo = new MongoBodyTestRepository();
  const tests = await repo.findByMember(memberId);
  const plain = JSON.parse(JSON.stringify(tests)) as Parameters<typeof BodyTestClient>[0]['initialTests'];

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">体测管理</h1>
      <BodyTestClient memberId={memberId} initialTests={plain} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=__tests__/app/trainer/body-test-client
```

Expected: PASS — all 7 tests pass

- [ ] **Step 6: Lint**

```bash
pnpm lint src/app/\(dashboard\)/trainer/members/[id]/body-tests/
```

Expected: no warnings or errors

- [ ] **Step 7: Commit**

```bash
git add src/app/"(dashboard)"/trainer/members/"[id]"/body-tests/ __tests__/app/trainer/body-test-client.test.tsx
git commit -m "feat: add trainer body test management page with form and record list"
```

---

## Task 7: Member UI — BodyTestViewer (History Cards + Recharts Chart)

**Files:**
- Create: `src/app/(dashboard)/member/body-tests/page.tsx`
- Create: `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx`
- Test: `__tests__/app/member/body-test-viewer.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/app/member/body-test-viewer.test.tsx
import { render, screen } from '@testing-library/react';
import { BodyTestViewer } from '@/app/(dashboard)/member/body-tests/_components/body-test-viewer';

// Recharts uses SVG and ResizeObserver — mock them for Jest
jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

const mockTests = [
  {
    _id: 'bt1',
    date: new Date('2026-04-01').toISOString(),
    protocol: 'other' as const,
    weight: 80,
    bodyFatPct: 20,
    leanMassKg: 64,
    fatMassKg: 16,
    targetWeight: 75,
    targetBodyFatPct: 15,
  },
  {
    _id: 'bt2',
    date: new Date('2026-03-01').toISOString(),
    protocol: 'other' as const,
    weight: 82,
    bodyFatPct: 22,
    leanMassKg: 63.96,
    fatMassKg: 18.04,
    targetWeight: null,
    targetBodyFatPct: null,
  },
];

describe('BodyTestViewer', () => {
  it('shows "暂无体测记录" when no tests', () => {
    render(<BodyTestViewer tests={[]} />);
    expect(screen.getByText(/暂无体测记录/i)).toBeInTheDocument();
  });

  it('renders test records with body fat percentage', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByText(/20/)).toBeInTheDocument();
    expect(screen.getByText(/22/)).toBeInTheDocument();
  });

  it('renders the Recharts line chart when tests exist', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows target comparison when targets are set', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByText(/目标/i)).toBeInTheDocument();
  });

  it('shows weight and lean/fat mass for each record', () => {
    render(<BodyTestViewer tests={mockTests} />);
    expect(screen.getByText(/80/)).toBeInTheDocument();
    expect(screen.getByText(/64/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=__tests__/app/member/body-test-viewer
```

Expected: FAIL — `Cannot find module '@/app/(dashboard)/member/body-tests/_components/body-test-viewer'`

- [ ] **Step 3: Write the viewer component**

```tsx
// src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx
'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface BodyTestRecord {
  _id: string;
  date: string;
  protocol: '3site' | '7site' | '9site' | 'other';
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

interface Props {
  tests: BodyTestRecord[];
}

export function BodyTestViewer({ tests }: Props) {
  if (tests.length === 0) {
    return <p className="text-muted-foreground">暂无体测记录</p>;
  }

  const chartData = [...tests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      体重: t.weight,
      体脂率: parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">趋势图表</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="weight" orientation="left" unit="kg" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="bf" orientation="right" unit="%" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="weight" type="monotone" dataKey="体重" stroke="#2563eb" dot />
              <Line yAxisId="bf" type="monotone" dataKey="体脂率" stroke="#dc2626" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">历史记录</h2>
        <div className="space-y-3">
          {tests.map((t) => (
            <div key={t._id} className="rounded-lg border p-4">
              <p className="font-medium">{new Date(t.date).toLocaleDateString('zh-CN')}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">体重</span>
                  <span className="ml-2 font-medium">{t.weight} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground">体脂率</span>
                  <span className="ml-2 font-medium">{t.bodyFatPct.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">瘦体重</span>
                  <span className="ml-2 font-medium">{t.leanMassKg.toFixed(1)} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground">脂肪量</span>
                  <span className="ml-2 font-medium">{t.fatMassKg.toFixed(1)} kg</span>
                </div>
              </div>
              {(t.targetWeight ?? t.targetBodyFatPct) && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <p className="text-muted-foreground font-medium mb-1">目标</p>
                  <div className="grid grid-cols-2 gap-2">
                    {t.targetWeight && (
                      <div>
                        <span className="text-muted-foreground">体重</span>
                        <span className="ml-2">{t.targetWeight} kg</span>
                        <span className={`ml-2 text-xs ${t.weight - t.targetWeight > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          ({t.weight - t.targetWeight > 0 ? '+' : ''}{(t.weight - t.targetWeight).toFixed(1)} kg)
                        </span>
                      </div>
                    )}
                    {t.targetBodyFatPct && (
                      <div>
                        <span className="text-muted-foreground">体脂率</span>
                        <span className="ml-2">{t.targetBodyFatPct}%</span>
                        <span className={`ml-2 text-xs ${t.bodyFatPct - t.targetBodyFatPct > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          ({t.bodyFatPct - t.targetBodyFatPct > 0 ? '+' : ''}{(t.bodyFatPct - t.targetBodyFatPct).toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Write the member server page**

```tsx
// src/app/(dashboard)/member/body-tests/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { BodyTestViewer } from './_components/body-test-viewer';

export default async function MemberBodyTestsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoBodyTestRepository();
  const tests = await repo.findByMember(session.user.id);
  const plain = JSON.parse(JSON.stringify(tests)) as Parameters<typeof BodyTestViewer>[0]['tests'];

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">我的体测记录</h1>
      <BodyTestViewer tests={plain} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=__tests__/app/member/body-test-viewer
```

Expected: PASS — all 5 tests pass

- [ ] **Step 6: Lint**

```bash
pnpm lint src/app/\(dashboard\)/member/body-tests/
```

Expected: no warnings or errors

- [ ] **Step 7: Commit**

```bash
git add src/app/"(dashboard)"/member/body-tests/ __tests__/app/member/body-test-viewer.test.tsx
git commit -m "feat: add member body test history view with Recharts trend chart"
```

---

## Task 8: Full Verification

**Files:** none new

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests + new body test tests PASS; 0 failures

- [ ] **Step 2: Lint entire project**

```bash
pnpm lint
```

Expected: no warnings, no errors

- [ ] **Step 3: TypeScript type check**

```bash
pnpm tsc --noEmit
```

Expected: no type errors

- [ ] **Step 4: Build**

```bash
pnpm build
```

Expected: successful production build with no errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify body composition testing feature — all tests pass, lint clean, build success"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| 3-site JP formulas (male/female) | Task 1 |
| 7-site JP formulas (male/female) | Task 1 |
| 9-site Parrillo formula | Task 1 |
| `other` protocol (direct BF% input) | Task 1 |
| `calculateComposition` (fatMassKg, leanMassKg) | Task 1 |
| `BodyTest` Mongoose schema with all fields | Task 2 |
| `{ memberId: 1, date: -1 }` index | Task 2 |
| `findByMember`, `create`, `deleteById` repository methods | Task 3 |
| GET /api/members/[memberId]/body-tests | Task 4 |
| POST /api/members/[memberId]/body-tests with server-side formula computation | Task 4 |
| member-only-own access guard for GET | Task 4 |
| trainer-only-own-members access guard for POST | Task 4 |
| DELETE /api/members/[memberId]/body-tests/[testId] | Task 5 |
| trainer/owner only for DELETE | Task 5 |
| Trainer form with protocol-aware dynamic fields | Task 6 |
| Trainer list with delete | Task 6 |
| Member history cards | Task 7 |
| Recharts dual-Y-axis trend chart (weight + BF%) | Task 7 |
| Target vs current comparison on cards | Task 7 |

**Placeholder scan:** No TBDs or vague requirements found.

**Type consistency:** `BodyTestRecord` interface in client components matches `IBodyTest` model fields. `BodyFatInput` union type covers all protocol branches. `CreateBodyTestData` mirrors form payload.
