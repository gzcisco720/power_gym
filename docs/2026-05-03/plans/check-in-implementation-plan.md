# Check-In Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weekly check-in system where trainers schedule reminders, members submit structured forms with photos (uploaded directly to Cloudinary), and trainers view history with side-by-side photo comparison.

**Architecture:** Two new MongoDB collections (`CheckInConfig` for schedules, `CheckIn` for submissions) backed by repository interfaces. Photos are signed and uploaded directly from the browser to Cloudinary — the Next.js server only generates the upload signature. A cron job (`/api/cron/check-in-reminders`) fires hourly to send reminder emails; `createCheckIn` sends trainer notification on submission.

**Tech Stack:** Next.js App Router, MongoDB/Mongoose, Auth.js v5, Node.js `crypto` (for Cloudinary signing), Nodemailer/Mailgun, Jest, Playwright.

---

## File Map

**New files:**
- `src/lib/db/models/check-in-config.model.ts`
- `src/lib/db/models/check-in.model.ts`
- `src/lib/repositories/check-in-config.repository.ts`
- `src/lib/repositories/check-in.repository.ts`
- `src/lib/email/templates/check-in-reminder.ts`
- `src/lib/email/templates/check-in-received.ts`
- `src/app/api/cron/check-in-reminders/route.ts`
- `src/app/api/check-ins/route.ts`
- `src/app/api/check-ins/[id]/route.ts`
- `src/app/api/check-in-config/route.ts`
- `src/app/(dashboard)/member/check-in/actions.ts`
- `src/app/(dashboard)/member/check-in/page.tsx`
- `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx`
- `src/app/(dashboard)/member/check-in/history/page.tsx`
- `src/app/(dashboard)/trainer/members/[id]/check-ins/actions.ts`
- `src/app/(dashboard)/trainer/members/[id]/check-ins/page.tsx`
- `src/app/(dashboard)/trainer/members/[id]/check-ins/[checkInId]/page.tsx`
- `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-list.tsx`
- `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-schedule-form.tsx`
- `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/photo-comparison.tsx`

**Modified files:**
- `src/lib/email/index.ts` — add two new interfaces + methods
- `src/lib/email/nodemailer.ts` — implement new methods
- `src/lib/email/mailgun.ts` — implement new methods
- `src/components/shared/app-shell.tsx` — add Check-in nav item for member role
- `src/components/shared/member-tab-nav.tsx` — add Check-ins tab
- `src/app/(dashboard)/layout.tsx` — pass check-in badge state for member

---

## Task 1: CheckInConfig Model

**Files:**
- Create: `src/lib/db/models/check-in-config.model.ts`
- Test: `__tests__/lib/db/models/check-in-config.model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/db/models/check-in-config.model.test.ts
import { CheckInConfigModel } from '@/lib/db/models/check-in-config.model';

describe('CheckInConfigModel schema', () => {
  it('has the required fields defined in the schema', () => {
    const paths = CheckInConfigModel.schema.paths;
    expect(paths).toHaveProperty('memberId');
    expect(paths).toHaveProperty('trainerId');
    expect(paths).toHaveProperty('dayOfWeek');
    expect(paths).toHaveProperty('hour');
    expect(paths).toHaveProperty('minute');
    expect(paths).toHaveProperty('active');
    expect(paths).toHaveProperty('reminderSentAt');
  });

  it('defaults active to true and reminderSentAt to null', () => {
    const doc = new CheckInConfigModel({
      memberId: '000000000000000000000001',
      trainerId: '000000000000000000000002',
      dayOfWeek: 4,
      hour: 7,
      minute: 0,
    });
    expect(doc.active).toBe(true);
    expect(doc.reminderSentAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in-config.model
```

Expected: FAIL — `Cannot find module '@/lib/db/models/check-in-config.model'`

- [ ] **Step 3: Create the model**

```ts
// src/lib/db/models/check-in-config.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICheckInConfig extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInConfigSchema = new Schema<ICheckInConfig>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    hour: { type: Number, required: true, min: 0, max: 23 },
    minute: { type: Number, required: true, min: 0, max: 59 },
    active: { type: Boolean, default: true },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CheckInConfigSchema.index({ memberId: 1 }, { unique: true });
CheckInConfigSchema.index({ dayOfWeek: 1, hour: 1, active: 1, reminderSentAt: 1 });

export const CheckInConfigModel: Model<ICheckInConfig> =
  mongoose.models.CheckInConfig ??
  mongoose.model<ICheckInConfig>('CheckInConfig', CheckInConfigSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=check-in-config.model
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/models/check-in-config.model.ts __tests__/lib/db/models/check-in-config.model.test.ts
git commit -m "feat: add CheckInConfig mongoose model"
```

---

## Task 2: CheckIn Model

**Files:**
- Create: `src/lib/db/models/check-in.model.ts`
- Test: `__tests__/lib/db/models/check-in.model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/db/models/check-in.model.test.ts
import { CheckInModel } from '@/lib/db/models/check-in.model';

describe('CheckInModel schema', () => {
  it('has all metric fields defined', () => {
    const paths = CheckInModel.schema.paths;
    const expected = [
      'memberId', 'trainerId', 'submittedAt',
      'sleepQuality', 'stress', 'fatigue', 'hunger', 'recovery', 'energy', 'digestion',
      'weight', 'waist', 'steps', 'exerciseMinutes', 'walkRunDistance', 'sleepHours',
      'dietDetails', 'stuckToDiet', 'wellbeing', 'notes', 'photos',
    ];
    expected.forEach((field) => expect(paths).toHaveProperty(field));
  });

  it('defaults optional numeric fields to null and photos to empty array', () => {
    const doc = new CheckInModel({
      memberId: '000000000000000000000001',
      trainerId: '000000000000000000000002',
      submittedAt: new Date(),
      sleepQuality: 7, stress: 3, fatigue: 4,
      hunger: 5, recovery: 6, energy: 8, digestion: 7,
      dietDetails: '', stuckToDiet: 'yes', wellbeing: '', notes: '',
    });
    expect(doc.weight).toBeNull();
    expect(doc.photos).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in.model.test
```

Expected: FAIL

- [ ] **Step 3: Create the model**

```ts
// src/lib/db/models/check-in.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICheckIn extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  submittedAt: Date;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
  createdAt: Date;
}

const CheckInSchema = new Schema<ICheckIn>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    submittedAt: { type: Date, required: true },
    sleepQuality: { type: Number, required: true, min: 1, max: 10 },
    stress: { type: Number, required: true, min: 1, max: 10 },
    fatigue: { type: Number, required: true, min: 1, max: 10 },
    hunger: { type: Number, required: true, min: 1, max: 10 },
    recovery: { type: Number, required: true, min: 1, max: 10 },
    energy: { type: Number, required: true, min: 1, max: 10 },
    digestion: { type: Number, required: true, min: 1, max: 10 },
    weight: { type: Number, default: null },
    waist: { type: Number, default: null },
    steps: { type: Number, default: null },
    exerciseMinutes: { type: Number, default: null },
    walkRunDistance: { type: Number, default: null },
    sleepHours: { type: Number, default: null },
    dietDetails: { type: String, required: true },
    stuckToDiet: { type: String, enum: ['yes', 'no', 'partial'], required: true },
    wellbeing: { type: String, required: true },
    notes: { type: String, required: true },
    photos: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CheckInSchema.index({ memberId: 1, submittedAt: -1 });
CheckInSchema.index({ trainerId: 1, submittedAt: -1 });

export const CheckInModel: Model<ICheckIn> =
  mongoose.models.CheckIn ?? mongoose.model<ICheckIn>('CheckIn', CheckInSchema);
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=check-in.model.test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/models/check-in.model.ts __tests__/lib/db/models/check-in.model.test.ts
git commit -m "feat: add CheckIn mongoose model"
```

---

## Task 3: CheckInConfig Repository

**Files:**
- Create: `src/lib/repositories/check-in-config.repository.ts`
- Test: `__tests__/lib/repositories/check-in-config.repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/repositories/check-in-config.repository.test.ts
import mongoose from 'mongoose';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import { CheckInConfigModel } from '@/lib/db/models/check-in-config.model';

jest.mock('@/lib/db/models/check-in-config.model', () => ({
  CheckInConfigModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(CheckInConfigModel);
const memberId = new mongoose.Types.ObjectId().toString();
const trainerId = new mongoose.Types.ObjectId().toString();

describe('MongoCheckInConfigRepository', () => {
  let repo: MongoCheckInConfigRepository;

  beforeEach(() => {
    repo = new MongoCheckInConfigRepository();
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('calls findOneAndUpdate with upsert and returns the document', async () => {
      const config = { memberId, trainerId, dayOfWeek: 4, hour: 7, minute: 0, active: true, reminderSentAt: null };
      mockModel.findOneAndUpdate.mockResolvedValue(config as never);

      const result = await repo.upsert(memberId, trainerId, { dayOfWeek: 4, hour: 7, minute: 0, active: true });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { memberId: expect.any(mongoose.Types.ObjectId) },
        expect.objectContaining({ $set: expect.objectContaining({ dayOfWeek: 4, hour: 7 }) }),
        { upsert: true, new: true },
      );
      expect(result).toEqual(config);
    });
  });

  describe('findByMember', () => {
    it('returns null when no config exists', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const result = await repo.findByMember(memberId);
      expect(result).toBeNull();
    });
  });

  describe('findDueForReminder', () => {
    it('queries by dayOfWeek, hour, active=true, and reminderSentAt before week start', async () => {
      const weekStart = new Date('2026-04-27T00:00:00Z');
      mockModel.find.mockResolvedValue([]);

      await repo.findDueForReminder(4, 7, weekStart);

      expect(mockModel.find).toHaveBeenCalledWith({
        dayOfWeek: 4,
        hour: 7,
        active: true,
        $or: [{ reminderSentAt: null }, { reminderSentAt: { $lt: weekStart } }],
      });
    });
  });

  describe('markReminderSent', () => {
    it('calls findOneAndUpdate with memberId and sets reminderSentAt', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({} as never);
      const now = new Date();

      await repo.markReminderSent(memberId, now);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { memberId: expect.any(mongoose.Types.ObjectId) },
        { $set: { reminderSentAt: now } },
      );
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in-config.repository
```

Expected: FAIL

- [ ] **Step 3: Implement the repository**

```ts
// src/lib/repositories/check-in-config.repository.ts
import mongoose from 'mongoose';
import { CheckInConfigModel, type ICheckInConfig } from '@/lib/db/models/check-in-config.model';

export interface UpsertCheckInConfigData {
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
}

export interface ICheckInConfigRepository {
  upsert(memberId: string, trainerId: string, data: UpsertCheckInConfigData): Promise<ICheckInConfig>;
  findByMember(memberId: string): Promise<ICheckInConfig | null>;
  findDueForReminder(dayOfWeek: number, hour: number, weekStart: Date): Promise<ICheckInConfig[]>;
  markReminderSent(memberId: string, sentAt: Date): Promise<void>;
}

export class MongoCheckInConfigRepository implements ICheckInConfigRepository {
  async upsert(memberId: string, trainerId: string, data: UpsertCheckInConfigData): Promise<ICheckInConfig> {
    const result = await CheckInConfigModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      {
        $set: {
          trainerId: new mongoose.Types.ObjectId(trainerId),
          dayOfWeek: data.dayOfWeek,
          hour: data.hour,
          minute: data.minute,
          active: data.active,
        },
      },
      { upsert: true, new: true },
    );
    return result!;
  }

  async findByMember(memberId: string): Promise<ICheckInConfig | null> {
    return CheckInConfigModel.findOne({ memberId: new mongoose.Types.ObjectId(memberId) });
  }

  async findDueForReminder(dayOfWeek: number, hour: number, weekStart: Date): Promise<ICheckInConfig[]> {
    return CheckInConfigModel.find({
      dayOfWeek,
      hour,
      active: true,
      $or: [{ reminderSentAt: null }, { reminderSentAt: { $lt: weekStart } } ],
    });
  }

  async markReminderSent(memberId: string, sentAt: Date): Promise<void> {
    await CheckInConfigModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: { reminderSentAt: sentAt } },
    );
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=check-in-config.repository
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/check-in-config.repository.ts __tests__/lib/repositories/check-in-config.repository.test.ts
git commit -m "feat: add CheckInConfig repository"
```

---

## Task 4: CheckIn Repository

**Files:**
- Create: `src/lib/repositories/check-in.repository.ts`
- Test: `__tests__/lib/repositories/check-in.repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/repositories/check-in.repository.test.ts
import mongoose from 'mongoose';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { CheckInModel } from '@/lib/db/models/check-in.model';

jest.mock('@/lib/db/models/check-in.model', () => ({
  CheckInModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockModel = jest.mocked(CheckInModel);
const memberId = new mongoose.Types.ObjectId().toString();
const trainerId = new mongoose.Types.ObjectId().toString();

function makeCheckInData() {
  return {
    memberId, trainerId,
    submittedAt: new Date(),
    sleepQuality: 7, stress: 3, fatigue: 4,
    hunger: 5, recovery: 6, energy: 8, digestion: 7,
    weight: 75, waist: null, steps: null, exerciseMinutes: null,
    walkRunDistance: null, sleepHours: null,
    dietDetails: 'good', stuckToDiet: 'yes' as const,
    wellbeing: 'great', notes: '',
    photos: [],
  };
}

describe('MongoCheckInRepository', () => {
  let repo: MongoCheckInRepository;

  beforeEach(() => {
    repo = new MongoCheckInRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('saves and returns the check-in', async () => {
      const data = makeCheckInData();
      const saved = { _id: 'ci1', ...data };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (CheckInModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create(data);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  describe('findByMember', () => {
    it('returns check-ins sorted by submittedAt descending', async () => {
      const items = [{ _id: 'ci2' }, { _id: 'ci1' }];
      const sortMock = jest.fn().mockResolvedValue(items);
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const result = await repo.findByMember(memberId);

      expect(mockModel.find).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
      });
      expect(sortMock).toHaveBeenCalledWith({ submittedAt: -1 });
      expect(result).toEqual(items);
    });
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const result = await repo.findById('000000000000000000000099', memberId);
      expect(result).toBeNull();
    });
  });

  describe('hasCheckInThisWeek', () => {
    it('returns true when countDocuments is 1', async () => {
      mockModel.countDocuments.mockResolvedValue(1 as never);
      const weekStart = new Date('2026-04-27T00:00:00Z');
      const result = await repo.hasCheckInThisWeek(memberId, weekStart);
      expect(result).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in.repository.test
```

Expected: FAIL

- [ ] **Step 3: Implement the repository**

```ts
// src/lib/repositories/check-in.repository.ts
import mongoose from 'mongoose';
import { CheckInModel, type ICheckIn } from '@/lib/db/models/check-in.model';

export interface CreateCheckInData {
  memberId: string;
  trainerId: string;
  submittedAt: Date;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
}

export interface ICheckInRepository {
  create(data: CreateCheckInData): Promise<ICheckIn>;
  findByMember(memberId: string): Promise<ICheckIn[]>;
  findById(checkInId: string, memberId: string): Promise<ICheckIn | null>;
  hasCheckInThisWeek(memberId: string, weekStart: Date): Promise<boolean>;
}

export class MongoCheckInRepository implements ICheckInRepository {
  async create(data: CreateCheckInData): Promise<ICheckIn> {
    const doc = new CheckInModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
    });
    return doc.save();
  }

  async findByMember(memberId: string): Promise<ICheckIn[]> {
    return CheckInModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ submittedAt: -1 });
  }

  async findById(checkInId: string, memberId: string): Promise<ICheckIn | null> {
    return CheckInModel.findOne({
      _id: new mongoose.Types.ObjectId(checkInId),
      memberId: new mongoose.Types.ObjectId(memberId),
    });
  }

  async hasCheckInThisWeek(memberId: string, weekStart: Date): Promise<boolean> {
    const count = await CheckInModel.countDocuments({
      memberId: new mongoose.Types.ObjectId(memberId),
      submittedAt: { $gte: weekStart },
    });
    return count > 0;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=check-in.repository.test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/check-in.repository.ts __tests__/lib/repositories/check-in.repository.test.ts
git commit -m "feat: add CheckIn repository"
```

---

## Task 5: Email — New Interfaces, Templates, and Nodemailer Implementation

**Files:**
- Modify: `src/lib/email/index.ts`
- Create: `src/lib/email/templates/check-in-reminder.ts`
- Create: `src/lib/email/templates/check-in-received.ts`
- Modify: `src/lib/email/nodemailer.ts`
- Test: `__tests__/lib/email/check-in-emails.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/email/check-in-emails.test.ts
import nodemailer from 'nodemailer';

jest.mock('nodemailer');
const mockNodemailer = jest.mocked(nodemailer);

describe('NodemailerEmailService — check-in methods', () => {
  const sendMailMock = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockNodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock } as never);
    process.env.EMAIL_PROVIDER = 'mailtrap';
    process.env.MAILTRAP_HOST = 'sandbox.smtp.mailtrap.io';
    process.env.MAILTRAP_PORT = '2525';
    process.env.MAILTRAP_USER = 'user';
    process.env.MAILTRAP_PASS = 'pass';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  it('sendCheckInReminder sends to the member with a subject mentioning check-in', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendCheckInReminder({
      to: 'member@test.com',
      memberName: 'Alice',
      trainerName: 'Bob',
      checkInUrl: 'http://localhost/member/check-in',
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'member@test.com',
        subject: expect.stringMatching(/check.?in/i),
      }),
    );
  });

  it('sendCheckInReceived sends to the trainer with member name in subject or body', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendCheckInReceived({
      to: 'trainer@test.com',
      trainerName: 'Bob',
      memberName: 'Alice',
      submittedAt: 'Thursday, 1 May 2026 at 09:00',
    });
    const call = sendMailMock.mock.calls[0][0] as { to: string; subject: string; html: string };
    expect(call.to).toBe('trainer@test.com');
    expect(call.html).toContain('Alice');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in-emails
```

Expected: FAIL — `sendCheckInReminder is not a function`

- [ ] **Step 3: Add interfaces to `src/lib/email/index.ts`**

Add after the existing `SendSessionCancelledParams` interface and before `IEmailService`:

```ts
export interface SendCheckInReminderParams {
  to: string;
  memberName: string;
  trainerName: string;
  checkInUrl: string;
}

export interface SendCheckInReceivedParams {
  to: string;
  trainerName: string;
  memberName: string;
  submittedAt: string;
}
```

Add two methods to `IEmailService`:

```ts
  sendCheckInReminder(params: SendCheckInReminderParams): Promise<void>;
  sendCheckInReceived(params: SendCheckInReceivedParams): Promise<void>;
```

- [ ] **Step 4: Create email templates**

```ts
// src/lib/email/templates/check-in-reminder.ts
import type { SendCheckInReminderParams } from '@/lib/email/index';

export function checkInReminderTemplate(params: SendCheckInReminderParams): {
  subject: string;
  html: string;
} {
  return {
    subject: `Time for your weekly check-in — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Weekly Check-In Reminder</h2>
        <p>Hi <strong>${params.memberName}</strong>,</p>
        <p>Your trainer <strong>${params.trainerName}</strong> has scheduled your weekly check-in. Take a few minutes to log your progress.</p>
        <p style="margin: 24px 0;">
          <a href="${params.checkInUrl}" style="background:#fff;color:#000;padding:10px 20px;text-decoration:none;font-weight:bold;border-radius:4px;border:1px solid #000;">
            Submit Check-In
          </a>
        </p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

```ts
// src/lib/email/templates/check-in-received.ts
import type { SendCheckInReceivedParams } from '@/lib/email/index';

export function checkInReceivedTemplate(params: SendCheckInReceivedParams): {
  subject: string;
  html: string;
} {
  return {
    subject: `${params.memberName} submitted a check-in — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New Check-In Submitted</h2>
        <p>Hi <strong>${params.trainerName}</strong>,</p>
        <p><strong>${params.memberName}</strong> has submitted their weekly check-in on ${params.submittedAt}.</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

- [ ] **Step 5: Implement new methods in `src/lib/email/nodemailer.ts`**

Add imports at the top (alongside existing template imports):
```ts
import { checkInReminderTemplate } from '@/lib/email/templates/check-in-reminder';
import { checkInReceivedTemplate } from '@/lib/email/templates/check-in-received';
```

Add import types at the top:
```ts
import type {
  // ... existing types ...
  SendCheckInReminderParams,
  SendCheckInReceivedParams,
} from '@/lib/email/index';
```

Add methods to `NodemailerEmailService`:
```ts
  async sendCheckInReminder(params: SendCheckInReminderParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = checkInReminderTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendCheckInReceived(params: SendCheckInReceivedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = checkInReceivedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }
```

- [ ] **Step 6: Run tests**

```bash
pnpm test -- --testPathPattern=check-in-emails
```

Expected: PASS

- [ ] **Step 7: Run full test suite to make sure existing tests still pass**

```bash
pnpm test
```

Expected: all PASS (the IEmailService type expansion requires Mailgun to also implement the new methods — see Task 6)

- [ ] **Step 8: Commit**

```bash
git add src/lib/email/index.ts src/lib/email/nodemailer.ts \
  src/lib/email/templates/check-in-reminder.ts \
  src/lib/email/templates/check-in-received.ts \
  __tests__/lib/email/check-in-emails.test.ts
git commit -m "feat: add check-in email methods to IEmailService and NodemailerEmailService"
```

---

## Task 6: Mailgun — Implement New Email Methods

**Files:**
- Modify: `src/lib/email/mailgun.ts`
- Test: `__tests__/lib/email/check-in-emails-mailgun.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/email/check-in-emails-mailgun.test.ts
/** @jest-environment node */
describe('MailgunEmailService — check-in methods', () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('') });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    global.fetch = fetchMock;
    process.env.MAILGUN_API_KEY = 'test-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.SMTP_FROM = 'noreply@example.com';
  });

  it('sendCheckInReminder calls Mailgun API with correct recipient', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendCheckInReminder({
      to: 'member@test.com',
      memberName: 'Alice',
      trainerName: 'Bob',
      checkInUrl: 'http://localhost/member/check-in',
    });
    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get('to')).toBe('member@test.com');
  });

  it('sendCheckInReceived calls Mailgun API with correct recipient', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendCheckInReceived({
      to: 'trainer@test.com',
      trainerName: 'Bob',
      memberName: 'Alice',
      submittedAt: '2026-05-01 09:00',
    });
    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get('to')).toBe('trainer@test.com');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in-emails-mailgun
```

Expected: FAIL

- [ ] **Step 3: Add imports + methods to `src/lib/email/mailgun.ts`**

Add import types alongside existing ones:
```ts
import type {
  SendCheckInReminderParams,
  SendCheckInReceivedParams,
} from '@/lib/email/index';
import { checkInReminderTemplate } from '@/lib/email/templates/check-in-reminder';
import { checkInReceivedTemplate } from '@/lib/email/templates/check-in-received';
```

Add methods to `MailgunEmailService` (use the same `send` helper pattern already in mailgun.ts):
```ts
  async sendCheckInReminder(params: SendCheckInReminderParams): Promise<void> {
    const { subject, html } = checkInReminderTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendCheckInReceived(params: SendCheckInReceivedParams): Promise<void> {
    const { subject, html } = checkInReceivedTemplate(params);
    await this.send(params.to, subject, html);
  }
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=check-in-emails-mailgun
pnpm test
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/mailgun.ts __tests__/lib/email/check-in-emails-mailgun.test.ts
git commit -m "feat: add check-in email methods to MailgunEmailService"
```

---

## Task 7: Cron Job — Check-In Reminders

**Files:**
- Create: `src/app/api/cron/check-in-reminders/route.ts`
- Test: `__tests__/app/api/cron/check-in-reminders.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/app/api/cron/check-in-reminders.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockConfigRepo = {
  findDueForReminder: jest.fn(),
  markReminderSent: jest.fn(),
};
const mockUserRepo = { findById: jest.fn() };

jest.mock('@/lib/repositories/check-in-config.repository', () => ({
  MongoCheckInConfigRepository: jest.fn(() => mockConfigRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { getEmailService } from '@/lib/email/index';
const mockGetEmailService = jest.mocked(getEmailService);

function makeRequest() {
  return new Request('http://localhost/api/cron/check-in-reminders', {
    headers: { Authorization: `Bearer test-secret` },
  });
}

describe('GET /api/cron/check-in-reminders', () => {
  const sendReminderMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    process.env.AUTH_URL = 'http://localhost:3000';
    mockGetEmailService.mockReturnValue({ sendCheckInReminder: sendReminderMock } as never);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/check-in-reminders/route');
    const req = new Request('http://localhost/api/cron/check-in-reminders');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('sends reminder email for each due config and marks it sent', async () => {
    const memberId = '000000000000000000000001';
    const trainerId = '000000000000000000000002';
    mockConfigRepo.findDueForReminder.mockResolvedValue([
      { memberId: { toString: () => memberId }, trainerId: { toString: () => trainerId } },
    ]);
    mockUserRepo.findById
      .mockResolvedValueOnce({ name: 'Alice', email: 'alice@test.com' })
      .mockResolvedValueOnce({ name: 'Bob', email: 'bob@test.com' });

    const { GET } = await import('@/app/api/cron/check-in-reminders/route');
    const res = await GET(makeRequest());
    const body = await res.json() as { sent: number };

    expect(sendReminderMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@test.com', memberName: 'Alice' }),
    );
    expect(mockConfigRepo.markReminderSent).toHaveBeenCalledWith(memberId, expect.any(Date));
    expect(body.sent).toBe(1);
  });

  it('skips config when member user is not found', async () => {
    mockConfigRepo.findDueForReminder.mockResolvedValue([
      { memberId: { toString: () => '000000000000000000000001' }, trainerId: { toString: () => '000000000000000000000002' } },
    ]);
    mockUserRepo.findById.mockResolvedValue(null);

    const { GET } = await import('@/app/api/cron/check-in-reminders/route');
    const res = await GET(makeRequest());
    const body = await res.json() as { sent: number };

    expect(sendReminderMock).not.toHaveBeenCalled();
    expect(body.sent).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in-reminders
```

Expected: FAIL

- [ ] **Step 3: Implement the cron route**

```ts
// src/app/api/cron/check-in-reminders/route.ts
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';

function getISOWeekStart(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay();
  // Monday = start of week (ISO 8601)
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const configRepo = new MongoCheckInConfigRepository();
  const userRepo = new MongoUserRepository();
  const emailService = getEmailService();

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const hour = now.getUTCHours();
  const weekStart = getISOWeekStart(now);

  const configs = await configRepo.findDueForReminder(dayOfWeek, hour, weekStart);
  let sent = 0;

  for (const config of configs) {
    const memberId = config.memberId.toString();
    const member = await userRepo.findById(memberId);
    if (!member) continue;

    const trainer = await userRepo.findById(config.trainerId.toString());
    const checkInUrl = `${process.env.AUTH_URL}/member/check-in`;

    try {
      await emailService.sendCheckInReminder({
        to: member.email,
        memberName: member.name,
        trainerName: trainer?.name ?? '',
        checkInUrl,
      });
    } catch {
      // log and continue
    }

    await configRepo.markReminderSent(memberId, now);
    sent++;
  }

  return Response.json({ sent });
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=check-in-reminders
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/check-in-reminders/route.ts __tests__/app/api/cron/check-in-reminders.test.ts
git commit -m "feat: add check-in reminders cron job"
```

---

## Task 8: Server Actions — upsertCheckInConfig and getCheckInSignature and createCheckIn

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/check-ins/actions.ts`
- Create: `src/app/(dashboard)/member/check-in/actions.ts`
- Test: `__tests__/app/actions/check-in-config-action.test.ts`
- Test: `__tests__/app/actions/check-in-action.test.ts`

- [ ] **Step 1: Write the failing tests for upsertCheckInConfig**

```ts
// __tests__/app/actions/check-in-config-action.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockConfigRepo = { upsert: jest.fn() };
const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/check-in-config.repository', () => ({
  MongoCheckInConfigRepository: jest.fn(() => mockConfigRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('upsertCheckInConfigAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { upsertCheckInConfigAction } = await import(
      '@/app/(dashboard)/trainer/members/[id]/check-ins/actions'
    );
    const result = await upsertCheckInConfigAction('member1', { dayOfWeek: 4, hour: 7, minute: 0, active: true });
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error when trainer tries to configure a member they do not own', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 'trainer2' } });

    const { upsertCheckInConfigAction } = await import(
      '@/app/(dashboard)/trainer/members/[id]/check-ins/actions'
    );
    const result = await upsertCheckInConfigAction('member1', { dayOfWeek: 4, hour: 7, minute: 0, active: true });
    expect(result.error).toBe('Forbidden');
  });

  it('calls repo.upsert and returns empty error on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 'trainer1' } });
    mockConfigRepo.upsert.mockResolvedValue({});

    const { upsertCheckInConfigAction } = await import(
      '@/app/(dashboard)/trainer/members/[id]/check-ins/actions'
    );
    const result = await upsertCheckInConfigAction('member1', { dayOfWeek: 4, hour: 7, minute: 0, active: true });
    expect(mockConfigRepo.upsert).toHaveBeenCalledWith('member1', 'trainer1', { dayOfWeek: 4, hour: 7, minute: 0, active: true });
    expect(result.error).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in-config-action
```

Expected: FAIL

- [ ] **Step 3: Implement upsertCheckInConfig action**

```ts
// src/app/(dashboard)/trainer/members/[id]/check-ins/actions.ts
'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UpsertCheckInConfigData } from '@/lib/repositories/check-in-config.repository';

export interface ActionState {
  error: string;
}

export async function upsertCheckInConfigAction(
  memberId: string,
  data: UpsertCheckInConfigData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  await connectDB();
  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);

  if (session.user.role === 'trainer') {
    if (!member || member.trainerId?.toString() !== session.user.id) {
      return { error: 'Forbidden' };
    }
  }

  const trainerId = session.user.role === 'owner' ? (member?.trainerId?.toString() ?? session.user.id) : session.user.id;

  try {
    await new MongoCheckInConfigRepository().upsert(memberId, trainerId, data);
    return { error: '' };
  } catch {
    return { error: 'Failed to save schedule' };
  }
}
```

- [ ] **Step 4: Write the failing tests for createCheckIn and getCheckInSignature**

```ts
// __tests__/app/actions/check-in-action.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockCheckInRepo = { create: jest.fn() };
const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeCheckInInput() {
  return {
    submittedAt: new Date().toISOString(),
    sleepQuality: 7, stress: 3, fatigue: 4,
    hunger: 5, recovery: 6, energy: 8, digestion: 7,
    weight: null, waist: null, steps: null,
    exerciseMinutes: null, walkRunDistance: null, sleepHours: null,
    dietDetails: '', stuckToDiet: 'yes' as const, wellbeing: '', notes: '',
    photos: [],
  };
}

describe('createCheckInAction', () => {
  const sendReceivedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGetEmailService.mockReturnValue({ sendCheckInReceived: sendReceivedMock } as never);
  });

  it('returns error when not a member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    const { createCheckInAction } = await import('@/app/(dashboard)/member/check-in/actions');
    const result = await createCheckInAction(makeCheckInInput());
    expect(result.error).toBe('Unauthorized');
  });

  it('saves check-in and sends trainer email on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'member1', role: 'member', trainerId: 'trainer1' } } as never);
    mockCheckInRepo.create.mockResolvedValue({ _id: 'ci1' });
    mockUserRepo.findById.mockResolvedValue({ name: 'Bob', email: 'bob@test.com' });

    const { createCheckInAction } = await import('@/app/(dashboard)/member/check-in/actions');
    const result = await createCheckInAction(makeCheckInInput());

    expect(mockCheckInRepo.create).toHaveBeenCalled();
    expect(sendReceivedMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'bob@test.com', memberName: expect.any(String) }),
    );
    expect(result.error).toBe('');
  });
});

describe('getCheckInSignatureAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.CLOUDINARY_CLOUD_NAME = 'testcloud';
    process.env.CLOUDINARY_API_KEY = 'testkey';
    process.env.CLOUDINARY_API_SECRET = 'testsecret';
  });

  it('returns 401 when not a member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    const { getCheckInSignatureAction } = await import('@/app/(dashboard)/member/check-in/actions');
    const result = await getCheckInSignatureAction();
    expect(result.error).toBe('Unauthorized');
  });

  it('returns signature, timestamp, cloudName, apiKey, folder for authenticated member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'member1', role: 'member' } } as never);
    const { getCheckInSignatureAction } = await import('@/app/(dashboard)/member/check-in/actions');
    const result = await getCheckInSignatureAction();
    expect(result.error).toBe('');
    expect(result.data).toMatchObject({
      cloudName: 'testcloud',
      apiKey: 'testkey',
      folder: expect.stringContaining('member1'),
      signature: expect.any(String),
      timestamp: expect.any(Number),
    });
  });
});
```

- [ ] **Step 5: Run to verify it fails**

```bash
pnpm test -- --testPathPattern=check-in-action.test
```

Expected: FAIL

- [ ] **Step 6: Implement member check-in actions**

```ts
// src/app/(dashboard)/member/check-in/actions.ts
'use server';

import crypto from 'crypto';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';
import type { CreateCheckInData } from '@/lib/repositories/check-in.repository';

export interface CheckInActionState {
  error: string;
}

export interface CheckInSignatureState {
  error: string;
  data?: {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  };
}

type CheckInInput = Omit<CreateCheckInData, 'memberId' | 'trainerId'> & {
  submittedAt: string;
};

export async function createCheckInAction(input: CheckInInput): Promise<CheckInActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') return { error: 'Unauthorized' };

  await connectDB();
  const memberId = session.user.id;
  const trainerId = (session.user as { trainerId?: string }).trainerId ?? '';

  const repo = new MongoCheckInRepository();
  await repo.create({
    ...input,
    memberId,
    trainerId,
    submittedAt: new Date(input.submittedAt),
  });

  const userRepo = new MongoUserRepository();
  const memberUser = await userRepo.findById(memberId);
  const trainerUser = trainerId ? await userRepo.findById(trainerId) : null;

  if (trainerUser) {
    const emailService = getEmailService();
    const formatted = new Date(input.submittedAt).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    try {
      await emailService.sendCheckInReceived({
        to: trainerUser.email,
        trainerName: trainerUser.name,
        memberName: memberUser?.name ?? 'Member',
        submittedAt: formatted,
      });
    } catch {
      // non-fatal
    }
  }

  return { error: '' };
}

export async function getCheckInSignatureAction(): Promise<CheckInSignatureState> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'member') return { error: 'Unauthorized' };

  const memberId = session.user.id;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `power-gym/check-ins/${memberId}`;

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  return { error: '', data: { signature, timestamp, cloudName, apiKey, folder } };
}
```

- [ ] **Step 7: Run tests**

```bash
pnpm test -- --testPathPattern="check-in-config-action|check-in-action.test"
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add \
  src/app/\(dashboard\)/trainer/members/\[id\]/check-ins/actions.ts \
  src/app/\(dashboard\)/member/check-in/actions.ts \
  __tests__/app/actions/check-in-config-action.test.ts \
  __tests__/app/actions/check-in-action.test.ts
git commit -m "feat: add check-in server actions (upsertConfig, createCheckIn, getSignature)"
```

---

## Task 9: Route Handlers — GET /api/check-ins and GET /api/check-in-config

**Files:**
- Create: `src/app/api/check-ins/route.ts`
- Create: `src/app/api/check-ins/[id]/route.ts`
- Create: `src/app/api/check-in-config/route.ts`
- Test: `__tests__/app/api/check-ins.test.ts`
- Test: `__tests__/app/api/check-in-config.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/app/api/check-ins.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockCheckInRepo = { findByMember: jest.fn(), findById: jest.fn() };
jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/check-ins', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.resetModules(); });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/check-ins/route');
    const res = await GET(new Request('http://localhost/api/check-ins?memberId=m1'));
    expect(res.status).toBe(401);
  });

  it('returns check-ins list for member querying own data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'member1', role: 'member' } } as never);
    mockCheckInRepo.findByMember.mockResolvedValue([{ _id: 'ci1', submittedAt: new Date() }]);

    const { GET } = await import('@/app/api/check-ins/route');
    const res = await GET(new Request('http://localhost/api/check-ins?memberId=member1'));
    expect(res.status).toBe(200);
    const body = await res.json() as { checkIns: unknown[] };
    expect(body.checkIns).toHaveLength(1);
  });

  it('returns 403 when member queries another member data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'member1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/check-ins/route');
    const res = await GET(new Request('http://localhost/api/check-ins?memberId=member2'));
    expect(res.status).toBe(403);
  });
});
```

```ts
// __tests__/app/api/check-in-config.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockConfigRepo = { findByMember: jest.fn() };
jest.mock('@/lib/repositories/check-in-config.repository', () => ({
  MongoCheckInConfigRepository: jest.fn(() => mockConfigRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/check-in-config', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.resetModules(); });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/check-in-config/route');
    const res = await GET(new Request('http://localhost/api/check-in-config?memberId=m1'));
    expect(res.status).toBe(401);
  });

  it('returns config for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } } as never);
    mockConfigRepo.findByMember.mockResolvedValue({ dayOfWeek: 4, hour: 7, minute: 0, active: true });

    const { GET } = await import('@/app/api/check-in-config/route');
    const res = await GET(new Request('http://localhost/api/check-in-config?memberId=m1'));
    expect(res.status).toBe(200);
    const body = await res.json() as { config: { dayOfWeek: number } };
    expect(body.config.dayOfWeek).toBe(4);
  });

  it('returns 403 when member tries to access config', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'member1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/check-in-config/route');
    const res = await GET(new Request('http://localhost/api/check-in-config?memberId=m1'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm test -- --testPathPattern="check-ins.test|check-in-config.test"
```

Expected: FAIL

- [ ] **Step 3: Implement the route handlers**

```ts
// src/app/api/check-ins/route.ts
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  if (session.user.role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const checkIns = await new MongoCheckInRepository().findByMember(memberId);
  return Response.json({ checkIns: JSON.parse(JSON.stringify(checkIns)) });
}
```

```ts
// src/app/api/check-ins/[id]/route.ts
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: checkInId } = await params;
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId') ?? (session.user.role === 'member' ? session.user.id : null);

  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });
  if (session.user.role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const checkIn = await new MongoCheckInRepository().findById(checkInId, memberId);
  if (!checkIn) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ checkIn: JSON.parse(JSON.stringify(checkIn)) });
}
```

```ts
// src/app/api/check-in-config/route.ts
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role === 'member') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  await connectDB();
  const config = await new MongoCheckInConfigRepository().findByMember(memberId);
  return Response.json({ config: config ? JSON.parse(JSON.stringify(config)) : null });
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern="check-ins.test|check-in-config.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/api/check-ins/route.ts \
  src/app/api/check-ins/\[id\]/route.ts \
  src/app/api/check-in-config/route.ts \
  __tests__/app/api/check-ins.test.ts \
  __tests__/app/api/check-in-config.test.ts
git commit -m "feat: add check-in and check-in-config GET route handlers"
```

---

## Task 10: Navigation — Add Check-in Nav Item (Member) and Check-ins Tab (Trainer View)

**Files:**
- Modify: `src/components/shared/app-shell.tsx`
- Modify: `src/components/shared/member-tab-nav.tsx`

No new tests required — navigation changes are covered by E2E.

- [ ] **Step 1: Add Check-in item to member nav in `app-shell.tsx`**

In `src/components/shared/app-shell.tsx`, find the `member` nav group array. Add under `TRAINING` group after `My Schedule`:

```ts
{ href: '/member/check-in', label: 'Check-in' },
```

So the TRAINING group becomes:
```ts
{
  group: 'TRAINING',
  items: [
    { href: '/member/plan', label: 'My Plan' },
    { href: '/member/pbs', label: 'Personal Bests' },
    { href: '/member/progress', label: 'My Progress' },
    { href: '/member/schedule', label: 'My Schedule' },
    { href: '/member/check-in', label: 'Check-in' },
  ],
},
```

- [ ] **Step 2: Add Check-ins tab to trainer's member hub tab nav**

In `src/components/shared/member-tab-nav.tsx`, add to the `TABS` array:

```ts
{ label: 'Check-ins', segment: '/check-ins' },
```

Full updated TABS:
```ts
const TABS = [
  { label: 'Overview', segment: '' },
  { label: 'Plan', segment: '/plan' },
  { label: 'Body Tests', segment: '/body-tests' },
  { label: 'Nutrition', segment: '/nutrition' },
  { label: 'Progress', segment: '/progress' },
  { label: 'Health', segment: '/health' },
  { label: 'Check-ins', segment: '/check-ins' },
] as const;
```

- [ ] **Step 3: Verify lint passes**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/app-shell.tsx src/components/shared/member-tab-nav.tsx
git commit -m "feat: add Check-in to member nav and Check-ins tab to trainer member hub"
```

---

## Task 11: Member Check-In Form Page

**Files:**
- Create: `src/app/(dashboard)/member/check-in/page.tsx`
- Create: `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx`

No new unit tests — form covered by E2E. Run lint only.

- [ ] **Step 1: Create the client form component**

```tsx
// src/app/(dashboard)/member/check-in/_components/check-in-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { createCheckInAction, getCheckInSignatureAction } from '../actions';

const RATING_FIELDS = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'energy', label: 'Energy' },
  { key: 'digestion', label: 'Digestion' },
] as const;

type RatingKey = (typeof RATING_FIELDS)[number]['key'];
type Ratings = Record<RatingKey, number>;

const DEFAULT_RATINGS: Ratings = {
  sleepQuality: 5, stress: 5, fatigue: 5,
  hunger: 5, recovery: 5, energy: 5, digestion: 5,
};

interface CheckInFormProps {
  memberId: string;
}

export function CheckInForm({ memberId: _memberId }: CheckInFormProps) {
  const [ratings, setRatings] = useState<Ratings>(DEFAULT_RATINGS);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [steps, setSteps] = useState('');
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [walkRunDistance, setWalkRunDistance] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [dietDetails, setDietDetails] = useState('');
  const [stuckToDiet, setStuckToDiet] = useState<'yes' | 'no' | 'partial'>('yes');
  const [wellbeing, setWellbeing] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (photos.length + files.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }
    setUploadingPhoto(true);
    try {
      const sigResult = await getCheckInSignatureAction();
      if (sigResult.error || !sigResult.data) {
        setError(sigResult.error || 'Failed to get upload signature');
        return;
      }
      const { signature, timestamp, cloudName, apiKey, folder } = sigResult.data;

      const newPublicIds: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', folder);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData },
        );
        const data = await res.json() as { public_id?: string; error?: { message: string } };
        if (data.error) throw new Error(data.error.message);
        if (data.public_id) newPublicIds.push(data.public_id);
      }
      setPhotos((prev) => [...prev, ...newPublicIds]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await createCheckInAction({
        submittedAt: new Date().toISOString(),
        sleepQuality: ratings.sleepQuality,
        stress: ratings.stress,
        fatigue: ratings.fatigue,
        hunger: ratings.hunger,
        recovery: ratings.recovery,
        energy: ratings.energy,
        digestion: ratings.digestion,
        weight: weight ? Number(weight) : null,
        waist: waist ? Number(waist) : null,
        steps: steps ? Number(steps) : null,
        exerciseMinutes: exerciseMinutes ? Number(exerciseMinutes) : null,
        walkRunDistance: walkRunDistance ? Number(walkRunDistance) : null,
        sleepHours: sleepHours ? Number(sleepHours) : null,
        dietDetails,
        stuckToDiet,
        wellbeing,
        notes,
        photos,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="px-4 sm:px-8 py-10 text-center">
        <div className="text-2xl font-bold text-white mb-2">Check-in submitted!</div>
        <p className="text-[#666]">Your trainer has been notified.</p>
        <a href="/member/check-in/history" className="mt-6 inline-block text-[13px] text-[#888] underline">
          View history
        </a>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto space-y-8">
      {/* Ratings */}
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[2px] text-[#555] mb-4">
          Weekly Metrics (1–10)
        </h2>
        <div className="space-y-4">
          {RATING_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-[13px] text-[#aaa]">{label}</span>
                <span className="text-[13px] text-white font-medium">{ratings[key]}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setRatings((r) => ({ ...r, [key]: n }))}
                    className={`flex-1 h-8 rounded text-[11px] font-medium transition-colors ${
                      ratings[key] === n
                        ? 'bg-white text-black'
                        : 'bg-[#1a1a1a] text-[#555] hover:bg-[#222]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Numbers */}
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[2px] text-[#555] mb-4">
          Body Stats
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Weight (kg)', value: weight, set: setWeight },
            { label: 'Waist (cm)', value: waist, set: setWaist },
            { label: 'Steps', value: steps, set: setSteps },
            { label: 'Exercise Minutes', value: exerciseMinutes, set: setExerciseMinutes },
            { label: 'Walk/Run (km)', value: walkRunDistance, set: setWalkRunDistance },
            { label: 'Sleep Hours', value: sleepHours, set: setSleepHours },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-[11px] text-[#555] mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-white text-[13px] focus:outline-none focus:border-[#444]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Diet */}
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[2px] text-[#555] mb-4">
          Diet & Wellbeing
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-[#555] mb-1">Detail your diet from the last week</label>
            <textarea
              value={dietDetails}
              onChange={(e) => setDietDetails(e.target.value)}
              rows={3}
              className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-white text-[13px] focus:outline-none focus:border-[#444] resize-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#555] mb-2">Did you stick to the diet?</label>
            <div className="flex gap-2">
              {(['yes', 'partial', 'no'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setStuckToDiet(v)}
                  className={`flex-1 py-2 rounded text-[12px] font-medium capitalize transition-colors ${
                    stuckToDiet === v ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#555] hover:bg-[#222]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-[#555] mb-1">How do you feel / overall wellbeing?</label>
            <textarea
              value={wellbeing}
              onChange={(e) => setWellbeing(e.target.value)}
              rows={3}
              className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-white text-[13px] focus:outline-none focus:border-[#444] resize-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#555] mb-1">Anything else?</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-white text-[13px] focus:outline-none focus:border-[#444] resize-none"
            />
          </div>
        </div>
      </section>

      {/* Photos */}
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[2px] text-[#555] mb-4">
          Photos (max 5)
        </h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((publicId) => (
            <div key={publicId} className="relative w-20 h-20 rounded overflow-hidden bg-[#1a1a1a]">
              <img
                src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_160,c_fill/${publicId}`}
                alt="check-in photo"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setPhotos((prev) => prev.filter((p) => p !== publicId))}
                className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < 5 && (
            <label className="w-20 h-20 border border-dashed border-[#333] rounded flex items-center justify-center cursor-pointer hover:border-[#555] transition-colors">
              <span className="text-[#555] text-2xl">{uploadingPhoto ? '…' : '+'}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>
      </section>

      {error && <p className="text-red-400 text-[12px]">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isPending || uploadingPhoto}
        className="w-full py-3 bg-white text-black font-semibold rounded text-[14px] disabled:opacity-50 transition-opacity"
      >
        {isPending ? 'Submitting…' : 'Submit Check-In'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

```tsx
// src/app/(dashboard)/member/check-in/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { CheckInForm } from './_components/check-in-form';

export default async function MemberCheckInPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'member') redirect('/');

  return (
    <div>
      <div className="border-b border-[#0f0f0f] px-4 sm:px-8 py-4">
        <h1 className="text-[18px] font-bold text-white">Weekly Check-In</h1>
        <p className="text-[12px] text-[#555] mt-0.5">Log your progress for this week</p>
      </div>
      <CheckInForm memberId={session.user.id} />
    </div>
  );
}
```

- [ ] **Step 3: Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` to `.env.local`**

In `.env.local` (create if absent, do not commit secrets):
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- [ ] **Step 4: Verify lint passes**

```bash
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/\(dashboard\)/member/check-in/page.tsx \
  src/app/\(dashboard\)/member/check-in/_components/check-in-form.tsx
git commit -m "feat: add member check-in submission page with Cloudinary photo upload"
```

---

## Task 12: Member Check-In History Page

**Files:**
- Create: `src/app/(dashboard)/member/check-in/history/page.tsx`

- [ ] **Step 1: Create the history page**

```tsx
// src/app/(dashboard)/member/check-in/history/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import type { ICheckIn } from '@/lib/db/models/check-in.model';
import Link from 'next/link';

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

type PlainCheckIn = {
  _id: string;
  submittedAt: string;
  weight: number | null;
  energy: number;
  photos: string[];
};

function serialize(c: ICheckIn): PlainCheckIn {
  return {
    _id: (c._id as { toString(): string }).toString(),
    submittedAt: c.submittedAt.toISOString(),
    weight: c.weight,
    energy: c.energy,
    photos: c.photos,
  };
}

export default async function MemberCheckInHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'member') redirect('/');

  await connectDB();
  const checkIns = await new MongoCheckInRepository().findByMember(session.user.id);
  const plain = checkIns.map(serialize);

  return (
    <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[18px] font-bold text-white">Check-In History</h1>
        <Link
          href="/member/check-in"
          className="text-[12px] bg-white text-black px-3 py-1.5 rounded font-medium"
        >
          New Check-In
        </Link>
      </div>
      {plain.length === 0 ? (
        <p className="text-[#555] text-[13px]">No check-ins yet.</p>
      ) : (
        <div className="space-y-3">
          {plain.map((c, i) => (
            <div key={c._id} className="border border-[#1a1a1a] rounded-lg p-4 bg-[#0d0d0d]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#555]">#{plain.length - i} check-in</span>
                  <div className="text-[14px] font-medium text-white mt-0.5">
                    {formatDate(new Date(c.submittedAt))}
                  </div>
                </div>
                <div className="text-right">
                  {c.weight && (
                    <div className="text-[13px] text-[#aaa]">{c.weight} kg</div>
                  )}
                  <div className="text-[11px] text-[#555]">Energy {c.energy}/10</div>
                </div>
              </div>
              {c.photos.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {c.photos.slice(0, 3).map((pub) => (
                    <div key={pub} className="w-14 h-14 rounded overflow-hidden bg-[#1a1a1a]">
                      <img
                        src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_112,c_fill/${pub}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {c.photos.length > 3 && (
                    <div className="w-14 h-14 rounded bg-[#1a1a1a] flex items-center justify-center text-[11px] text-[#555]">
                      +{c.photos.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

```bash
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/member/check-in/history/page.tsx
git commit -m "feat: add member check-in history page"
```

---

## Task 13: Trainer — Check-ins Tab (List + Schedule Config)

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/check-ins/page.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-list.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-schedule-form.tsx`

- [ ] **Step 1: Create the schedule config form component**

```tsx
// src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-schedule-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { upsertCheckInConfigAction } from '../actions';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CheckInScheduleFormProps {
  memberId: string;
  initialConfig: {
    dayOfWeek: number;
    hour: number;
    minute: number;
    active: boolean;
  } | null;
}

export function CheckInScheduleForm({ memberId, initialConfig }: CheckInScheduleFormProps) {
  const [dayOfWeek, setDayOfWeek] = useState(initialConfig?.dayOfWeek ?? 4);
  const [hour, setHour] = useState(initialConfig?.hour ?? 7);
  const [minute, setMinute] = useState(initialConfig?.minute ?? 0);
  const [active, setActive] = useState(initialConfig?.active ?? true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError('');
    setSaved(false);
    startTransition(async () => {
      const result = await upsertCheckInConfigAction(memberId, { dayOfWeek, hour, minute, active });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="border border-[#1a1a1a] rounded-lg p-4 bg-[#0d0d0d] mb-6">
      <h3 className="text-[13px] font-semibold text-white mb-4">Check-In Schedule</h3>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[11px] text-[#555] mb-1">Day</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="bg-[#111] border border-[#222] rounded px-2 py-1.5 text-white text-[13px]"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[#555] mb-1">Hour (UTC)</label>
          <input
            type="number"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-16 bg-[#111] border border-[#222] rounded px-2 py-1.5 text-white text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[11px] text-[#555] mb-1">Minute</label>
          <input
            type="number"
            min={0}
            max={59}
            step={15}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-16 bg-[#111] border border-[#222] rounded px-2 py-1.5 text-white text-[13px]"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-white"
          />
          <span className="text-[12px] text-[#aaa]">Active</span>
        </label>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-1.5 bg-white text-black text-[12px] font-medium rounded disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <p className="text-red-400 text-[11px] mt-2">{error}</p>}
      {saved && <p className="text-green-400 text-[11px] mt-2">Schedule saved.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create the check-in list component**

```tsx
// src/app/(dashboard)/trainer/members/[id]/check-ins/_components/check-in-list.tsx
import Link from 'next/link';

interface CheckInSummary {
  _id: string;
  submittedAt: string;
  weight: number | null;
  energy: number;
  photos: string[];
}

interface CheckInListProps {
  memberId: string;
  checkIns: CheckInSummary[];
  cloudName: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function CheckInList({ memberId, checkIns, cloudName }: CheckInListProps) {
  if (checkIns.length === 0) {
    return <p className="text-[#555] text-[13px]">No check-ins yet.</p>;
  }

  return (
    <div className="space-y-3">
      {checkIns.map((c, i) => (
        <Link
          key={c._id}
          href={`/trainer/members/${memberId}/check-ins/${c._id}`}
          className="block border border-[#1a1a1a] rounded-lg p-4 bg-[#0d0d0d] hover:border-[#2a2a2a] transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#555]">#{checkIns.length - i} check-in</span>
              <div className="text-[14px] font-medium text-white mt-0.5">{formatDate(c.submittedAt)}</div>
            </div>
            <div className="text-right">
              {c.weight && <div className="text-[13px] text-[#aaa]">{c.weight} kg</div>}
              <div className="text-[11px] text-[#555]">Energy {c.energy}/10</div>
            </div>
          </div>
          {c.photos.length > 0 && (
            <div className="flex gap-2 mt-3">
              {c.photos.slice(0, 3).map((pub) => (
                <div key={pub} className="w-14 h-14 rounded overflow-hidden bg-[#1a1a1a]">
                  <img
                    src={`https://res.cloudinary.com/${cloudName}/image/upload/w_112,c_fill/${pub}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {c.photos.length > 3 && (
                <div className="w-14 h-14 rounded bg-[#1a1a1a] flex items-center justify-center text-[11px] text-[#555]">
                  +{c.photos.length - 3}
                </div>
              )}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create the trainer check-ins page**

```tsx
// src/app/(dashboard)/trainer/members/[id]/check-ins/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import type { ICheckIn } from '@/lib/db/models/check-in.model';
import type { ICheckInConfig } from '@/lib/db/models/check-in-config.model';
import { CheckInList } from './_components/check-in-list';
import { CheckInScheduleForm } from './_components/check-in-schedule-form';

type PlainCheckIn = {
  _id: string;
  submittedAt: string;
  weight: number | null;
  energy: number;
  photos: string[];
};

type PlainConfig = {
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
} | null;

function serializeCheckIn(c: ICheckIn): PlainCheckIn {
  return {
    _id: (c._id as { toString(): string }).toString(),
    submittedAt: c.submittedAt.toISOString(),
    weight: c.weight,
    energy: c.energy,
    photos: c.photos,
  };
}

function serializeConfig(c: ICheckInConfig | null): PlainConfig {
  if (!c) return null;
  return { dayOfWeek: c.dayOfWeek, hour: c.hour, minute: c.minute, active: c.active };
}

export default async function TrainerMemberCheckInsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId } = await params;

  await connectDB();
  const [checkIns, config] = await Promise.all([
    new MongoCheckInRepository().findByMember(memberId),
    new MongoCheckInConfigRepository().findByMember(memberId),
  ]);

  const plainCheckIns = checkIns.map(serializeCheckIn);
  const plainConfig = serializeConfig(config);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
      <CheckInScheduleForm memberId={memberId} initialConfig={plainConfig} />
      <CheckInList memberId={memberId} checkIns={plainCheckIns} cloudName={cloudName} />
    </div>
  );
}
```

- [ ] **Step 4: Verify lint passes**

```bash
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/\(dashboard\)/trainer/members/\[id\]/check-ins/page.tsx \
  src/app/\(dashboard\)/trainer/members/\[id\]/check-ins/_components/check-in-list.tsx \
  src/app/\(dashboard\)/trainer/members/\[id\]/check-ins/_components/check-in-schedule-form.tsx
git commit -m "feat: add trainer check-ins tab with schedule config and history list"
```

---

## Task 14: Trainer — Check-In Detail Page with Photo Comparison

**Files:**
- Create: `src/app/(dashboard)/trainer/members/[id]/check-ins/[checkInId]/page.tsx`
- Create: `src/app/(dashboard)/trainer/members/[id]/check-ins/_components/photo-comparison.tsx`

- [ ] **Step 1: Create the photo comparison component**

```tsx
// src/app/(dashboard)/trainer/members/[id]/check-ins/_components/photo-comparison.tsx
'use client';

import { useState } from 'react';

interface PhotoComparisonProps {
  photos: string[];
  cloudName: string;
}

export function PhotoComparison({ photos, cloudName }: PhotoComparisonProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function togglePhoto(publicId: string) {
    setSelected((prev) => {
      if (prev.includes(publicId)) return prev.filter((p) => p !== publicId);
      if (prev.length >= 2) return [prev[1]!, publicId]; // deselect oldest
      return [...prev, publicId];
    });
  }

  const imageUrl = (pub: string) =>
    `https://res.cloudinary.com/${cloudName}/image/upload/w_800,c_limit,q_auto/${pub}`;
  const thumbUrl = (pub: string) =>
    `https://res.cloudinary.com/${cloudName}/image/upload/w_160,c_fill/${pub}`;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {photos.map((pub) => (
          <button
            key={pub}
            onClick={() => togglePhoto(pub)}
            className={`w-20 h-20 rounded overflow-hidden border-2 transition-colors ${
              selected.includes(pub) ? 'border-white' : 'border-transparent'
            }`}
          >
            <img src={thumbUrl(pub)} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {selected.length === 2 && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {selected.map((pub) => (
            <div key={pub} className="rounded overflow-hidden">
              <img src={imageUrl(pub)} alt="comparison" className="w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {selected.length === 1 && (
        <div className="mt-4">
          <img src={imageUrl(selected[0]!)} alt="selected" className="max-w-full rounded" />
        </div>
      )}

      {photos.length >= 2 && selected.length < 2 && (
        <p className="text-[11px] text-[#555] mt-2">Select two photos to compare side by side.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the detail page**

```tsx
// src/app/(dashboard)/trainer/members/[id]/check-ins/[checkInId]/page.tsx
import { auth } from '@/lib/auth/auth';
import { redirect, notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { ICheckIn } from '@/lib/db/models/check-in.model';
import { PhotoComparison } from '../_components/photo-comparison';

const RATING_LABELS: { key: keyof ICheckIn; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'energy', label: 'Energy' },
  { key: 'digestion', label: 'Digestion' },
];

function formatDate(d: Date) {
  return d.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === '') return null;
  return (
    <div className="flex justify-between py-2 border-b border-[#111]">
      <span className="text-[12px] text-[#555]">{label}</span>
      <span className="text-[13px] text-white">{String(value)}</span>
    </div>
  );
}

export default async function TrainerCheckInDetailPage({
  params,
}: {
  params: Promise<{ id: string; checkInId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId, checkInId } = await params;

  await connectDB();
  const checkIn = await new MongoCheckInRepository().findById(checkInId, memberId);
  if (!checkIn) notFound();

  const member = await new MongoUserRepository().findById(memberId);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

  return (
    <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="text-[11px] text-[#555]">{member?.name ?? 'Member'}</div>
        <div className="text-[16px] font-bold text-white">{formatDate(checkIn.submittedAt)}</div>
      </div>

      <div className="space-y-1 mb-6">
        {RATING_LABELS.map(({ key, label }) => (
          <Row key={key} label={label} value={`${checkIn[key] as number}/10`} />
        ))}
        <Row label="Weight (kg)" value={checkIn.weight} />
        <Row label="Waist (cm)" value={checkIn.waist} />
        <Row label="Steps" value={checkIn.steps} />
        <Row label="Exercise Minutes" value={checkIn.exerciseMinutes} />
        <Row label="Walk/Run (km)" value={checkIn.walkRunDistance} />
        <Row label="Sleep Hours" value={checkIn.sleepHours} />
        <Row label="Stuck to diet?" value={checkIn.stuckToDiet} />
        <Row label="Diet details" value={checkIn.dietDetails} />
        <Row label="Wellbeing" value={checkIn.wellbeing} />
        <Row label="Notes" value={checkIn.notes} />
      </div>

      {checkIn.photos.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[2px] text-[#555] mb-3">
            Photos
          </h3>
          <PhotoComparison photos={checkIn.photos} cloudName={cloudName} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify lint passes**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add \
  src/app/\(dashboard\)/trainer/members/\[id\]/check-ins/\[checkInId\]/page.tsx \
  src/app/\(dashboard\)/trainer/members/\[id\]/check-ins/_components/photo-comparison.tsx
git commit -m "feat: add trainer check-in detail page with side-by-side photo comparison"
```

---

## Task 15: Full Test Suite + Lint Check

- [ ] **Step 1: Run all unit/integration tests**

```bash
pnpm test
```

Expected: all PASS

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: no warnings, no errors

- [ ] **Step 3: Build check**

```bash
pnpm build
```

Expected: builds successfully

- [ ] **Step 4: Final commit if any lint auto-fixes were needed**

```bash
pnpm lint --fix
git add -A
git commit -m "fix: lint cleanup after check-in feature implementation"
```

---

## Vercel Cron Configuration

After deployment, add the cron to `vercel.json` (create if absent):

```json
{
  "crons": [
    {
      "path": "/api/cron/check-in-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

This fires every hour at minute 0. Set `CRON_SECRET` in Vercel environment variables.

---

## Out of Scope (follow-on)

- Video uploads (same Cloudinary pattern, `resource_type: video`)
- Badge dot on nav item (requires fetching `hasCheckInThisWeek` in layout; defer)
- Owner-role check-in management pages (mirrors trainer pages)
