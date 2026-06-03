# My Schedule (Mobile) Implementation Plan

## Goal
A Member can open the My Schedule screen on mobile and see their upcoming scheduled sessions (date, weekday, time range, trainer name, service type) and a section of past sessions — read-only, no create/edit/cancel.

## Application
cross-app: `backend/` (new read-only `scheduled-sessions` module) + `mobile/` (data layer + screen). No `web/` changes.

## Scope
**In scope:**
- A new NestJS `scheduled-sessions` module exposing `GET /scheduled-sessions/my` for the Member role (JWT + RolesGuard), returning the member's sessions with trainer name and service type name resolved, split-able into upcoming/past by the client.
- A dev/test-only seed endpoint in the same module (`POST /scheduled-sessions/dev/seed`, NODE_ENV !== 'production' only) so the Detox E2E can create real sessions for the logged-in member. Mirrors the existing `auth/dev` pattern.
- Mobile types, API client function, and a Zustand store for scheduled sessions.
- A real `MyScheduleScreen` replacing the placeholder, with an "Upcoming" section (sorted date asc) and a "Past" section (sorted date desc), each with its own empty state. Session card shows: weekday + date, time range, trainer name, service type / custom service name (when set).
- Detox E2E spec for the Member My Schedule flow.

**Out of scope:**
- Any create / edit / cancel / reschedule UI or endpoints (that is the Calendar feature, Phase 3 #13, Owner/Trainer only).
- Recurring-series management, reminders, fees, payments.
- Owner/Trainer access to this endpoint or screen.
- Web (`web/`) changes — the web schedule already exists and is untouched.

## Module reuse note (Phase 3 Calendar)
The `scheduled-sessions` backend module is intentionally created as the shared home for all session endpoints. Phase 3's Calendar plan will add `POST` / `PATCH` / `DELETE` (Owner/Trainer) endpoints to **this same module** — the controller, service, and module wiring must be structured so those can be added without restructuring. Do not name anything "member-only" at the module/service level; member scoping lives only in the `/my` route handler and a dedicated service method.

## Affected Files

### Stage 1 — Backend module (read-only)
Created:
- `backend/src/modules/scheduled-sessions/scheduled-sessions.module.ts`
- `backend/src/modules/scheduled-sessions/scheduled-sessions.controller.ts`
- `backend/src/modules/scheduled-sessions/scheduled-sessions.service.ts`
- `backend/src/modules/scheduled-sessions/scheduled-sessions.controller.spec.ts`
- `backend/src/modules/scheduled-sessions/scheduled-sessions.service.spec.ts`
- `backend/src/modules/scheduled-sessions/scheduled-sessions.dev.controller.ts` (dev/test-only seed)
- `backend/src/modules/scheduled-sessions/dto/seed-sessions.dto.ts`
- `backend/test/scheduled-sessions.e2e-spec.ts`
Modified:
- `backend/src/app.module.ts` (register `ScheduledSessionsModule`)

Reused (not modified): `backend/src/common/models/scheduled-session.model.ts`, `backend/src/common/models/user.model.ts`, `backend/src/common/models/service-type.model.ts`, `backend/src/common/guards/{jwt-auth,roles}.guard.ts`, `backend/src/common/decorators/roles.decorator.ts`.

### Stage 2 — Mobile data layer
Created:
- `mobile/src/types/scheduled-sessions.ts`
- `mobile/src/lib/api/scheduled-sessions.api.ts`
- `mobile/src/stores/scheduled-sessions.store.ts`
- `mobile/src/stores/scheduled-sessions.store.spec.ts`
Reused (not modified): `mobile/src/lib/api/client.ts`.

### Stage 3 — Mobile screen + Detox E2E
Created:
- `mobile/src/screens/my-schedule/MyScheduleScreen.tsx`
- `mobile/src/screens/my-schedule/components/SessionCard.tsx`
- `mobile/src/screens/my-schedule/components/SessionCard.spec.tsx`
- `mobile/src/screens/my-schedule/MyScheduleScreen.spec.tsx`
- `mobile/e2e/member/my-schedule.spec.ts`
Modified:
- `mobile/src/navigation/index.tsx` (import real `MyScheduleScreen`, register in `SCREEN_REGISTRY`)
- `mobile/src/screens/placeholders/index.ts` (remove the `MyScheduleScreen` placeholder export)

---

## Stage 1: Backend `scheduled-sessions` module (read-only)

**Goal**: A logged-in Member can call `GET /scheduled-sessions/my` and receive their sessions, each enriched with `trainerName` and `serviceTypeName`, sorted by date ascending. A dev-only seed endpoint lets E2E/tests create sessions. The module is wired so Calendar can later add write endpoints.

**Endpoint contract — `GET /scheduled-sessions/my`** (JWT + Member role):
- Returns sessions where `req.user.sub` is in `memberIds`.
- Each item DTO shape:
  ```
  {
    _id: string,
    date: string (ISO),
    startTime: string ("HH:MM"),
    endTime: string ("HH:MM"),
    status: 'scheduled' | 'cancelled',
    trainerName: string,        // resolved from User.firstName + lastName; 'Trainer' fallback if user missing
    serviceTypeName: string | null,  // ServiceType.name if serviceTypeId set, else customServiceName, else null
    isRecurring: boolean        // seriesId !== null
  }
  ```
- Sorted by `date` ascending (client splits into upcoming/past).

**Dev seed contract — `POST /scheduled-sessions/dev/seed`** (NODE_ENV !== 'production' only; returns 200; throws `ForbiddenException` in production). Body: `{ memberEmail: string, sessions: Array<{ date: string (ISO), startTime: string, endTime: string, trainerEmail?: string, serviceTypeName?: string, customServiceName?: string, status?: 'scheduled'|'cancelled' }> }`. Resolves member by email, optional trainer by email (creates/links if `trainerEmail` given), creates `ScheduledSession` docs with member in `memberIds`. Used only by the E2E spec.

**Sprint Contract**:

*Unit tests:*
- [ ] `ScheduledSessionsService > findForMember > queries sessions where memberIds contains the member id and sorts by date ascending` — asserts the Mongoose `find` filter uses the member ObjectId against `memberIds` and `.sort({ date: 1 })` is applied.
- [ ] `ScheduledSessionsService > findForMember > resolves trainerName from the User model (firstName + lastName)` — given a session whose trainerId maps to a user, the returned DTO `trainerName` equals "First Last".
- [ ] `ScheduledSessionsService > findForMember > falls back to "Trainer" when the trainer user is not found` — returned DTO `trainerName === 'Trainer'`.
- [ ] `ScheduledSessionsService > findForMember > sets serviceTypeName from ServiceType when serviceTypeId is set, else customServiceName, else null` — three branches asserted on the returned DTO.
- [ ] `ScheduledSessionsService > findForMember > sets isRecurring true when seriesId is non-null and false when null` — asserted on returned DTO.
- [ ] `ScheduledSessionsController > findMySessions > passes req.user.sub to service.findForMember and returns its result` — service mocked; asserts call argument and return passthrough.

*Integration (`backend/test/scheduled-sessions.e2e-spec.ts`, real Nest app + mongodb-memory-server, mirroring `check-ins.e2e-spec.ts`):*
- [ ] Member token → `GET /scheduled-sessions/my` returns `200` and an array; after seeding two sessions for that member the array length is `>= 2`, items are ordered by `date` ascending, and each item has `trainerName`, `serviceTypeName` (or null), and `isRecurring` keys.
- [ ] Auth/role guards: no token → `401`; owner token → `403`; member token belonging to a different member does NOT receive the first member's sessions (each member sees only their own).

**TDD sequence**:
1. Write failing service + controller unit specs → Red.
2. Implement `scheduled-sessions.service.ts` (`findForMember`), `scheduled-sessions.controller.ts` (`@Get('my')`, `@Roles('member')`), `scheduled-sessions.dev.controller.ts`, DTO, and `scheduled-sessions.module.ts`; register module in `app.module.ts` → Green.
3. Write `scheduled-sessions.e2e-spec.ts` against the real stack (seed via the dev endpoint) → passes.
4. `/simplify`; ensure `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm build` all pass in `backend/`.

**Status**: In Progress

### Stage 1 Checkpoint
- [x] `scheduled-sessions.service.spec.ts` — unit tests
- [x] `scheduled-sessions.controller.spec.ts` — unit tests
- [x] `scheduled-sessions.service.ts`
- [x] `scheduled-sessions.controller.ts`
- [x] `scheduled-sessions.dev.controller.ts`
- [x] `dto/seed-sessions.dto.ts`
- [x] `scheduled-sessions.module.ts`
- [x] `app.module.ts` registration
- [x] `backend/test/scheduled-sessions.e2e-spec.ts`

---

## Stage 2: Mobile data layer (types, API, store)

**Goal**: A typed `fetchMySessions()` API call and a `useScheduledSessionsStore` that loads sessions and exposes derived `upcoming` (date asc) and `past` (date desc) lists.

**Type shape (`mobile/src/types/scheduled-sessions.ts`)** — mirrors the backend DTO:
```
export interface ScheduledSession {
  _id: string;
  date: string;            // ISO
  startTime: string;       // "HH:MM"
  endTime: string;         // "HH:MM"
  status: 'scheduled' | 'cancelled';
  trainerName: string;
  serviceTypeName: string | null;
  isRecurring: boolean;
}
```

**Store shape (`useScheduledSessionsStore`)** — follows `check-ins.store.ts` conventions:
- State: `items: ScheduledSession[]`, `loading: boolean`, `error: string | null`.
- `fetchSessions(): Promise<void>` — sets loading, calls API, stores items or sets error message.
- `getUpcoming(now?: Date): ScheduledSession[]` — items with `date >= now` and `status === 'scheduled'`, sorted date ascending.
- `getPast(now?: Date): ScheduledSession[]` — items with `date < now` OR `status === 'cancelled'`, sorted date descending.

**Sprint Contract**:

*Unit tests (`scheduled-sessions.store.spec.ts`, API mocked):*
- [ ] `useScheduledSessionsStore > fetchSessions > populates items and clears loading on success` — after resolve, `items.length` matches mock and `loading === false`, `error === null`.
- [ ] `useScheduledSessionsStore > fetchSessions > sets error message and clears loading on failure` — API rejects → `error` is the message string and `loading === false`, `items` unchanged.
- [ ] `useScheduledSessionsStore > getUpcoming > returns only future scheduled sessions sorted ascending by date` — given a mix of past/future/cancelled items and a fixed `now`, asserts the exact filtered+ordered ids.
- [ ] `useScheduledSessionsStore > getPast > returns past or cancelled sessions sorted descending by date` — given the same mix and fixed `now`, asserts the exact filtered+ordered ids (a cancelled future session is included in past).

*Integration:*
- [ ] `fetchMySessions` (`scheduled-sessions.api.ts`) calls `apiClient.get('/scheduled-sessions/my')` and returns `response.data` — verified via a mocked `apiClient` asserting the exact path and the returned array.
- [ ] Store + API together: with `apiClient.get` mocked to resolve a fixture array, calling `store.fetchSessions()` results in `getUpcoming`/`getPast` partitioning the fixture correctly against a fixed `now` (end-to-end through the real store + real api function, only the http client mocked).

**TDD sequence**:
1. Write failing store + api specs → Red.
2. Implement `scheduled-sessions.ts` types, `scheduled-sessions.api.ts`, `scheduled-sessions.store.ts` → Green.
3. `/simplify`; ensure `cd mobile && pnpm test` and `pnpm lint` pass.

**Status**: Not Started

---

## Stage 3: Mobile `MyScheduleScreen` + Detox E2E

**Goal**: The Member drawer item "My Schedule" opens a real screen showing an Upcoming section and a Past section of session cards, each with empty states; verified by a Detox spec against the real backend.

**Screen behavior**:
- Header matches the standard mobile header pattern ("My Schedule" + subtitle = upcoming count).
- On mount, calls `store.fetchSessions()`. Loading → Skeleton rows (not a "Loading…" string).
- "Upcoming" section (testID `schedule-upcoming-section`): renders `getUpcoming()` as `SessionCard`s; empty → `schedule-upcoming-empty` ("No upcoming sessions").
- "Past" section (testID `schedule-past-section`): renders `getPast()` as `SessionCard`s; empty → `schedule-past-empty` ("No past sessions").
- `SessionCard` (testID `session-card-<_id>`): weekday + date label, `startTime – endTime`, `trainerName`, and `serviceTypeName` when non-null. Horizontal-dense layout per design (`flex-row items-center justify-between`, `px-3 py-2`).
- Replace the placeholder export and wire the real screen into `SCREEN_REGISTRY`.

**Sprint Contract**:

*Unit tests (React Native Testing Library):*
- [ ] `SessionCard > renders weekday/date, time range, and trainer name from props` — asserts the formatted weekday+date string, `"09:00 – 10:00"`, and trainer name are present.
- [ ] `SessionCard > renders serviceTypeName when provided and omits it when null` — service name visible when set; not rendered when null.
- [ ] `MyScheduleScreen > calls fetchSessions on mount` — store's `fetchSessions` mock called once on render.
- [ ] `MyScheduleScreen > renders upcoming empty state when getUpcoming returns []` — `schedule-upcoming-empty` present.
- [ ] `MyScheduleScreen > renders a SessionCard for each upcoming and each past session` — given a mocked store with N upcoming + M past, asserts N+M `session-card-*` testIDs render in the correct sections.

*E2E (`mobile/e2e/member/my-schedule.spec.ts`, Detox; seeds via `POST /scheduled-sessions/dev/seed`):*
- [ ] Golden path: seed one future and one past session for the member → log in as member → open drawer → tap `drawer-item-MySchedule` → `screen-MySchedule` visible → the seeded future session's trainer name/time is visible in the Upcoming section, and the seeded past session is visible in the Past section.
- [ ] Empty-state case: seed a member with zero sessions → open My Schedule → `schedule-upcoming-empty` and `schedule-past-empty` are both visible.

**TDD sequence**:
1. Write failing RNTL specs for `SessionCard` and `MyScheduleScreen` (store mocked) → Red.
2. Implement `SessionCard`, `MyScheduleScreen`; update `navigation/index.tsx` and remove the placeholder export → Green.
3. Write `my-schedule.spec.ts` Detox spec; run against a booted simulator + running backend → passes.
4. `/simplify`; run design-reviewer on `mobile/src/screens/my-schedule/`; ensure `cd mobile && pnpm test` and `pnpm lint` pass and the Detox spec passes.

**Status**: Not Started
