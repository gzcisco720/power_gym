# Sprint 6: Mobile Feature Parity Implementation Plan

## Goal
A Trainer or Owner using the mobile app can view a member's check-in photo gallery, see their own personal-training sessions on a calendar, and open a completed personal-training session to review its full detail — closing the three confirmed gaps between mobile and the reference web app.

## Application
cross-app — `backend/` (NestJS API) + `mobile/` (React Native + Expo). No `web/` changes; web is the reference implementation only.

## Architectural Context & Decisions

Read before implementing:
- `backend/src/modules/training/training.service.ts` — all session methods are scoped to `@Roles('member')` or to a *target* member (trainer-for-member flows). There is **no** "self" personal-training surface for owner/trainer, and **no** `SelfWorkoutLog` model in `backend/`.
- `backend/src/modules/check-ins/check-ins.controller.ts` — already exposes `GET /check-ins/members/:memberId` (scoped to owner/trainer) and `GET /check-ins/members/:memberId/:id`. The check-in model (`backend/src/common/models/check-in.model.ts`) stores `photos: string[]` and `weight: number | null`.
- `web/src/app/(dashboard)/trainer/members/[id]/photos/page.tsx` + `_components/photos-client.tsx` — the photo gallery flattens every check-in's `photos[]` into one item per URL, carrying `submittedAt` and `weight`. Mobile mirrors the **gallery + tap-for-context** behavior. The web compare/select mode is **out of scope** for mobile this sprint.
- `web/src/components/self-tracking/*` — the web self-training calendar and session detail read from a dedicated `SelfWorkoutLog` collection via `/api/me/workout-logs` and `/range`.

**Decision — self-training data source (Features 2 & 3):** The `backend/` has no self-tracking collection. Rather than introduce a new Mongoose model this sprint, owner/trainer personal-training sessions are stored in the existing `WorkoutSession` collection keyed by the **caller's own user id** as `memberId` (the caller logs their own personal sessions against themselves). This reuses `WorkoutSession`, matches the web's self-log *shape* (`dayName`, `startedAt`, `completedAt`, `sets`, `rpe`), and lets Feature 2 (calendar) and Feature 3 (history/detail) share **one** data source — exactly as the web does. Both features read the same `self/sessions` endpoint; the calendar groups completed sessions by `completedAt` date, the history lists them, and detail fetches one by id.

**Decision — calendar semantics (Feature 2):** The reference web "self training calendar" shows **completed personal-training session logs** by date (a dot per day with a logged session), NOT scheduled-session bookings. The existing mobile `calendar.store` fetches `StaffSession[]` (scheduled bookings where members are participants) and is **not** the right source. Feature 2 therefore reads the new self-session endpoint, not `calendar.store`. `calendar.store` is left untouched.

**Store strategy:**
- Feature 1: extend existing `members.store` is **not** used for photos — add a **new** `member-photos.store.ts` (photos are fetched independently of the member-detail bundle and only when the Photos tab opens).
- Features 2 & 3: add a **new** `self-training.store.ts`. Do **not** extend `training.store.ts` (that store is member-self plan logging + trainer-for-member logging; self personal-training history is a distinct concern). Do **not** reuse `calendar.store.ts`.

## Scope

**In scope:**
- Backend: `GET /check-ins/members/:memberId/photos` returning flattened photo items.
- Backend: `GET /training/self/sessions` (list caller's own completed personal-training sessions) and `GET /training/self/sessions/:id` (one session, full detail), both `@Roles('owner', 'trainer')`.
- Mobile: a **Photos** tab in `MemberDetailScreen` (8th tab) with a grid gallery + tap-to-view-context modal.
- Mobile: a **Calendar** view on `MyTrainingScreen` showing the caller's own completed self-sessions by date, with month navigation.
- Mobile: a **History** list on `MyTrainingScreen` + a new `SelfSessionDetailScreen` showing date, exercises, sets/reps/weights, notes, completion status.
- Detox E2E specs for all three flows.

**Out of scope:**
- Web photo **compare/select-two** mode on mobile (gallery + single-photo context only).
- Creating/logging *new* owner/trainer personal-training sessions on mobile (this sprint is read/parity for history + calendar + photos; the logging flow is a separate future sprint).
- Any new Mongoose model (`SelfWorkoutLog`) — reuse `WorkoutSession`.
- Editing or deleting photos or sessions.
- `web/` changes of any kind.

## Affected Files

**Backend (Feature 1):**
- `backend/src/modules/check-ins/check-ins.controller.ts` — add `GET members/:memberId/photos` (modify)
- `backend/src/modules/check-ins/check-ins.service.ts` — add `findPhotosForMemberScoped` (modify)
- `backend/src/modules/check-ins/check-ins.service.spec.ts` — unit tests (modify)
- `backend/src/modules/check-ins/check-ins.controller.spec.ts` — unit tests (modify)
- `backend/test/check-ins.e2e-spec.ts` — integration tests (create or modify)

**Backend (Features 2 & 3):**
- `backend/src/modules/training/training.controller.ts` — add `GET self/sessions`, `GET self/sessions/:id` (modify)
- `backend/src/modules/training/training.service.ts` — add `getSelfSessions`, `getSelfSession` (modify)
- `backend/src/modules/training/training.service.spec.ts` — unit tests (modify)
- `backend/src/modules/training/training.controller.spec.ts` — unit tests (modify)
- `backend/test/training.e2e-spec.ts` — integration tests (create or modify)

**Mobile (Feature 1):**
- `mobile/src/types/check-ins.ts` — add `MemberPhoto` interface (modify)
- `mobile/src/lib/api/check-ins.api.ts` — add `fetchMemberPhotos` (modify)
- `mobile/src/stores/member-photos.store.ts` — new store (create)
- `mobile/src/stores/member-photos.store.spec.ts` — store unit tests (create)
- `mobile/src/screens/members/tabs/MemberPhotosTab.tsx` — new tab component (create)
- `mobile/src/screens/members/tabs/MemberPhotosTab.spec.tsx` — unit tests (create)
- `mobile/src/screens/members/MemberDetailScreen.tsx` — register Photos tab (modify)
- `mobile/e2e/trainer/member-photos.spec.ts` — Detox spec (create)

**Mobile (Features 2 & 3):**
- `mobile/src/types/training.ts` — add `SelfSessionSummary` interface (modify)
- `mobile/src/lib/api/training.api.ts` — add `fetchSelfSessions`, `fetchSelfSession` (modify)
- `mobile/src/lib/api/training.api.spec.ts` — api unit tests (modify)
- `mobile/src/stores/self-training.store.ts` — new store (create)
- `mobile/src/stores/self-training.store.spec.ts` — store unit tests (create)
- `mobile/src/screens/my-training/MyTrainingScreen.tsx` — add Calendar / History view switch (modify)
- `mobile/src/screens/my-training/MyTrainingScreen.spec.tsx` — unit tests (modify)
- `mobile/src/screens/my-training/SelfWorkoutCalendar.tsx` — new month-grid calendar component (create)
- `mobile/src/screens/my-training/SelfWorkoutCalendar.spec.tsx` — unit tests (create)
- `mobile/src/screens/my-training/SelfSessionDetailScreen.tsx` — new detail screen (create)
- `mobile/src/screens/my-training/SelfSessionDetailScreen.spec.tsx` — unit tests (create)
- `mobile/src/navigation/index.tsx` — register `SelfSessionDetail` route + param (modify)
- `mobile/src/navigation/nav-config.ts` — register route if nav config gates routes (modify if needed)
- `mobile/e2e/trainer/self-training-history.spec.ts` — Detox spec (create)

---

## Stage 1: Backend — Member Photos Endpoint

**Goal**: `GET /check-ins/members/:memberId/photos` returns every photo across a member's check-ins, flattened to one item per URL, scoped so a trainer only sees their own members and an owner sees all. Returns `[]` when there are none.

Response item shape (mirrors web `PhotoItem`):
```ts
{ key: string; photoUrl: string; submittedAt: string /* ISO */; weight: number | null }
```
Ordered newest-first by `submittedAt`. `key` = `${checkInId}-${photoIndex}`.

**Sprint Contract**:

*Unit tests:*
- [ ] `CheckInsService > findPhotosForMemberScoped > flattens each check-in's photos[] into one item per URL with key, photoUrl, submittedAt, and weight`
- [ ] `CheckInsService > findPhotosForMemberScoped > returns items ordered newest-first by submittedAt`
- [ ] `CheckInsService > findPhotosForMemberScoped > excludes check-ins with an empty photos array`
- [ ] `CheckInsService > findPhotosForMemberScoped > throws NotFoundException when a trainer requests a member not assigned to them`
- [ ] `CheckInsService > findPhotosForMemberScoped > returns [] when the member has check-ins but none contain photos`
- [ ] `CheckInsController > findMemberPhotos > delegates to service with memberId, caller id, and caller role`

*Integration (`backend/test/check-ins.e2e-spec.ts`):*
- [ ] `GET /check-ins/members/:memberId/photos` as the member's trainer → 200 with a flattened array whose first item is the newest photo
- [ ] `GET /check-ins/members/:memberId/photos` with no JWT → 401
- [ ] `GET /check-ins/members/:memberId/photos` as a `member` role → 403
- [ ] `GET /check-ins/members/:memberId/photos` as a trainer for a member not assigned to them → 404

**TDD sequence**:
1. Write failing service unit tests (scoping, flatten, ordering, empty) → Red
2. Implement `findPhotosForMemberScoped` reusing the existing member-scoping helper used by `findByMemberScoped` → Green
3. Write failing controller unit test → implement `@Get('members/:memberId/photos')` `@Roles('owner','trainer')` → Green
4. Write/extend integration spec covering 200/401/403/404 → passes against the real Nest test stack

**Status**: Complete

### Stage 1 Checkpoint
- [x] `CheckInsService > findPhotosForMemberScoped` unit tests
- [x] `CheckInsController > findMemberPhotos` unit test
- [x] `GET /check-ins/members/:memberId/photos` integration tests

---

## Stage 2: Mobile — Member Photos Gallery Tab

**Goal**: `MemberDetailScreen` gains an 8th **Photos** tab (Trainer + Owner). Opening it fetches the member's photos via a new `member-photos.store`, renders them in a grid with the date overlaid, shows an empty state when there are none, and opens a modal with the photo + date + weight (when present) on tap.

**Sprint Contract**:

*Unit tests:*
- [ ] `useMemberPhotosStore > fetchPhotos > populates photos[memberId] and sets loading false on success`
- [ ] `useMemberPhotosStore > fetchPhotos > sets error and clears loading when the api call rejects`
- [ ] `MemberPhotosTab > renders one image per photo item with an accessible date label`
- [ ] `MemberPhotosTab > shows the "No photos yet" empty state when the photo list is empty`
- [ ] `MemberPhotosTab > tapping a photo opens the context modal showing its date and weight`
- [ ] `MemberDetailScreen > renders the Photos tab button and shows MemberPhotosTab content when it is selected`

*E2E (`mobile/e2e/trainer/member-photos.spec.ts`):*
- [ ] Trainer opens a member detail, taps the "Photos" tab → the photo grid renders with at least one photo
- [ ] Trainer taps a photo → a modal appears showing the check-in date (and weight when recorded); tapping close dismisses it
- [ ] Trainer opens the Photos tab for a member with no check-in photos → the "No photos yet" empty state is shown

**TDD sequence**:
1. Write failing store unit tests → implement `member-photos.store.ts` + `fetchMemberPhotos` api → Green
2. Write failing `MemberPhotosTab` unit tests (grid, empty state, tap-modal) → implement component per `design.md` density + token rules → Green
3. Wire the tab into `MemberDetailScreen` `TABS` array + render branch; write failing screen unit test → Green
4. Write Detox spec; build + run against the simulator → passes

**Status**: Complete

### Stage 2 Checkpoint
- [x] `useMemberPhotosStore > fetchPhotos` unit tests
- [x] `MemberPhotosTab` unit tests (grid, empty state, tap-modal)
- [x] `MemberDetailScreen` Photos tab unit test
- [x] `mobile/e2e/trainer/member-photos.spec.ts` Detox E2E spec

---

## Stage 3: Backend — Self Personal-Training Sessions Endpoints

**Goal**: Two new endpoints, both `@Roles('owner', 'trainer')`, reading the caller's own completed personal-training sessions from `WorkoutSession` keyed by the caller's id as `memberId`:
- `GET /training/self/sessions` → list of summaries, newest-first by `completedAt`, completed only.
- `GET /training/self/sessions/:id` → one session with full `sets` detail; 404 if not found or not owned by the caller.

Summary shape:
```ts
{ _id: string; dayName: string; startedAt: string; completedAt: string; setCount: number; rpe: number | null }
```

**Sprint Contract**:

*Unit tests:*
- [x] `TrainingService > getSelfSessions > returns only sessions where memberId equals the caller id and completedAt is not null`
- [x] `TrainingService > getSelfSessions > orders results newest-first by completedAt`
- [x] `TrainingService > getSelfSessions > returns [] when the caller has no completed sessions`
- [x] `TrainingService > getSelfSession > returns the full session including its sets array for a session owned by the caller`
- [x] `TrainingService > getSelfSession > throws NotFoundException when the session belongs to a different user`
- [x] `TrainingController > getSelfSessions > delegates to service with the caller id from the JWT`
- [x] `TrainingController > getSelfSession > delegates to service with session id and caller id`

*Integration (`backend/test/training.e2e-spec.ts`):*
- [x] `GET /training/self/sessions` as a trainer with one completed self-session → 200 with a one-element summary array
- [x] `GET /training/self/sessions/:id` as the owning trainer → 200 with the full sets array
- [x] `GET /training/self/sessions` with no JWT → 401
- [x] `GET /training/self/sessions` as a `member` role → 403
- [x] `GET /training/self/sessions/:id` for a session owned by another user → 404

**TDD sequence**:
1. Write failing service unit tests for `getSelfSessions` / `getSelfSession` → Red
2. Implement both service methods (query `WorkoutSession` by `memberId: callerId`, `completedAt != null`; detail enforces ownership) → Green
3. Write failing controller unit tests → add `@Get('self/sessions')` and `@Get('self/sessions/:id')` `@Roles('owner','trainer')`. Order routes so `self/sessions` is declared before `members/:memberId/...` to avoid param-route shadowing → Green
4. Write/extend integration spec covering 200/401/403/404 → passes against the real Nest test stack

**Status**: Complete

### Stage 3 Checkpoint
- [x] `TrainingService > getSelfSessions` unit tests
- [x] `TrainingService > getSelfSession` unit tests
- [x] `TrainingController > getSelfSessions` unit test
- [x] `TrainingController > getSelfSession` unit test
- [x] `GET /training/self/sessions` integration tests
- [x] `GET /training/self/sessions/:id` integration tests

---

## Stage 4: Mobile — Self-Training Calendar View

**Goal**: `MyTrainingScreen` gains a segmented view switch (e.g. **Plan** / **Calendar** / **History**). The Calendar view uses a new `self-training.store` to fetch the caller's completed self-sessions, renders a month grid (`SelfWorkoutCalendar`) marking days that have a session, supports previous/next month navigation, and tapping a marked day navigates to that session's detail.

**Sprint Contract**:

*Unit tests:*
- [ ] `useSelfTrainingStore > fetchSessions > populates sessions and clears loading on success`
- [ ] `useSelfTrainingStore > fetchSessions > sets error and clears loading when the api rejects`
- [ ] `SelfWorkoutCalendar > marks a day as having a session when a session's completedAt falls on that day of the displayed month`
- [ ] `SelfWorkoutCalendar > advancing the month with the next-month control re-derives marked days for the new month`
- [ ] `SelfWorkoutCalendar > tapping a marked day invokes onSelect with that day's session`
- [ ] `MyTrainingScreen > selecting the Calendar view renders the SelfWorkoutCalendar`

*E2E (`mobile/e2e/trainer/self-training-history.spec.ts` — calendar portion):*
- [ ] Trainer opens My Training, switches to the "Calendar" view → the month grid renders with at least one marked training day
- [ ] Trainer taps a marked day → navigates to the self session detail screen showing that session's day name

**TDD sequence**:
1. Write failing store unit tests → implement `self-training.store.ts` + `fetchSelfSessions` api → Green
2. Write failing `SelfWorkoutCalendar` unit tests (marking, month-nav, onSelect) → implement the month-grid component per `design.md` mobile tokens → Green
3. Add the view switch to `MyTrainingScreen`; write failing screen unit test → Green
4. Extend the Detox spec with the calendar flow; build + run against the simulator → passes

**Status**: Complete

### Stage 4 Checkpoint
- [x] `useSelfTrainingStore > fetchSessions` unit tests
- [x] `useSelfTrainingStore > fetchSessions > sets error on reject` unit test
- [x] `SelfWorkoutCalendar > marks a day` unit test
- [x] `SelfWorkoutCalendar > advancing month re-derives marked days` unit test
- [x] `SelfWorkoutCalendar > tapping marked day invokes onSelect` unit test
- [x] `MyTrainingScreen > selecting Calendar view renders SelfWorkoutCalendar` unit test
- [x] `mobile/e2e/trainer/self-training-history.spec.ts` Detox E2E spec (calendar portion)

---

## Stage 5: Mobile — Self Session History List & Detail Screen

**Goal**: The **History** view on `MyTrainingScreen` lists the caller's completed self-sessions (date, day name, set count) newest-first, with an empty state when there are none. Tapping a row navigates to a new `SelfSessionDetailScreen` that fetches the session by id and shows date, completion status, each exercise grouped with its sets (reps/weight), and the session note when present.

**Sprint Contract**:

*Unit tests:*
- [ ] `useSelfTrainingStore > fetchSession > populates selectedSession with the fetched detail and clears loading`
- [ ] `useSelfTrainingStore > fetchSession > sets error and clears loading when the api rejects`
- [ ] `MyTrainingScreen > the History view renders one row per completed self-session with its day name and date`
- [ ] `MyTrainingScreen > the History view shows the "No sessions yet" empty state when there are no completed sessions`
- [ ] `SelfSessionDetailScreen > renders each exercise grouped with its logged sets showing reps and weight`
- [ ] `SelfSessionDetailScreen > shows the completion status and the session note when present`

*E2E (`mobile/e2e/trainer/self-training-history.spec.ts` — history portion):*
- [ ] Trainer opens My Training, switches to "History" → a list of past sessions renders with at least one row
- [ ] Trainer taps a session row → the detail screen opens showing the day name, at least one exercise, and its logged set values
- [ ] Trainer opens History for an account with no completed self-sessions → the "No sessions yet" empty state is shown

**TDD sequence**:
1. Write failing store unit test for `fetchSession` → implement `fetchSelfSession` api + store method → Green
2. Write failing `MyTrainingScreen` History-view unit tests (list rows, empty state) → implement the History branch → Green
3. Write failing `SelfSessionDetailScreen` unit tests (grouped sets, status, note) → implement the screen + register the `SelfSessionDetail` route in `navigation/index.tsx` → Green
4. Complete the Detox spec history + detail flow; build + run against the simulator → passes

**Status**: Complete

### Stage 5 Checkpoint
- [x] `useSelfTrainingStore > fetchSession` unit tests (pre-existing from Stage 4)
- [x] `MyTrainingScreen > History view renders one row per completed self-session with its day name and date`
- [x] `MyTrainingScreen > History view shows "No sessions yet" empty state when there are no completed sessions`
- [x] `SelfSessionDetailScreen > renders each exercise grouped with its logged sets showing reps and weight`
- [x] `SelfSessionDetailScreen > shows the completion status and the session note when present`
- [x] `SelfSessionDetail` route registered in `navigation/index.tsx`
- [x] `handleSessionSelect` wired in `MyTrainingScreen` to navigate to `SelfSessionDetail`
- [x] `mobile/e2e/trainer/self-training-history.spec.ts` updated with history + detail E2E flows
