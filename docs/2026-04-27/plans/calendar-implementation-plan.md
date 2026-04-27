# Calendar & Session Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weekly scheduling calendar for owners/trainers to book training sessions with members, with recurring support, scope-based editing, 24h email reminders, and a list view for members.

**Architecture:** ScheduledSession documents (seriesId groups recurring), repository pattern for all DB access, cron API routes secured by CRON_SECRET, calendar rendered as a client component with absolute-positioned event blocks.

**Tech Stack:** Next.js App Router, MongoDB/Mongoose, Nodemailer (existing), React Testing Library, Jest

---

## File Map

**New files:**
- `src/lib/db/models/scheduled-session.model.ts`
- `src/lib/repositories/scheduled-session.repository.ts`
- `src/lib/email/templates/session-reminder.ts`
- `src/app/api/schedule/route.ts`
- `src/app/api/schedule/[id]/route.ts`
- `src/app/api/schedule/member/[memberId]/route.ts`
- `src/app/api/cron/session-reminders/route.ts`
- `src/app/api/cron/extend-series/route.ts`
- `src/app/(dashboard)/owner/calendar/page.tsx`
- `src/app/(dashboard)/owner/calendar/_components/week-calendar.tsx`
- `src/app/(dashboard)/trainer/calendar/page.tsx`
- `src/app/(dashboard)/trainer/calendar/_components/week-calendar.tsx`
- `src/app/(dashboard)/member/schedule/page.tsx`
- `src/app/(dashboard)/member/schedule/_components/member-schedule-list.tsx`
- `src/components/calendar/week-calendar-grid.tsx`
- `src/components/calendar/session-event-card.tsx`
- `src/components/calendar/create-session-modal.tsx`
- `src/components/calendar/recurring-scope-dialog.tsx`
- `src/components/calendar/edit-session-modal.tsx`
- `__tests__/app/api/schedule.test.ts`
- `__tests__/app/api/schedule-id.test.ts`
- `__tests__/app/api/schedule-member.test.ts`
- `__tests__/app/api/cron-session-reminders.test.ts`
- `__tests__/app/api/cron-extend-series.test.ts`
- `__tests__/components/calendar/create-session-modal.test.tsx`
- `__tests__/components/calendar/recurring-scope-dialog.test.tsx`

**Modified files:**
- `src/lib/email/index.ts` — add `SendSessionReminderParams` + `sendSessionReminder` to `IEmailService`
- `src/lib/email/nodemailer.ts` — implement `sendSessionReminder`
- `src/app/api/owner/members/[id]/trainer/route.ts` — add unassign side effect
- `src/components/shared/app-shell.tsx` — add Calendar / My Schedule nav items

---

## Stage 1: ScheduledSession Model + Repository

**Goal:** Data layer for all schedule operations  
**Success Criteria:** All repository methods covered by passing unit tests  
**Status:** Not Started

### Task 1.1 — Model

**Files:**
- Create: `src/lib/db/models/scheduled-session.model.ts`

- [ ] **Write the failing test**

Create `__tests__/lib/db/models/scheduled-session.model.test.ts`:
```ts
/** @jest-environment node */
import mongoose from 'mongoose';

describe('ScheduledSession model schema', () => {
  it('exports ScheduledSessionModel without throwing', () => {
    const { ScheduledSessionModel } = require('@/lib/db/models/scheduled-session.model');
    expect(ScheduledSessionModel).toBeDefined();
  });
});
```

- [ ] **Run test to confirm RED**
```bash
pnpm test -- --testPathPattern="scheduled-session.model" --no-coverage
```
Expected: FAIL — module not found

- [ ] **Implement model**

Create `src/lib/db/models/scheduled-session.model.ts`:
```ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IScheduledSession extends Document {
  seriesId: mongoose.Types.ObjectId | null;
  trainerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledSessionSchema = new Schema<IScheduledSession>(
  {
    seriesId: { type: Schema.Types.ObjectId, default: null },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    memberIds: [{ type: Schema.Types.ObjectId }],
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ScheduledSessionSchema.index({ date: 1, trainerId: 1 });
ScheduledSessionSchema.index({ memberIds: 1, date: 1 });
ScheduledSessionSchema.index({ seriesId: 1, date: 1 });
ScheduledSessionSchema.index({ status: 1, date: 1, reminderSentAt: 1 });

export const ScheduledSessionModel: Model<IScheduledSession> =
  mongoose.models.ScheduledSession ??
  mongoose.model<IScheduledSession>('ScheduledSession', ScheduledSessionSchema);
```

- [ ] **Run test to confirm GREEN**
```bash
pnpm test -- --testPathPattern="scheduled-session.model" --no-coverage
```
Expected: PASS

- [ ] **Commit**
```bash
git add src/lib/db/models/scheduled-session.model.ts __tests__/lib/db/models/scheduled-session.model.test.ts
git commit -m "feat: add ScheduledSession mongoose model"
```

---

### Task 1.2 — Repository

**Files:**
- Create: `src/lib/repositories/scheduled-session.repository.ts`
- Create: `__tests__/lib/repositories/scheduled-session.repository.test.ts`

- [ ] **Write the failing test**

Create `__tests__/lib/repositories/scheduled-session.repository.test.ts`:
```ts
/** @jest-environment node */

const mockSave = jest.fn();
const mockInsertMany = jest.fn();
const mockFind = jest.fn(() => ({ sort: jest.fn().mockResolvedValue([]) }));
const mockFindOne = jest.fn(() => ({ sort: jest.fn().mockResolvedValue(null) }));
const mockFindById = jest.fn().mockResolvedValue(null);
const mockFindByIdAndUpdate = jest.fn().mockResolvedValue(null);
const mockUpdateMany = jest.fn().mockResolvedValue({});
const mockDistinct = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/db/models/scheduled-session.model', () => {
  function MockModel(data: object) {
    return { ...data, save: mockSave };
  }
  MockModel.insertMany = mockInsertMany;
  MockModel.find = mockFind;
  MockModel.findOne = mockFindOne;
  MockModel.findById = mockFindById;
  MockModel.findByIdAndUpdate = mockFindByIdAndUpdate;
  MockModel.updateMany = mockUpdateMany;
  MockModel.distinct = mockDistinct;
  return { ScheduledSessionModel: MockModel };
});

import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';

describe('MongoScheduledSessionRepository', () => {
  let repo: MongoScheduledSessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoScheduledSessionRepository();
  });

  it('create calls save and returns doc', async () => {
    const fakeDoc = { _id: 'id1' };
    mockSave.mockResolvedValue(fakeDoc);
    const result = await repo.create({
      seriesId: null,
      trainerId: '507f1f77bcf86cd799439011',
      memberIds: ['507f1f77bcf86cd799439012'],
      date: new Date('2026-05-01'),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(mockSave).toHaveBeenCalled();
    expect(result).toBe(fakeDoc);
  });

  it('createMany calls insertMany', async () => {
    await repo.createMany([
      { seriesId: 'sid1', trainerId: '507f1f77bcf86cd799439011', memberIds: [], date: new Date(), startTime: '09:00', endTime: '10:00' },
    ]);
    expect(mockInsertMany).toHaveBeenCalled();
  });

  it('findByDateRange calls find with date range', async () => {
    const start = new Date('2026-05-01');
    const end = new Date('2026-05-07');
    await repo.findByDateRange(start, end);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ date: { $gte: start, $lte: end } }));
  });

  it('findByDateRange passes trainerId filter when given', async () => {
    const start = new Date();
    const end = new Date();
    await repo.findByDateRange(start, end, { trainerId: '507f1f77bcf86cd799439011' });
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ trainerId: expect.anything() }));
  });

  it('cancelOne calls findByIdAndUpdate with cancelled status', async () => {
    await repo.cancelOne('abc123');
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('abc123', { $set: { status: 'cancelled' } });
  });

  it('cancelFuture calls updateMany with seriesId and date filter', async () => {
    const from = new Date('2026-05-05');
    await repo.cancelFuture('sid1', from);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ date: { $gte: from }, status: 'scheduled' }),
      { $set: { status: 'cancelled' } },
    );
  });

  it('markReminderSent calls findByIdAndUpdate', async () => {
    await repo.markReminderSent('id1');
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('id1', { $set: { reminderSentAt: expect.any(Date) } });
  });
});
```

- [ ] **Run test to confirm RED**
```bash
pnpm test -- --testPathPattern="scheduled-session.repository" --no-coverage
```
Expected: FAIL — module not found

- [ ] **Implement repository**

Create `src/lib/repositories/scheduled-session.repository.ts`:
```ts
import mongoose from 'mongoose';
import type { IScheduledSession } from '@/lib/db/models/scheduled-session.model';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';

export interface CreateScheduledSessionData {
  seriesId: string | null;
  trainerId: string;
  memberIds: string[];
  date: Date;
  startTime: string;
  endTime: string;
}

export interface UpdateScheduledSessionData {
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
}

export interface FindByDateRangeOptions {
  trainerId?: string;
  memberId?: string;
}

export interface IScheduledSessionRepository {
  create(data: CreateScheduledSessionData): Promise<IScheduledSession>;
  createMany(data: CreateScheduledSessionData[]): Promise<void>;
  findByDateRange(start: Date, end: Date, options?: FindByDateRangeOptions): Promise<IScheduledSession[]>;
  findByMember(memberId: string): Promise<IScheduledSession[]>;
  findById(id: string): Promise<IScheduledSession | null>;
  updateOne(id: string, data: UpdateScheduledSessionData): Promise<void>;
  updateFuture(seriesId: string, fromDate: Date, data: UpdateScheduledSessionData): Promise<void>;
  updateAll(seriesId: string, data: UpdateScheduledSessionData): Promise<void>;
  cancelOne(id: string): Promise<void>;
  cancelFuture(seriesId: string, fromDate: Date): Promise<void>;
  cancelAll(seriesId: string): Promise<void>;
  findUnreminded(windowStart: Date, windowEnd: Date): Promise<IScheduledSession[]>;
  markReminderSent(id: string): Promise<void>;
  findActiveSeriesIds(): Promise<string[]>;
  findLatestInSeries(seriesId: string): Promise<IScheduledSession | null>;
  removeMemberFromFutureSessions(memberId: string): Promise<void>;
}

function toOid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function buildUpdateSet(data: UpdateScheduledSessionData): Record<string, unknown> {
  const $set: Record<string, unknown> = {};
  if (data.trainerId !== undefined) $set.trainerId = toOid(data.trainerId);
  if (data.memberIds !== undefined) $set.memberIds = data.memberIds.map(toOid);
  if (data.startTime !== undefined) $set.startTime = data.startTime;
  if (data.endTime !== undefined) $set.endTime = data.endTime;
  return { $set };
}

export class MongoScheduledSessionRepository implements IScheduledSessionRepository {
  async create(data: CreateScheduledSessionData): Promise<IScheduledSession> {
    const doc = new ScheduledSessionModel({
      seriesId: data.seriesId ? toOid(data.seriesId) : null,
      trainerId: toOid(data.trainerId),
      memberIds: data.memberIds.map(toOid),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    });
    return doc.save();
  }

  async createMany(data: CreateScheduledSessionData[]): Promise<void> {
    await ScheduledSessionModel.insertMany(
      data.map((d) => ({
        seriesId: d.seriesId ? toOid(d.seriesId) : null,
        trainerId: toOid(d.trainerId),
        memberIds: d.memberIds.map(toOid),
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
      })),
    );
  }

  async findByDateRange(start: Date, end: Date, options?: FindByDateRangeOptions): Promise<IScheduledSession[]> {
    const filter: Record<string, unknown> = { date: { $gte: start, $lte: end } };
    if (options?.trainerId) filter.trainerId = toOid(options.trainerId);
    if (options?.memberId) filter.memberIds = toOid(options.memberId);
    return ScheduledSessionModel.find(filter).sort({ date: 1, startTime: 1 });
  }

  async findByMember(memberId: string): Promise<IScheduledSession[]> {
    return ScheduledSessionModel.find({ memberIds: toOid(memberId) }).sort({ date: 1, startTime: 1 });
  }

  async findById(id: string): Promise<IScheduledSession | null> {
    return ScheduledSessionModel.findById(id);
  }

  async updateOne(id: string, data: UpdateScheduledSessionData): Promise<void> {
    await ScheduledSessionModel.findByIdAndUpdate(id, buildUpdateSet(data));
  }

  async updateFuture(seriesId: string, fromDate: Date, data: UpdateScheduledSessionData): Promise<void> {
    await ScheduledSessionModel.updateMany(
      { seriesId: toOid(seriesId), date: { $gte: fromDate } },
      buildUpdateSet(data),
    );
  }

  async updateAll(seriesId: string, data: UpdateScheduledSessionData): Promise<void> {
    await ScheduledSessionModel.updateMany({ seriesId: toOid(seriesId) }, buildUpdateSet(data));
  }

  async cancelOne(id: string): Promise<void> {
    await ScheduledSessionModel.findByIdAndUpdate(id, { $set: { status: 'cancelled' } });
  }

  async cancelFuture(seriesId: string, fromDate: Date): Promise<void> {
    await ScheduledSessionModel.updateMany(
      { seriesId: toOid(seriesId), date: { $gte: fromDate }, status: 'scheduled' },
      { $set: { status: 'cancelled' } },
    );
  }

  async cancelAll(seriesId: string): Promise<void> {
    await ScheduledSessionModel.updateMany(
      { seriesId: toOid(seriesId), status: 'scheduled' },
      { $set: { status: 'cancelled' } },
    );
  }

  async findUnreminded(windowStart: Date, windowEnd: Date): Promise<IScheduledSession[]> {
    return ScheduledSessionModel.find({
      status: 'scheduled',
      date: { $gte: windowStart, $lte: windowEnd },
      reminderSentAt: null,
    });
  }

  async markReminderSent(id: string): Promise<void> {
    await ScheduledSessionModel.findByIdAndUpdate(id, { $set: { reminderSentAt: new Date() } });
  }

  async findActiveSeriesIds(): Promise<string[]> {
    const ids = await ScheduledSessionModel.distinct('seriesId', {
      status: 'scheduled',
      date: { $gte: new Date() },
      seriesId: { $ne: null },
    });
    return ids.map((id: mongoose.Types.ObjectId) => id.toString());
  }

  async findLatestInSeries(seriesId: string): Promise<IScheduledSession | null> {
    return ScheduledSessionModel.findOne({ seriesId: toOid(seriesId) }).sort({ date: -1 });
  }

  async removeMemberFromFutureSessions(memberId: string): Promise<void> {
    const now = new Date();
    const memberOid = toOid(memberId);
    await ScheduledSessionModel.updateMany(
      { memberIds: memberOid, date: { $gte: now }, status: 'scheduled' },
      { $pull: { memberIds: memberOid } },
    );
    await ScheduledSessionModel.updateMany(
      { memberIds: { $size: 0 }, date: { $gte: now }, status: 'scheduled' },
      { $set: { status: 'cancelled' } },
    );
  }
}
```

- [ ] **Run test to confirm GREEN**
```bash
pnpm test -- --testPathPattern="scheduled-session.repository" --no-coverage
```
Expected: PASS (7 tests)

- [ ] **Run lint**
```bash
pnpm lint
```

- [ ] **Commit**
```bash
git add src/lib/repositories/scheduled-session.repository.ts __tests__/lib/repositories/scheduled-session.repository.test.ts
git commit -m "feat: add ScheduledSession repository"
```

---

## Stage 2: POST + GET /api/schedule

**Goal:** Create sessions (single or recurring) and list by date range  
**Status:** Not Started

### Task 2.1 — POST + GET route

**Files:**
- Create: `src/app/api/schedule/route.ts`
- Create: `__tests__/app/api/schedule.test.ts`

- [ ] **Write the failing tests**

Create `__tests__/app/api/schedule.test.ts`:
```ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockRepo = {
  create: jest.fn(),
  createMany: jest.fn(),
  findByDateRange: jest.fn(),
  findByMember: jest.fn(),
};
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('POST /api/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for member role', async () => {
    mockAuth.mockResolvedValue(makeSession('member'));
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when memberIds is empty', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [], date: '2026-05-01', startTime: '09:00', endTime: '10:00' }),
    }));
    expect(res.status).toBe(400);
  });

  it('creates single session for trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.create.mockResolvedValue({ _id: 's1' });
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: false }),
    }));
    expect(res.status).toBe(201);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ trainerId: 't1', seriesId: null }));
  });

  it('creates 12 recurring sessions', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.createMany.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: true }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json() as { sessions: unknown[] };
    expect(body.sessions).toHaveLength(12);
    expect(mockRepo.createMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ startTime: '09:00' }),
    ]));
  });

  it('owner must provide trainerId', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    const { POST } = await import('@/app/api/schedule/route');
    const res = await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00' }),
    }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/schedule/route');
    const res = await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when start/end missing', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { GET } = await import('@/app/api/schedule/route');
    const res = await GET(new Request('http://localhost/api/schedule'));
    expect(res.status).toBe(400);
  });

  it('trainer sees own sessions only', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findByDateRange.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/route');
    await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07'));
    expect(mockRepo.findByDateRange).toHaveBeenCalledWith(
      expect.any(Date), expect.any(Date), { trainerId: 't1' },
    );
  });

  it('owner sees all sessions (no trainerId filter)', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    mockRepo.findByDateRange.mockResolvedValue([]);
    const { GET } = await import('@/app/api/schedule/route');
    await GET(new Request('http://localhost/api/schedule?start=2026-05-01&end=2026-05-07'));
    expect(mockRepo.findByDateRange).toHaveBeenCalledWith(
      expect.any(Date), expect.any(Date), {},
    );
  });
});
```

- [ ] **Run test to confirm RED**
```bash
pnpm test -- --testPathPattern="__tests__/app/api/schedule\\.test" --no-coverage
```
Expected: FAIL — module not found

- [ ] **Implement POST + GET route**

Create `src/app/api/schedule/route.ts`:
```ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import mongoose from 'mongoose';

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: {
    trainerId?: unknown;
    memberIds?: unknown;
    date?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    isRecurring?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const trainerId =
    session.user.role === 'owner'
      ? typeof body.trainerId === 'string' && body.trainerId
        ? body.trainerId
        : null
      : session.user.id;

  if (!trainerId) return Response.json({ error: 'trainerId is required' }, { status: 400 });
  if (!Array.isArray(body.memberIds) || (body.memberIds as unknown[]).length === 0) {
    return Response.json({ error: 'memberIds must be a non-empty array' }, { status: 400 });
  }
  if (typeof body.date !== 'string' || typeof body.startTime !== 'string' || typeof body.endTime !== 'string') {
    return Response.json({ error: 'date, startTime, endTime are required' }, { status: 400 });
  }

  const memberIds = body.memberIds as string[];
  const baseDate = new Date(body.date);
  const isRecurring = body.isRecurring === true;

  await connectDB();
  const repo = new MongoScheduledSessionRepository();

  if (!isRecurring) {
    const doc = await repo.create({
      seriesId: null,
      trainerId,
      memberIds,
      date: baseDate,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return Response.json({ sessions: [doc] }, { status: 201 });
  }

  const seriesId = new mongoose.Types.ObjectId().toString();
  const sessions = Array.from({ length: 12 }, (_, i) => ({
    seriesId,
    trainerId,
    memberIds,
    date: addWeeks(baseDate, i),
    startTime: body.startTime as string,
    endTime: body.endTime as string,
  }));

  await repo.createMany(sessions);
  return Response.json({ sessions }, { status: 201 });
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const startStr = url.searchParams.get('start');
  const endStr = url.searchParams.get('end');
  if (!startStr || !endStr) return Response.json({ error: 'start and end are required' }, { status: 400 });

  const start = new Date(startStr);
  const end = new Date(endStr);

  await connectDB();
  const repo = new MongoScheduledSessionRepository();

  let docs;
  if (session.user.role === 'trainer') {
    docs = await repo.findByDateRange(start, end, { trainerId: session.user.id });
  } else if (session.user.role === 'member') {
    docs = await repo.findByDateRange(start, end, { memberId: session.user.id });
  } else {
    docs = await repo.findByDateRange(start, end, {});
  }

  return Response.json({ sessions: docs });
}
```

- [ ] **Run test to confirm GREEN**
```bash
pnpm test -- --testPathPattern="__tests__/app/api/schedule\\.test" --no-coverage
```
Expected: PASS

- [ ] **Run lint**
```bash
pnpm lint
```

- [ ] **Commit**
```bash
git add src/app/api/schedule/route.ts __tests__/app/api/schedule.test.ts
git commit -m "feat: add POST+GET /api/schedule"
```

---

## Stage 3: PATCH + DELETE /api/schedule/[id]

**Goal:** Edit and cancel sessions with one/future/all scope  
**Status:** Not Started

### Task 3.1 — PATCH + DELETE [id] route

**Files:**
- Create: `src/app/api/schedule/[id]/route.ts`
- Create: `__tests__/app/api/schedule-id.test.ts`

- [ ] **Write the failing tests**

Create `__tests__/app/api/schedule-id.test.ts`:
```ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockRepo = {
  findById: jest.fn(),
  updateOne: jest.fn(),
  updateFuture: jest.fn(),
  updateAll: jest.fn(),
  cancelOne: jest.fn(),
  cancelFuture: jest.fn(),
  cancelAll: jest.fn(),
};
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

const params = { params: Promise.resolve({ id: 'sess1' }) };

describe('PATCH /api/schedule/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({}) }), params);
    expect(res.status).toBe(401);
  });

  it('returns 403 for member role', async () => {
    mockAuth.mockResolvedValue(makeSession('member'));
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({}) }), params);
    expect(res.status).toBe(403);
  });

  it('returns 404 when session not found', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'one', startTime: '10:00' }),
    }), params);
    expect(res.status).toBe(404);
  });

  it('scope=one calls updateOne', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: null, date: new Date() });
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'one', startTime: '10:00' }),
    }), params);
    expect(res.status).toBe(200);
    expect(mockRepo.updateOne).toHaveBeenCalledWith('sess1', { startTime: '10:00' });
  });

  it('scope=future calls updateFuture', async () => {
    const date = new Date('2026-05-05');
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: { toString: () => 'sid1' }, date });
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'future', startTime: '10:00' }),
    }), params);
    expect(mockRepo.updateFuture).toHaveBeenCalledWith('sid1', date, { startTime: '10:00' });
  });

  it('scope=all calls updateAll', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: { toString: () => 'sid1' }, date: new Date() });
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'all', startTime: '10:00' }),
    }), params);
    expect(mockRepo.updateAll).toHaveBeenCalledWith('sid1', { startTime: '10:00' });
  });
});

describe('DELETE /api/schedule/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scope=one calls cancelOne', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: null, date: new Date() });
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    const res = await DELETE(new Request('http://localhost', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'one' }),
    }), params);
    expect(res.status).toBe(200);
    expect(mockRepo.cancelOne).toHaveBeenCalledWith('sess1');
  });

  it('scope=future calls cancelFuture', async () => {
    const date = new Date('2026-05-05');
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: { toString: () => 'sid1' }, date });
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    await DELETE(new Request('http://localhost', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'future' }),
    }), params);
    expect(mockRepo.cancelFuture).toHaveBeenCalledWith('sid1', date);
  });
});
```

- [ ] **Run test to confirm RED**
```bash
pnpm test -- --testPathPattern="schedule-id" --no-coverage
```

- [ ] **Implement [id] route**

Create `src/app/api/schedule/[id]/route.ts`:
```ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import type { UpdateScheduledSessionData } from '@/lib/repositories/scheduled-session.repository';

type RouteContext = { params: Promise<{ id: string }> };
type Scope = 'one' | 'future' | 'all';

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: { scope?: unknown; trainerId?: unknown; memberIds?: unknown; startTime?: unknown; endTime?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const scope = body.scope as Scope;
  if (!['one', 'future', 'all'].includes(scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const existing = await repo.findById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const update: UpdateScheduledSessionData = {};
  if (typeof body.trainerId === 'string') update.trainerId = body.trainerId;
  if (Array.isArray(body.memberIds)) update.memberIds = body.memberIds as string[];
  if (typeof body.startTime === 'string') update.startTime = body.startTime;
  if (typeof body.endTime === 'string') update.endTime = body.endTime;

  const seriesId = existing.seriesId?.toString();

  if (scope === 'one') {
    await repo.updateOne(id, update);
  } else if (scope === 'future' && seriesId) {
    await repo.updateFuture(seriesId, existing.date, update);
  } else if (scope === 'all' && seriesId) {
    await repo.updateAll(seriesId, update);
  } else {
    await repo.updateOne(id, update);
  }

  return Response.json({ success: true });
}

export async function DELETE(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: { scope?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const scope = body.scope as Scope;
  if (!['one', 'future', 'all'].includes(scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const existing = await repo.findById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const seriesId = existing.seriesId?.toString();

  if (scope === 'one') {
    await repo.cancelOne(id);
  } else if (scope === 'future' && seriesId) {
    await repo.cancelFuture(seriesId, existing.date);
  } else if (scope === 'all' && seriesId) {
    await repo.cancelAll(seriesId);
  } else {
    await repo.cancelOne(id);
  }

  return Response.json({ success: true });
}
```

- [ ] **Run test to confirm GREEN**
```bash
pnpm test -- --testPathPattern="schedule-id" --no-coverage
```

- [ ] **Run lint**
```bash
pnpm lint
```

- [ ] **Commit**
```bash
git add src/app/api/schedule/[id]/route.ts __tests__/app/api/schedule-id.test.ts
git commit -m "feat: add PATCH+DELETE /api/schedule/[id] with scope"
```

---

## Stage 4: GET /api/schedule/member/[memberId]

**Goal:** Member schedule list endpoint  
**Status:** Not Started

**Files:**
- Create: `src/app/api/schedule/member/[memberId]/route.ts`
- Create: `__tests__/app/api/schedule-member.test.ts`

- [ ] **Write failing test**

Create `__tests__/app/api/schedule-member.test.ts`:
```ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockRepo = { findByMember: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

const params = { params: Promise.resolve({ memberId: 'm1' }) };

describe('GET /api/schedule/member/[memberId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(401);
  });

  it('member can only fetch own schedule', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm2'));
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(403);
  });

  it('returns upcoming and history split for trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const now = new Date();
    const past = new Date(now.getTime() - 86400000);
    const future = new Date(now.getTime() + 86400000);
    mockRepo.findByMember.mockResolvedValue([
      { _id: 'p1', date: past, status: 'scheduled' },
      { _id: 'f1', date: future, status: 'scheduled' },
    ]);
    const { GET } = await import('@/app/api/schedule/member/[memberId]/route');
    const res = await GET(new Request('http://localhost'), params);
    expect(res.status).toBe(200);
    const body = await res.json() as { upcoming: unknown[]; history: unknown[] };
    expect(body.upcoming).toHaveLength(1);
    expect(body.history).toHaveLength(1);
  });
});
```

- [ ] **Run test to confirm RED**
```bash
pnpm test -- --testPathPattern="schedule-member" --no-coverage
```

- [ ] **Implement route**

Create `src/app/api/schedule/member/[memberId]/route.ts`:
```ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;

  if (session.user.role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const all = await repo.findByMember(memberId);
  const now = new Date();

  const upcoming = all.filter((s) => s.date >= now && s.status === 'scheduled');
  const history = all.filter((s) => s.date < now || s.status === 'cancelled');

  return Response.json({ upcoming, history });
}
```

- [ ] **Run test GREEN**
```bash
pnpm test -- --testPathPattern="schedule-member" --no-coverage
```

- [ ] **Commit**
```bash
git add src/app/api/schedule/member/[memberId]/route.ts __tests__/app/api/schedule-member.test.ts
git commit -m "feat: add GET /api/schedule/member/[memberId]"
```

---

## Stage 5: Email Reminder Template

**Goal:** Extend IEmailService with sendSessionReminder, implement template  
**Status:** Not Started

**Files:**
- Modify: `src/lib/email/index.ts`
- Create: `src/lib/email/templates/session-reminder.ts`
- Modify: `src/lib/email/nodemailer.ts`

- [ ] **Extend IEmailService interface**

Edit `src/lib/email/index.ts` — add after `SendInviteParams`:
```ts
export interface SendSessionReminderParams {
  to: string;
  memberName: string;
  trainerName: string;
  date: string;       // e.g. "Monday, May 5, 2026"
  startTime: string;  // e.g. "09:00"
  endTime: string;    // e.g. "10:00"
  groupMembers: string[]; // other member names (empty for 1-on-1)
}
```

Add `sendSessionReminder(params: SendSessionReminderParams): Promise<void>;` to `IEmailService`.

- [ ] **Create template**

Create `src/lib/email/templates/session-reminder.ts`:
```ts
import type { SendSessionReminderParams } from '@/lib/email/index';

export function sessionReminderTemplate(params: SendSessionReminderParams): { subject: string; html: string } {
  const groupNote =
    params.groupMembers.length > 0
      ? `<p>This is a group session. Other participants: <strong>${params.groupMembers.join(', ')}</strong></p>`
      : '';

  return {
    subject: `Reminder: Training session tomorrow at ${params.startTime} — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Training Session Reminder</h2>
        <p>Hi <strong>${params.memberName}</strong>,</p>
        <p>You have a training session tomorrow with <strong>${params.trainerName}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td><strong>${params.date}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td><strong>${params.startTime} – ${params.endTime}</strong></td></tr>
        </table>
        ${groupNote}
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

- [ ] **Implement sendSessionReminder in Nodemailer**

Edit `src/lib/email/nodemailer.ts` — add import and method:
```ts
import { sessionReminderTemplate } from '@/lib/email/templates/session-reminder';
```

Add to `NodemailerEmailService`:
```ts
async sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
  const transporter = createTransport();
  const { subject, html } = sessionReminderTemplate(params);
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject,
    html,
  });
}
```

- [ ] **Run lint + tests**
```bash
pnpm lint && pnpm test --no-coverage
```
Expected: all pass, no type errors

- [ ] **Commit**
```bash
git add src/lib/email/index.ts src/lib/email/templates/session-reminder.ts src/lib/email/nodemailer.ts
git commit -m "feat: add sendSessionReminder email template and service method"
```

---

## Stage 6: Cron API Routes

**Goal:** Hourly reminder cron + weekly series-extension cron  
**Status:** Not Started

Add `CRON_SECRET` env var (string, any random value) to `.env.local`. Both cron routes validate `Authorization: Bearer <CRON_SECRET>`.

### Task 6.1 — Session reminders cron

**Files:**
- Create: `src/app/api/cron/session-reminders/route.ts`
- Create: `__tests__/app/api/cron-session-reminders.test.ts`

- [ ] **Write failing test**

Create `__tests__/app/api/cron-session-reminders.test.ts`:
```ts
/** @jest-environment node */
process.env.CRON_SECRET = 'test-secret';
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockRepo = { findUnreminded: jest.fn(), markReminderSent: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockEmailService = { sendSessionReminder: jest.fn() };
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn(() => mockEmailService) }));

describe('GET /api/cron/session-reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without correct CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/session-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer wrong' } }));
    expect(res.status).toBe(401);
  });

  it('sends reminders for unreminded sessions', async () => {
    mockRepo.findUnreminded.mockResolvedValue([
      {
        _id: { toString: () => 's1' },
        trainerId: { toString: () => 't1' },
        memberIds: [{ toString: () => 'm1' }],
        date: new Date('2026-05-05'),
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
    mockUserRepo.findById
      .mockResolvedValueOnce({ name: 'Mike', email: 'mike@gym.com' })  // trainer
      .mockResolvedValueOnce({ name: 'Alice', email: 'alice@gym.com' }); // member

    const { GET } = await import('@/app/api/cron/session-reminders/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledTimes(1);
    expect(mockRepo.markReminderSent).toHaveBeenCalledWith('s1');
  });
});
```

- [ ] **Run RED**
```bash
pnpm test -- --testPathPattern="cron-session-reminders" --no-coverage
```

- [ ] **Implement**

Create `src/app/api/cron/session-reminders/route.ts`:
```ts
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const userRepo = new MongoUserRepository();
  const emailService = getEmailService();

  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const sessions = await repo.findUnreminded(windowStart, windowEnd);
  let sent = 0;

  for (const s of sessions) {
    const trainer = await userRepo.findById(s.trainerId.toString());
    if (!trainer) continue;

    const memberDocs = await Promise.all(
      s.memberIds.map((id) => userRepo.findById(id.toString())),
    );
    const members = memberDocs.filter(Boolean) as NonNullable<typeof memberDocs[number]>[];

    const dateLabel = s.date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    for (const member of members) {
      const otherNames = members.filter((m) => m._id.toString() !== member._id.toString()).map((m) => m.name);
      await emailService.sendSessionReminder({
        to: member.email,
        memberName: member.name,
        trainerName: trainer.name,
        date: dateLabel,
        startTime: s.startTime,
        endTime: s.endTime,
        groupMembers: otherNames,
      });
    }

    await repo.markReminderSent(s._id.toString());
    sent++;
  }

  return Response.json({ sent });
}
```

- [ ] **Run GREEN**
```bash
pnpm test -- --testPathPattern="cron-session-reminders" --no-coverage
```

- [ ] **Commit**
```bash
git add src/app/api/cron/session-reminders/route.ts __tests__/app/api/cron-session-reminders.test.ts
git commit -m "feat: add cron route for 24h session reminder emails"
```

### Task 6.2 — Series extension cron

**Files:**
- Create: `src/app/api/cron/extend-series/route.ts`
- Create: `__tests__/app/api/cron-extend-series.test.ts`

- [ ] **Write failing test**

Create `__tests__/app/api/cron-extend-series.test.ts`:
```ts
/** @jest-environment node */
process.env.CRON_SECRET = 'test-secret';
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockRepo = { findActiveSeriesIds: jest.fn(), findLatestInSeries: jest.fn(), createMany: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

describe('GET /api/cron/extend-series', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without correct secret', async () => {
    const { GET } = await import('@/app/api/cron/extend-series/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer bad' } }));
    expect(res.status).toBe(401);
  });

  it('extends each active series by 1 week', async () => {
    mockRepo.findActiveSeriesIds.mockResolvedValue(['sid1']);
    const latest = {
      seriesId: { toString: () => 'sid1' },
      trainerId: { toString: () => 't1' },
      memberIds: [{ toString: () => 'm1' }],
      date: new Date('2026-07-01'),
      startTime: '09:00',
      endTime: '10:00',
    };
    mockRepo.findLatestInSeries.mockResolvedValue(latest);
    mockRepo.createMany.mockResolvedValue(undefined);

    const { GET } = await import('@/app/api/cron/extend-series/route');
    const res = await GET(new Request('http://localhost', { headers: { Authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect(mockRepo.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        seriesId: 'sid1',
        trainerId: 't1',
        startTime: '09:00',
      }),
    ]);
  });
});
```

- [ ] **Run RED**
```bash
pnpm test -- --testPathPattern="cron-extend-series" --no-coverage
```

- [ ] **Implement**

Create `src/app/api/cron/extend-series/route.ts`:
```ts
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const seriesIds = await repo.findActiveSeriesIds();
  let extended = 0;

  for (const seriesId of seriesIds) {
    const latest = await repo.findLatestInSeries(seriesId);
    if (!latest) continue;

    const nextDate = new Date(latest.date);
    nextDate.setDate(nextDate.getDate() + 7);

    await repo.createMany([{
      seriesId,
      trainerId: latest.trainerId.toString(),
      memberIds: latest.memberIds.map((id) => id.toString()),
      date: nextDate,
      startTime: latest.startTime,
      endTime: latest.endTime,
    }]);
    extended++;
  }

  return Response.json({ extended });
}
```

- [ ] **Run GREEN**
```bash
pnpm test -- --testPathPattern="cron-extend-series" --no-coverage
```

- [ ] **Commit**
```bash
git add src/app/api/cron/extend-series/route.ts __tests__/app/api/cron-extend-series.test.ts
git commit -m "feat: add cron route for weekly series extension"
```

---

## Stage 7: Member Unassign Side Effect

**Goal:** When a member is reassigned, cancel their future sessions  
**Status:** Not Started

**Files:**
- Modify: `src/app/api/owner/members/[id]/trainer/route.ts`

- [ ] **Write the failing test**

In `__tests__/app/api/owner-members.test.ts`, add this block inside the existing file (before the last closing line):
```ts
// Add to top-level mocks (alongside existing mockUserRepo):
const mockScheduleRepo = { removeMemberFromFutureSessions: jest.fn() };
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockScheduleRepo),
}));

// Add as a new describe block:
describe('PATCH /api/owner/members/[id]/trainer — unassign side effect', () => {
  it('calls removeMemberFromFutureSessions after updateTrainerId', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', role: 'member' });
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);
    mockScheduleRepo.removeMemberFromFutureSessions.mockResolvedValue(undefined);
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't2' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(mockScheduleRepo.removeMemberFromFutureSessions).toHaveBeenCalledWith('m1');
  });
});
```

- [ ] **Run RED**
```bash
pnpm test -- --testPathPattern="owner-members" --no-coverage
```

- [ ] **Add side effect to trainer route**

Edit `src/app/api/owner/members/[id]/trainer/route.ts` — add after existing imports:
```ts
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
```

Replace the final `await userRepo.updateTrainerId(id, trainerId);` with:
```ts
await userRepo.updateTrainerId(id, trainerId);
const scheduleRepo = new MongoScheduledSessionRepository();
await scheduleRepo.removeMemberFromFutureSessions(id);
```

- [ ] **Run GREEN**
```bash
pnpm test -- --testPathPattern="owner-members" --no-coverage
```

- [ ] **Run lint**
```bash
pnpm lint
```

- [ ] **Commit**
```bash
git add src/app/api/owner/members/[id]/trainer/route.ts __tests__/app/api/owner-members.test.ts
git commit -m "feat: cancel future sessions when member is reassigned"
```

---

## Stage 8: Calendar Grid UI Components

**Goal:** WeekCalendarGrid and SessionEventCard — the visual core of the calendar  
**Status:** Not Started

**Files:**
- Create: `src/components/calendar/session-event-card.tsx`
- Create: `src/components/calendar/week-calendar-grid.tsx`
- Create: `__tests__/components/calendar/week-calendar-grid.test.tsx`

### Constants
- Time range: 06:00–22:00 (16 hours)
- Slot height: 48px per 30 min → grid height = 1536px
- Column: 7 days, equal width
- Event positioning: `top = (startMinutes - 360) / 30 * 48`, `height = durationMinutes / 30 * 48`

### Task 8.1 — SessionEventCard

Create `src/components/calendar/session-event-card.tsx`:
```tsx
'use client';

interface SessionEventCardProps {
  memberNames: string[];
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  trainerColor: string;
  onClick: () => void;
}

export function SessionEventCard({ memberNames, startTime, endTime, isRecurring, trainerColor, onClick }: SessionEventCardProps) {
  return (
    <button
      onClick={onClick}
      className="absolute inset-x-0.5 rounded text-left overflow-hidden text-[11px] leading-tight px-1.5 py-1 hover:brightness-110 transition-[filter]"
      style={{ backgroundColor: trainerColor, color: '#fff' }}
    >
      <div className="font-semibold truncate">{memberNames.join(', ')}</div>
      <div className="opacity-80">{startTime}–{endTime}{isRecurring ? ' 🔄' : ''}</div>
    </button>
  );
}
```

### Task 8.2 — WeekCalendarGrid

- [ ] **Write failing test**

Create `__tests__/components/calendar/week-calendar-grid.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { WeekCalendarGrid } from '@/components/calendar/week-calendar-grid';

const baseProps = {
  weekStart: new Date('2026-05-04'), // Monday
  sessions: [],
  memberMap: {},
  trainerColorMap: {},
  onSlotClick: jest.fn(),
  onSessionClick: jest.fn(),
};

describe('WeekCalendarGrid', () => {
  it('renders 7 day column headers', () => {
    render(<WeekCalendarGrid {...baseProps} />);
    expect(screen.getByText(/Mon/)).toBeInTheDocument();
    expect(screen.getByText(/Sun/)).toBeInTheDocument();
  });

  it('renders a session event card when session is provided', () => {
    const session = {
      _id: 's1',
      seriesId: null,
      trainerId: 't1',
      memberIds: ['m1'],
      date: '2026-05-04T00:00:00.000Z',
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled' as const,
      reminderSentAt: null,
    };
    render(
      <WeekCalendarGrid
        {...baseProps}
        sessions={[session]}
        memberMap={{ m1: 'Alice' }}
        trainerColorMap={{ t1: '#3b82f6' }}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

- [ ] **Run RED**
```bash
pnpm test -- --testPathPattern="week-calendar-grid" --no-coverage
```

- [ ] **Implement WeekCalendarGrid**

Create `src/components/calendar/week-calendar-grid.tsx`:
```tsx
'use client';

import { SessionEventCard } from './session-event-card';

const HOUR_START = 6;
const HOUR_END = 22;
const SLOT_HEIGHT = 48;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface CalendarSession {
  _id: string;
  seriesId: string | null;
  trainerId: string;
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  reminderSentAt: string | null;
}

interface WeekCalendarGridProps {
  weekStart: Date;
  sessions: CalendarSession[];
  memberMap: Record<string, string>;
  trainerColorMap: Record<string, string>;
  onSlotClick: (date: Date, time: string) => void;
  onSessionClick: (session: CalendarSession) => void;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getTopPx(startTime: string): number {
  return ((timeToMinutes(startTime) - HOUR_START * 60) / 30) * SLOT_HEIGHT;
}

function getHeightPx(startTime: string, endTime: string): number {
  return ((timeToMinutes(endTime) - timeToMinutes(startTime)) / 30) * SLOT_HEIGHT;
}

export function WeekCalendarGrid({ weekStart, sessions, memberMap, trainerColorMap, onSlotClick, onSessionClick }: WeekCalendarGridProps) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalHeight = (HOUR_END - HOUR_START) * 2 * SLOT_HEIGHT;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const sessionsByDay = days.map((day) => {
    const iso = day.toISOString().slice(0, 10);
    return sessions.filter((s) => s.date.slice(0, 10) === iso && s.status === 'scheduled');
  });

  const TRAINER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  const trainerColorFallback = (trainerId: string) => {
    const idx = parseInt(trainerId.slice(-2), 16) % TRAINER_COLORS.length;
    return trainerColorMap[trainerId] ?? TRAINER_COLORS[idx];
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header row */}
      <div className="flex border-b border-[#1e1e2e] sticky top-0 bg-[#0c0c0c] z-10">
        <div className="w-14 flex-shrink-0" />
        {days.map((day, i) => (
          <div key={i} className="flex-1 text-center py-2 text-xs text-[#555]">
            <div>{DAYS[i]}</div>
            <div className="text-white font-semibold">{day.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="flex flex-1" style={{ height: totalHeight }}>
        {/* Time labels */}
        <div className="w-14 flex-shrink-0 relative">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 text-[10px] text-[#555] -translate-y-2"
              style={{ top: ((h - HOUR_START) * 2) * SLOT_HEIGHT }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => (
          <div key={di} className="flex-1 relative border-l border-[#1a1a2e]">
            {/* Slot click areas */}
            {Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, si) => {
              const totalMin = (HOUR_START + si / 2) * 60 + (si % 2 === 0 ? 0 : 30);
              const hh = Math.floor(totalMin / 60);
              const mm = totalMin % 60;
              const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
              return (
                <div
                  key={si}
                  className="absolute inset-x-0 border-t border-[#111] cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ top: si * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                  onClick={() => onSlotClick(day, time)}
                />
              );
            })}

            {/* Events */}
            {sessionsByDay[di].map((s) => (
              <div
                key={s._id}
                className="absolute inset-x-0"
                style={{
                  top: getTopPx(s.startTime),
                  height: Math.max(getHeightPx(s.startTime, s.endTime), SLOT_HEIGHT),
                }}
              >
                <SessionEventCard
                  memberNames={s.memberIds.map((id) => memberMap[id] ?? id)}
                  startTime={s.startTime}
                  endTime={s.endTime}
                  isRecurring={s.seriesId !== null}
                  trainerColor={trainerColorFallback(s.trainerId)}
                  onClick={() => onSessionClick(s)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Run GREEN**
```bash
pnpm test -- --testPathPattern="week-calendar-grid" --no-coverage
```

- [ ] **Run lint**
```bash
pnpm lint
```

- [ ] **Commit**
```bash
git add src/components/calendar/session-event-card.tsx src/components/calendar/week-calendar-grid.tsx __tests__/components/calendar/week-calendar-grid.test.tsx
git commit -m "feat: add WeekCalendarGrid and SessionEventCard components"
```

---

## Stage 9: Create / Edit Modals

**Goal:** Create session modal, recurring scope dialog, edit modal  
**Status:** Not Started

**Files:**
- Create: `src/components/calendar/recurring-scope-dialog.tsx`
- Create: `src/components/calendar/create-session-modal.tsx`
- Create: `src/components/calendar/edit-session-modal.tsx`
- Create: `__tests__/components/calendar/recurring-scope-dialog.test.tsx`
- Create: `__tests__/components/calendar/create-session-modal.test.tsx`

### Task 9.1 — RecurringScopeDialog

- [ ] **Write failing test**

Create `__tests__/components/calendar/recurring-scope-dialog.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RecurringScopeDialog } from '@/components/calendar/recurring-scope-dialog';

describe('RecurringScopeDialog', () => {
  it('renders three scope options', () => {
    render(<RecurringScopeDialog open onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText(/This occurrence only/i)).toBeInTheDocument();
    expect(screen.getByText(/This and all future/i)).toBeInTheDocument();
    expect(screen.getByText(/All occurrences/i)).toBeInTheDocument();
  });

  it('calls onConfirm with selected scope', () => {
    const onConfirm = jest.fn();
    render(<RecurringScopeDialog open onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByText(/This and all future/i));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith('future');
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = jest.fn();
    render(<RecurringScopeDialog open onConfirm={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Run RED**
```bash
pnpm test -- --testPathPattern="recurring-scope-dialog" --no-coverage
```

- [ ] **Implement RecurringScopeDialog**

Create `src/components/calendar/recurring-scope-dialog.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Scope = 'one' | 'future' | 'all';

interface RecurringScopeDialogProps {
  open: boolean;
  onConfirm: (scope: Scope) => void;
  onCancel: () => void;
}

const OPTIONS: { scope: Scope; label: string; description: string }[] = [
  { scope: 'one', label: 'This occurrence only', description: 'Only this single session is affected.' },
  { scope: 'future', label: 'This and all future occurrences', description: 'This session and every following session in the series.' },
  { scope: 'all', label: 'All occurrences', description: 'The entire series, including past sessions.' },
];

export function RecurringScopeDialog({ open, onConfirm, onCancel }: RecurringScopeDialogProps) {
  const [selected, setSelected] = useState<Scope>('one');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit recurring session</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 my-2">
          {OPTIONS.map(({ scope, label, description }) => (
            <button
              key={scope}
              onClick={() => setSelected(scope)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selected === scope ? 'border-blue-500 bg-blue-500/10' : 'border-[#222] hover:border-[#333]'
              }`}
            >
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="text-xs text-[#555] mt-0.5">{description}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(selected)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Run GREEN**
```bash
pnpm test -- --testPathPattern="recurring-scope-dialog" --no-coverage
```

### Task 9.2 — CreateSessionModal

- [ ] **Write failing test**

Create `__tests__/components/calendar/create-session-modal.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateSessionModal } from '@/components/calendar/create-session-modal';

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sessions: [] }) }) as jest.Mock;

const baseProps = {
  open: true,
  defaultDate: '2026-05-04',
  defaultStartTime: '09:00',
  trainers: [{ _id: 't1', name: 'Mike' }],
  members: [{ _id: 'm1', name: 'Alice', trainerId: 't1' }],
  currentUserRole: 'trainer' as const,
  currentUserId: 't1',
  onSuccess: jest.fn(),
  onClose: jest.fn(),
};

describe('CreateSessionModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders form fields', () => {
    render(<CreateSessionModal {...baseProps} />);
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', () => {
    render(<CreateSessionModal {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('submits POST /api/schedule and calls onSuccess', async () => {
    render(<CreateSessionModal {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/schedule', expect.objectContaining({ method: 'POST' }));
    });
  });
});
```

- [ ] **Run RED**
```bash
pnpm test -- --testPathPattern="create-session-modal" --no-coverage
```

- [ ] **Implement CreateSessionModal**

Create `src/components/calendar/create-session-modal.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Trainer { _id: string; name: string }
interface Member { _id: string; name: string; trainerId: string }

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
  const [trainerId, setTrainerId] = useState(currentUserRole === 'trainer' ? currentUserId : trainers[0]?._id ?? '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredMembers = members.filter((m) => m.trainerId === trainerId);

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
        body: JSON.stringify({ trainerId, memberIds: selectedMemberIds, date, startTime, endTime, isRecurring }),
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
                <button
                  key={m._id}
                  type="button"
                  onClick={() => toggleMember(m._id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedMemberIds.includes(m._id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1e1e2e] text-[#888] hover:text-white'
                  }`}
                >
                  {m.name}
                </button>
              ))}
              {filteredMembers.length === 0 && <span className="text-xs text-[#555]">No members for this trainer</span>}
            </div>
          </div>

          <div>
            <Label>Date</Label>
            <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
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
            <button
              type="button"
              onClick={() => setIsRecurring(false)}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${!isRecurring ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888]'}`}
            >
              Once
            </button>
            <button
              type="button"
              onClick={() => setIsRecurring(true)}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${isRecurring ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888]'}`}
            >
              Weekly Recurring
            </button>
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

- [ ] **Run GREEN**
```bash
pnpm test -- --testPathPattern="create-session-modal" --no-coverage
```

### Task 9.3 — EditSessionModal

Create `src/components/calendar/edit-session-modal.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RecurringScopeDialog } from './recurring-scope-dialog';
import type { CalendarSession } from './week-calendar-grid';

type Scope = 'one' | 'future' | 'all';

interface EditSessionModalProps {
  open: boolean;
  session: CalendarSession;
  memberMap: Record<string, string>;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditSessionModal({ open, session, memberMap, onSuccess, onClose }: EditSessionModalProps) {
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [action, setAction] = useState<'edit' | 'cancel' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRecurring = session.seriesId !== null;

  async function executeAction(scope: Scope) {
    setLoading(true);
    setError('');
    try {
      if (action === 'edit') {
        const res = await fetch(`/api/schedule/${session._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, startTime, endTime }),
        });
        if (!res.ok) { setError('Failed to update'); return; }
      } else {
        const res = await fetch(`/api/schedule/${session._id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope }),
        });
        if (!res.ok) { setError('Failed to cancel'); return; }
      }
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  function handleSave() {
    if (isRecurring) { setAction('edit'); } else { void executeAction('one'); }
  }

  function handleCancel() {
    if (isRecurring) { setAction('cancel'); } else { void executeAction('one'); }
  }

  return (
    <>
      <Dialog open={open && action === null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Members</Label>
              <p className="mt-1 text-sm text-[#888]">{session.memberIds.map((id) => memberMap[id] ?? id).join(', ')}</p>
            </div>
            {isRecurring && <p className="text-xs text-blue-400">🔄 This is a recurring session</p>}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Start Time</Label>
                <Input type="time" className="mt-1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>End Time</Label>
                <Input type="time" className="mt-1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="destructive" onClick={handleCancel} disabled={loading} className="sm:mr-auto">
              Cancel Session
            </Button>
            <Button variant="ghost" onClick={onClose}>Dismiss</Button>
            <Button onClick={handleSave} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {action !== null && isRecurring && (
        <RecurringScopeDialog
          open
          onConfirm={(scope) => { void executeAction(scope); }}
          onCancel={() => setAction(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Run all calendar component tests**
```bash
pnpm test -- --testPathPattern="components/calendar" --no-coverage
```

- [ ] **Run lint**
```bash
pnpm lint
```

- [ ] **Commit**
```bash
git add src/components/calendar/ __tests__/components/calendar/
git commit -m "feat: add CreateSessionModal, EditSessionModal, RecurringScopeDialog"
```

---

## Stage 10: Pages + Navigation

**Goal:** Wire up owner/trainer calendar pages and member schedule list; update sidebar nav  
**Status:** Not Started

### Task 10.1 — Shared CalendarClient component

Create `src/components/calendar/calendar-client.tsx`:
```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { WeekCalendarGrid } from './week-calendar-grid';
import { CreateSessionModal } from './create-session-modal';
import { EditSessionModal } from './edit-session-modal';
import type { CalendarSession } from './week-calendar-grid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Trainer { _id: string; name: string }
interface Member { _id: string; name: string; trainerId: string }

interface CalendarClientProps {
  currentUserRole: 'owner' | 'trainer';
  currentUserId: string;
  trainers: Trainer[];
  members: Member[];
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function CalendarClient({ currentUserRole, currentUserId, trainers, members }: CalendarClientProps) {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [createSlot, setCreateSlot] = useState<{ date: string; time: string } | null>(null);
  const [editSession, setEditSession] = useState<CalendarSession | null>(null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const memberMap = Object.fromEntries(members.map((m) => [m._id, m.name]));

  const fetchSessions = useCallback(async () => {
    const res = await fetch(
      `/api/schedule?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
    );
    if (!res.ok) return;
    const data = await res.json() as { sessions: CalendarSession[] };
    setSessions(data.sessions);
  }, [weekStart.toISOString()]);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  function goToPrevWeek() {
    setWeekStart((d) => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; });
  }
  function goToNextWeek() {
    setWeekStart((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; });
  }
  function goToToday() { setWeekStart(getMondayOfWeek(new Date())); }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-[#141414]">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>
        <span className="text-sm text-[#888] ml-2">
          {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} –{' '}
          {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-4 sm:px-8">
        <WeekCalendarGrid
          weekStart={weekStart}
          sessions={sessions}
          memberMap={memberMap}
          trainerColorMap={{}}
          onSlotClick={(date, time) =>
            setCreateSlot({ date: date.toISOString().slice(0, 10), time })
          }
          onSessionClick={(s) => setEditSession(s)}
        />
      </div>

      {createSlot && (
        <CreateSessionModal
          open
          defaultDate={createSlot.date}
          defaultStartTime={createSlot.time}
          trainers={trainers}
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onSuccess={fetchSessions}
          onClose={() => setCreateSlot(null)}
        />
      )}

      {editSession && (
        <EditSessionModal
          open
          session={editSession}
          memberMap={memberMap}
          onSuccess={fetchSessions}
          onClose={() => setEditSession(null)}
        />
      )}
    </div>
  );
}
```

### Task 10.2 — Owner Calendar Page

Create `src/app/(dashboard)/owner/calendar/page.tsx`:
```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarClient } from '@/components/calendar/calendar-client';

export default async function OwnerCalendarPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const trainers = await userRepo.findByRole('trainer');
  const members = await userRepo.findAllMembers();

  const trainerDtos = trainers.map((t) => ({ _id: t._id.toString(), name: t.name }));
  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    trainerId: m.trainerId?.toString() ?? '',
  }));

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Calendar" subtitle="Manage all training sessions" />
      <CalendarClient
        currentUserRole="owner"
        currentUserId={session.user.id ?? ''}
        trainers={trainerDtos}
        members={memberDtos}
      />
    </div>
  );
}
```

### Task 10.3 — Trainer Calendar Page

Create `src/app/(dashboard)/trainer/calendar/page.tsx`:
```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarClient } from '@/components/calendar/calendar-client';

export default async function TrainerCalendarPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const members = await userRepo.findAllMembers(session.user.id);

  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    trainerId: session.user.id ?? '',
  }));

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Calendar" subtitle="Your training sessions" />
      <CalendarClient
        currentUserRole="trainer"
        currentUserId={session.user.id ?? ''}
        trainers={[]}
        members={memberDtos}
      />
    </div>
  );
}
```

### Task 10.4 — Member Schedule Page

Create `src/app/(dashboard)/member/schedule/page.tsx`:
```tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { MemberScheduleList } from './_components/member-schedule-list';

export default async function MemberSchedulePage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const userRepo = new MongoUserRepository();

  const all = await repo.findByMember(session.user.id ?? '');
  const now = new Date();
  const upcoming = all.filter((s) => s.date >= now && s.status === 'scheduled');
  const history = all.filter((s) => s.date < now || s.status === 'cancelled');

  const trainerIds = [...new Set(all.map((s) => s.trainerId.toString()))];
  const trainerDocs = await Promise.all(trainerIds.map((id) => userRepo.findById(id)));
  const trainerMap = Object.fromEntries(
    trainerDocs.filter(Boolean).map((t) => [t!._id.toString(), t!.name]),
  );

  const toDto = (s: typeof all[0]) => ({
    _id: s._id.toString(),
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    trainerName: trainerMap[s.trainerId.toString()] ?? 'Trainer',
    memberCount: s.memberIds.length,
    status: s.status,
    isRecurring: s.seriesId !== null,
  });

  return (
    <div>
      <PageHeader title="My Schedule" subtitle={`${upcoming.length} upcoming session${upcoming.length !== 1 ? 's' : ''}`} />
      <MemberScheduleList upcoming={upcoming.map(toDto)} history={history.map(toDto)} />
    </div>
  );
}
```

Create `src/app/(dashboard)/member/schedule/_components/member-schedule-list.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

interface SessionDto {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  trainerName: string;
  memberCount: number;
  status: 'scheduled' | 'cancelled';
  isRecurring: boolean;
}

interface MemberScheduleListProps {
  upcoming: SessionDto[];
  history: SessionDto[];
}

function SessionRow({ s }: { s: SessionDto }) {
  const d = new Date(s.date);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[14px] font-semibold text-white">
          {label} · {s.startTime}–{s.endTime}
          {s.isRecurring && <span className="ml-1 text-[11px] text-blue-400">🔄</span>}
        </div>
        <div className="text-[12px] text-[#555] mt-0.5">
          {s.trainerName}{s.memberCount > 1 ? ` · Group (${s.memberCount})` : ''}
        </div>
      </div>
      {s.status === 'cancelled' && (
        <span className="text-[11px] text-red-400 uppercase tracking-wide">Cancelled</span>
      )}
    </Card>
  );
}

export function MemberScheduleList({ upcoming, history }: MemberScheduleListProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="px-4 sm:px-8 py-7 space-y-3">
      {upcoming.length === 0 && <p className="text-[#555] text-sm">No upcoming sessions.</p>}
      {upcoming.map((s) => <SessionRow key={s._id} s={s} />)}

      {history.length > 0 && (
        <div className="mt-6">
          <button
            className="text-[12px] text-[#555] hover:text-[#888] transition-colors"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? '▾ Hide history' : `▸ Show history (${history.length})`}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3 opacity-60">
              {history.map((s) => <SessionRow key={s._id} s={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Task 10.5 — Update Navigation

Edit `src/components/shared/app-shell.tsx` — update the `NAV` constant:

In the `trainer` section, add to `MEMBERS` group:
```ts
{ href: '/trainer/calendar', label: 'Calendar' },
```

In the `owner` section, add to `ADMIN` group:
```ts
{ href: '/owner/calendar', label: 'Calendar' },
```

In the `member` section, add to `TRAINING` group:
```ts
{ href: '/member/schedule', label: 'My Schedule' },
```

- [ ] **Run all tests**
```bash
pnpm test --no-coverage
```
Expected: all pass

- [ ] **Run lint**
```bash
pnpm lint
```

- [ ] **Run build**
```bash
pnpm build
```
Expected: no type errors, clean build

- [ ] **Start dev server and verify**
```bash
pnpm dev
```
Check:
- Owner can navigate to `/owner/calendar` and see the weekly grid
- Owner can click a slot → CreateSessionModal opens with trainer dropdown
- Trainer can navigate to `/trainer/calendar` and see their sessions
- Member can navigate to `/member/schedule` and see their list
- Creating a once session creates 1 record; recurring creates 12
- Editing a recurring session shows the 3-scope dialog
- Cancelling triggers scope dialog (recurring) or immediate cancel (once)
- Sidebar shows Calendar link for owner and trainer, My Schedule for member

- [ ] **Commit**
```bash
git add src/app/(dashboard)/owner/calendar/ src/app/(dashboard)/trainer/calendar/ src/app/(dashboard)/member/schedule/ src/components/calendar/calendar-client.tsx src/components/shared/app-shell.tsx
git commit -m "feat: add calendar pages and member schedule list, update navigation"
```

---

## Environment Variables

Add to `.env.local`:
```
CRON_SECRET=<random-string>
```

If deploying to Vercel, add this to the Vercel project environment variables and configure Vercel Cron Jobs in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/session-reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/extend-series", "schedule": "0 6 * * 1" }
  ]
}
```
Vercel Cron Jobs automatically send the `Authorization: Bearer <CRON_SECRET>` header when `CRON_SECRET` is set in the project.
