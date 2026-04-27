# Calendar & Session Scheduling — Design Spec

**Date:** 2026-04-27  
**Status:** Approved  

---

## Overview

A weekly calendar system allowing owners and trainers to schedule training sessions with members. Owners see the entire gym's calendar across all trainers; trainers see only their own members. Members see a simple list of their upcoming sessions. All historical data is preserved permanently.

---

## User Roles & Access

| Role    | View                                   | Can Create / Edit / Cancel         |
|---------|----------------------------------------|------------------------------------|
| Owner   | Full gym — all trainers + all members  | Any session for any trainer/member |
| Trainer | Own members only                       | Sessions for their own members     |
| Member  | List of own upcoming sessions (read-only) | —                               |

---

## UI Design

### Owner / Trainer — Weekly Calendar (`/owner/calendar`, `/trainer/calendar`)

- **Outlook-style 7-column week grid** with time rows on the left (e.g. 06:00–22:00), 30-minute granularity.
- Each session appears as a coloured block spanning its start→end time. Colour encodes the **trainer** (consistent per trainer across the calendar). Group sessions show all member names inside the block but use the trainer's colour.
- Clicking an empty slot opens **Create Session Modal**.
- Clicking an existing session opens **Session Detail / Edit Modal**.
- Navigation: previous/next week arrows + "Today" button.

### Create Session Modal (single-step form)

Fields:
- **Trainer** (Owner only — dropdown of all trainers + self; pre-filled for Trainer)
- **Members** — multi-select chip input (filtered to selected trainer's members); supports 1+ members for group sessions
- **Date** — pre-filled from clicked slot
- **Start Time** / **End Time** — free text with time picker (e.g. 12:00 → 12:30)
- **Repeat** — toggle: `Once` (default) | `Recurring (weekly)`

### Edit / Cancel Recurring Session — Scope Dialog

When editing or cancelling a session that belongs to a recurring series, a scope prompt appears before the action:

- **This occurrence only** — affects only the clicked date
- **This and all future occurrences** — affects clicked date and every subsequent occurrence in the series
- **All occurrences** — affects the entire series (past and future)

Single (non-recurring) sessions skip the scope dialog.

### Member — Schedule List (`/member/schedule`)

- Chronological list of upcoming sessions (status = `scheduled`).
- Each row shows: date, day of week, time range, trainer name, other members in group (if any).
- Past sessions shown in a collapsed "History" section below.

---

## Data Model

### `ScheduledSession` (MongoDB collection)

```ts
interface IScheduledSession {
  _id: ObjectId;
  seriesId: ObjectId | null;     // null = one-off; shared value = recurring series
  trainerId: ObjectId;
  memberIds: ObjectId[];         // 1+ members; supports group sessions
  date: Date;                    // UTC midnight of session date
  startTime: string;             // "09:00"
  endTime: string;               // "10:30"
  status: 'scheduled' | 'cancelled';
  reminderSentAt: Date | null;   // set after 24h reminder email is sent
  createdAt: Date;
  updatedAt: Date;
}
```

**Key invariants:**
- Records are **never physically deleted**. Cancellation sets `status: 'cancelled'`.
- Creating a recurring session generates **12 weeks** of individual documents sharing one `seriesId`.
- A **weekly cron job** extends every active series by 1 week to maintain the 12-week rolling window.
- When a member is unassigned from a trainer/owner, they are removed from `memberIds` on all future `scheduled` sessions. If `memberIds` becomes empty after removal, `status` is set to `cancelled`.

---

## API Routes

All routes live under `/api/schedule` and are protected by the existing Auth.js session middleware.

| Method | Path                              | Description                                               |
|--------|-----------------------------------|-----------------------------------------------------------|
| POST   | `/api/schedule`                   | Create session(s). `isRecurring: true` generates 12 weeks |
| GET    | `/api/schedule?start=&end=`       | Fetch sessions in date range (role-filtered)              |
| PATCH  | `/api/schedule/[id]`              | Edit with `scope: 'one' \| 'future' \| 'all'`            |
| DELETE | `/api/schedule/[id]`              | Cancel with `scope: 'one' \| 'future' \| 'all'`          |
| GET    | `/api/schedule/member/[memberId]` | Member's session list (upcoming + history)                |

### Role filtering (GET)
- **Owner** — no filter; returns all sessions in range grouped by trainer
- **Trainer** — filtered to `trainerId = session.user.id`
- **Member** — filtered to `memberIds ∋ session.user.id`

### Scope semantics (PATCH / DELETE)
- `one` — update/cancel only the document with the given `_id`
- `future` — update/cancel all documents with matching `seriesId` where `date >= target date`
- `all` — update/cancel all documents with matching `seriesId` (including past records); for edits this updates metadata such as trainer/members/time, but `reminderSentAt` on past records is not cleared

---

## Components

```
src/
  app/
    (dashboard)/
      owner/calendar/
        page.tsx                    # Owner calendar page (server component)
        _components/
          week-calendar.tsx         # 7-col grid shell + navigation
      trainer/calendar/
        page.tsx                    # Trainer calendar page
      member/schedule/
        page.tsx                    # Member list page
        _components/
          member-schedule-list.tsx
  components/
    calendar/
      week-calendar-grid.tsx        # Core grid renderer (shared owner+trainer)
      session-event-card.tsx        # Coloured event block on grid
      create-session-modal.tsx      # Create form
      edit-session-modal.tsx        # Edit form + scope dialog
      recurring-scope-dialog.tsx    # "This / Future / All" prompt
  lib/
    db/models/
      scheduled-session.model.ts   # Mongoose model
    repositories/
      scheduled-session.repository.ts
    email/
      templates/
        session-reminder.ts        # 24h reminder email template
```

---

## 24-Hour Email Reminder

**Mechanism:** A cron job runs **every hour**. It queries for sessions where:
- `status = 'scheduled'`
- `date` is within the next 24–25 hours (rolling 1-hour window)
- `reminderSentAt = null`

For each match, it sends a reminder email to every member in `memberIds` using the existing Nodemailer service (`getEmailService().sendSessionReminder(...)`). After sending, `reminderSentAt` is set to `Date.now()`.

**Email content:**
- Trainer name
- Date and time of session
- Duration
- Other participants (for group sessions)

**Future extensibility:** The `IEmailService` interface will gain a `sendSessionReminder` method. SMS can be added later as an additional implementation without changing callers.

---

## Navigation Updates

Add "Calendar" entry to the sidebar for `owner` and `trainer` roles, and "My Schedule" for `member`:

```
owner:   ADMIN group  → + Calendar  (/owner/calendar)
trainer: MEMBERS group → + Calendar  (/trainer/calendar)
member:  TRAINING group → + My Schedule (/member/schedule)
```

---

## Member Unassign Side Effect

When a member is removed from a trainer (or moved to another trainer) via the existing member management API, a side effect fires:

1. Find all future `scheduled` sessions containing `memberId`.
2. Remove `memberId` from `memberIds`.
3. If `memberIds` is now empty → set `status: 'cancelled'`.

This is implemented as a repository helper called from within the existing unassign logic, keeping the API surface unchanged.

---

## Out of Scope (this iteration)

- SMS notifications
- Member ability to confirm / decline sessions
- iCal / calendar export
- Drag-and-drop rescheduling on the calendar grid
- Timezone support (single-timezone gym assumed)
