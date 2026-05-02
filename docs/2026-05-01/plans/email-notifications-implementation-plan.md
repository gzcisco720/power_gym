# Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend email infrastructure with multi-provider support (Mailgun SDK + existing Nodemailer) and wire 5 new email triggers: plan assigned, nutrition plan assigned, member assigned to trainer, session booked, session cancelled.

**Architecture:** Add `MailgunEmailService` alongside existing `NodemailerEmailService`, both behind the `IEmailService` interface. Update `getEmailService()` factory to branch on `EMAIL_PROVIDER`. Expand the interface and both implementations with 5 new methods. Wire fire-and-forget email calls into 6 route handlers.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Jest (node environment), `mailgun.js` + `form-data` packages.

---

## File Map

| Action  | File                                                                   | Purpose                                      |
|---------|------------------------------------------------------------------------|----------------------------------------------|
| Modify  | `src/lib/email/index.ts`                                               | Add 5 new param interfaces + 5 new methods to `IEmailService`; update `getEmailService()` |
| Modify  | `src/lib/email/nodemailer.ts`                                          | Implement 5 new methods                      |
| Create  | `src/lib/email/mailgun.ts`                                             | `MailgunEmailService` — all 7 methods        |
| Create  | `src/lib/email/templates/plan-assigned.ts`                             | Training plan notification template          |
| Create  | `src/lib/email/templates/nutrition-assigned.ts`                        | Nutrition plan notification template         |
| Create  | `src/lib/email/templates/member-assigned.ts`                           | Member-to-trainer assignment template        |
| Create  | `src/lib/email/templates/session-booked.ts`                            | Session booking confirmation template        |
| Create  | `src/lib/email/templates/session-cancelled.ts`                         | Session cancellation template                |
| Modify  | `src/app/api/members/[memberId]/plan/route.ts`                         | Fire `sendPlanAssigned` after POST           |
| Modify  | `src/app/api/members/[memberId]/nutrition/route.ts`                    | Fire `sendNutritionPlanAssigned` after POST  |
| Modify  | `src/app/api/owner/members/[id]/trainer/route.ts`                      | Fire `sendMemberAssigned` after PATCH        |
| Modify  | `src/app/api/owner/trainers/[id]/route.ts`                             | Fire `sendMemberAssigned` summary after DELETE |
| Modify  | `src/app/api/schedule/route.ts`                                        | Fire `sendSessionBooked` per member after POST |
| Modify  | `src/app/api/schedule/[id]/route.ts`                                   | Fire `sendSessionCancelled` per member after DELETE |
| Create  | `__tests__/lib/email/templates.test.ts`                                | Unit tests for 5 new templates               |
| Create  | `__tests__/lib/email/mailgun.test.ts`                                  | Unit tests for `MailgunEmailService`         |
| Modify  | `__tests__/lib/email/nodemailer.test.ts`                               | Tests for 5 new methods on `NodemailerEmailService` |
| Modify  | `__tests__/app/api/schedule.test.ts`                                   | Assert email called on POST + DELETE         |
| Create  | `__tests__/app/api/member-plan.test.ts`                                | Route tests + email assertion for plan POST  |
| Create  | `__tests__/app/api/member-nutrition.test.ts`                           | Route tests + email assertion for nutrition POST |
| Create  | `__tests__/app/api/owner-trainer-assign.test.ts`                       | Route tests + email assertion for PATCH      |
| Create  | `__tests__/app/api/owner-trainer-delete.test.ts`                       | Route tests + email assertion for DELETE     |

---

## Task 1: Install packages

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install runtime and type packages**

```bash
pnpm add mailgun.js form-data
pnpm add -D @types/form-data
```

Expected output: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Verify TypeScript can resolve types**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install mailgun.js and form-data packages"
```

---

## Task 2: Add 5 email templates

**Files:**
- Create: `src/lib/email/templates/plan-assigned.ts`
- Create: `src/lib/email/templates/nutrition-assigned.ts`
- Create: `src/lib/email/templates/member-assigned.ts`
- Create: `src/lib/email/templates/session-booked.ts`
- Create: `src/lib/email/templates/session-cancelled.ts`
- Create: `__tests__/lib/email/templates.test.ts`

- [ ] **Step 1: Write failing tests for all 5 templates**

Create `__tests__/lib/email/templates.test.ts`:

```typescript
describe('planAssignedTemplate', () => {
  it('includes plan name in subject', () => {
    const { planAssignedTemplate } = require('@/lib/email/templates/plan-assigned') as typeof import('@/lib/email/templates/plan-assigned');
    const { subject } = planAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Push Pull Legs' });
    expect(subject).toContain('POWER GYM');
  });

  it('includes trainer name and plan name in html', () => {
    const { planAssignedTemplate } = require('@/lib/email/templates/plan-assigned') as typeof import('@/lib/email/templates/plan-assigned');
    const { html } = planAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Push Pull Legs' });
    expect(html).toContain('Bob');
    expect(html).toContain('Push Pull Legs');
  });
});

describe('nutritionAssignedTemplate', () => {
  it('includes plan name in subject', () => {
    const { nutritionAssignedTemplate } = require('@/lib/email/templates/nutrition-assigned') as typeof import('@/lib/email/templates/nutrition-assigned');
    const { subject } = nutritionAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Bulk Diet' });
    expect(subject).toContain('POWER GYM');
  });

  it('includes trainer name and plan name in html', () => {
    const { nutritionAssignedTemplate } = require('@/lib/email/templates/nutrition-assigned') as typeof import('@/lib/email/templates/nutrition-assigned');
    const { html } = nutritionAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Bulk Diet' });
    expect(html).toContain('Bob');
    expect(html).toContain('Bulk Diet');
  });
});

describe('memberAssignedTemplate', () => {
  it('single member: includes member name in html', () => {
    const { memberAssignedTemplate } = require('@/lib/email/templates/member-assigned') as typeof import('@/lib/email/templates/member-assigned');
    const { html } = memberAssignedTemplate({ trainerName: 'Bob', memberNames: ['Alice'], assignerName: 'Owner' });
    expect(html).toContain('Alice');
  });

  it('multiple members: includes count and list in html', () => {
    const { memberAssignedTemplate } = require('@/lib/email/templates/member-assigned') as typeof import('@/lib/email/templates/member-assigned');
    const { html } = memberAssignedTemplate({ trainerName: 'Bob', memberNames: ['Alice', 'Charlie'], assignerName: 'Owner' });
    expect(html).toContain('Alice');
    expect(html).toContain('Charlie');
  });
});

describe('sessionBookedTemplate', () => {
  it('single session: includes date in html', () => {
    const { sessionBookedTemplate } = require('@/lib/email/templates/session-booked') as typeof import('@/lib/email/templates/session-booked');
    const { html } = sessionBookedTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isRecurring: false });
    expect(html).toContain('May 5, 2026');
    expect(html).toContain('09:00');
  });

  it('recurring session: includes sessionCount in html', () => {
    const { sessionBookedTemplate } = require('@/lib/email/templates/session-booked') as typeof import('@/lib/email/templates/session-booked');
    const { html } = sessionBookedTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isRecurring: true, sessionCount: 12 });
    expect(html).toContain('12');
  });
});

describe('sessionCancelledTemplate', () => {
  it('single cancel: includes date in html', () => {
    const { sessionCancelledTemplate } = require('@/lib/email/templates/session-cancelled') as typeof import('@/lib/email/templates/session-cancelled');
    const { html } = sessionCancelledTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isSeries: false });
    expect(html).toContain('May 5, 2026');
  });

  it('series cancel: html indicates series', () => {
    const { sessionCancelledTemplate } = require('@/lib/email/templates/session-cancelled') as typeof import('@/lib/email/templates/session-cancelled');
    const { html } = sessionCancelledTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isSeries: true });
    expect(html).toContain('09:00');
  });
});
```

- [ ] **Step 2: Run to confirm RED**

```bash
pnpm test -- --testPathPattern="templates.test"
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/lib/email/templates/plan-assigned.ts`**

```typescript
export function planAssignedTemplate(params: {
  memberName: string;
  trainerName: string;
  planName: string;
}): { subject: string; html: string } {
  return {
    subject: `你的训练计划已更新 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>训练计划已更新</h2>
        <p><strong>${params.trainerName}</strong> 已为你分配了新的训练计划「<strong>${params.planName}</strong>」，请登录查看。</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

- [ ] **Step 4: Create `src/lib/email/templates/nutrition-assigned.ts`**

```typescript
export function nutritionAssignedTemplate(params: {
  memberName: string;
  trainerName: string;
  planName: string;
}): { subject: string; html: string } {
  return {
    subject: `你的营养计划已更新 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>营养计划已更新</h2>
        <p><strong>${params.trainerName}</strong> 已为你分配了新的营养计划「<strong>${params.planName}</strong>」，请登录查看。</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

- [ ] **Step 5: Create `src/lib/email/templates/member-assigned.ts`**

```typescript
export function memberAssignedTemplate(params: {
  trainerName: string;
  memberNames: string[];
  assignerName: string;
}): { subject: string; html: string } {
  const { memberNames, assignerName } = params;
  const body =
    memberNames.length === 1
      ? `<strong>${memberNames[0]}</strong> 已由 <strong>${assignerName}</strong> 分配给你。`
      : `以下 <strong>${memberNames.length}</strong> 名会员已由 <strong>${assignerName}</strong> 转移给你：<ul>${memberNames.map((n) => `<li>${n}</li>`).join('')}</ul>`;

  return {
    subject: `新会员已分配给你 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>新会员分配通知</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

- [ ] **Step 6: Create `src/lib/email/templates/session-booked.ts`**

```typescript
export function sessionBookedTemplate(params: {
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number;
}): { subject: string; html: string } {
  const { trainerName, date, startTime, endTime, isRecurring, sessionCount } = params;
  const body = isRecurring
    ? `已为你安排 <strong>${sessionCount ?? 12}</strong> 节课，每周 ${startTime}–${endTime}，从 ${date} 开始，教练 <strong>${trainerName}</strong>。`
    : `你的训练课已安排在 <strong>${date}</strong> ${startTime}–${endTime}，教练 <strong>${trainerName}</strong>。`;

  return {
    subject: `训练课已安排 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>训练课预约确认</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

- [ ] **Step 7: Create `src/lib/email/templates/session-cancelled.ts`**

```typescript
export function sessionCancelledTemplate(params: {
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;
}): { subject: string; html: string } {
  const { date, startTime, endTime, isSeries } = params;
  const body = isSeries
    ? `从 <strong>${date}</strong> 起的系列训练课（每周 ${startTime}–${endTime}）已全部取消。`
    : `原定 <strong>${date}</strong> ${startTime}–${endTime} 的训练课已取消。`;

  return {
    subject: `训练课已取消 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>训练课取消通知</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
```

- [ ] **Step 8: Run tests to confirm GREEN**

```bash
pnpm test -- --testPathPattern="templates.test"
```

Expected: all 9 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/email/templates/plan-assigned.ts src/lib/email/templates/nutrition-assigned.ts src/lib/email/templates/member-assigned.ts src/lib/email/templates/session-booked.ts src/lib/email/templates/session-cancelled.ts __tests__/lib/email/templates.test.ts
git commit -m "feat: add 5 email notification templates"
```

---

## Task 3: Expand `IEmailService` and `NodemailerEmailService`

**Files:**
- Modify: `src/lib/email/index.ts`
- Modify: `src/lib/email/nodemailer.ts`
- Modify: `__tests__/lib/email/nodemailer.test.ts`

- [ ] **Step 1: Write failing tests for 5 new methods on `NodemailerEmailService`**

Append to `__tests__/lib/email/nodemailer.test.ts` (keep existing tests, add new describe blocks):

```typescript
describe('NodemailerEmailService — new methods', () => {
  const sendMailMock = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    mockNodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock } as never);
    process.env.EMAIL_PROVIDER = 'mailtrap';
    process.env.MAILTRAP_HOST = 'sandbox.smtp.mailtrap.io';
    process.env.MAILTRAP_PORT = '2525';
    process.env.MAILTRAP_USER = 'user';
    process.env.MAILTRAP_PASS = 'pass';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  it('sendPlanAssigned calls sendMail with correct to', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendPlanAssigned({ to: 'member@test.com', memberName: 'Alice', trainerName: 'Bob', planName: 'PPL' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com' }));
  });

  it('sendNutritionPlanAssigned calls sendMail with correct to', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendNutritionPlanAssigned({ to: 'member@test.com', memberName: 'Alice', trainerName: 'Bob', planName: 'Bulk' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com' }));
  });

  it('sendMemberAssigned calls sendMail with correct to', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendMemberAssigned({ to: 'trainer@test.com', trainerName: 'Bob', memberNames: ['Alice'], assignerName: 'Owner' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'trainer@test.com' }));
  });

  it('sendSessionBooked calls sendMail with correct to', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendSessionBooked({ to: 'member@test.com', memberName: 'Alice', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', isRecurring: false });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com' }));
  });

  it('sendSessionCancelled calls sendMail with correct to', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendSessionCancelled({ to: 'member@test.com', memberName: 'Alice', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', isSeries: false });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com' }));
  });
});
```

- [ ] **Step 2: Run to confirm RED**

```bash
pnpm test -- --testPathPattern="nodemailer.test"
```

Expected: FAIL — methods do not exist on `NodemailerEmailService`.

- [ ] **Step 3: Update `src/lib/email/index.ts`**

Replace the entire file:

```typescript
export interface SendInviteParams {
  to: string;
  inviterName: string;
  role: 'trainer' | 'member';
  inviteUrl: string;
}

export interface SendSessionReminderParams {
  to: string;
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  groupMembers: string[];
}

export interface SendPlanAssignedParams {
  to: string;
  memberName: string;
  trainerName: string;
  planName: string;
}

export interface SendNutritionPlanAssignedParams {
  to: string;
  memberName: string;
  trainerName: string;
  planName: string;
}

export interface SendMemberAssignedParams {
  to: string;
  trainerName: string;
  memberNames: string[];
  assignerName: string;
}

export interface SendSessionBookedParams {
  to: string;
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number;
}

export interface SendSessionCancelledParams {
  to: string;
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;
}

export interface IEmailService {
  sendInvite(params: SendInviteParams): Promise<void>;
  sendSessionReminder(params: SendSessionReminderParams): Promise<void>;
  sendPlanAssigned(params: SendPlanAssignedParams): Promise<void>;
  sendNutritionPlanAssigned(params: SendNutritionPlanAssignedParams): Promise<void>;
  sendMemberAssigned(params: SendMemberAssignedParams): Promise<void>;
  sendSessionBooked(params: SendSessionBookedParams): Promise<void>;
  sendSessionCancelled(params: SendSessionCancelledParams): Promise<void>;
}

export function getEmailService(): IEmailService {
  const provider = process.env.EMAIL_PROVIDER;
  if (provider === 'mailgun') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MailgunEmailService } = require('@/lib/email/mailgun') as {
      MailgunEmailService: new () => IEmailService;
    };
    return new MailgunEmailService();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodemailerEmailService } = require('@/lib/email/nodemailer') as {
    NodemailerEmailService: new () => IEmailService;
  };
  return new NodemailerEmailService();
}
```

- [ ] **Step 4: Update `src/lib/email/nodemailer.ts`**

Replace the entire file:

```typescript
import nodemailer from 'nodemailer';
import type {
  IEmailService,
  SendInviteParams,
  SendSessionReminderParams,
  SendPlanAssignedParams,
  SendNutritionPlanAssignedParams,
  SendMemberAssignedParams,
  SendSessionBookedParams,
  SendSessionCancelledParams,
} from '@/lib/email/index';
import { inviteEmailTemplate } from '@/lib/email/templates/invite';
import { sessionReminderTemplate } from '@/lib/email/templates/session-reminder';
import { planAssignedTemplate } from '@/lib/email/templates/plan-assigned';
import { nutritionAssignedTemplate } from '@/lib/email/templates/nutrition-assigned';
import { memberAssignedTemplate } from '@/lib/email/templates/member-assigned';
import { sessionBookedTemplate } from '@/lib/email/templates/session-booked';
import { sessionCancelledTemplate } from '@/lib/email/templates/session-cancelled';

function createTransport() {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === 'mailtrap') {
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT ?? 2525),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export class NodemailerEmailService implements IEmailService {
  async sendInvite(params: SendInviteParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = inviteEmailTemplate({
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl: params.inviteUrl,
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = sessionReminderTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendPlanAssigned(params: SendPlanAssignedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = planAssignedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendNutritionPlanAssigned(params: SendNutritionPlanAssignedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = nutritionAssignedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendMemberAssigned(params: SendMemberAssignedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = memberAssignedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionBooked(params: SendSessionBookedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = sessionBookedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionCancelled(params: SendSessionCancelledParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = sessionCancelledTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }
}
```

- [ ] **Step 5: Run to confirm GREEN**

```bash
pnpm test -- --testPathPattern="nodemailer.test"
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/index.ts src/lib/email/nodemailer.ts __tests__/lib/email/nodemailer.test.ts
git commit -m "feat: expand IEmailService with 5 new methods; implement in NodemailerEmailService"
```

---

## Task 4: Create `MailgunEmailService`

**Files:**
- Create: `src/lib/email/mailgun.ts`
- Create: `__tests__/lib/email/mailgun.test.ts`

- [ ] **Step 1: Write failing tests for `MailgunEmailService`**

Create `__tests__/lib/email/mailgun.test.ts`:

```typescript
const mockCreate = jest.fn().mockResolvedValue({});
const mockClient = { messages: { create: mockCreate } };

jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue(mockClient),
  }));
});
jest.mock('form-data', () => jest.fn());

describe('MailgunEmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MAILGUN_API_KEY = 'test-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.SMTP_FROM = 'noreply@example.com';
  });

  it('sendInvite calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendInvite({ to: 'invited@test.com', inviterName: 'Bob', role: 'member', inviteUrl: 'http://example.com' });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['invited@test.com'] }));
  });

  it('sendPlanAssigned calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendPlanAssigned({ to: 'member@test.com', memberName: 'Alice', trainerName: 'Bob', planName: 'PPL' });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['member@test.com'] }));
  });

  it('sendSessionBooked calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendSessionBooked({ to: 'member@test.com', memberName: 'Alice', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', isRecurring: false });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['member@test.com'] }));
  });
});
```

- [ ] **Step 2: Run to confirm RED**

```bash
pnpm test -- --testPathPattern="mailgun.test"
```

Expected: FAIL — `@/lib/email/mailgun` not found.

- [ ] **Step 3: Create `src/lib/email/mailgun.ts`**

```typescript
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import type {
  IEmailService,
  SendInviteParams,
  SendSessionReminderParams,
  SendPlanAssignedParams,
  SendNutritionPlanAssignedParams,
  SendMemberAssignedParams,
  SendSessionBookedParams,
  SendSessionCancelledParams,
} from '@/lib/email/index';
import { inviteEmailTemplate } from '@/lib/email/templates/invite';
import { sessionReminderTemplate } from '@/lib/email/templates/session-reminder';
import { planAssignedTemplate } from '@/lib/email/templates/plan-assigned';
import { nutritionAssignedTemplate } from '@/lib/email/templates/nutrition-assigned';
import { memberAssignedTemplate } from '@/lib/email/templates/member-assigned';
import { sessionBookedTemplate } from '@/lib/email/templates/session-booked';
import { sessionCancelledTemplate } from '@/lib/email/templates/session-cancelled';

export class MailgunEmailService implements IEmailService {
  private mg: ReturnType<InstanceType<typeof Mailgun>['client']>;

  constructor() {
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY ?? '' });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    await this.mg.messages.create(process.env.MAILGUN_DOMAIN ?? '', {
      from: process.env.SMTP_FROM,
      to: [to],
      subject,
      html,
    });
  }

  async sendInvite(params: SendInviteParams): Promise<void> {
    const { subject, html } = inviteEmailTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
    const { subject, html } = sessionReminderTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendPlanAssigned(params: SendPlanAssignedParams): Promise<void> {
    const { subject, html } = planAssignedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendNutritionPlanAssigned(params: SendNutritionPlanAssignedParams): Promise<void> {
    const { subject, html } = nutritionAssignedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendMemberAssigned(params: SendMemberAssignedParams): Promise<void> {
    const { subject, html } = memberAssignedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendSessionBooked(params: SendSessionBookedParams): Promise<void> {
    const { subject, html } = sessionBookedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendSessionCancelled(params: SendSessionCancelledParams): Promise<void> {
    const { subject, html } = sessionCancelledTemplate(params);
    await this.send(params.to, subject, html);
  }
}
```

- [ ] **Step 4: Run to confirm GREEN**

```bash
pnpm test -- --testPathPattern="mailgun.test"
```

Expected: all 3 tests pass.

- [ ] **Step 5: Run full suite to check nothing broke**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/mailgun.ts __tests__/lib/email/mailgun.test.ts
git commit -m "feat: add MailgunEmailService; update getEmailService factory"
```

---

## Task 5: Wire plan assignment emails

**Files:**
- Modify: `src/app/api/members/[memberId]/plan/route.ts`
- Modify: `src/app/api/members/[memberId]/nutrition/route.ts`
- Create: `__tests__/app/api/member-plan.test.ts`
- Create: `__tests__/app/api/member-nutrition.test.ts`

- [ ] **Step 1: Write failing tests for `POST /api/members/[memberId]/plan`**

Create `__tests__/app/api/member-plan.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
const mockTemplateRepo = { findById: jest.fn() };
const mockMemberPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/plan-template.repository', () => ({
  MongoPlanTemplateRepository: jest.fn(() => mockTemplateRepo),
}));
jest.mock('@/lib/repositories/member-plan.repository', () => ({
  MongoMemberPlanRepository: jest.fn(() => mockMemberPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1', name = 'Trainer') {
  return { user: { role, id, name } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('GET /api/members/[memberId]/plan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ memberId: 'm1' }) });
    expect(res.status).toBe(401);
  });

  it('returns active plan for member', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm1'));
    mockMemberPlanRepo.findActive.mockResolvedValue({ name: 'PPL' });
    const { GET } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await GET(new Request('http://localhost'), { params: Promise.resolve({ memberId: 'm1' }) });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/members/[memberId]/plan', () => {
  const sendPlanAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendPlanAssigned: sendPlanAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: { toString: () => 't1' } });
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', name: 'PPL', days: [] });
    mockMemberPlanRepo.deactivateAll.mockResolvedValue(undefined);
    mockMemberPlanRepo.create.mockResolvedValue({ _id: 'plan1' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for member role', async () => {
    mockAuth.mockResolvedValue(makeSession('member', 'm1'));
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(403);
  });

  it('creates plan and returns 201', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(201);
  });

  it('fires sendPlanAssigned after creating plan', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1', 'Coach Bob'));
    const { POST } = await import('@/app/api/members/[memberId]/plan/route');
    await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(sendPlanAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      memberName: 'Alice',
      trainerName: 'Coach Bob',
      planName: 'PPL',
    }));
  });
});
```

- [ ] **Step 2: Write failing tests for `POST /api/members/[memberId]/nutrition`**

Create `__tests__/app/api/member-nutrition.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
const mockTemplateRepo = { findById: jest.fn() };
const mockPlanRepo = { findActive: jest.fn(), deactivateAll: jest.fn(), create: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/nutrition-template.repository', () => ({
  MongoNutritionTemplateRepository: jest.fn(() => mockTemplateRepo),
}));
jest.mock('@/lib/repositories/member-nutrition-plan.repository', () => ({
  MongoMemberNutritionPlanRepository: jest.fn(() => mockPlanRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1', name = 'Trainer') {
  return { user: { role, id, name } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('POST /api/members/[memberId]/nutrition', () => {
  const sendNutritionPlanAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendNutritionPlanAssigned: sendNutritionPlanAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: { toString: () => 't1' } });
    mockTemplateRepo.findById.mockResolvedValue({ _id: 'tpl1', name: 'Bulk Diet', dayTypes: [] });
    mockPlanRepo.deactivateAll.mockResolvedValue(undefined);
    mockPlanRepo.create.mockResolvedValue({ _id: 'plan1' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('creates nutrition plan and returns 201', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(res.status).toBe(201);
  });

  it('fires sendNutritionPlanAssigned after creating plan', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1', 'Coach Bob'));
    const { POST } = await import('@/app/api/members/[memberId]/nutrition/route');
    await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: 'tpl1' }) }),
      { params: Promise.resolve({ memberId: 'm1' }) },
    );
    expect(sendNutritionPlanAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      memberName: 'Alice',
      trainerName: 'Coach Bob',
      planName: 'Bulk Diet',
    }));
  });
});
```

- [ ] **Step 3: Run to confirm RED**

```bash
pnpm test -- --testPathPattern="member-plan.test|member-nutrition.test"
```

Expected: FAIL — `sendPlanAssigned` / `sendNutritionPlanAssigned` not called.

- [ ] **Step 4: Update `src/app/api/members/[memberId]/plan/route.ts`**

Add the import at the top and append fire-and-forget after `memberPlanRepo.create(...)` in the POST handler. Replace the entire file:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';
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

  try {
    await getEmailService().sendPlanAssigned({
      to: member.email,
      memberName: member.name,
      trainerName: session.user.name ?? 'Your trainer',
      planName: template.name,
    });
  } catch (e) {
    console.error('sendPlanAssigned failed:', e);
  }

  return Response.json(plan, { status: 201 });
}
```

- [ ] **Step 5: Update `src/app/api/members/[memberId]/nutrition/route.ts`**

Replace the entire file:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';
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

  try {
    await getEmailService().sendNutritionPlanAssigned({
      to: member.email,
      memberName: member.name,
      trainerName: session.user.name ?? 'Your trainer',
      planName: template.name,
    });
  } catch (e) {
    console.error('sendNutritionPlanAssigned failed:', e);
  }

  return Response.json(plan, { status: 201 });
}
```

- [ ] **Step 6: Run to confirm GREEN**

```bash
pnpm test -- --testPathPattern="member-plan.test|member-nutrition.test"
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/members/[memberId]/plan/route.ts src/app/api/members/[memberId]/nutrition/route.ts __tests__/app/api/member-plan.test.ts __tests__/app/api/member-nutrition.test.ts
git commit -m "feat: send email when training/nutrition plan is assigned to member"
```

---

## Task 6: Wire member assignment emails

**Files:**
- Modify: `src/app/api/owner/members/[id]/trainer/route.ts`
- Modify: `src/app/api/owner/trainers/[id]/route.ts`
- Create: `__tests__/app/api/owner-trainer-assign.test.ts`
- Create: `__tests__/app/api/owner-trainer-delete.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/api/owner-trainer-assign.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = { findById: jest.fn(), updateTrainerId: jest.fn() };
const mockScheduleRepo = { removeMemberFromFutureSessions: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockScheduleRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1', name = 'Owner') {
  return { user: { role, id, name } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('PATCH /api/owner/members/[id]/trainer', () => {
  const sendMemberAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendMemberAssigned: sendMemberAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.findById
      .mockResolvedValueOnce({ _id: 'm1', name: 'Alice', role: 'member' })
      .mockResolvedValueOnce({ _id: 't1', name: 'Coach Bob', email: 'bob@test.com', role: 'trainer' });
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);
    mockScheduleRepo.removeMemberFromFutureSessions.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ trainerId: 't1' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't1' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(res.status).toBe(403);
  });

  it('reassigns member and returns 200', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't1' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(res.status).toBe(200);
  });

  it('fires sendMemberAssigned to new trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1', 'Owner Name'));
    const { PATCH } = await import('@/app/api/owner/members/[id]/trainer/route');
    await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trainerId: 't1' }) }),
      { params: Promise.resolve({ id: 'm1' }) },
    );
    expect(sendMemberAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'bob@test.com',
      trainerName: 'Coach Bob',
      memberNames: ['Alice'],
      assignerName: 'Owner Name',
    }));
  });
});
```

Create `__tests__/app/api/owner-trainer-delete.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockUserRepo = {
  findById: jest.fn(),
  findAllMembers: jest.fn(),
  updateTrainerId: jest.fn(),
};

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1', name = 'Owner') {
  return { user: { role, id, name } } as unknown as Awaited<ReturnType<typeof auth>>;
}

describe('DELETE /api/owner/trainers/[id]', () => {
  const sendMemberAssignedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendMemberAssigned: sendMemberAssignedMock } as unknown as ReturnType<typeof getEmailService>);
    mockUserRepo.findById
      .mockResolvedValueOnce({ _id: 't1', name: 'Old Trainer', role: 'trainer' })
      .mockResolvedValueOnce({ _id: 't2', name: 'New Trainer', email: 'new@test.com', role: 'trainer' });
    mockUserRepo.findAllMembers.mockResolvedValue([
      { _id: { toString: () => 'm1' }, name: 'Alice' },
      { _id: { toString: () => 'm2' }, name: 'Bob' },
    ]);
    mockUserRepo.updateTrainerId.mockResolvedValue(undefined);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', body: JSON.stringify({ reassignToId: 't2' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('deletes trainer and returns 200', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 't2' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(res.status).toBe(200);
  });

  it('fires sendMemberAssigned with all member names to new trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'o1', 'Owner Name'));
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 't2' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(sendMemberAssignedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'new@test.com',
      trainerName: 'New Trainer',
      memberNames: expect.arrayContaining(['Alice', 'Bob']),
      assignerName: 'Owner Name',
    }));
  });

  it('does not fire sendMemberAssigned when no members to reassign', async () => {
    mockUserRepo.findAllMembers.mockResolvedValue([]);
    mockAuth.mockResolvedValue(makeSession('owner', 'o1'));
    const { DELETE } = await import('@/app/api/owner/trainers/[id]/route');
    await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reassignToId: 't2' }) }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(sendMemberAssignedMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to confirm RED**

```bash
pnpm test -- --testPathPattern="owner-trainer-assign.test|owner-trainer-delete.test"
```

Expected: FAIL — `sendMemberAssigned` never called.

- [ ] **Step 3: Update `src/app/api/owner/members/[id]/trainer/route.ts`**

Replace the entire file:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { getEmailService } from '@/lib/email/index';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  let trainerId: string;
  try {
    const body = (await req.json()) as { trainerId?: unknown };
    if (typeof body.trainerId !== 'string' || !body.trainerId) {
      return Response.json({ error: 'trainerId is required' }, { status: 400 });
    }
    trainerId = body.trainerId;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await connectDB();
  const userRepo = new MongoUserRepository();

  const member = await userRepo.findById(id);
  if (!member || member.role !== 'member') {
    return Response.json({ error: 'Member not found' }, { status: 404 });
  }

  await userRepo.updateTrainerId(id, trainerId);
  const scheduleRepo = new MongoScheduledSessionRepository();
  await scheduleRepo.removeMemberFromFutureSessions(id);

  const newTrainer = await userRepo.findById(trainerId);
  if (newTrainer) {
    try {
      await getEmailService().sendMemberAssigned({
        to: newTrainer.email,
        trainerName: newTrainer.name,
        memberNames: [member.name],
        assignerName: session.user.name ?? 'Owner',
      });
    } catch (e) {
      console.error('sendMemberAssigned failed:', e);
    }
  }

  return Response.json({ success: true });
}
```

- [ ] **Step 4: Update `src/app/api/owner/trainers/[id]/route.ts`**

Replace the entire file:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { reassignToId } = (await req.json()) as { reassignToId: string };

  await connectDB();
  const userRepo = new MongoUserRepository();

  const trainer = await userRepo.findById(id);
  if (!trainer || trainer.role !== 'trainer') {
    return Response.json({ error: 'Trainer not found' }, { status: 404 });
  }

  const members = await userRepo.findAllMembers(id);
  await Promise.all(
    members.map((m) => userRepo.updateTrainerId(m._id.toString(), reassignToId)),
  );

  if (members.length > 0) {
    const newTrainer = await userRepo.findById(reassignToId);
    if (newTrainer) {
      try {
        await getEmailService().sendMemberAssigned({
          to: newTrainer.email,
          trainerName: newTrainer.name,
          memberNames: members.map((m) => m.name),
          assignerName: session.user.name ?? 'Owner',
        });
      } catch (e) {
        console.error('sendMemberAssigned failed:', e);
      }
    }
  }

  return Response.json({ success: true });
}
```

- [ ] **Step 5: Run to confirm GREEN**

```bash
pnpm test -- --testPathPattern="owner-trainer-assign.test|owner-trainer-delete.test"
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/owner/members/[id]/trainer/route.ts src/app/api/owner/trainers/[id]/route.ts __tests__/app/api/owner-trainer-assign.test.ts __tests__/app/api/owner-trainer-delete.test.ts
git commit -m "feat: send email to trainer when members are assigned or bulk-reassigned"
```

---

## Task 7: Wire session booked email

**Files:**
- Modify: `src/app/api/schedule/route.ts`
- Modify: `__tests__/app/api/schedule.test.ts`

- [ ] **Step 1: Write failing tests — append to `__tests__/app/api/schedule.test.ts`**

The existing `schedule.test.ts` mocks `@/lib/repositories/scheduled-session.repository` but not email. Add the email mock at the top of the file (alongside the existing mocks), then append the new describe block.

Add to the top-level mocks section at the top of `__tests__/app/api/schedule.test.ts` (after the existing `jest.mock` calls):

```typescript
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
```

Add the `mockUserRepo` object alongside the existing `mockRepo`:

```typescript
const mockUserRepo = { findById: jest.fn() };
```

Add new import at the top (alongside existing `auth` import):

```typescript
import { getEmailService } from '@/lib/email/index';
const mockGetEmailService = jest.mocked(getEmailService);
```

Append to the end of the file:

```typescript
describe('POST /api/schedule — email notification', () => {
  const sendSessionBookedMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendSessionBooked: sendSessionBookedMock } as unknown as ReturnType<typeof getEmailService>);
    mockRepo.create.mockResolvedValue({ _id: 's1' });
    mockUserRepo.findById
      .mockResolvedValueOnce({ _id: 'm1', name: 'Alice', email: 'alice@test.com' })
      .mockResolvedValueOnce({ _id: 't1', name: 'Coach Bob' });
  });

  it('fires sendSessionBooked for each member on single session', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { POST } = await import('@/app/api/schedule/route');
    await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: false }),
    }));
    expect(sendSessionBookedMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      memberName: 'Alice',
      isRecurring: false,
    }));
  });

  it('fires sendSessionBooked with isRecurring=true for recurring sessions', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.createMany.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/schedule/route');
    await POST(new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ['m1'], date: '2026-05-01', startTime: '09:00', endTime: '10:00', isRecurring: true }),
    }));
    expect(sendSessionBookedMock).toHaveBeenCalledWith(expect.objectContaining({
      isRecurring: true,
      sessionCount: 12,
    }));
  });
});
```

- [ ] **Step 2: Run to confirm RED**

```bash
pnpm test -- --testPathPattern="schedule.test"
```

Expected: FAIL — new describe block fails, `sendSessionBooked` not called.

- [ ] **Step 3: Update `src/app/api/schedule/route.ts`**

Replace the entire file:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';
import mongoose from 'mongoose';

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

interface PostBody {
  trainerId?: string;
  memberIds?: string[];
  date?: string;
  startTime?: string;
  endTime?: string;
  isRecurring?: boolean;
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
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
  if (!Array.isArray(body.memberIds) || body.memberIds.length === 0) {
    return Response.json({ error: 'memberIds must be a non-empty array' }, { status: 400 });
  }
  if (typeof body.date !== 'string' || typeof body.startTime !== 'string' || typeof body.endTime !== 'string') {
    return Response.json({ error: 'date, startTime, endTime are required' }, { status: 400 });
  }

  const memberIds = body.memberIds;
  const baseDate = new Date(body.date);
  const isRecurring = body.isRecurring === true;

  await connectDB();
  const repo = new MongoScheduledSessionRepository();

  let sessions: unknown[];
  if (!isRecurring) {
    const doc = await repo.create({
      seriesId: null,
      trainerId,
      memberIds,
      date: baseDate,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    sessions = [doc];
  } else {
    const seriesId = new mongoose.Types.ObjectId().toString();
    sessions = Array.from({ length: 12 }, (_, i) => ({
      seriesId,
      trainerId,
      memberIds,
      date: addWeeks(baseDate, i),
      startTime: body.startTime as string,
      endTime: body.endTime as string,
    }));
    await repo.createMany(sessions as Parameters<typeof repo.createMany>[0]);
  }

  const userRepo = new MongoUserRepository();
  const dateLabel = baseDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const emailService = getEmailService();

  await Promise.all(
    memberIds.map(async (memberId) => {
      const memberDoc = await userRepo.findById(memberId);
      if (!memberDoc) return;
      const trainerDoc = await userRepo.findById(trainerId);
      try {
        await emailService.sendSessionBooked({
          to: memberDoc.email,
          memberName: memberDoc.name,
          trainerName: trainerDoc?.name ?? 'Your trainer',
          date: dateLabel,
          startTime: body.startTime as string,
          endTime: body.endTime as string,
          isRecurring,
          sessionCount: isRecurring ? 12 : undefined,
        });
      } catch (e) {
        console.error('sendSessionBooked failed:', e);
      }
    }),
  );

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
    const trainerIdParam = url.searchParams.get('trainerId');
    if (trainerIdParam && !/^[a-f0-9]{24}$/.test(trainerIdParam)) {
      return Response.json({ error: 'Invalid trainerId format' }, { status: 400 });
    }
    docs = await repo.findByDateRange(
      start,
      end,
      trainerIdParam ? { trainerId: trainerIdParam } : {},
    );
  }

  return Response.json({ sessions: docs });
}
```

- [ ] **Step 4: Run to confirm GREEN**

```bash
pnpm test -- --testPathPattern="schedule.test"
```

Expected: all tests pass (original tests + new email tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/schedule/route.ts __tests__/app/api/schedule.test.ts
git commit -m "feat: send session booking email to each member when session is created"
```

---

## Task 8: Wire session cancelled email

**Files:**
- Modify: `src/app/api/schedule/[id]/route.ts`
- Create: `__tests__/app/api/schedule-id.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/api/schedule-id.test.ts`:

```typescript
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockRepo = {
  findById: jest.fn(),
  updateOne: jest.fn(),
  updateFuture: jest.fn(),
  updateAll: jest.fn(),
  cancelOne: jest.fn(),
  cancelFuture: jest.fn(),
  cancelAll: jest.fn(),
};
const mockUserRepo = { findById: jest.fn() };

jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

const existingSession = {
  _id: 's1',
  seriesId: { toString: () => 'series1' },
  memberIds: ['m1'],
  trainerId: 't1',
  date: new Date('2026-05-05'),
  startTime: '09:00',
  endTime: '10:00',
};

describe('DELETE /api/schedule/[id] — scope=one', () => {
  const sendSessionCancelledMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendSessionCancelled: sendSessionCancelledMock } as unknown as ReturnType<typeof getEmailService>);
    mockRepo.findById.mockResolvedValue(existingSession);
    mockRepo.cancelOne.mockResolvedValue(undefined);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Alice', email: 'alice@test.com' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', body: JSON.stringify({ scope: 'one' }) }),
      { params: Promise.resolve({ id: 's1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('cancels single session and returns 200', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'one' }) }),
      { params: Promise.resolve({ id: 's1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockRepo.cancelOne).toHaveBeenCalledWith('s1');
  });

  it('fires sendSessionCancelled with isSeries=false for scope=one', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'one' }) }),
      { params: Promise.resolve({ id: 's1' }) },
    );
    expect(sendSessionCancelledMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      isSeries: false,
    }));
  });
});

describe('DELETE /api/schedule/[id] — scope=future', () => {
  const sendSessionCancelledMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendSessionCancelled: sendSessionCancelledMock } as unknown as ReturnType<typeof getEmailService>);
    mockRepo.findById.mockResolvedValue(existingSession);
    mockRepo.cancelFuture.mockResolvedValue(undefined);
    mockUserRepo.findById.mockResolvedValue({ _id: 'm1', name: 'Alice', email: 'alice@test.com' });
  });

  it('fires sendSessionCancelled with isSeries=true for scope=future', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    await DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'future' }) }),
      { params: Promise.resolve({ id: 's1' }) },
    );
    expect(sendSessionCancelledMock).toHaveBeenCalledWith(expect.objectContaining({
      isSeries: true,
    }));
  });
});
```

- [ ] **Step 2: Run to confirm RED**

```bash
pnpm test -- --testPathPattern="schedule-id.test"
```

Expected: FAIL — `sendSessionCancelled` not called.

- [ ] **Step 3: Update `src/app/api/schedule/[id]/route.ts`**

Replace the entire file:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';
import type { UpdateScheduledSessionData } from '@/lib/repositories/scheduled-session.repository';

type RouteContext = { params: Promise<{ id: string }> };
type Scope = 'one' | 'future' | 'all';

interface PatchBody {
  scope?: string;
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
}

interface DeleteBody {
  scope?: string;
}

function isScope(s: string | undefined): s is Scope {
  return s === 'one' || s === 'future' || s === 'all';
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isScope(body.scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }
  const scope = body.scope;

  try {
    await connectDB();
    const repo = new MongoScheduledSessionRepository();
    const existing = await repo.findById(id);
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

    const update: UpdateScheduledSessionData = {};
    if (typeof body.trainerId === 'string') update.trainerId = body.trainerId;
    if (Array.isArray(body.memberIds)) update.memberIds = body.memberIds;
    if (typeof body.startTime === 'string') update.startTime = body.startTime;
    if (typeof body.endTime === 'string') update.endTime = body.endTime;

    const seriesId = existing.seriesId?.toString();

    if (scope === 'one') {
      await repo.updateOne(id, update);
    } else if (seriesId) {
      if (scope === 'future') await repo.updateFuture(seriesId, existing.date, update);
      else await repo.updateAll(seriesId, update);
    } else {
      return Response.json({ error: 'Session is not part of a recurring series' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isScope(body.scope)) {
    return Response.json({ error: 'scope must be one of: one, future, all' }, { status: 400 });
  }
  const scope = body.scope;

  try {
    await connectDB();
    const repo = new MongoScheduledSessionRepository();
    const existing = await repo.findById(id);
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

    const seriesId = existing.seriesId?.toString();

    if (scope === 'one') {
      await repo.cancelOne(id);
    } else if (seriesId) {
      if (scope === 'future') await repo.cancelFuture(seriesId, existing.date);
      else await repo.cancelAll(seriesId);
    } else {
      return Response.json({ error: 'Session is not part of a recurring series' }, { status: 400 });
    }

    const isSeries = scope === 'future' || scope === 'all';
    const dateLabel = existing.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const userRepo = new MongoUserRepository();
    const emailService = getEmailService();

    await Promise.all(
      existing.memberIds.map(async (memberId: string) => {
        const memberDoc = await userRepo.findById(memberId);
        if (!memberDoc) return;
        try {
          await emailService.sendSessionCancelled({
            to: memberDoc.email,
            memberName: memberDoc.name,
            trainerName: session.user.name ?? 'Your trainer',
            date: dateLabel,
            startTime: existing.startTime,
            endTime: existing.endTime,
            isSeries,
          });
        } catch (e) {
          console.error('sendSessionCancelled failed:', e);
        }
      }),
    );

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run to confirm GREEN**

```bash
pnpm test -- --testPathPattern="schedule-id.test"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/schedule/[id]/route.ts __tests__/app/api/schedule-id.test.ts
git commit -m "feat: send session cancellation email to members when session is cancelled"
```

---

## Task 9: Final check

**Files:** None modified.

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass, no failures.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Run type check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Update docs index**

Open `docs/INDEX.md` and change the Email Notifications row in Implementation Plans to:

```
| Email Notifications | [email-notifications-implementation-plan.md](2026-05-01/plans/email-notifications-implementation-plan.md) | Complete |
```

- [ ] **Step 5: Final commit**

```bash
git add docs/INDEX.md
git commit -m "docs: mark email notifications implementation plan complete"
```
