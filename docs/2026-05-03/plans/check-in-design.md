# Check-In Feature Design

**Date:** 2026-05-03  
**Status:** Approved

---

## Overview

A weekly check-in system for gym members. Trainers set a recurring schedule (e.g., every Thursday at 7am); members receive an email reminder and an in-app badge, then submit a structured check-in form anytime. When a member submits, the trainer receives an email notification. Trainers can view full check-in history per member and compare photos across check-ins.

---

## Data Models

### `CheckInConfig`

One document per member. Created/updated by trainer (or owner).

| Field           | Type              | Notes                                          |
|-----------------|-------------------|------------------------------------------------|
| `memberId`      | `ObjectId`        | ref: User                                      |
| `trainerId`     | `ObjectId`        | ref: User                                      |
| `dayOfWeek`     | `0–6`             | 0 = Sunday                                     |
| `hour`          | `0–23`            |                                                |
| `minute`        | `0–59`            |                                                |
| `active`        | `boolean`         | trainer can disable without deleting           |
| `reminderSentAt`| `Date \| null`    | set by cron; reset each week for deduplication |
| `createdAt`     | `Date`            |                                                |
| `updatedAt`     | `Date`            |                                                |

Index: `{ memberId: 1 }` (unique), `{ dayOfWeek: 1, hour: 1, active: 1, reminderSentAt: 1 }` (cron query).

**Deduplication logic:** After sending a reminder, cron writes `reminderSentAt = now`. On the next cron run, a config is skipped if `reminderSentAt` is within the current ISO week (Monday–Sunday). This mirrors the `ScheduledSession.reminderSentAt` pattern.

### `CheckIn`

One document per submission.

| Field             | Type                         | Notes                          |
|-------------------|------------------------------|--------------------------------|
| `memberId`        | `ObjectId`                   |                                |
| `trainerId`       | `ObjectId`                   |                                |
| `submittedAt`     | `Date`                       |                                |
| `sleepQuality`    | `number` (1–10)              |                                |
| `stress`          | `number` (1–10)              |                                |
| `fatigue`         | `number` (1–10)              |                                |
| `hunger`          | `number` (1–10)              |                                |
| `recovery`        | `number` (1–10)              |                                |
| `energy`          | `number` (1–10)              |                                |
| `digestion`       | `number` (1–10)              |                                |
| `weight`          | `number \| null`             | kg                             |
| `waist`           | `number \| null`             | cm                             |
| `steps`           | `number \| null`             |                                |
| `exerciseMinutes` | `number \| null`             |                                |
| `walkRunDistance` | `number \| null`             | km                             |
| `sleepHours`      | `number \| null`             |                                |
| `dietDetails`     | `string`                     | free text                      |
| `stuckToDiet`     | `'yes' \| 'no' \| 'partial'` |                                |
| `wellbeing`       | `string`                     | free text                      |
| `notes`           | `string`                     | "Anything else?" field         |
| `photos`          | `string[]`                   | Cloudinary public_ids, max 5   |
| `createdAt`       | `Date`                       |                                |

Index: `{ memberId: 1, submittedAt: -1 }` (history list), `{ trainerId: 1, submittedAt: -1 }` (trainer overview).

---

## API & Server Actions

### Server Actions

| Action | Caller | Description |
|--------|--------|-------------|
| `createCheckIn(data)` | Member | Saves submission; sends `sendCheckInReceived` email to trainer |
| `getCheckInSignature()` | Member | Returns Cloudinary signed upload params (server-signed, never exposes API secret to client) |
| `upsertCheckInConfig(memberId, config)` | Trainer / Owner | Creates or updates check-in schedule for a member; validates caller owns the member |

### Route Handlers

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/check-ins` | GET | member or trainer | `?memberId=xxx` — paginated check-in history |
| `/api/check-ins/[id]` | GET | member (own) or trainer | Single check-in detail with photo URLs |
| `/api/check-in-config` | GET | trainer / owner | `?memberId=xxx` — current schedule config |

### Cron Job

**Route:** `GET /api/cron/check-in-reminders`  
**Schedule:** Every hour (same `CRON_SECRET` bearer auth as existing crons)  
**Logic:**
1. Query `CheckInConfig` where `active = true`, `dayOfWeek` matches current UTC day, `hour` matches current UTC hour, and `reminderSentAt` is null or before the start of the current ISO week.
2. For each match, send `sendCheckInReminder` email to the member.
3. Write `reminderSentAt = now`.

---

## Email Integration

Extends `IEmailService` with two new methods:

```typescript
interface SendCheckInReminderParams {
  to: string;
  memberName: string;
  trainerName: string;
  checkInUrl: string;
}

interface SendCheckInReceivedParams {
  to: string;           // trainer's email
  trainerName: string;
  memberName: string;
  submittedAt: string;  // formatted date/time
}
```

Both `NodemailerEmailService` and `MailgunEmailService` implement these methods. Templates follow existing patterns in `src/lib/email/templates/`.

---

## Photo Upload (Cloudinary)

**Flow:**
1. Member opens check-in form → client calls `getCheckInSignature()` server action.
2. Server generates a signed upload signature using `CLOUDINARY_API_SECRET` and returns `{ signature, timestamp, cloudName, apiKey, uploadPreset }`.
3. Client uploads directly to `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` using the signature.
4. On success, Cloudinary returns `public_id`; client stores it and includes it in `createCheckIn(data)`.

**Cloudinary config:**
- Upload preset: restricted (signed uploads only)
- Folder: `power-gym/check-ins/{memberId}/`
- Transformation on fetch: `w_800,c_limit,q_auto` (auto quality, max width 800px for display)

---

## UI Pages

### Member

| Route | Description |
|-------|-------------|
| `(dashboard)/member/check-in/page.tsx` | Check-in submission form (always open) |
| `(dashboard)/member/check-in/history/page.tsx` | Member's own check-in history (read-only list) |

**Form layout (single scrollable page):**
- Section 1: 1–10 rating selectors for Sleep Quality, Stress, Fatigue, Hunger, Recovery, Energy, Digestion (button row, same as sample app)
- Section 2: Number inputs — Weight, Waist, Steps, Exercise Minutes, Walk/Run Distance, Sleep Hours
- Section 3: Text areas — Diet details, Stuck to diet (Yes/Partial/No toggle), Overall wellbeing, Notes
- Section 4: Photo upload (up to 5 images, direct to Cloudinary, preview thumbnails shown)
- Submit button

**In-app badge:** If current user has an active `CheckInConfig` and has not submitted a check-in in the current ISO week, show a notification dot on the "Check-in" nav item.

### Trainer / Owner

| Route | Description |
|-------|-------------|
| `(dashboard)/trainer/members/[id]/check-ins/page.tsx` | Check-in history tab for a specific member |
| `(dashboard)/trainer/members/[id]/check-ins/[checkInId]/page.tsx` | Single check-in detail with photo comparison |
| Member settings page | New "Check-in Schedule" section with day-of-week + time picker |

**Photo comparison (detail page):** Member's photos render in a horizontal scroll strip. Clicking any photo selects it; clicking a second photo opens a side-by-side (split) modal. Only two photos selected at a time; clicking a third deselects the oldest.

---

## Testing Strategy

### Unit / Integration (Jest)

- `CheckInConfigRepository`: findByMember, upsert, findDueForReminder
- `CheckInRepository`: create, findByMember (paginated), findById
- `createCheckIn` server action: happy path, email triggered, unauthorized member rejected
- `upsertCheckInConfig` server action: trainer can only configure own members
- `getCheckInSignature` server action: returns valid Cloudinary signature shape
- Cron handler: matches correct configs, sends reminder, writes `reminderSentAt`, skips already-reminded configs in same week
- `IEmailService` extensions: `sendCheckInReminder` and `sendCheckInReceived` mock tests

### E2E (Playwright)

- Member submits check-in (fill form → upload photo → submit → history page shows new entry)
- Trainer views member check-in list → opens detail → selects two photos for comparison
- Trainer sets check-in schedule → config saved → UI reflects new schedule

### Cloudinary in tests

- Unit tests: mock `getCheckInSignature` to return a fixed payload; mock Cloudinary SDK
- E2E: use a Cloudinary test environment or intercept upload requests at the network level

---

## Out of Scope (this iteration)

- Video uploads (can be added as a follow-on — same pattern, `resource_type: video`)
- Trainer-customizable fields per member
- In-app push notifications (only email + badge dot)
- Check-in editing after submission
