# Calendar (Session Scheduling) Implementation Plan

## Goal
Owner and Trainer can view, create (one-off or recurring), edit, and delete scheduled sessions from a Calendar screen in the mobile app; Member continues to see their own upcoming sessions read-only.

## Application
Cross-app: `backend/` (NestJS CRUD endpoints) + `mobile/` (data layer + Calendar screen). No `web/` changes.

## Context — what already exists (do NOT rebuild)
The Member read-only slice is already shipped and must keep passing:
- `backend/` — `GET /scheduled-sessions/my` (member-only) in `scheduled-sessions.controller.ts` + `findForMember` in `scheduled-sessions.service.ts`. Dev seed at `POST /scheduled-sessions/dev/seed`.
- `mobile/` — `MyScheduleScreen`, `scheduled-sessions.store.ts`, `scheduled-sessions.api.ts` (`fetchMySessions`), `types/scheduled-sessions.ts` (`ScheduledSession`).
- Models exist in both `backend/src/common/models/scheduled-session.model.ts` and `web/src/lib/db/models/scheduled-session.model.ts` — **do not modify the schema**.
- `Calendar` nav entry already exists for owner + trainer in `mobile/src/navigation/nav-config.ts`, currently mapped to a placeholder (`CalendarScreen` from `screens/placeholders/index.ts`) in `mobile/src/navigation/index.tsx`.
- `ServiceType` model + `GET /service-types` (owner) + mobile `service-types.api.ts` / `service-types.store.ts` exist and are reused for the session "type" field.

This plan adds the Owner/Trainer management slice on top.

## Key decisions
- **View choice**: scrollable **agenda list grouped by day** (date-section headers), not a month grid. Simpler on mobile, matches existing `MyScheduleScreen` card pattern. Default range = sessions from today forward, plus a "Past" toggle.
- **Role scoping**: Owner sees all sessions in the gym; Trainer sees only sessions where `trainerId === self`. Enforced server-side in the service, mirroring `MembersService.listMembers`.
- **Recurrence model**: a recurring series is N `ScheduledSession` docs sharing one generated `seriesId` (one doc per occurrence). No new schema fields — `seriesId` already exists. Recurrence is weekly on the same weekday/time for a chosen number of weeks (2–12).
- **Edit/delete scope**: when a session belongs to a series (`seriesId != null`), the UI offers "This session only" vs "This and following / whole series". Delete = set `status: 'cancelled'` is NOT used for owner deletes — owner/trainer delete hard-removes the doc(s); `cancelled` status remains a member-facing display state only. (Single source: hard delete keeps the agenda clean.)
- **Time fields** stay strings `HH:MM`; `date` is the day at the session's start (ISO). `endTime` derived from serviceType `durationMin` when a service type is chosen, else entered manually.

## Affected Files

### Stage 1 — backend CRUD (`backend/`)
Create:
- `backend/src/modules/scheduled-sessions/dto/create-session.dto.ts`
- `backend/src/modules/scheduled-sessions/dto/update-session.dto.ts`
- `backend/src/modules/scheduled-sessions/dto/list-sessions.query.ts`
Modify:
- `backend/src/modules/scheduled-sessions/scheduled-sessions.controller.ts` (add owner/trainer routes)
- `backend/src/modules/scheduled-sessions/scheduled-sessions.service.ts` (add list/create/update/delete + series logic + DTO mapping)
- `backend/src/modules/scheduled-sessions/scheduled-sessions.service.spec.ts` (unit)
- `backend/src/modules/scheduled-sessions/scheduled-sessions.controller.spec.ts` (unit)
- `backend/test/scheduled-sessions.e2e-spec.ts` (integration — extend existing file)

### Stage 2 — mobile data layer (`mobile/`)
Create:
- `mobile/src/stores/calendar.store.ts`
- `mobile/src/stores/calendar.store.spec.ts`
Modify:
- `mobile/src/types/scheduled-sessions.ts` (add management types — keep existing `ScheduledSession`)
- `mobile/src/lib/api/scheduled-sessions.api.ts` (add list/create/update/delete functions)
- `mobile/src/lib/api/scheduled-sessions.api.spec.ts` (extend)

### Stage 3 — mobile Calendar screen (`mobile/`)
Create:
- `mobile/src/screens/calendar/CalendarScreen.tsx`
- `mobile/src/screens/calendar/CalendarScreen.spec.tsx`
- `mobile/src/screens/calendar/components/SessionForm.tsx`
- `mobile/src/screens/calendar/components/SessionForm.spec.tsx`
- `mobile/src/screens/calendar/components/AgendaSessionCard.tsx`
- `mobile/src/screens/calendar/components/AgendaSessionCard.spec.tsx`
- `mobile/e2e/owner/calendar.spec.ts`
Modify:
- `mobile/src/navigation/index.tsx` (map `Calendar` → real `CalendarScreen`)
- `mobile/src/screens/placeholders/index.ts` (remove `CalendarScreen` placeholder export)

---

## Data Shapes (DTOs)

**Session response (`SessionDto`) — extend existing**
```ts
{
  _id: string;
  date: string;            // ISO
  startTime: string;       // "HH:MM"
  endTime: string;         // "HH:MM"
  status: 'scheduled' | 'cancelled';
  trainerId: string;       // NEW — needed for trainer ownership in UI
  trainerName: string;
  memberIds: string[];     // NEW
  memberNames: string[];   // NEW
  serviceTypeId: string | null;   // NEW
  serviceTypeName: string | null;
  customServiceName: string | null; // NEW
  seriesId: string | null;  // NEW (replaces relying only on isRecurring)
  isRecurring: boolean;
}
```
(`isRecurring` kept for the member view; new keys are additive — member `/my` response keeps working.)

**`CreateSessionDto`**
```ts
{
  date: string;            // ISO date of first occurrence (required)
  startTime: string;       // "HH:MM" (required, matches /^\d{2}:\d{2}$/)
  endTime: string;         // "HH:MM" (required)
  memberIds: string[];     // required, >= 1
  trainerId?: string;      // owner may assign; trainer ignored → self
  serviceTypeId?: string;  // optional
  customServiceName?: string; // optional
  notes?: string;          // optional (stored? — NO schema field; omit persistence, validate only) → drop
  recurrence?: { weeks: number }; // optional, weeks 2..12 → creates a series
}
```
> Note: schema has no `notes` field — `notes` is OUT of the create DTO. Form has no notes field either (revise scope: drop notes to avoid schema change).

**`UpdateSessionDto`**
```ts
{
  date?: string;
  startTime?: string;
  endTime?: string;
  memberIds?: string[];
  serviceTypeId?: string | null;
  customServiceName?: string | null;
  scope?: 'single' | 'series'; // for series edits; default 'single'
}
```

**List query (`GET /scheduled-sessions`)**
```
?range=upcoming|past   (default upcoming)
```

---

## Stage 1: Backend CRUD + series + role scoping

**Goal**: Owner/Trainer REST endpoints for listing, creating (one-off + series), updating (single/series), and deleting (single/series) scheduled sessions, with role-scoped queries and validation. Member `/my` endpoint untouched.

Endpoints (all under `@UseGuards(JwtAuthGuard, RolesGuard)`):
- `GET  /scheduled-sessions`        `@Roles('owner','trainer')` — list, role-scoped, `?range`
- `POST /scheduled-sessions`        `@Roles('owner','trainer')` — create one-off or series
- `PATCH /scheduled-sessions/:id`   `@Roles('owner','trainer')` — update single or series
- `DELETE /scheduled-sessions/:id?scope=single|series` `@Roles('owner','trainer')` — delete

**Sprint Contract**:

*Unit tests:*
- [ ] `ScheduledSessionsService > listForStaff > owner receives sessions for all trainers`
- [ ] `ScheduledSessionsService > listForStaff > trainer receives only own-trainer sessions`
- [ ] `ScheduledSessionsService > listForStaff > range=upcoming excludes sessions before today; range=past includes them`
- [ ] `ScheduledSessionsService > createSession > one-off creates exactly one doc with seriesId null and resolved trainerId`
- [ ] `ScheduledSessionsService > createSession > recurrence weeks=4 creates 4 docs sharing one seriesId, dates 7 days apart`
- [ ] `ScheduledSessionsService > createSession > trainer caller forces trainerId to self even if body sets another`
- [ ] `ScheduledSessionsService > updateSession > scope=single edits only the targeted doc`
- [ ] `ScheduledSessionsService > updateSession > scope=series edits all docs sharing seriesId`
- [ ] `ScheduledSessionsService > deleteSession > scope=single removes only the targeted doc; scope=series removes all in the series`
- [ ] `ScheduledSessionsService > updateSession > throws NotFoundException when id does not exist`
- [ ] `ScheduledSessionsService > updateSession > trainer throws ForbiddenException editing another trainer's session`
- [ ] `ScheduledSessionsController > create > delegates to service with req.user.sub and role`

*Integration (extend `backend/test/scheduled-sessions.e2e-spec.ts`):*
- [ ] `POST /scheduled-sessions` no token → 401; member token → 403; owner token + valid body → 201 returns SessionDto with `_id`, `seriesId`, `memberNames`
- [ ] `POST /scheduled-sessions` with `recurrence.weeks=3` → `GET /scheduled-sessions` returns 3 docs sharing one `seriesId`
- [ ] `GET /scheduled-sessions` trainer token returns only sessions where `trainerId` is that trainer (seed two trainers, assert isolation)
- [ ] `PATCH /scheduled-sessions/:id?` with `scope=series` updates startTime on all series docs (verify via subsequent GET)
- [ ] `DELETE /scheduled-sessions/:id?scope=single` → 200 and that doc gone, sibling series docs remain
- [ ] `POST /scheduled-sessions` malformed body (missing `memberIds`) → 400

**TDD sequence**:
1. Write failing service unit tests (listForStaff, createSession one-off + series, update, delete, guards) → Red
2. Implement `SessionDto` mapping additions + service methods + series id generation → Green
3. Write failing controller unit tests → implement controller routes → Green
4. Extend integration spec; run `pnpm test:e2e` against real Mongo-memory stack → Green
5. `/simplify` on the diff

**Status**: In Progress

### Stage 1 Checkpoint
- [x] DTOs (create-session.dto.ts, update-session.dto.ts, list-sessions.query.ts)
- [x] Service unit tests → service methods (listForStaff, createSession, updateSession, deleteSession)
- [x] Controller unit tests → controller routes (GET, POST, PATCH, DELETE)
- [x] Integration tests extension

---

## Stage 2: Mobile data layer (API + Zustand store)

**Goal**: Typed API functions and a `calendar.store` that loads staff sessions, groups them by day, and exposes create/update/delete actions with optimistic refetch. Member store/screen untouched.

API functions in `scheduled-sessions.api.ts`:
- `fetchStaffSessions(range: 'upcoming' | 'past'): Promise<StaffSession[]>` → `GET /scheduled-sessions`
- `createSession(dto: CreateSessionInput): Promise<StaffSession>` → `POST`
- `updateSession(id, dto: UpdateSessionInput): Promise<StaffSession>` → `PATCH`
- `deleteSession(id, scope: 'single' | 'series'): Promise<void>` → `DELETE`

Store `calendar.store.ts` shape:
```ts
{
  items: StaffSession[]; loading: boolean; error: string | null; range: 'upcoming'|'past';
  fetch(range?): Promise<void>;
  groupedByDay(): { dateLabel: string; isoDate: string; sessions: StaffSession[] }[];
  create(dto): Promise<void>;   // calls api then re-fetch
  update(id, dto): Promise<void>;
  remove(id, scope): Promise<void>;
}
```

**Sprint Contract**:

*Unit tests:*
- [ ] `calendarApi > fetchStaffSessions > requests /scheduled-sessions with range query and returns parsed array`
- [ ] `calendarApi > createSession > POSTs body and returns created session`
- [ ] `calendarApi > deleteSession > DELETEs /scheduled-sessions/:id with scope query`
- [ ] `useCalendarStore > fetch > populates items and clears loading on success`
- [ ] `useCalendarStore > fetch > sets error and clears loading on failure`
- [ ] `useCalendarStore > groupedByDay > groups sessions under day headers sorted ascending by date`
- [ ] `useCalendarStore > create > calls api.createSession then re-fetches current range`
- [ ] `useCalendarStore > remove > calls api.deleteSession with scope then re-fetches`

*Integration (store + mocked api, no UI):*
- [ ] Calling `fetch('upcoming')` then `groupedByDay()` → returns at least one group whose `sessions` are all on the same `isoDate`
- [ ] `create()` rejection surfaces as `error` string and leaves `items` unchanged

**TDD sequence**:
1. Write failing api unit tests (mock `apiClient`) → implement functions → Green
2. Write failing store unit tests → implement store → Green
3. `/simplify`

**Status**: Not Started

---

## Stage 3: Mobile Calendar screen + form + Detox E2E

**Goal**: Real `CalendarScreen` replacing the placeholder — agenda list grouped by day, upcoming/past toggle, FAB to add, a `SessionForm` bottom-sheet/dialog (member picker, date/time, service type, recurrence weeks), tap-card-to-edit with single/series scope, and delete with single/series confirm Dialog. Owner Detox golden path passes on simulator.

Max units: 1 screen + 2 components = within limit.

**Sprint Contract**:

*Unit tests (RTL):*
- [ ] `CalendarScreen > renders skeleton rows while loading, then day-grouped agenda after fetch`
- [ ] `CalendarScreen > empty upcoming range shows "No upcoming sessions" empty state`
- [ ] `CalendarScreen > tapping the add button opens SessionForm`
- [ ] `CalendarScreen > toggling Past tab calls store.fetch('past')`
- [ ] `SessionForm > save button disabled until at least one member and startTime/endTime are set`
- [ ] `SessionForm > selecting a service type auto-fills endTime from durationMin`
- [ ] `SessionForm > setting recurrence weeks includes recurrence in the submitted payload`
- [ ] `AgendaSessionCard > renders member names, time range, and a recurring badge when seriesId is set`
- [ ] `CalendarScreen > confirming delete on a series session shows single-vs-series choice and calls remove with chosen scope`

*Detox E2E (`mobile/e2e/owner/calendar.spec.ts`) on iOS simulator:*
- [ ] Owner golden path: log in → drawer → Calendar → tap add → fill member + date + time + type → save → new session card visible in agenda
- [ ] Owner edits that session's time → "Changes saved" feedback → updated time visible on the card
- [ ] Owner deletes the session (scope "This session only") → card no longer visible
- [ ] Error case: opening the form and leaving members empty keeps the save button disabled and the form open

**TDD sequence**:
1. Write failing RTL tests for `AgendaSessionCard` → implement → Green
2. Write failing RTL tests for `SessionForm` → implement → Green
3. Write failing RTL tests for `CalendarScreen` → implement; wire store; map screen in `navigation/index.tsx`; remove placeholder export → Green
4. Write `calendar.spec.ts` Detox golden + error path; run against simulator + running backend → Green
5. `/simplify`; then `design-reviewer` on `screens/calendar/`

**Status**: Not Started

---

## Architectural risks / notes
- `SessionDto` gains keys — the member `/my` path returns the same enriched DTO, so member E2E must still pass (additive only). Verify no member regression in Stage 1.
- Series edit/delete with `scope=series` must target by `seriesId`, not by date range, to stay deterministic.
- Detox requires a native build + booted iOS sim + backend with `/auth/dev/seed-user-role` and `/scheduled-sessions/dev/seed` (dev-only) running — same setup as `services.spec.ts`.
- `notes` was dropped from scope because the schema has no field for it; revisit only if a schema migration is approved.
