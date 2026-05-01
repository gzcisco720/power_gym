# Email Notifications — Design Spec

## Goal

Extend the existing email infrastructure to cover all meaningful notification touchpoints in the app, and add proper multi-provider support (Mailtrap for dev, Mailgun SDK or generic SMTP for production) switchable via a single environment variable.

---

## Current State

The app already has:
- `IEmailService` interface in `src/lib/email/index.ts`
- `NodemailerEmailService` in `src/lib/email/nodemailer.ts` — supports `mailtrap` and generic SMTP
- `getEmailService()` factory — currently always returns `NodemailerEmailService`
- Two email types: `sendInvite`, `sendSessionReminder`
- Two templates: `invite.ts`, `session-reminder.ts`
- Email is already wired to invite routes and the session-reminder cron job

---

## Provider Architecture

### Environment Variable

`EMAIL_PROVIDER` controls which transport is used:

| Value | Implementation | Use Case |
|---|---|---|
| `mailtrap` | `NodemailerEmailService` (Mailtrap SMTP) | Development |
| `mailgun` | `MailgunEmailService` (Mailgun HTTP SDK) | Production option A |
| `smtp` (default) | `NodemailerEmailService` (generic SMTP) | Production option B (incl. Google) |

### `getEmailService()` — Updated Factory

```typescript
export function getEmailService(): IEmailService {
  const provider = process.env.EMAIL_PROVIDER;
  if (provider === 'mailgun') {
    const { MailgunEmailService } = require('@/lib/email/mailgun') as {
      MailgunEmailService: new () => IEmailService;
    };
    return new MailgunEmailService();
  }
  const { NodemailerEmailService } = require('@/lib/email/nodemailer') as {
    NodemailerEmailService: new () => IEmailService;
  };
  return new NodemailerEmailService();
}
```

`NodemailerEmailService` keeps its existing internal branch: `EMAIL_PROVIDER === 'mailtrap'` → Mailtrap SMTP, otherwise generic SMTP.

### Mailgun Environment Variables

```
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
SMTP_FROM=noreply@yourdomain.com
```

`SMTP_FROM` is shared across all providers as the sender address.

### Mailgun Implementation (`src/lib/email/mailgun.ts`)

Uses `mailgun.js` + `form-data` packages:

```typescript
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export class MailgunEmailService implements IEmailService {
  private mg;

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

  // ... each IEmailService method calls this.send()
}
```

---

## Email Trigger Matrix

| Trigger | Route | Recipient | Status |
|---|---|---|---|
| Owner invites trainer/member | `POST /api/owner/invites` | Invitee | ✅ Already wired |
| Resend invite | `POST /api/owner/invites/[id]/resend` | Invitee | ✅ Already wired |
| Trainer invites member | `POST /api/invites` | Invitee | ✅ Already wired |
| Session reminder (24h cron) | `GET /api/cron/session-reminders` | Session members | ✅ Already wired |
| Training plan assigned | `POST /api/members/[memberId]/plan` | Member | ❌ Add |
| Nutrition plan assigned | `POST /api/members/[memberId]/nutrition` | Member | ❌ Add |
| Member assigned to trainer | `PATCH /api/owner/members/[id]/trainer` | New trainer | ❌ Add |
| Trainer deleted (bulk reassign) | `DELETE /api/owner/trainers/[id]` | New trainer (one summary) | ❌ Add |
| Session scheduled | `POST /api/schedule` | Each member (one email) | ❌ Add |
| Session cancelled | `DELETE /api/schedule/[id]` | Each member in session | ❌ Add |

### Error Handling

All email sends are fire-and-forget: wrapped in `try/catch`, log on failure, never block the API response. This matches the existing pattern.

---

## New Email Types

### `sendPlanAssigned`

```typescript
interface SendPlanAssignedParams {
  to: string;           // member email
  memberName: string;
  trainerName: string;
  planName: string;
}
```

Subject: `你的训练计划已更新 — POWER GYM`
Body: `[trainerName] 已为你分配了新的训练计划「[planName]」，请登录查看。`

### `sendNutritionPlanAssigned`

```typescript
interface SendNutritionPlanAssignedParams {
  to: string;
  memberName: string;
  trainerName: string;
  planName: string;
}
```

Subject: `你的营养计划已更新 — POWER GYM`
Body: `[trainerName] 已为你分配了新的营养计划「[planName]」，请登录查看。`

### `sendMemberAssigned`

Covers both single assignment (`PATCH /api/owner/members/[id]/trainer`) and bulk reassignment on trainer deletion. `memberNames` array handles both cases with one template.

```typescript
interface SendMemberAssignedParams {
  to: string;           // trainer email
  trainerName: string;
  memberNames: string[];  // one or more
  assignerName: string;
}
```

Subject: `新会员已分配给你 — POWER GYM`
Body (single): `[memberName] 已由 [assignerName] 分配给你。`
Body (multiple): `以下 [N] 名会员已由 [assignerName] 转移给你：[list]`
Template renders list vs single based on `memberNames.length`.

### `sendSessionBooked`

```typescript
interface SendSessionBookedParams {
  to: string;           // member email
  memberName: string;
  trainerName: string;
  date: string;         // e.g. "Monday, May 5, 2026"
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number; // present when isRecurring=true (always 12)
}
```

Subject: `训练课已安排 — POWER GYM`
Body (single): `你的训练课已安排在 [date] [startTime]–[endTime]，教练 [trainerName]。`
Body (recurring): `已为你安排 [sessionCount] 节课，每周 [weekday] [startTime]–[endTime]，从 [date] 开始，教练 [trainerName]。`

### `sendSessionCancelled`

```typescript
interface SendSessionCancelledParams {
  to: string;
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;  // true when scope=future or scope=all
}
```

Subject: `训练课已取消 — POWER GYM`
Body (single): `原定 [date] [startTime]–[endTime] 的训练课已取消。`
Body (series): `从 [date] 起的系列训练课（每周 [startTime]–[endTime]）已全部取消。`

---

## Route Changes

### `POST /api/members/[memberId]/plan`

After creating the plan, look up the member's email (`userRepo.findById` already called in this route), then fire-and-forget:
```typescript
try {
  await getEmailService().sendPlanAssigned({
    to: member.email,
    memberName: member.name,
    trainerName: session.user.name ?? 'Your trainer',
    planName: template.name,
  });
} catch (e) { console.error('sendPlanAssigned failed:', e); }
```

### `POST /api/members/[memberId]/nutrition`

Same pattern, using `sendNutritionPlanAssigned`.

### `PATCH /api/owner/members/[id]/trainer`

After `updateTrainerId`, look up the new trainer:
```typescript
const newTrainer = await userRepo.findById(trainerId);
if (newTrainer) {
  try {
    await getEmailService().sendMemberAssigned({
      to: newTrainer.email,
      trainerName: newTrainer.name,
      memberNames: [member.name],
      assignerName: session.user.name ?? 'Owner',
    });
  } catch (e) { console.error('sendMemberAssigned failed:', e); }
}
```

### `DELETE /api/owner/trainers/[id]`

After bulk reassign, look up new trainer and send one summary email:
```typescript
const newTrainer = await userRepo.findById(reassignToId);
if (newTrainer && members.length > 0) {
  try {
    await getEmailService().sendMemberAssigned({
      to: newTrainer.email,
      trainerName: newTrainer.name,
      memberNames: members.map((m) => m.name),
      assignerName: session.user.name ?? 'Owner',
    });
  } catch (e) { console.error('sendMemberAssigned failed:', e); }
}
```

### `POST /api/schedule`

After creating session(s), look up members and send one email per member:
```typescript
const userRepo = new MongoUserRepository();
const memberDocs = await Promise.all(memberIds.map((id) => userRepo.findById(id)));
const trainer = await userRepo.findById(trainerId);
const emailService = getEmailService();
const dateLabel = baseDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
for (const memberDoc of memberDocs) {
  if (!memberDoc) continue;
  try {
    await emailService.sendSessionBooked({
      to: memberDoc.email,
      memberName: memberDoc.name,
      trainerName: trainer?.name ?? 'Your trainer',
      date: dateLabel,
      startTime: body.startTime,
      endTime: body.endTime,
      isRecurring,
      sessionCount: isRecurring ? 12 : undefined,
    });
  } catch (e) { console.error('sendSessionBooked failed:', e); }
}
```

### `DELETE /api/schedule/[id]`

Before cancelling, read `existing` (already fetched) for memberIds and date info:

- `scope=one`: `isSeries = false`
- `scope=future` or `scope=all`: `isSeries = true`

Then send `sendSessionCancelled` to each member in `existing.memberIds`. No count querying needed — the email describes the cancellation by date rather than count.

---

## File Structure

```
src/lib/email/
  index.ts                    — IEmailService (7 methods) + all Params types + getEmailService()
  nodemailer.ts               — NodemailerEmailService (adds 4 new methods)
  mailgun.ts                  — NEW: MailgunEmailService (implements all 7 methods)
  templates/
    invite.ts                 — unchanged
    session-reminder.ts       — unchanged
    plan-assigned.ts          — NEW
    nutrition-assigned.ts     — NEW
    member-assigned.ts        — NEW
    session-booked.ts         — NEW
    session-cancelled.ts      — NEW
```

---

## Testing

- Unit tests mock `getEmailService()` at the module level in each route test
- Assert the correct email method was called with correct params after the triggering action
- Template tests: pure functions, test subject/html output for each variant (single vs recurring, single vs series)
- No integration tests against real providers — provider implementations are thin wrappers tested manually via Mailtrap in dev

---

## New Packages Required

```bash
pnpm add mailgun.js form-data
pnpm add -D @types/form-data
```
