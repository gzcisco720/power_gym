# Health Profile: Module A — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the injury data model, add MemberMedication and MemberMedicalHistory models, repositories, and API routes so the UI (modules B and C) can consume them.

**Architecture:** Three Mongoose models behind the repository pattern. Injury model gets new fields + member can now create/resolve/delete their own records. Medication and MedicalHistory are new member-managed entities with trainer read-access.

**Tech Stack:** Next.js App Router, Mongoose, TypeScript strict, Jest (node env)

---

## File Map

**Modify:**
- `src/lib/db/models/member-injury.model.ts` — add 13 new fields
- `src/lib/repositories/member-injury.repository.ts` — widen Create/Update types
- `src/app/api/members/[memberId]/injuries/route.ts` — allow member POST
- `src/app/api/members/[memberId]/injuries/[id]/route.ts` — allow member PATCH/DELETE for own records
- `__tests__/lib/db/models/member-injury.model.test.ts` — cover new fields
- `__tests__/app/api/members-injuries.test.ts` — cover member POST
- `__tests__/app/api/members-injuries-id.test.ts` — cover member PATCH/DELETE

**Create:**
- `src/lib/db/models/member-medication.model.ts`
- `src/lib/repositories/member-medication.repository.ts`
- `src/app/api/members/[memberId]/medications/route.ts`
- `src/app/api/members/[memberId]/medications/[id]/route.ts`
- `src/lib/db/models/member-medical-history.model.ts`
- `src/lib/repositories/member-medical-history.repository.ts`
- `src/app/api/members/[memberId]/medical-history/route.ts`
- `__tests__/lib/db/models/member-medication.model.test.ts`
- `__tests__/lib/repositories/member-medication.repository.test.ts`
- `__tests__/app/api/members-medications.test.ts`
- `__tests__/app/api/members-medications-id.test.ts`
- `__tests__/lib/db/models/member-medical-history.model.test.ts`
- `__tests__/lib/repositories/member-medical-history.repository.test.ts`
- `__tests__/app/api/members-medical-history.test.ts`

---

## Task 1: Extend MemberInjury model

**Files:**
- Modify: `src/lib/db/models/member-injury.model.ts`
- Modify: `__tests__/lib/db/models/member-injury.model.test.ts`

- [ ] **Step 1: Write failing tests for new fields**

Replace `__tests__/lib/db/models/member-injury.model.test.ts` content with:

```typescript
import { MemberInjuryModel } from '@/lib/db/models/member-injury.model';

describe('MemberInjuryModel schema', () => {
  it('has new extended fields with correct defaults', () => {
    const doc = new MemberInjuryModel({
      memberId: '507f1f77bcf86cd799439011',
      title: 'Test',
      createdByRole: 'trainer',
    });
    expect(doc.injuryType).toBeNull();
    expect(doc.bodyPart).toBeNull();
    expect(doc.bodySide).toBeNull();
    expect(doc.painAtRest).toBeNull();
    expect(doc.painDuringExercise).toBeNull();
    expect(doc.mechanism).toBeNull();
    expect(doc.aggravatingFactors).toBeNull();
    expect(doc.relievingFactors).toBeNull();
    expect(doc.seenDoctor).toBe(false);
    expect(doc.doctorRestrictions).toBeNull();
    expect(doc.rehabilitationStatus).toBeNull();
    expect(doc.resolvedAt).toBeNull();
    expect(doc.createdByRole).toBe('trainer');
  });

  it('defaults createdByRole to trainer', () => {
    const doc = new MemberInjuryModel({ memberId: '507f1f77bcf86cd799439011', title: 'Test' });
    expect(doc.createdByRole).toBe('trainer');
  });

  it('rejects invalid injuryType', () => {
    const doc = new MemberInjuryModel({
      memberId: '507f1f77bcf86cd799439011',
      title: 'Test',
      injuryType: 'invalid',
      createdByRole: 'trainer',
    });
    const err = doc.validateSync();
    expect(err?.errors['injuryType']).toBeDefined();
  });

  it('rejects painAtRest above 10', () => {
    const doc = new MemberInjuryModel({
      memberId: '507f1f77bcf86cd799439011',
      title: 'Test',
      painAtRest: 11,
      createdByRole: 'trainer',
    });
    const err = doc.validateSync();
    expect(err?.errors['painAtRest']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern="member-injury.model.test" --no-coverage
```

Expected: FAIL — `injuryType`, `painAtRest` etc. not defined on model.

- [ ] **Step 3: Replace model file with extended version**

Replace `src/lib/db/models/member-injury.model.ts`:

```typescript
import mongoose, { Document, Model, Schema } from 'mongoose';

export type InjuryStatus = 'active' | 'resolved';
export type InjuryType = 'acute' | 'chronic' | 'post_surgery';
export type BodyPart = 'knee' | 'shoulder' | 'lower_back' | 'hip' | 'ankle' | 'wrist' | 'neck' | 'other';
export type BodySide = 'left' | 'right' | 'bilateral';
export type RehabStatus = 'not_started' | 'in_progress' | 'cleared';
export type CreatedByRole = 'trainer' | 'member';

export interface IMemberInjury extends Document {
  memberId: mongoose.Types.ObjectId;
  title: string;
  status: InjuryStatus;
  recordedAt: Date;
  trainerNotes: string | null;
  memberNotes: string | null;
  affectedMovements: string | null;
  // new fields
  injuryType: InjuryType | null;
  bodyPart: BodyPart | null;
  bodySide: BodySide | null;
  painAtRest: number | null;
  painDuringExercise: number | null;
  mechanism: string | null;
  aggravatingFactors: string | null;
  relievingFactors: string | null;
  seenDoctor: boolean;
  doctorRestrictions: string | null;
  rehabilitationStatus: RehabStatus | null;
  resolvedAt: Date | null;
  createdByRole: CreatedByRole;
  createdAt: Date;
}

const MemberInjurySchema = new Schema<IMemberInjury>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    recordedAt: { type: Date, default: () => new Date() },
    trainerNotes: { type: String, default: null },
    memberNotes: { type: String, default: null },
    affectedMovements: { type: String, default: null },
    injuryType: { type: String, enum: ['acute', 'chronic', 'post_surgery'], default: null },
    bodyPart: { type: String, enum: ['knee', 'shoulder', 'lower_back', 'hip', 'ankle', 'wrist', 'neck', 'other'], default: null },
    bodySide: { type: String, enum: ['left', 'right', 'bilateral'], default: null },
    painAtRest: { type: Number, min: 0, max: 10, default: null },
    painDuringExercise: { type: Number, min: 0, max: 10, default: null },
    mechanism: { type: String, default: null },
    aggravatingFactors: { type: String, default: null },
    relievingFactors: { type: String, default: null },
    seenDoctor: { type: Boolean, default: false },
    doctorRestrictions: { type: String, default: null },
    rehabilitationStatus: { type: String, enum: ['not_started', 'in_progress', 'cleared'], default: null },
    resolvedAt: { type: Date, default: null },
    createdByRole: { type: String, enum: ['trainer', 'member'], default: 'trainer', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MemberInjurySchema.index({ memberId: 1, recordedAt: -1 });

export const MemberInjuryModel: Model<IMemberInjury> =
  mongoose.models.MemberInjury ??
  mongoose.model<IMemberInjury>('MemberInjury', MemberInjurySchema);
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pnpm test -- --testPathPattern="member-injury.model.test" --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Update repository types**

Replace `src/lib/repositories/member-injury.repository.ts`:

```typescript
import mongoose from 'mongoose';
import { MemberInjuryModel } from '@/lib/db/models/member-injury.model';
import type { IMemberInjury, InjuryStatus, InjuryType, BodyPart, BodySide, RehabStatus, CreatedByRole } from '@/lib/db/models/member-injury.model';

export interface CreateInjuryData {
  memberId: string;
  title: string;
  status?: InjuryStatus;
  recordedAt?: Date;
  trainerNotes?: string | null;
  memberNotes?: string | null;
  affectedMovements?: string | null;
  injuryType?: InjuryType | null;
  bodyPart?: BodyPart | null;
  bodySide?: BodySide | null;
  painAtRest?: number | null;
  painDuringExercise?: number | null;
  mechanism?: string | null;
  aggravatingFactors?: string | null;
  relievingFactors?: string | null;
  seenDoctor?: boolean;
  doctorRestrictions?: string | null;
  rehabilitationStatus?: RehabStatus | null;
  resolvedAt?: Date | null;
  createdByRole?: CreatedByRole;
}

export type UpdateInjuryData = Partial<Omit<CreateInjuryData, 'memberId'>>;

export interface IMemberInjuryRepository {
  findByMember(memberId: string): Promise<IMemberInjury[]>;
  findActiveByMember(memberId: string): Promise<IMemberInjury[]>;
  findById(id: string): Promise<IMemberInjury | null>;
  create(data: CreateInjuryData): Promise<IMemberInjury>;
  update(id: string, data: UpdateInjuryData): Promise<IMemberInjury | null>;
  deleteById(id: string): Promise<void>;
}

export class MongoMemberInjuryRepository implements IMemberInjuryRepository {
  async findByMember(memberId: string): Promise<IMemberInjury[]> {
    return MemberInjuryModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ recordedAt: -1 });
  }

  async findActiveByMember(memberId: string): Promise<IMemberInjury[]> {
    return MemberInjuryModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
      status: 'active',
    }).sort({ recordedAt: -1 });
  }

  async findById(id: string): Promise<IMemberInjury | null> {
    return MemberInjuryModel.findById(id);
  }

  async create(data: CreateInjuryData): Promise<IMemberInjury> {
    const doc = new MemberInjuryModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
    });
    return doc.save();
  }

  async update(id: string, data: UpdateInjuryData): Promise<IMemberInjury | null> {
    return MemberInjuryModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string): Promise<void> {
    await MemberInjuryModel.findByIdAndDelete(id);
  }
}
```

- [ ] **Step 6: Run full injury tests**

```bash
pnpm test -- --testPathPattern="member-injury" --no-coverage
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/models/member-injury.model.ts src/lib/repositories/member-injury.repository.ts __tests__/lib/db/models/member-injury.model.test.ts
git commit -m "feat(health): extend MemberInjury model with clinical fields"
```

---

## Task 2: Update injury API routes to allow member access

**Files:**
- Modify: `src/app/api/members/[memberId]/injuries/route.ts`
- Modify: `src/app/api/members/[memberId]/injuries/[id]/route.ts`
- Modify: `__tests__/app/api/members-injuries.test.ts`
- Modify: `__tests__/app/api/members-injuries-id.test.ts`

- [ ] **Step 1: Write failing tests for member POST**

Append to `__tests__/app/api/members-injuries.test.ts` (after existing tests):

```typescript
describe('POST /api/members/[memberId]/injuries — member self-report', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to create for a different memberId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ title: 'Knee pain' }) }),
      makeParams('m2'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 201 when member creates injury for themselves', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.create.mockResolvedValue({ _id: 'i1', title: 'Knee pain', createdByRole: 'member' });
    const { POST } = await import('@/app/api/members/[memberId]/injuries/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ title: 'Knee pain' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
    expect(mockInjuryRepo.create).toHaveBeenCalledWith(expect.objectContaining({ createdByRole: 'member' }));
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
pnpm test -- --testPathPattern="members-injuries\\.test" --no-coverage
```

Expected: 2 new tests FAIL.

- [ ] **Step 3: Update POST route to allow member self-report**

Replace `src/app/api/members/[memberId]/injuries/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';
import type { CreateInjuryData } from '@/lib/repositories/member-injury.repository';

type RouteContext = { params: Promise<{ memberId: string }> };

async function authorizeAccess(
  role: UserRole,
  sessionId: string,
  memberId: string,
): Promise<Response | null> {
  if (role === 'member') {
    if (sessionId !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    return null;
  }
  if (role === 'owner') return null;
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
  if (member.trainerId?.toString() !== sessionId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;
  await connectDB();
  const denied = await authorizeAccess(role, session.user.id, memberId);
  if (denied) return denied;
  const injuries = await new MongoMemberInjuryRepository().findByMember(memberId);
  return Response.json(injuries);
}

interface InjuryPayload {
  title?: string;
  injuryType?: string | null;
  bodyPart?: string | null;
  bodySide?: string | null;
  painAtRest?: number | null;
  painDuringExercise?: number | null;
  mechanism?: string | null;
  aggravatingFactors?: string | null;
  relievingFactors?: string | null;
  seenDoctor?: boolean;
  affectedMovements?: string | null;
  trainerNotes?: string | null;
  memberNotes?: string | null;
  recordedAt?: string;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;

  // Members can only create for themselves
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: InjuryPayload;
  try {
    body = (await req.json()) as InjuryPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 });

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const data: CreateInjuryData = {
    memberId,
    title: body.title.trim(),
    createdByRole: role === 'member' ? 'member' : 'trainer',
    trainerNotes: role !== 'member' ? (body.trainerNotes ?? null) : null,
    memberNotes: role === 'member' ? (body.memberNotes ?? null) : null,
    affectedMovements: body.affectedMovements ?? null,
    injuryType: (body.injuryType as CreateInjuryData['injuryType']) ?? null,
    bodyPart: (body.bodyPart as CreateInjuryData['bodyPart']) ?? null,
    bodySide: (body.bodySide as CreateInjuryData['bodySide']) ?? null,
    painAtRest: body.painAtRest ?? null,
    painDuringExercise: body.painDuringExercise ?? null,
    mechanism: body.mechanism ?? null,
    aggravatingFactors: body.aggravatingFactors ?? null,
    relievingFactors: body.relievingFactors ?? null,
    seenDoctor: body.seenDoctor ?? false,
    recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
  };

  const injury = await new MongoMemberInjuryRepository().create(data);
  return Response.json(injury, { status: 201 });
}
```

- [ ] **Step 4: Write failing tests for member PATCH/DELETE own records**

Append to `__tests__/app/api/members-injuries-id.test.ts`:

```typescript
describe('PATCH — member updates own injury (createdByRole=member)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows member to update pain scores and status on own injury', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.findById.mockResolvedValue({
      memberId: { toString: () => 'm1' },
      createdByRole: 'member',
    });
    mockInjuryRepo.update.mockResolvedValue({ _id: 'i1', status: 'resolved' });
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved', painAtRest: 0, resolvedAt: new Date().toISOString() }),
      }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(200);
  });

  it('blocks member from setting trainerNotes on own injury', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.findById.mockResolvedValue({
      memberId: { toString: () => 'm1' },
      createdByRole: 'member',
    });
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        body: JSON.stringify({ trainerNotes: 'hacked' }),
      }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(403);
  });

  it('blocks member from deleting trainer-created injury', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.findById.mockResolvedValue({
      memberId: { toString: () => 'm1' },
      createdByRole: 'trainer',
    });
    const { DELETE } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await DELETE(
      new Request('http://localhost/'),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(403);
  });

  it('allows member to delete own (member-created) injury', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.findById.mockResolvedValue({
      memberId: { toString: () => 'm1' },
      createdByRole: 'member',
    });
    mockInjuryRepo.deleteById.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await DELETE(
      new Request('http://localhost/'),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(204);
  });
});
```

Note: you'll need to check that `makeParams` in this test file accepts two args. If not, add:
```typescript
function makeParams(memberId: string, id: string) {
  return { params: Promise.resolve({ memberId, id }) };
}
```

- [ ] **Step 5: Run to confirm fail**

```bash
pnpm test -- --testPathPattern="members-injuries-id\\.test" --no-coverage
```

Expected: 4 new tests FAIL.

- [ ] **Step 6: Update PATCH/DELETE route**

Replace `src/app/api/members/[memberId]/injuries/[id]/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UpdateInjuryData } from '@/lib/repositories/member-injury.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; id: string }> };

const MEMBER_ALLOWED_FIELDS = new Set([
  'memberNotes', 'painAtRest', 'painDuringExercise', 'mechanism',
  'aggravatingFactors', 'relievingFactors', 'seenDoctor', 'status', 'resolvedAt',
]);

const TRAINER_FORBIDDEN_FROM_MEMBER = new Set(['memberNotes']);

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, id } = await params;
  const role = session.user.role as UserRole;

  let body: UpdateInjuryData & { resolvedAt?: string | null };
  try {
    body = (await req.json()) as UpdateInjuryData;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await connectDB();
  const injuryRepo = new MongoMemberInjuryRepository();

  if (role === 'member') {
    const injury = await injuryRepo.findById(id);
    if (!injury) return Response.json({ error: 'Not found' }, { status: 404 });
    if (injury.memberId.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const keys = Object.keys(body);
    // Member can only update their own fields; trainer-only fields are forbidden
    const hasDisallowed = keys.some((k) => !MEMBER_ALLOWED_FIELDS.has(k));
    if (hasDisallowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const updateData: UpdateInjuryData = {};
    for (const k of keys) {
      if (MEMBER_ALLOWED_FIELDS.has(k)) {
        (updateData as Record<string, unknown>)[k] = (body as Record<string, unknown>)[k];
      }
    }
    // Auto-set resolvedAt when status changes to resolved
    if (updateData.status === 'resolved' && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (updateData.status === 'active') {
      updateData.resolvedAt = null;
    }

    const updated = await injuryRepo.update(id, updateData);
    return Response.json(updated);
  }

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Strip memberNotes from trainer updates (trainers can't overwrite member notes)
  const { memberNotes: _mn, ...trainerBody } = body as UpdateInjuryData & { memberNotes?: unknown };
  void _mn;

  // Auto-set resolvedAt
  const finalUpdate = { ...trainerBody } as UpdateInjuryData;
  if (finalUpdate.status === 'resolved' && !finalUpdate.resolvedAt) {
    finalUpdate.resolvedAt = new Date();
  }
  if (finalUpdate.status === 'active') {
    finalUpdate.resolvedAt = null;
  }

  const updated = await injuryRepo.update(id, finalUpdate);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, id } = await params;
  const role = session.user.role as UserRole;

  await connectDB();
  const injuryRepo = new MongoMemberInjuryRepository();

  if (role === 'member') {
    const injury = await injuryRepo.findById(id);
    if (!injury) return Response.json({ error: 'Not found' }, { status: 404 });
    if (injury.memberId.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Members can only delete injuries they created
    if (injury.createdByRole !== 'member') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    await injuryRepo.deleteById(id);
    return new Response(null, { status: 204 });
  }

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  await injuryRepo.deleteById(id);
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 7: Run all injury tests**

```bash
pnpm test -- --testPathPattern="members-injuries" --no-coverage
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/members/\[memberId\]/injuries/route.ts src/app/api/members/\[memberId\]/injuries/\[id\]/route.ts __tests__/app/api/members-injuries.test.ts __tests__/app/api/members-injuries-id.test.ts
git commit -m "feat(health): allow members to self-report and manage own injuries"
```

---

## Task 3: MemberMedication model + repository

**Files:**
- Create: `src/lib/db/models/member-medication.model.ts`
- Create: `src/lib/repositories/member-medication.repository.ts`
- Create: `__tests__/lib/db/models/member-medication.model.test.ts`
- Create: `__tests__/lib/repositories/member-medication.repository.test.ts`

- [ ] **Step 1: Write failing model test**

Create `__tests__/lib/db/models/member-medication.model.test.ts`:

```typescript
import { MemberMedicationModel } from '@/lib/db/models/member-medication.model';

describe('MemberMedicationModel schema', () => {
  it('has correct defaults', () => {
    const doc = new MemberMedicationModel({
      memberId: '507f1f77bcf86cd799439011',
      name: 'Ibuprofen 400mg',
      purpose: 'Pain relief',
      duration: 'short_term',
      startDate: new Date(),
    });
    expect(doc.status).toBe('active');
    expect(doc.endDate).toBeNull();
    expect(doc.notes).toBeNull();
  });

  it('rejects invalid duration', () => {
    const doc = new MemberMedicationModel({
      memberId: '507f1f77bcf86cd799439011',
      name: 'X',
      purpose: 'Y',
      duration: 'forever',
      startDate: new Date(),
    });
    const err = doc.validateSync();
    expect(err?.errors['duration']).toBeDefined();
  });

  it('requires name, purpose, duration, startDate', () => {
    const doc = new MemberMedicationModel({ memberId: '507f1f77bcf86cd799439011' });
    const err = doc.validateSync();
    expect(err?.errors['name']).toBeDefined();
    expect(err?.errors['duration']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
pnpm test -- --testPathPattern="member-medication.model.test" --no-coverage
```

Expected: FAIL — model file does not exist.

- [ ] **Step 3: Create model**

Create `src/lib/db/models/member-medication.model.ts`:

```typescript
import mongoose, { Document, Model, Schema } from 'mongoose';

export type MedicationDuration = 'long_term' | 'short_term';
export type MedicationStatus = 'active' | 'ended';

export interface IMemberMedication extends Document {
  memberId: mongoose.Types.ObjectId;
  name: string;
  purpose: string;
  duration: MedicationDuration;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  status: MedicationStatus;
  createdAt: Date;
}

const MemberMedicationSchema = new Schema<IMemberMedication>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    duration: { type: String, enum: ['long_term', 'short_term'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    notes: { type: String, default: null },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MemberMedicationSchema.index({ memberId: 1, status: 1 });

export const MemberMedicationModel: Model<IMemberMedication> =
  mongoose.models.MemberMedication ??
  mongoose.model<IMemberMedication>('MemberMedication', MemberMedicationSchema);
```

- [ ] **Step 4: Create repository**

Create `src/lib/repositories/member-medication.repository.ts`:

```typescript
import mongoose from 'mongoose';
import { MemberMedicationModel } from '@/lib/db/models/member-medication.model';
import type { IMemberMedication, MedicationDuration, MedicationStatus } from '@/lib/db/models/member-medication.model';

export interface CreateMedicationData {
  memberId: string;
  name: string;
  purpose: string;
  duration: MedicationDuration;
  startDate: Date;
  endDate?: Date | null;
  notes?: string | null;
}

export type UpdateMedicationData = Partial<Omit<CreateMedicationData, 'memberId'> & { status: MedicationStatus }>;

export interface IMemberMedicationRepository {
  findByMember(memberId: string): Promise<IMemberMedication[]>;
  findById(id: string): Promise<IMemberMedication | null>;
  create(data: CreateMedicationData): Promise<IMemberMedication>;
  update(id: string, data: UpdateMedicationData): Promise<IMemberMedication | null>;
  deleteById(id: string): Promise<void>;
}

export class MongoMemberMedicationRepository implements IMemberMedicationRepository {
  async findByMember(memberId: string): Promise<IMemberMedication[]> {
    return MemberMedicationModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ status: 1, startDate: -1 });
  }

  async findById(id: string): Promise<IMemberMedication | null> {
    return MemberMedicationModel.findById(id);
  }

  async create(data: CreateMedicationData): Promise<IMemberMedication> {
    const doc = new MemberMedicationModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
    });
    return doc.save();
  }

  async update(id: string, data: UpdateMedicationData): Promise<IMemberMedication | null> {
    return MemberMedicationModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string): Promise<void> {
    await MemberMedicationModel.findByIdAndDelete(id);
  }
}
```

- [ ] **Step 5: Write repository test**

Create `__tests__/lib/repositories/member-medication.repository.test.ts`:

```typescript
import mongoose from 'mongoose';

jest.mock('@/lib/db/models/member-medication.model', () => {
  const save = jest.fn();
  const MockModel = Object.assign(
    jest.fn().mockImplementation(() => ({ save })),
    {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    },
  );
  return { MemberMedicationModel: MockModel };
});

import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import { MemberMedicationModel } from '@/lib/db/models/member-medication.model';

const mockModel = MemberMedicationModel as jest.MockedClass<typeof MemberMedicationModel>;

describe('MongoMemberMedicationRepository', () => {
  let repo: MongoMemberMedicationRepository;
  const memberId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoMemberMedicationRepository();
  });

  it('findByMember calls find with memberId and sorts', async () => {
    const fakeSortFn = jest.fn().mockResolvedValue([]);
    (mockModel.find as jest.Mock).mockReturnValue({ sort: fakeSortFn });
    await repo.findByMember(memberId);
    expect(mockModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId) }),
    );
    expect(fakeSortFn).toHaveBeenCalledWith({ status: 1, startDate: -1 });
  });

  it('create saves a new document with ObjectId memberId', async () => {
    const instance = { save: jest.fn().mockResolvedValue({ _id: 'med1' }) };
    (mockModel as jest.Mock).mockImplementation(() => instance);
    await repo.create({
      memberId,
      name: 'Ibuprofen',
      purpose: 'Pain',
      duration: 'short_term',
      startDate: new Date(),
    });
    expect(instance.save).toHaveBeenCalled();
  });

  it('deleteById calls findByIdAndDelete', async () => {
    (mockModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
    await repo.deleteById('med1');
    expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('med1');
  });
});
```

- [ ] **Step 6: Run model + repo tests**

```bash
pnpm test -- --testPathPattern="member-medication" --no-coverage
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/models/member-medication.model.ts src/lib/repositories/member-medication.repository.ts __tests__/lib/db/models/member-medication.model.test.ts __tests__/lib/repositories/member-medication.repository.test.ts
git commit -m "feat(health): add MemberMedication model and repository"
```

---

## Task 4: Medication API routes

**Files:**
- Create: `src/app/api/members/[memberId]/medications/route.ts`
- Create: `src/app/api/members/[memberId]/medications/[id]/route.ts`
- Create: `__tests__/app/api/members-medications.test.ts`
- Create: `__tests__/app/api/members-medications-id.test.ts`

- [ ] **Step 1: Write failing tests for GET + POST**

Create `__tests__/app/api/members-medications.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockMedRepo = { findByMember: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/member-medication.repository', () => ({
  MongoMemberMedicationRepository: jest.fn(() => mockMedRepo),
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

describe('GET /api/members/[memberId]/medications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member reads another member medications', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns medications for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findByMember.mockResolvedValue([{ _id: 'med1' }]);
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { GET } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/members/[memberId]/medications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to create a medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ name: 'X' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ name: 'X' }) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 when member creates medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.create.mockResolvedValue({ _id: 'med1' });
    const { POST } = await import('@/app/api/members/[memberId]/medications/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify({ name: 'Ibuprofen', purpose: 'Pain', duration: 'short_term', startDate: new Date().toISOString() }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
pnpm test -- --testPathPattern="members-medications\\.test" --no-coverage
```

Expected: FAIL — route file does not exist.

- [ ] **Step 3: Create GET + POST route**

Create `src/app/api/members/[memberId]/medications/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';
import type { MedicationDuration } from '@/lib/db/models/member-medication.model';

type RouteContext = { params: Promise<{ memberId: string }> };

async function authorizeAccess(role: UserRole, sessionId: string, memberId: string): Promise<Response | null> {
  if (role === 'member') {
    if (sessionId !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    return null;
  }
  if (role === 'owner') return null;
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
  if (member.trainerId?.toString() !== sessionId) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;
  await connectDB();
  const denied = await authorizeAccess(role, session.user.id, memberId);
  if (denied) return denied;
  const meds = await new MongoMemberMedicationRepository().findByMember(memberId);
  return Response.json(meds);
}

interface MedPayload {
  name?: string;
  purpose?: string;
  duration?: MedicationDuration;
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;

  // Only member can create their own medications
  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (session.user.id !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: MedPayload;
  try { body = (await req.json()) as MedPayload; } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name?.trim() || !body.purpose?.trim() || !body.duration || !body.startDate) {
    return Response.json({ error: 'name, purpose, duration and startDate are required' }, { status: 400 });
  }

  await connectDB();
  const med = await new MongoMemberMedicationRepository().create({
    memberId,
    name: body.name.trim(),
    purpose: body.purpose.trim(),
    duration: body.duration,
    startDate: new Date(body.startDate),
    endDate: body.endDate ? new Date(body.endDate) : null,
    notes: body.notes ?? null,
  });
  return Response.json(med, { status: 201 });
}
```

- [ ] **Step 4: Write failing tests for PATCH + DELETE**

Create `__tests__/app/api/members-medications-id.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockMedRepo = { findById: jest.fn(), update: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/member-medication.repository', () => ({
  MongoMemberMedicationRepository: jest.fn(() => mockMedRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string, id: string) {
  return { params: Promise.resolve({ memberId, id }) };
}

describe('PATCH /api/members/[memberId]/medications/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to patch', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ notes: 'x' }) }),
      makeParams('m1', 'med1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when member patches another member medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm2' } });
    const { PATCH } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ notes: 'x' }) }),
      makeParams('m1', 'med1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 when member patches own medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm1' } });
    mockMedRepo.update.mockResolvedValue({ _id: 'med1', notes: 'updated' });
    const { PATCH } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ notes: 'updated' }) }),
      makeParams('m1', 'med1'),
    );
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/members/[memberId]/medications/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'med1'));
    expect(res.status).toBe(403);
  });

  it('returns 204 when member deletes own medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm1' } });
    mockMedRepo.deleteById.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'med1'));
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 5: Run to confirm fail**

```bash
pnpm test -- --testPathPattern="members-medications-id" --no-coverage
```

- [ ] **Step 6: Create PATCH + DELETE route**

Create `src/app/api/members/[memberId]/medications/[id]/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import type { UpdateMedicationData } from '@/lib/repositories/member-medication.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; id: string }> };

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const role = session.user.role as UserRole;

  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: UpdateMedicationData;
  try { body = (await req.json()) as UpdateMedicationData; } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoMemberMedicationRepository();
  const med = await repo.findById(id);
  if (!med) return Response.json({ error: 'Not found' }, { status: 404 });
  if (med.memberId.toString() !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const updated = await repo.update(id, body);
  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const role = session.user.role as UserRole;

  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const repo = new MongoMemberMedicationRepository();
  const med = await repo.findById(id);
  if (!med) return Response.json({ error: 'Not found' }, { status: 404 });
  if (med.memberId.toString() !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  await repo.deleteById(id);
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 7: Run all medication tests**

```bash
pnpm test -- --testPathPattern="member-medication|members-medication" --no-coverage
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/members/\[memberId\]/medications/ src/lib/db/models/member-medication.model.ts src/lib/repositories/member-medication.repository.ts __tests__/app/api/members-medications.test.ts __tests__/app/api/members-medications-id.test.ts __tests__/lib/repositories/member-medication.repository.test.ts
git commit -m "feat(health): add MemberMedication API routes"
```

---

## Task 5: MemberMedicalHistory model + repository + API

**Files:**
- Create: `src/lib/db/models/member-medical-history.model.ts`
- Create: `src/lib/repositories/member-medical-history.repository.ts`
- Create: `src/app/api/members/[memberId]/medical-history/route.ts`
- Create: `__tests__/lib/db/models/member-medical-history.model.test.ts`
- Create: `__tests__/lib/repositories/member-medical-history.repository.test.ts`
- Create: `__tests__/app/api/members-medical-history.test.ts`

- [ ] **Step 1: Write failing model test**

Create `__tests__/lib/db/models/member-medical-history.model.test.ts`:

```typescript
import { MemberMedicalHistoryModel } from '@/lib/db/models/member-medical-history.model';

describe('MemberMedicalHistoryModel schema', () => {
  it('has correct defaults', () => {
    const doc = new MemberMedicalHistoryModel({ memberId: '507f1f77bcf86cd799439011' });
    expect(doc.chronicConditions).toEqual([]);
    expect(doc.surgeries).toBeNull();
    expect(doc.allergies).toBeNull();
    expect(doc.familyHistory).toBeNull();
    expect(doc.currentDoctor).toBeNull();
    expect(doc.emergencyContact).toBeNull();
    expect(doc.pregnancyStatus).toBeNull();
  });

  it('rejects invalid pregnancyStatus', () => {
    const doc = new MemberMedicalHistoryModel({
      memberId: '507f1f77bcf86cd799439011',
      pregnancyStatus: 'unknown',
    });
    const err = doc.validateSync();
    expect(err?.errors['pregnancyStatus']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
pnpm test -- --testPathPattern="member-medical-history.model.test" --no-coverage
```

- [ ] **Step 3: Create model**

Create `src/lib/db/models/member-medical-history.model.ts`:

```typescript
import mongoose, { Document, Model, Schema } from 'mongoose';

export type PregnancyStatus = 'n/a' | 'not_pregnant' | 'pregnant' | 'postpartum';

export interface IMemberMedicalHistory extends Document {
  memberId: mongoose.Types.ObjectId;
  chronicConditions: string[];
  surgeries: string | null;
  allergies: string | null;
  familyHistory: string | null;
  currentDoctor: string | null;
  emergencyContact: string | null;
  pregnancyStatus: PregnancyStatus | null;
  updatedAt: Date;
}

const MemberMedicalHistorySchema = new Schema<IMemberMedicalHistory>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    chronicConditions: { type: [String], default: [] },
    surgeries: { type: String, default: null },
    allergies: { type: String, default: null },
    familyHistory: { type: String, default: null },
    currentDoctor: { type: String, default: null },
    emergencyContact: { type: String, default: null },
    pregnancyStatus: {
      type: String,
      enum: ['n/a', 'not_pregnant', 'pregnant', 'postpartum'],
      default: null,
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const MemberMedicalHistoryModel: Model<IMemberMedicalHistory> =
  mongoose.models.MemberMedicalHistory ??
  mongoose.model<IMemberMedicalHistory>('MemberMedicalHistory', MemberMedicalHistorySchema);
```

- [ ] **Step 4: Create repository**

Create `src/lib/repositories/member-medical-history.repository.ts`:

```typescript
import mongoose from 'mongoose';
import { MemberMedicalHistoryModel } from '@/lib/db/models/member-medical-history.model';
import type { IMemberMedicalHistory, PregnancyStatus } from '@/lib/db/models/member-medical-history.model';

export interface UpsertMedicalHistoryData {
  chronicConditions?: string[];
  surgeries?: string | null;
  allergies?: string | null;
  familyHistory?: string | null;
  currentDoctor?: string | null;
  emergencyContact?: string | null;
  pregnancyStatus?: PregnancyStatus | null;
}

export interface IMemberMedicalHistoryRepository {
  findByMember(memberId: string): Promise<IMemberMedicalHistory | null>;
  upsert(memberId: string, data: UpsertMedicalHistoryData): Promise<IMemberMedicalHistory>;
}

export class MongoMemberMedicalHistoryRepository implements IMemberMedicalHistoryRepository {
  async findByMember(memberId: string): Promise<IMemberMedicalHistory | null> {
    return MemberMedicalHistoryModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
    });
  }

  async upsert(memberId: string, data: UpsertMedicalHistoryData): Promise<IMemberMedicalHistory> {
    const result = await MemberMedicalHistoryModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: data },
      { new: true, upsert: true },
    );
    return result!;
  }
}
```

- [ ] **Step 5: Write and run repository test**

Create `__tests__/lib/repositories/member-medical-history.repository.test.ts`:

```typescript
import mongoose from 'mongoose';

jest.mock('@/lib/db/models/member-medical-history.model', () => ({
  MemberMedicalHistoryModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import { MongoMemberMedicalHistoryRepository } from '@/lib/repositories/member-medical-history.repository';
import { MemberMedicalHistoryModel } from '@/lib/db/models/member-medical-history.model';

const mockModel = MemberMedicalHistoryModel as jest.Mocked<typeof MemberMedicalHistoryModel>;

describe('MongoMemberMedicalHistoryRepository', () => {
  const memberId = new mongoose.Types.ObjectId().toString();
  let repo: MongoMemberMedicalHistoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoMemberMedicalHistoryRepository();
  });

  it('findByMember calls findOne with memberId', async () => {
    (mockModel.findOne as jest.Mock).mockResolvedValue(null);
    await repo.findByMember(memberId);
    expect(mockModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId) }),
    );
  });

  it('upsert calls findOneAndUpdate with upsert:true', async () => {
    (mockModel.findOneAndUpdate as jest.Mock).mockResolvedValue({ memberId, chronicConditions: [] });
    await repo.upsert(memberId, { surgeries: 'None' });
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: expect.any(mongoose.Types.ObjectId) }),
      expect.objectContaining({ $set: { surgeries: 'None' } }),
      expect.objectContaining({ upsert: true }),
    );
  });
});
```

```bash
pnpm test -- --testPathPattern="member-medical-history" --no-coverage
```

Expected: all pass.

- [ ] **Step 6: Write failing API test**

Create `__tests__/app/api/members-medical-history.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockHistoryRepo = { findByMember: jest.fn(), upsert: jest.fn() };
jest.mock('@/lib/repositories/member-medical-history.repository', () => ({
  MongoMemberMedicalHistoryRepository: jest.fn(() => mockHistoryRepo),
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

describe('GET /api/members/[memberId]/medical-history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns null body as empty object when no history exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockHistoryRepo.findByMember.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(null);
  });
});

describe('PUT /api/members/[memberId]/medical-history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to upsert', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { PUT } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await PUT(
      new Request('http://localhost/', { method: 'PUT', body: JSON.stringify({}) }),
      makeParams('m1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 when member upserts their own history', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockHistoryRepo.upsert.mockResolvedValue({ memberId: 'm1', chronicConditions: ['Hypertension'] });
    const { PUT } = await import('@/app/api/members/[memberId]/medical-history/route');
    const res = await PUT(
      new Request('http://localhost/', {
        method: 'PUT',
        body: JSON.stringify({ chronicConditions: ['Hypertension'] }),
      }),
      makeParams('m1'),
    );
    expect(res.status).toBe(200);
  });
});
```

```bash
pnpm test -- --testPathPattern="members-medical-history\\.test" --no-coverage
```

Expected: FAIL — route file does not exist.

- [ ] **Step 7: Create the API route**

Create `src/app/api/members/[memberId]/medical-history/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberMedicalHistoryRepository } from '@/lib/repositories/member-medical-history.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';
import type { UpsertMedicalHistoryData } from '@/lib/repositories/member-medical-history.repository';

type RouteContext = { params: Promise<{ memberId: string }> };

async function authorizeAccess(role: UserRole, sessionId: string, memberId: string): Promise<Response | null> {
  if (role === 'member') {
    if (sessionId !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    return null;
  }
  if (role === 'owner') return null;
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
  if (member.trainerId?.toString() !== sessionId) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;
  await connectDB();
  const denied = await authorizeAccess(role, session.user.id, memberId);
  if (denied) return denied;
  const history = await new MongoMemberMedicalHistoryRepository().findByMember(memberId);
  return Response.json(history);
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (session.user.id !== memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: UpsertMedicalHistoryData;
  try { body = (await req.json()) as UpsertMedicalHistoryData; } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await connectDB();
  const history = await new MongoMemberMedicalHistoryRepository().upsert(memberId, body);
  return Response.json(history);
}
```

- [ ] **Step 8: Run all medical history tests**

```bash
pnpm test -- --testPathPattern="medical-history" --no-coverage
```

Expected: all pass.

- [ ] **Step 9: Run full test suite to confirm no regressions**

```bash
pnpm test --no-coverage
```

Expected: all existing tests still pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/db/models/member-medical-history.model.ts src/lib/repositories/member-medical-history.repository.ts src/app/api/members/\[memberId\]/medical-history/ __tests__/lib/db/models/member-medical-history.model.test.ts __tests__/lib/repositories/member-medical-history.repository.test.ts __tests__/app/api/members-medical-history.test.ts
git commit -m "feat(health): add MemberMedicalHistory model, repository, and API route"
```

---

## Final Check

```bash
pnpm lint && pnpm test --no-coverage
```

Both must pass cleanly before Module A is considered complete.
