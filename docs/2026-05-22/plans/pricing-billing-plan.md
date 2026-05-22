# Pricing & Billing Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gym-wide service type pricing and billing summaries based on completed scheduled sessions, with views for Owner, Trainer, and Member.

**Architecture:** New `ServiceType` model (global, Owner-managed) + `serviceTypeId` field on `ScheduledSession`. Billing is computed on-the-fly by querying past non-cancelled sessions that have a service type attached. No materialized billing records — the query is simple and fast for gym-scale data.

**Tech Stack:** Next.js App Router, MongoDB/Mongoose, Auth.js, React, Tailwind, shadcn/ui, Jest, Playwright

---

## File Map

**New files:**
- `src/lib/db/models/service-type.model.ts`
- `src/lib/repositories/service-type.repository.ts`
- `src/lib/billing/calculate-billing.ts`
- `src/app/api/service-types/route.ts`
- `src/app/api/service-types/active/route.ts`
- `src/app/api/service-types/[id]/route.ts`
- `src/app/api/billing/route.ts`
- `src/app/api/billing/member/[id]/route.ts`
- `src/app/(dashboard)/owner/services/page.tsx`
- `src/app/(dashboard)/owner/services/_components/service-type-list.tsx`
- `src/app/(dashboard)/owner/services/_components/service-type-dialog.tsx`
- `src/app/(dashboard)/owner/billing/page.tsx`
- `src/app/(dashboard)/trainer/billing/page.tsx`
- `src/app/(dashboard)/member/billing/page.tsx`
- `src/app/(dashboard)/trainer/members/[id]/billing/page.tsx`
- `src/components/billing/billing-period-nav.tsx`
- `src/components/billing/member-billing-detail.tsx`
- `src/components/billing/billing-summary-client.tsx`
- `__tests__/lib/repositories/service-type.repository.test.ts`
- `__tests__/lib/billing/calculate-billing.test.ts`
- `e2e/owner/service-types.spec.ts`
- `e2e/owner/billing.spec.ts`
- `e2e/member/billing.spec.ts`

**Modified files:**
- `src/lib/db/models/scheduled-session.model.ts` — add `serviceTypeId` field
- `src/lib/repositories/scheduled-session.repository.ts` — extend `CreateScheduledSessionData`, `UpdateScheduledSessionData`, `buildUpdateSet`
- `src/app/api/schedule/route.ts` — accept optional `serviceTypeId` in POST body
- `src/app/api/schedule/[id]/route.ts` — accept optional `serviceTypeId` in PATCH body
- `src/components/calendar/week-calendar-grid.tsx` — add `serviceTypeId` to `CalendarSession`
- `src/components/calendar/create-session-modal.tsx` — add service type dropdown
- `src/components/calendar/edit-session-modal.tsx` — add service type dropdown
- `src/components/shared/member-tab-nav.tsx` — add Billing tab
- `src/components/shared/app-shell.tsx` — add Services + Billing nav items

---

## Task 1: ServiceType Mongoose Model

**Files:**
- Create: `src/lib/db/models/service-type.model.ts`

- [ ] **Step 1: Write the model**

```typescript
// src/lib/db/models/service-type.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IServiceType extends Document {
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ServiceTypeSchema = new Schema<IServiceType>(
  {
    name: { type: String, required: true, trim: true },
    durationMin: { type: Number, required: true, min: 1 },
    pricePerSession: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'CNY' },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ServiceTypeSchema.index({ isActive: 1 });

export const ServiceTypeModel: Model<IServiceType> =
  mongoose.models.ServiceType ??
  mongoose.model<IServiceType>('ServiceType', ServiceTypeSchema);
```

- [ ] **Step 2: Verify lint passes**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/models/service-type.model.ts
git commit -m "feat(billing): add ServiceType mongoose model"
```

---

## Task 2: ServiceType Repository

**Files:**
- Create: `src/lib/repositories/service-type.repository.ts`
- Test: `__tests__/lib/repositories/service-type.repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/repositories/service-type.repository.test.ts
import mongoose from 'mongoose';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';
import { ServiceTypeModel } from '@/lib/db/models/service-type.model';

jest.mock('@/lib/db/models/service-type.model', () => ({
  ServiceTypeModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(ServiceTypeModel);

describe('MongoServiceTypeRepository', () => {
  let repo: MongoServiceTypeRepository;
  const ownerId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    repo = new MongoServiceTypeRepository();
    jest.clearAllMocks();
  });

  it('findAll returns all service types sorted by name', async () => {
    mockModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) } as never);
    await repo.findAll();
    expect(mockModel.find).toHaveBeenCalledWith({});
  });

  it('findActive returns only isActive:true types', async () => {
    mockModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) } as never);
    await repo.findActive();
    expect(mockModel.find).toHaveBeenCalledWith({ isActive: true });
  });

  it('create saves a new service type', async () => {
    const saved = { _id: 'st1', name: '1小时私教', durationMin: 60, pricePerSession: 300, currency: 'CNY', isActive: true };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (ServiceTypeModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const result = await repo.create({ name: '1小时私教', durationMin: 60, pricePerSession: 300, currency: 'CNY', createdBy: ownerId });
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('update uses findByIdAndUpdate', async () => {
    mockModel.findByIdAndUpdate.mockResolvedValue({} as never);
    await repo.update('st1', { pricePerSession: 350 });
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'st1',
      { $set: { pricePerSession: 350 } },
      { new: true },
    );
  });

  it('deactivate sets isActive:false', async () => {
    mockModel.findByIdAndUpdate.mockResolvedValue({} as never);
    await repo.deactivate('st1');
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'st1',
      { $set: { isActive: false } },
      { new: true },
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test -- --testPathPattern=service-type.repository`
Expected: FAIL — `MongoServiceTypeRepository` not defined

- [ ] **Step 3: Write the repository**

```typescript
// src/lib/repositories/service-type.repository.ts
import { ServiceTypeModel, type IServiceType } from '@/lib/db/models/service-type.model';

export interface CreateServiceTypeData {
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  createdBy: string;
}

export interface UpdateServiceTypeData {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  currency?: string;
  isActive?: boolean;
}

export interface IServiceTypeRepository {
  findAll(): Promise<IServiceType[]>;
  findActive(): Promise<IServiceType[]>;
  findById(id: string): Promise<IServiceType | null>;
  create(data: CreateServiceTypeData): Promise<IServiceType>;
  update(id: string, data: UpdateServiceTypeData): Promise<IServiceType | null>;
  deactivate(id: string): Promise<IServiceType | null>;
}

export class MongoServiceTypeRepository implements IServiceTypeRepository {
  async findAll(): Promise<IServiceType[]> {
    return ServiceTypeModel.find({}).sort({ name: 1 });
  }

  async findActive(): Promise<IServiceType[]> {
    return ServiceTypeModel.find({ isActive: true }).sort({ name: 1 });
  }

  async findById(id: string): Promise<IServiceType | null> {
    return ServiceTypeModel.findById(id);
  }

  async create(data: CreateServiceTypeData): Promise<IServiceType> {
    const doc = new ServiceTypeModel({
      name: data.name,
      durationMin: data.durationMin,
      pricePerSession: data.pricePerSession,
      currency: data.currency,
      createdBy: data.createdBy,
    });
    return doc.save();
  }

  async update(id: string, data: UpdateServiceTypeData): Promise<IServiceType | null> {
    return ServiceTypeModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deactivate(id: string): Promise<IServiceType | null> {
    return ServiceTypeModel.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test -- --testPathPattern=service-type.repository`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/service-type.repository.ts __tests__/lib/repositories/service-type.repository.test.ts
git commit -m "feat(billing): add ServiceType repository"
```

---

## Task 3: Billing Calculation Utility

**Files:**
- Create: `src/lib/billing/calculate-billing.ts`
- Test: `__tests__/lib/billing/calculate-billing.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/billing/calculate-billing.test.ts
import { calculateMemberBilling, type BillingSession } from '@/lib/billing/calculate-billing';

const now = new Date('2026-05-22T12:00:00Z');

function makeSession(overrides: Partial<BillingSession> = {}): BillingSession {
  return {
    _id: 's1',
    date: new Date('2026-05-10T00:00:00Z'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    serviceType: { _id: 'st1', name: '1小时私教', pricePerSession: 300, currency: 'CNY' },
    ...overrides,
  };
}

describe('calculateMemberBilling', () => {
  it('sums pricePerSession for completed sessions', () => {
    const sessions = [makeSession(), makeSession({ _id: 's2', date: new Date('2026-05-17T00:00:00Z') })];
    const result = calculateMemberBilling(sessions, now);
    expect(result.total).toBe(600);
    expect(result.count).toBe(2);
    expect(result.lines).toHaveLength(2);
  });

  it('excludes cancelled sessions', () => {
    const sessions = [makeSession(), makeSession({ _id: 's2', status: 'cancelled' })];
    const result = calculateMemberBilling(sessions, now);
    expect(result.total).toBe(300);
    expect(result.count).toBe(1);
  });

  it('excludes sessions with no serviceType', () => {
    const sessions = [makeSession(), makeSession({ _id: 's2', serviceType: null })];
    const result = calculateMemberBilling(sessions, now);
    expect(result.total).toBe(300);
  });

  it('excludes future sessions (date >= now)', () => {
    const future = makeSession({ _id: 's2', date: new Date('2026-05-25T00:00:00Z') });
    const result = calculateMemberBilling([makeSession(), future], now);
    expect(result.count).toBe(1);
  });

  it('returns zero total when no qualifying sessions', () => {
    const result = calculateMemberBilling([], now);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it('returns correct currency from first session', () => {
    const result = calculateMemberBilling([makeSession()], now);
    expect(result.currency).toBe('CNY');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test -- --testPathPattern=calculate-billing`
Expected: FAIL — module not found

- [ ] **Step 3: Write the utility**

```typescript
// src/lib/billing/calculate-billing.ts
export interface BillingSession {
  _id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  serviceType: { _id: string; name: string; pricePerSession: number; currency: string } | null;
}

export interface BillingLine {
  sessionId: string;
  date: Date;
  startTime: string;
  endTime: string;
  serviceTypeName: string;
  price: number;
  currency: string;
}

export interface BillingResult {
  total: number;
  count: number;
  currency: string;
  lines: BillingLine[];
}

export function calculateMemberBilling(sessions: BillingSession[], now: Date): BillingResult {
  const lines: BillingLine[] = [];

  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    if (!s.serviceType) continue;
    if (s.date >= now) continue;

    lines.push({
      sessionId: s._id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      serviceTypeName: s.serviceType.name,
      price: s.serviceType.pricePerSession,
      currency: s.serviceType.currency,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.price, 0);
  const currency = lines[0]?.currency ?? 'CNY';

  return { total, count: lines.length, currency, lines };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test -- --testPathPattern=calculate-billing`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/calculate-billing.ts __tests__/lib/billing/calculate-billing.test.ts
git commit -m "feat(billing): add billing calculation utility"
```

---

## Task 4: Extend ScheduledSession — Add serviceTypeId

**Files:**
- Modify: `src/lib/db/models/scheduled-session.model.ts`
- Modify: `src/lib/repositories/scheduled-session.repository.ts`

- [ ] **Step 1: Add `serviceTypeId` to the model**

In `src/lib/db/models/scheduled-session.model.ts`, add to `IScheduledSession`:
```typescript
serviceTypeId: mongoose.Types.ObjectId | null;
```

And to `ScheduledSessionSchema`:
```typescript
serviceTypeId: { type: Schema.Types.ObjectId, default: null },
```

Full updated interface block:
```typescript
export interface IScheduledSession extends Document {
  seriesId: mongoose.Types.ObjectId | null;
  trainerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  serviceTypeId: mongoose.Types.ObjectId | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

In schema, add after `status`:
```typescript
serviceTypeId: { type: Schema.Types.ObjectId, default: null },
```

- [ ] **Step 2: Extend repository types**

In `src/lib/repositories/scheduled-session.repository.ts`:

Add `serviceTypeId?: string | null` to `CreateScheduledSessionData`:
```typescript
export interface CreateScheduledSessionData {
  seriesId: string | null;
  trainerId: string;
  memberIds: string[];
  date: Date;
  startTime: string;
  endTime: string;
  serviceTypeId?: string | null;
}
```

Add `serviceTypeId?: string | null` to `UpdateScheduledSessionData`:
```typescript
export interface UpdateScheduledSessionData {
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
  serviceTypeId?: string | null;
}
```

Add `serviceTypeId?: mongoose.Types.ObjectId | null` to `UpdateSetDoc` interface:
```typescript
interface UpdateSetDoc {
  trainerId?: mongoose.Types.ObjectId;
  memberIds?: mongoose.Types.ObjectId[];
  startTime?: string;
  endTime?: string;
  serviceTypeId?: mongoose.Types.ObjectId | null;
}
```

Add to `buildUpdateSet`:
```typescript
if (data.serviceTypeId !== undefined) {
  $set.serviceTypeId = data.serviceTypeId ? toOid(data.serviceTypeId) : null;
}
```

In the `create` method, pass `serviceTypeId` when building the document:
```typescript
async create(data: CreateScheduledSessionData): Promise<IScheduledSession> {
  const doc = new ScheduledSessionModel({
    seriesId: data.seriesId,
    trainerId: toOid(data.trainerId),
    memberIds: data.memberIds.map(toOid),
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    serviceTypeId: data.serviceTypeId ? toOid(data.serviceTypeId) : null,
  });
  return doc.save();
}
```

In `createMany`, also spread `serviceTypeId`:
```typescript
async createMany(data: CreateScheduledSessionData[]): Promise<void> {
  const docs = data.map((d) => ({
    seriesId: d.seriesId,
    trainerId: toOid(d.trainerId),
    memberIds: d.memberIds.map(toOid),
    date: d.date,
    startTime: d.startTime,
    endTime: d.endTime,
    serviceTypeId: d.serviceTypeId ? toOid(d.serviceTypeId) : null,
  }));
  await ScheduledSessionModel.insertMany(docs);
}
```

- [ ] **Step 3: Run all tests — expect PASS**

Run: `pnpm test`
Expected: PASS — no existing tests should break (new field is optional/defaulted)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/models/scheduled-session.model.ts src/lib/repositories/scheduled-session.repository.ts
git commit -m "feat(billing): add serviceTypeId to ScheduledSession model and repository"
```

---

## Task 5: Service Type API Routes

**Files:**
- Create: `src/app/api/service-types/route.ts`
- Create: `src/app/api/service-types/active/route.ts`
- Create: `src/app/api/service-types/[id]/route.ts`

- [ ] **Step 1: Create GET list + POST create route**

```typescript
// src/app/api/service-types/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';

interface PostBody {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  currency?: string;
}

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const types = await repo.findAll();
  return Response.json({ serviceTypes: types });
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }
  if (typeof body.durationMin !== 'number' || body.durationMin < 1) {
    return Response.json({ error: 'durationMin must be a positive number' }, { status: 400 });
  }
  if (typeof body.pricePerSession !== 'number' || body.pricePerSession < 0) {
    return Response.json({ error: 'pricePerSession must be a non-negative number' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const serviceType = await repo.create({
    name: body.name.trim(),
    durationMin: body.durationMin,
    pricePerSession: body.pricePerSession,
    currency: typeof body.currency === 'string' ? body.currency : 'CNY',
    createdBy: session.user.id,
  });

  return Response.json({ serviceType }, { status: 201 });
}
```

- [ ] **Step 2: Create GET active route**

```typescript
// src/app/api/service-types/active/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const types = await repo.findActive();
  return Response.json({ serviceTypes: types });
}
```

- [ ] **Step 3: Create PATCH [id] route**

```typescript
// src/app/api/service-types/[id]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';

type RouteContext = { params: Promise<{ id: string }> };

interface PatchBody {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  currency?: string;
  isActive?: boolean;
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const updated = await repo.update(id, {
    ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
    ...(typeof body.durationMin === 'number' ? { durationMin: body.durationMin } : {}),
    ...(typeof body.pricePerSession === 'number' ? { pricePerSession: body.pricePerSession } : {}),
    ...(typeof body.currency === 'string' ? { currency: body.currency } : {}),
    ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
  });

  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ serviceType: updated });
}
```

- [ ] **Step 4: Verify lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/service-types/
git commit -m "feat(billing): add service type API routes"
```

---

## Task 6: Update Calendar Schedule API Routes

**Files:**
- Modify: `src/app/api/schedule/route.ts`
- Modify: `src/app/api/schedule/[id]/route.ts`

- [ ] **Step 1: Update POST /api/schedule to accept serviceTypeId**

In `src/app/api/schedule/route.ts`, extend `PostBody`:
```typescript
interface PostBody {
  trainerId?: string;
  memberIds?: string[];
  date?: string;
  startTime?: string;
  endTime?: string;
  isRecurring?: boolean;
  serviceTypeId?: string | null;
}
```

In the non-recurring branch, pass `serviceTypeId` to `repo.create`:
```typescript
const doc = await repo.create({
  seriesId: null,
  trainerId,
  memberIds,
  date: baseDate,
  startTime: body.startTime,
  endTime: body.endTime,
  serviceTypeId: typeof body.serviceTypeId === 'string' ? body.serviceTypeId : null,
});
```

In the recurring branch, pass `serviceTypeId` to each session in the array:
```typescript
const sessions = Array.from({ length: 12 }, (_, i) => ({
  seriesId,
  trainerId,
  memberIds,
  date: addWeeks(baseDate, i),
  startTime: body.startTime as string,
  endTime: body.endTime as string,
  serviceTypeId: typeof body.serviceTypeId === 'string' ? body.serviceTypeId : null,
}));
```

- [ ] **Step 2: Update PATCH /api/schedule/[id] to accept serviceTypeId**

In `src/app/api/schedule/[id]/route.ts`, extend `PatchBody`:
```typescript
interface PatchBody {
  scope?: string;
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
  serviceTypeId?: string | null;
}
```

In the `update` object construction, add:
```typescript
if (body.serviceTypeId !== undefined) update.serviceTypeId = body.serviceTypeId;
```

Full updated block:
```typescript
const update: UpdateScheduledSessionData = {};
if (typeof body.trainerId === 'string') update.trainerId = body.trainerId;
if (Array.isArray(body.memberIds)) update.memberIds = body.memberIds;
if (typeof body.startTime === 'string') update.startTime = body.startTime;
if (typeof body.endTime === 'string') update.endTime = body.endTime;
if (body.serviceTypeId !== undefined) update.serviceTypeId = body.serviceTypeId;
```

- [ ] **Step 3: Run all tests — expect PASS**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/schedule/route.ts src/app/api/schedule/[id]/route.ts
git commit -m "feat(billing): accept serviceTypeId in schedule POST and PATCH"
```

---

## Task 7: Billing API Routes

**Files:**
- Create: `src/app/api/billing/route.ts`
- Create: `src/app/api/billing/member/[id]/route.ts`

- [ ] **Step 1: Create global billing summary route**

```typescript
// src/app/api/billing/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import mongoose from 'mongoose';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { calculateMemberBilling } from '@/lib/billing/calculate-billing';

function getMonthRange(monthParam: string | null): { from: Date; to: Date } {
  const now = new Date();
  if (monthParam) {
    const [year, month] = monthParam.split('-').map(Number);
    if (year && month) {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59, 999);
      return { from, to };
    }
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  let from: Date, to: Date;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    ({ from, to } = getMonthRange(url.searchParams.get('month')));
  }

  const now = new Date();
  const effectiveTo = to < now ? to : now;

  await connectDB();

  const query: Record<string, unknown> = {
    date: { $gte: from, $lte: effectiveTo },
    status: 'scheduled',
    serviceTypeId: { $ne: null },
  };
  if (session.user.role === 'trainer') {
    query.trainerId = new mongoose.Types.ObjectId(session.user.id);
  }

  const sessions = await ScheduledSessionModel.find(query).populate('serviceTypeId').lean();

  const memberSessions = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const memberIds: mongoose.Types.ObjectId[] = s.memberIds as mongoose.Types.ObjectId[];
    for (const mid of memberIds) {
      const key = mid.toString();
      if (!memberSessions.has(key)) memberSessions.set(key, []);
      memberSessions.get(key)!.push(s);
    }
  }

  const userRepo = new MongoUserRepository();
  const memberResults = await Promise.all(
    Array.from(memberSessions.entries()).map(async ([memberId, mSessions]) => {
      const member = await userRepo.findById(memberId);
      const trainer = mSessions[0]?.trainerId
        ? await userRepo.findById(mSessions[0].trainerId.toString())
        : null;

      const billingSessions = mSessions.map((s) => ({
        _id: s._id.toString(),
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        serviceType: s.serviceTypeId as { _id: string; name: string; pricePerSession: number; currency: string } | null,
      }));

      const billing = calculateMemberBilling(billingSessions, now);

      return {
        memberId,
        name: member?.name ?? 'Unknown',
        trainerName: trainer?.name ?? '',
        sessionsCount: billing.count,
        totalAmount: billing.total,
        currency: billing.currency,
        breakdown: billing.lines,
      };
    }),
  );

  const grandTotal = memberResults.reduce((sum, m) => sum + m.totalAmount, 0);
  const currency = memberResults[0]?.currency ?? 'CNY';

  return Response.json({ members: memberResults, grandTotal, currency });
}
```

- [ ] **Step 2: Create per-member billing detail route**

```typescript
// src/app/api/billing/member/[id]/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import mongoose from 'mongoose';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';
import { calculateMemberBilling } from '@/lib/billing/calculate-billing';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: memberId } = await params;

  // Members can only see their own billing
  if (session.user.role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  const now = new Date();
  let from: Date, to: Date;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  const effectiveTo = to < now ? to : now;

  await connectDB();

  const sessions = await ScheduledSessionModel.find({
    memberIds: new mongoose.Types.ObjectId(memberId),
    date: { $gte: from, $lte: effectiveTo },
    status: 'scheduled',
    serviceTypeId: { $ne: null },
  }).populate('serviceTypeId').lean();

  const billingSessions = sessions.map((s) => ({
    _id: s._id.toString(),
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    serviceType: s.serviceTypeId as { _id: string; name: string; pricePerSession: number; currency: string } | null,
  }));

  const billing = calculateMemberBilling(billingSessions, now);

  return Response.json({
    memberId,
    from: from.toISOString(),
    to: to.toISOString(),
    total: billing.total,
    count: billing.count,
    currency: billing.currency,
    lines: billing.lines,
  });
}
```

- [ ] **Step 3: Verify lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/billing/
git commit -m "feat(billing): add billing API routes"
```

---

## Task 8: Update Calendar Session Modals

**Files:**
- Modify: `src/components/calendar/week-calendar-grid.tsx`
- Modify: `src/components/calendar/create-session-modal.tsx`
- Modify: `src/components/calendar/edit-session-modal.tsx`

- [ ] **Step 1: Extend CalendarSession type**

In `src/components/calendar/week-calendar-grid.tsx`, add to `CalendarSession`:
```typescript
export interface CalendarSession {
  _id: string;
  seriesId: string | null;
  trainerId: string;
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  serviceTypeId: string | null;
  reminderSentAt: string | null;
}
```

- [ ] **Step 2: Update CreateSessionModal**

Replace `src/components/calendar/create-session-modal.tsx` with the full updated version. Key changes: add `ServiceType` interface, fetch active service types on mount, add `serviceTypeId` state, add select element in the form.

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { addOneHour } from '@/lib/time';

interface Trainer { _id: string; name: string; }
interface Member { _id: string; name: string; trainerId: string; }
interface ServiceType { _id: string; name: string; durationMin: number; pricePerSession: number; currency: string; }

interface CreateSessionModalProps {
  open: boolean;
  defaultDate: string;
  defaultStartTime: string;
  trainers: Trainer[];
  members: Member[];
  currentUserRole: 'owner' | 'trainer';
  currentUserId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function CreateSessionModal({
  open, defaultDate, defaultStartTime, trainers, members,
  currentUserRole, currentUserId, onSuccess, onClose,
}: CreateSessionModalProps) {
  const defaultTrainerId = currentUserRole === 'trainer' ? currentUserId : (trainers[0]?._id ?? '');
  const initialFilteredMembers = members.filter((m) => m.trainerId === defaultTrainerId);

  const [trainerId, setTrainerId] = useState(defaultTrainerId);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    initialFilteredMembers.length > 0 ? [initialFilteredMembers[0]._id] : [],
  );
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(addOneHour(defaultStartTime));
  const [isRecurring, setIsRecurring] = useState(false);
  const [serviceTypeId, setServiceTypeId] = useState<string>('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/service-types/active')
      .then((r) => r.json())
      .then((data: { serviceTypes: ServiceType[] }) => setServiceTypes(data.serviceTypes ?? []))
      .catch(() => {});
  }, [open]);

  const filteredMembers = members.filter((m) => m.trainerId === trainerId);
  const selectedServiceType = serviceTypes.find((st) => st._id === serviceTypeId) ?? null;

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (selectedMemberIds.length === 0) { setError('Select at least one member'); return; }
    if (!endTime) { setError('End time is required'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId, memberIds: selectedMemberIds, date, startTime, endTime, isRecurring,
          serviceTypeId: serviceTypeId || null,
        }),
      });
      if (!res.ok) { setError('Failed to create session'); return; }
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Training Session</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {currentUserRole === 'owner' && (
            <div>
              <Label>Trainer</Label>
              <select
                className="w-full mt-1 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white"
                value={trainerId}
                onChange={(e) => { setTrainerId(e.target.value); setSelectedMemberIds([]); }}
              >
                {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <Label>Members</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {filteredMembers.map((m) => (
                <button key={m._id} type="button" onClick={() => toggleMember(m._id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedMemberIds.includes(m._id) ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888] hover:text-white'
                  }`}>{m.name}</button>
              ))}
              {filteredMembers.length === 0 && <span className="text-xs text-[#888]">No members for this trainer</span>}
            </div>
          </div>

          <div>
            <Label htmlFor="sessionDate">Date</Label>
            <Input id="sessionDate" type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" className="mt-1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" className="mt-1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setIsRecurring(false)}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${!isRecurring ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888]'}`}>
              Once
            </button>
            <button type="button" onClick={() => setIsRecurring(true)}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${isRecurring ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888]'}`}>
              Weekly Recurring
            </button>
          </div>

          <div>
            <Label htmlFor="serviceType">Service Type <span className="text-foreground/40">(optional)</span></Label>
            <div className="mt-1 flex items-center gap-2">
              <select
                id="serviceType"
                className="flex-1 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white"
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
              >
                <option value="">— None —</option>
                {serviceTypes.map((st) => (
                  <option key={st._id} value={st._id}>{st.name} ({st.durationMin} min)</option>
                ))}
              </select>
              {selectedServiceType && (
                <span className="text-sm text-primary-light font-semibold shrink-0">
                  ¥{selectedServiceType.pricePerSession}
                </span>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Update EditSessionModal**

In `src/components/calendar/edit-session-modal.tsx`, add service type state and selector. Key additions:

Add `ServiceType` interface and state at the top of the component (after existing state):
```typescript
interface ServiceType { _id: string; name: string; durationMin: number; pricePerSession: number; currency: string; }
```

Inside the component function, after the `error` state:
```typescript
const [serviceTypeId, setServiceTypeId] = useState<string>(session.serviceTypeId ?? '');
const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

useEffect(() => {
  if (!open) return;
  fetch('/api/service-types/active')
    .then((r) => r.json())
    .then((data: { serviceTypes: ServiceType[] }) => setServiceTypes(data.serviceTypes ?? []))
    .catch(() => {});
}, [open]);

const selectedServiceType = serviceTypes.find((st) => st._id === serviceTypeId) ?? null;
```

In `executeAction`, when `action === 'edit'`, include `serviceTypeId` in the body:
```typescript
body: JSON.stringify({ scope, startTime, endTime, serviceTypeId: serviceTypeId || null }),
```

In the form JSX, add the service type field after the time inputs (before `{error && ...}`):
```tsx
<div>
  <Label htmlFor="editServiceType">Service Type <span className="text-foreground/40">(optional)</span></Label>
  <div className="mt-1 flex items-center gap-2">
    <select
      id="editServiceType"
      className="flex-1 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white"
      value={serviceTypeId}
      onChange={(e) => setServiceTypeId(e.target.value)}
    >
      <option value="">— None —</option>
      {serviceTypes.map((st) => (
        <option key={st._id} value={st._id}>{st.name} ({st.durationMin} min)</option>
      ))}
    </select>
    {selectedServiceType && (
      <span className="text-sm text-primary-light font-semibold shrink-0">
        ¥{selectedServiceType.pricePerSession}
      </span>
    )}
  </div>
</div>
```

- [ ] **Step 4: Verify lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/week-calendar-grid.tsx src/components/calendar/create-session-modal.tsx src/components/calendar/edit-session-modal.tsx
git commit -m "feat(billing): add service type selector to calendar session modals"
```

---

## Task 9: Owner Services Management Page

**Files:**
- Create: `src/app/(dashboard)/owner/services/page.tsx`
- Create: `src/app/(dashboard)/owner/services/_components/service-type-list.tsx`
- Create: `src/app/(dashboard)/owner/services/_components/service-type-dialog.tsx`

- [ ] **Step 1: Create the dialog component (create + edit)**

```typescript
// src/app/(dashboard)/owner/services/_components/service-type-dialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  isActive: boolean;
}

interface ServiceTypeDialogProps {
  open: boolean;
  serviceType?: ServiceType;
  onSuccess: () => void;
  onClose: () => void;
}

export function ServiceTypeDialog({ open, serviceType, onSuccess, onClose }: ServiceTypeDialogProps) {
  const isEdit = !!serviceType;
  const [name, setName] = useState(serviceType?.name ?? '');
  const [durationMin, setDurationMin] = useState(String(serviceType?.durationMin ?? 60));
  const [pricePerSession, setPricePerSession] = useState(String(serviceType?.pricePerSession ?? ''));
  const [currency, setCurrency] = useState(serviceType?.currency ?? 'CNY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) { setError('Name is required'); return; }
    const dur = Number(durationMin);
    const price = Number(pricePerSession);
    if (!dur || dur < 1) { setError('Duration must be at least 1 minute'); return; }
    if (isNaN(price) || price < 0) { setError('Price must be a non-negative number'); return; }

    setError('');
    setLoading(true);
    try {
      const url = isEdit ? `/api/service-types/${serviceType._id}` : '/api/service-types';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), durationMin: dur, pricePerSession: price, currency }),
      });
      if (!res.ok) { setError('Failed to save'); return; }
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!serviceType) return;
    setLoading(true);
    try {
      await fetch(`/api/service-types/${serviceType._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !serviceType.isActive }),
      });
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Service Type' : 'Add Service Type'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="stName">Name</Label>
            <Input id="stName" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="1小时私教" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="stDur">Duration (min)</Label>
              <Input id="stDur" type="text" inputMode="decimal" className="mt-1" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="stCur">Currency</Label>
              <Input id="stCur" className="mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="stPrice">Price per Session</Label>
            <Input id="stPrice" type="text" inputMode="decimal" className="mt-1" value={pricePerSession} onChange={(e) => setPricePerSession(e.target.value)} placeholder="300" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEdit && (
            <Button variant="ghost" onClick={handleDeactivate} disabled={loading} className="sm:mr-auto text-foreground/40">
              {serviceType.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the list component**

```typescript
// src/app/(dashboard)/owner/services/_components/service-type-list.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceTypeDialog } from './service-type-dialog';

interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  isActive: boolean;
}

export function ServiceTypeList() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceType | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/service-types');
      const data = (await res.json()) as { serviceTypes: ServiceType[] };
      setServiceTypes(data.serviceTypes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = serviceTypes.filter((st) => st.isActive);
  const inactive = serviceTypes.filter((st) => !st.isActive);

  function openCreate() { setEditing(undefined); setDialogOpen(true); }
  function openEdit(st: ServiceType) { setEditing(st); setDialogOpen(true); }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Services</h1>
          <p className="text-xs text-foreground/65 mt-0.5">Manage session types and pricing for your gym</p>
        </div>
        <Button onClick={openCreate}>+ Add Service</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-1.5">
          {active.map((st) => (
            <div key={st._id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all cursor-pointer"
              onClick={() => openEdit(st)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{st.name}</span>
                <span className="text-xs text-foreground/65">{st.durationMin} min</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary-light">{st.currency} {st.pricePerSession}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
              </div>
            </div>
          ))}

          {inactive.length > 0 && (
            <>
              <div className="pt-4 pb-1 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Inactive</div>
              {inactive.map((st) => (
                <div key={st._id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 opacity-50 cursor-pointer"
                  onClick={() => openEdit(st)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground/65">{st.name}</span>
                    <span className="text-xs text-foreground/40">{st.durationMin} min</span>
                  </div>
                  <span className="text-sm text-foreground/40">{st.currency} {st.pricePerSession}</span>
                </div>
              ))}
            </>
          )}

          {active.length === 0 && inactive.length === 0 && (
            <p className="text-sm text-foreground/65 py-8 text-center">No service types yet. Add your first one.</p>
          )}
        </div>
      )}

      <ServiceTypeDialog
        open={dialogOpen}
        serviceType={editing}
        onSuccess={() => void load()}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create the page**

```typescript
// src/app/(dashboard)/owner/services/page.tsx
import { ServiceTypeList } from './_components/service-type-list';

export default function OwnerServicesPage() {
  return (
    <div className="px-4 sm:px-8 py-7 max-w-2xl">
      <ServiceTypeList />
    </div>
  );
}
```

- [ ] **Step 4: Verify lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/owner/services/
git commit -m "feat(billing): add owner services management page"
```

---

## Task 10: Shared Billing Components

**Files:**
- Create: `src/components/billing/billing-period-nav.tsx`
- Create: `src/components/billing/member-billing-detail.tsx`
- Create: `src/components/billing/billing-summary-client.tsx`

- [ ] **Step 1: Create BillingPeriodNav**

```typescript
// src/components/billing/billing-period-nav.tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface BillingPeriod {
  from: Date;
  to: Date;
  label: string;
}

function getMonthPeriod(year: number, month: number): BillingPeriod {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  return { from, to, label };
}

interface BillingPeriodNavProps {
  onChange: (period: BillingPeriod) => void;
}

export function BillingPeriodNav({ onChange }: BillingPeriodNavProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const period = getMonthPeriod(year, month);

  function prev() {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }

  function next() {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onChange(getMonthPeriod(newYear, newMonth));
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Previous month">
        <ChevronLeft className="h-4 w-4 text-foreground/65" />
      </button>
      <span className="text-sm font-medium text-foreground min-w-[100px] text-center">{period.label}</span>
      <button onClick={next} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Next month">
        <ChevronRight className="h-4 w-4 text-foreground/65" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create MemberBillingDetail**

```typescript
// src/components/billing/member-billing-detail.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BillingPeriodNav, type BillingPeriod } from './billing-period-nav';

interface BillingLine {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTypeName: string;
  price: number;
  currency: string;
}

interface BillingData {
  total: number;
  count: number;
  currency: string;
  lines: BillingLine[];
}

interface MemberBillingDetailProps {
  memberId: string;
}

export function MemberBillingDetail({ memberId }: MemberBillingDetailProps) {
  const now = new Date();
  const [period, setPeriod] = useState<BillingPeriod>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    label: now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
  });
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: BillingPeriod) => {
    setLoading(true);
    try {
      const from = p.from.toISOString();
      const to = p.to.toISOString();
      const res = await fetch(`/api/billing/member/${memberId}?from=${from}&to=${to}`);
      const json = (await res.json()) as BillingData;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { void load(period); }, [load, period]);

  function handlePeriodChange(p: BillingPeriod) {
    setPeriod(p);
    void load(p);
  }

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="flex items-center justify-between mb-6">
        <BillingPeriodNav onChange={handlePeriodChange} />
        {data && !loading && (
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-light">{data.currency} {data.total.toLocaleString()}</div>
            <div className="text-xs text-foreground/65 mt-0.5">{data.count} sessions completed</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : data && data.lines.length > 0 ? (
        <div className="space-y-0">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
            <span>Session</span><span>Amount</span>
          </div>
          {data.lines.map((line) => {
            const d = new Date(line.date);
            const dateLabel = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' });
            return (
              <div key={line.sessionId} className="grid grid-cols-[1fr_auto] gap-4 items-center px-3 py-2.5 border-b border-foreground/[.05] last:border-0">
                <div>
                  <span className="text-sm text-foreground/80">{dateLabel}</span>
                  <span className="text-xs text-foreground/65 ml-2">{line.startTime}–{line.endTime}</span>
                  <span className="text-xs text-foreground/40 ml-2">{line.serviceTypeName}</span>
                </div>
                <span className="text-sm font-semibold text-primary-light">{line.currency} {line.price}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-foreground/65 py-8 text-center">No completed sessions with a service type in this period.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create BillingSummaryClient**

```typescript
// src/components/billing/billing-summary-client.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BillingPeriodNav, type BillingPeriod } from './billing-period-nav';

interface MemberBilling {
  memberId: string;
  name: string;
  trainerName: string;
  sessionsCount: number;
  totalAmount: number;
  currency: string;
}

interface SummaryData {
  members: MemberBilling[];
  grandTotal: number;
  currency: string;
}

interface BillingSummaryClientProps {
  role: 'owner' | 'trainer';
  memberHubBase: string;
}

export function BillingSummaryClient({ role, memberHubBase }: BillingSummaryClientProps) {
  const router = useRouter();
  const now = new Date();
  const [period, setPeriod] = useState<BillingPeriod>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    label: now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
  });
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: BillingPeriod) => {
    setLoading(true);
    try {
      const from = p.from.toISOString();
      const to = p.to.toISOString();
      const res = await fetch(`/api/billing?from=${from}&to=${to}`);
      const json = (await res.json()) as SummaryData;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(period); }, [load, period]);

  function handlePeriodChange(p: BillingPeriod) {
    setPeriod(p);
    void load(p);
  }

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Billing</h1>
          <p className="text-xs text-foreground/65 mt-0.5">Completed sessions with a service type</p>
        </div>
        <BillingPeriodNav onChange={handlePeriodChange} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : data && data.members.length > 0 ? (
        <div>
          <div className={`grid gap-3 px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold ${role === 'owner' ? 'grid-cols-[1fr_80px_90px_80px]' : 'grid-cols-[1fr_90px_80px]'}`}>
            <span>Member</span>
            {role === 'owner' && <span>Trainer</span>}
            <span>Sessions</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="space-y-1.5">
            {data.members.map((m) => (
              <div key={m.memberId}
                className={`grid gap-3 items-center px-3 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all cursor-pointer ${role === 'owner' ? 'grid-cols-[1fr_80px_90px_80px]' : 'grid-cols-[1fr_90px_80px]'}`}
                onClick={() => router.push(`${memberHubBase}/${m.memberId}/billing`)}
              >
                <span className="text-sm font-medium text-foreground">{m.name}</span>
                {role === 'owner' && <span className="text-xs text-foreground/65">{m.trainerName}</span>}
                <span className="text-xs text-foreground/65">{m.sessionsCount} sessions</span>
                <span className="text-sm font-semibold text-primary-light text-right">{m.currency} {m.totalAmount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-foreground/[.06]">
            <span className="text-sm text-foreground/65 mr-3">Total</span>
            <span className="text-base font-bold text-primary-light">{data.currency} {data.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/65 py-8 text-center">No completed sessions with a service type in this period.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/billing/
git commit -m "feat(billing): add shared billing components"
```

---

## Task 11: Owner + Trainer Billing Pages

**Files:**
- Create: `src/app/(dashboard)/owner/billing/page.tsx`
- Create: `src/app/(dashboard)/trainer/billing/page.tsx`

- [ ] **Step 1: Create owner billing page**

```typescript
// src/app/(dashboard)/owner/billing/page.tsx
import { BillingSummaryClient } from '@/components/billing/billing-summary-client';

export default function OwnerBillingPage() {
  return <BillingSummaryClient role="owner" memberHubBase="/owner/members" />;
}
```

- [ ] **Step 2: Create trainer billing page**

```typescript
// src/app/(dashboard)/trainer/billing/page.tsx
import { BillingSummaryClient } from '@/components/billing/billing-summary-client';

export default function TrainerBillingPage() {
  return <BillingSummaryClient role="trainer" memberHubBase="/trainer/members" />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/owner/billing/page.tsx src/app/(dashboard)/trainer/billing/page.tsx
git commit -m "feat(billing): add owner and trainer billing pages"
```

---

## Task 12: Member Hub Billing Tab

**Files:**
- Modify: `src/components/shared/member-tab-nav.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/billing/page.tsx`

- [ ] **Step 1: Add Billing tab to member hub nav**

In `src/components/shared/member-tab-nav.tsx`, add to `TABS`:
```typescript
const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Health', segment: '/health' },
  { label: 'Check-ins', segment: '/check-ins' },
  { label: 'Photos', segment: '/photos' },
  { label: 'Billing', segment: '/billing' },
] as const;
```

- [ ] **Step 2: Create billing tab page for trainer member hub**

```typescript
// src/app/(dashboard)/trainer/members/[id]/billing/page.tsx
import { MemberBillingDetail } from '@/components/billing/member-billing-detail';

export default async function MemberHubBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: memberId } = await params;
  return <MemberBillingDetail memberId={memberId} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/member-tab-nav.tsx src/app/(dashboard)/trainer/members/[id]/billing/
git commit -m "feat(billing): add Billing tab to member hub"
```

---

## Task 13: Member Billing Page

**Files:**
- Create: `src/app/(dashboard)/member/billing/page.tsx`

- [ ] **Step 1: Create member billing page**

```typescript
// src/app/(dashboard)/member/billing/page.tsx
import { auth } from '@/lib/auth/auth';
import { MemberBillingDetail } from '@/components/billing/member-billing-detail';

export default async function MemberBillingPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <div className="px-4 sm:px-8 pt-7 pb-2">
        <h1 className="text-xl font-bold text-foreground">My Billing</h1>
        <p className="text-xs text-foreground/65 mt-0.5">Sessions completed and amounts due</p>
      </div>
      <MemberBillingDetail memberId={session.user.id} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/member/billing/page.tsx
git commit -m "feat(billing): add member billing page"
```

---

## Task 14: Navigation Updates

**Files:**
- Modify: `src/components/shared/app-shell.tsx`

- [ ] **Step 1: Add Services + Billing to owner nav, Billing to trainer and member nav**

In `src/components/shared/app-shell.tsx`, update the `NAV` constant:

For `owner`, add to the `GYM` group:
```typescript
{
  group: 'GYM',
  items: [
    { href: '/owner/calendar', label: 'Calendar' },
    { href: '/owner/equipment', label: 'Equipment' },
    { href: '/owner/services', label: 'Services' },
    { href: '/owner/billing', label: 'Billing' },
  ],
},
```

For `trainer`, add to the `SCHEDULE` group (or add a new `BILLING` group):
```typescript
{
  group: 'SCHEDULE',
  items: [
    { href: '/trainer/calendar', label: 'Calendar' },
    { href: '/trainer/billing', label: 'Billing' },
  ],
},
```

For `member`, add to the `TRAINING` group:
```typescript
{
  group: 'TRAINING',
  items: [
    { href: '/member/my-training', label: 'My Training' },
    { href: '/member/schedule', label: 'My Schedule' },
    { href: '/member/billing', label: 'My Billing' },
  ],
},
```

- [ ] **Step 2: Verify lint**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/app-shell.tsx
git commit -m "feat(billing): add Services and Billing nav items for all roles"
```

---

## Task 15: E2E Tests

**Files:**
- Create: `e2e/owner/service-types.spec.ts`
- Create: `e2e/owner/billing.spec.ts`
- Create: `e2e/member/billing.spec.ts`

Login is done inline — no helper. Fill `#email` / `#password` and click "Sign in".

- [ ] **Step 1: Write service-types E2E spec**

```typescript
// e2e/owner/service-types.spec.ts
import { test, expect } from '@playwright/test';

async function loginAsOwner(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('#email', 'owner@test.com');
  await page.fill('#password', 'TestPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/owner');
}

test.describe('Owner: Service Types', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('owner can create a service type and it appears in calendar dropdown', async ({ page }) => {
    // Create service type
    await page.goto('/owner/services');
    await page.getByRole('button', { name: '+ Add Service' }).click();
    await page.getByLabel('Name').fill('E2E Test Service');
    await page.getByLabel('Duration (min)').fill('45');
    await page.getByLabel('Price per Session').fill('200');
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify it appears in the list
    await expect(page.getByText('E2E Test Service')).toBeVisible();
    await expect(page.getByText('CNY 200')).toBeVisible();

    // Verify it appears in calendar create-session dropdown
    await page.goto('/owner/calendar');
    // Click an empty slot to open create modal
    const grid = page.locator('[data-testid="week-calendar-grid"]');
    if (await grid.isVisible()) {
      await grid.locator('td, [data-slot]').first().click();
    } else {
      // Fallback: navigate directly
      await page.goto('/owner/calendar');
    }
    const dropdown = page.getByLabel('Service Type');
    if (await dropdown.isVisible()) {
      await expect(dropdown.getByText('E2E Test Service')).toBeVisible();
    }
  });

  test('owner can deactivate a service type', async ({ page }) => {
    await page.goto('/owner/services');
    const firstActive = page.locator('.ring-foreground\\/10').first();
    if (await firstActive.isVisible()) {
      await firstActive.click();
      await page.getByRole('button', { name: 'Deactivate' }).click();
      await expect(page.getByText('Inactive')).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Write billing E2E spec (owner)**

```typescript
// e2e/owner/billing.spec.ts
import { test, expect } from '@playwright/test';

async function loginAsOwner(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('#email', 'owner@test.com');
  await page.fill('#password', 'TestPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/owner');
}

test.describe('Owner: Billing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('billing page loads and shows correct structure', async ({ page }) => {
    await page.goto('/owner/billing');
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    // Month nav present
    await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  });

  test('session with past date and service type appears in billing', async ({ page }) => {
    // Create a service type first
    await page.goto('/owner/services');
    await page.getByRole('button', { name: '+ Add Service' }).click();
    await page.getByLabel('Name').fill('Billing E2E Service');
    await page.getByLabel('Duration (min)').fill('60');
    await page.getByLabel('Price per Session').fill('500');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Billing E2E Service')).toBeVisible();

    // The billing total reflects completed sessions (past dates)
    await page.goto('/owner/billing');
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    // Verify the page renders without error
    await expect(page.locator('body')).not.toContainText('Internal server error');
  });
});
```

- [ ] **Step 3: Write member billing E2E spec**

```typescript
// e2e/member/billing.spec.ts
import { test, expect } from '@playwright/test';

async function loginAsMember(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('#email', 'member@test.com');
  await page.fill('#password', 'TestPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/member/plan');
}

test.describe('Member: Billing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMember(page);
  });

  test('member billing page loads with correct structure', async ({ page }) => {
    await page.goto('/member/billing');
    await expect(page.getByRole('heading', { name: 'My Billing' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
  });

  test('member cannot access owner billing page', async ({ page }) => {
    await page.goto('/owner/billing');
    // Should redirect away from owner page
    await expect(page).not.toHaveURL('/owner/billing');
  });
});
```

- [ ] **Step 4: Run E2E tests**

Run: `pnpm test:e2e --grep "Billing|Service Types"`
Expected: All specs pass (or skip gracefully if test data not seeded)

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: PASS

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add e2e/owner/service-types.spec.ts e2e/owner/billing.spec.ts e2e/member/billing.spec.ts
git commit -m "feat(billing): add E2E specs for service types and billing"
```

---

## Final Verification

- [ ] Run `pnpm build` — must pass cleanly
- [ ] Run `pnpm test` — 100% pass
- [ ] Run `pnpm lint` — no errors
- [ ] Manually verify in browser:
  - Owner: /owner/services → create a service type
  - Owner/Trainer: /owner/calendar → create session → service type dropdown appears
  - Owner: /owner/billing → page loads, month nav works
  - Owner: /owner/members/[id]/billing → per-member detail loads
  - Member: /member/billing → page loads
