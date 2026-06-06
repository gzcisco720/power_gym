# Trainer Log for Member Implementation Plan

## Goal
A trainer (or owner) can open one of their members, see the member's active training plan, tap "Log Session", and log a full workout session (sets + finish) on behalf of that member using their own trainer auth.

## Application
cross-app: `backend/` (NestJS training endpoints) + `mobile/` (React Native trainer log flow). No `web/` changes.

## Scope
**In scope:**
- 4 new trainer/owner-scoped training endpoints on the existing `training` module:
  - `GET /training/members/:memberId/plan`
  - `POST /training/members/:memberId/sessions`
  - `PATCH /training/members/:memberId/sessions/:id/sets`
  - `POST /training/members/:memberId/sessions/:id/finish`
- Scoping: trainer may only access members assigned to them; owner may access any member in the gym; both reuse the existing member-resolution pattern in `TrainingService.getHistory`/`assignPlan`.
- Trainer-logged sessions set `WorkoutSession.loggedBy` to the caller's user id (member-self sessions leave it `null`).
- Mobile training store extended with trainer-log actions and trainer-scoped session state (kept separate from the member's own `activeSession`).
- New mobile API client functions for the 4 endpoints.
- `MemberTrainingTab` fetches the member's active plan and shows a "Log Session" button (with a day picker) when a plan exists.
- New `TrainerWorkoutSessionScreen` stack screen mirroring `WorkoutSessionScreen` UX but trainer-scoped, receiving `memberId` + `memberName`.
- Detox E2E: trainer logs a full session for a member end-to-end.

**Out of scope:**
- Any change to the existing member-only endpoints (`/training/my-plan`, `/training/sessions`, `/training/sessions/:id/sets`, `/training/sessions/:id/finish`) or `WorkoutSessionScreen`.
- RPE / member note / extra-set / auto-seal logic (not part of the existing log flow being mirrored).
- Editing or deleting already-finished sessions.
- Any `web/` work, Member Progress / Check-ins tabs (separate sprints).
- Reusing `WorkoutSessionScreen` — `TrainerWorkoutSessionScreen` is a distinct screen per the design decision.

## Affected Files

**Backend — create:**
- `backend/src/modules/training/dto/` — no new DTO files needed; reuse `start-session.dto.ts` and `patch-set.dto.ts`.

**Backend — modify:**
- `backend/src/modules/training/training.controller.ts` — add 4 `@Roles('owner','trainer')` endpoints.
- `backend/src/modules/training/training.service.ts` — add `getMemberPlan`, `startMemberSession`, `patchMemberSet`, `finishMemberSession` (each scoped via member resolution + caller id/role); set `loggedBy` on trainer-started sessions.
- `backend/src/modules/training/training.service.spec.ts` — unit tests for new methods.
- `backend/src/modules/training/training.controller.spec.ts` — controller delegation tests for new endpoints.
- `backend/test/training.e2e-spec.ts` — integration tests for the 4 endpoints (already seeds owner/trainer/other-trainer/member/other-member).

**Mobile — create:**
- `mobile/src/screens/my-training/TrainerWorkoutSessionScreen.tsx` — new stack screen.
- `mobile/__tests__/stores/training.store.test.ts` — unit tests for new store actions (store currently has no test file).
- `mobile/e2e/trainer/trainer-log.spec.ts` — Detox spec.

**Mobile — modify:**
- `mobile/src/types/training.ts` — add trainer-log input/types as needed (reuse existing `WorkoutSession`, `PatchSetInput`, `ActivePlan`).
- `mobile/src/lib/api/training.api.ts` — add `fetchMemberPlan`, `startMemberSession`, `patchMemberSet`, `finishMemberSession`.
- `mobile/src/stores/training.store.ts` — add trainer-log state + actions.
- `mobile/src/screens/members/tabs/MemberTrainingTab.tsx` — fetch member plan, add "Log Session" button + day selection, navigate to `TrainerWorkoutSession`.
- `mobile/src/navigation/index.tsx` — add `TrainerWorkoutSession: { memberId: string; memberName: string }` to `AppStackParamList`, register the screen.

---

## Stage 1: Backend — Trainer-scoped training endpoints

**Goal**: 4 new endpoints under `training` that let an owner/trainer read a member's active plan and start/log/finish a session for that member, scoped so a trainer can only touch their own members and a finished/foreign session is rejected.

**Files to create/modify**:
- Modify `training.service.ts` (add `getMemberPlan`, `startMemberSession`, `patchMemberSet`, `finishMemberSession`)
- Modify `training.controller.ts` (add 4 endpoints, `@Roles('owner','trainer')`)
- Modify `training.service.spec.ts`, `training.controller.spec.ts`, `backend/test/training.e2e-spec.ts`

**Implementation notes**:
- Each service method first resolves the member via `userModel.findById`, rejects non-members with `NotFoundException('Member not found')`, and — when `callerRole === 'trainer'` — rejects members whose `trainerId` !== caller id (mirror `getHistory`).
- `startMemberSession` mirrors `startSession` but additionally sets `loggedBy: new Types.ObjectId(callerId)`.
- `patchMemberSet` / `finishMemberSession` load the session, assert `session.memberId.toString() === memberId`, assert `completedAt === null`, then apply the same mutation as the member versions.

**Sprint Contract**:

*Unit tests (training.service.spec.ts):*
- [x] `TrainingService > getMemberPlan > returns the member's active MemberPlan when caller is the assigned trainer`
- [x] `TrainingService > getMemberPlan > returns null when the member has no active plan`
- [x] `TrainingService > getMemberPlan > throws NotFoundException when trainer is not the member's assigned trainer`
- [x] `TrainingService > startMemberSession > creates a WorkoutSession with one set per prescribed set and sets loggedBy to the caller id`
- [x] `TrainingService > startMemberSession > throws NotFoundException when the member has no active plan`
- [x] `TrainingService > patchMemberSet > updates actualReps/actualWeight/completedAt on the matching set and returns the session`
- [x] `TrainingService > patchMemberSet > throws BadRequestException when the session is already completed`
- [x] `TrainingService > finishMemberSession > sets completedAt and returns the session`
- [x] `TrainingService > finishMemberSession > throws NotFoundException when the session does not belong to the member`

*Unit tests (training.controller.spec.ts):*
- [x] `TrainingController > getMemberPlan > delegates to service with memberId, caller sub and role`
- [x] `TrainingController > startMemberSession > delegates to service with memberId, dto.dayNumber, caller sub and role`
- [x] `TrainingController > finishMemberSession > delegates to service with sessionId, memberId, caller sub and role`

*Integration (backend/test/training.e2e-spec.ts):*
- [x] `GET /training/members/:memberId/plan` as assigned trainer → 200 with the active plan body (name + days)
- [x] `GET /training/members/:memberId/plan` as `member` role → 403 (role guard)
- [x] `GET /training/members/:memberId/plan` as other-trainer (member not theirs) → 404
- [x] `POST /training/members/:memberId/sessions` as assigned trainer with `{ dayNumber: 1 }` → 201 with a WorkoutSession whose `loggedBy` equals the trainer id
- [x] `PATCH /training/members/:memberId/sessions/:id/sets` as assigned trainer with a valid set → 200 and that set has a non-null `completedAt`
- [x] `POST /training/members/:memberId/sessions/:id/finish` as assigned trainer → 200 and the returned session has a non-null `completedAt`
- [x] `POST /training/members/:memberId/sessions/:id/finish` on an already-finished session → 400

**TDD sequence**:
1. Write failing service + controller unit tests → Red
2. Implement service methods + controller routes → Green
3. Write/extend e2e integration tests, run against in-memory Mongo → pass

**Dependencies**: None.

**Status**: Complete

---

## Stage 2: Mobile data — training store trainer-log actions

**Goal**: The mobile training store can fetch a member's plan and run a trainer-logged session (start → log sets → finish) via the new endpoints, holding trainer-session state separately from the member's own `activeSession`.

**Files to create/modify**:
- Modify `mobile/src/types/training.ts` (add any trainer-log types if needed; reuse existing where possible)
- Modify `mobile/src/lib/api/training.api.ts` (add 4 client functions)
- Modify `mobile/src/stores/training.store.ts` (add `memberSession` state + actions)
- Create `mobile/__tests__/stores/training.store.test.ts`

**Implementation notes**:
- Add store fields `memberSession: WorkoutSession | null` and actions:
  - `fetchMemberPlan(memberId): Promise<ActivePlan | null>`
  - `startMemberSession(memberId, dayNumber): Promise<WorkoutSession>` → sets `memberSession`
  - `patchMemberSet(memberId, input): Promise<void>` → patches against `memberSession._id`, replaces `memberSession`
  - `finishMemberSession(memberId): Promise<void>` → finishes, clears `memberSession`
- Keep these fully independent of `activeSession` so a trainer logging never collides with their own member flow.
- Mock the API client module in the store test (mirror `body-tests.store.test.ts` mocking style).

**Sprint Contract**:

*Unit tests (training.store.test.ts):*
- [ ] `useTrainingStore > fetchMemberPlan > calls fetchMemberPlan(memberId) API and returns the resolved plan`
- [ ] `useTrainingStore > startMemberSession > stores returned session in memberSession`
- [ ] `useTrainingStore > patchMemberSet > sends input against current memberSession id and replaces memberSession with API response`
- [ ] `useTrainingStore > patchMemberSet > does nothing when memberSession is null`
- [ ] `useTrainingStore > finishMemberSession > calls finishMemberSession API and clears memberSession to null`

*Integration (store ↔ mocked API client, in training.store.test.ts):*
- [ ] start → patch → finish sequence: after the full sequence `memberSession` is `null` and `finishMemberSession` API was called once with the started session id
- [ ] trainer-log state isolation: running `startMemberSession` then `finishMemberSession` leaves the member's own `activeSession` untouched (stays `null`)

**TDD sequence**:
1. Write failing store unit tests with mocked API client → Red
2. Add API client functions + store actions → Green
3. Run full store test suite → pass

**Dependencies**: Stage 1 (endpoint shapes finalized).

---

## Stage 3: Mobile screens — Log Session button + TrainerWorkoutSessionScreen

**Goal**: From a member's Training tab, a trainer sees the member's active plan, taps "Log Session" for a day, lands on `TrainerWorkoutSessionScreen` titled with the member's name, logs a set, and finishes — returning to the member detail.

**Files to create/modify**:
- Modify `mobile/src/screens/members/tabs/MemberTrainingTab.tsx`
- Create `mobile/src/screens/my-training/TrainerWorkoutSessionScreen.tsx`
- Modify `mobile/src/navigation/index.tsx`
- Create/extend Jest component tests:
  - `mobile/src/screens/members/tabs/__tests__/MemberTrainingTab.test.tsx`
  - `mobile/src/screens/my-training/__tests__/TrainerWorkoutSessionScreen.test.tsx`

**Implementation notes**:
- `MemberTrainingTab` calls `fetchMemberPlan(memberId)` on mount; when a plan exists, render a "Log Session" affordance that lets the trainer pick a day (one button per `plan.days[]`, testID `log-session-day-<dayNumber>`) and on press calls `startMemberSession(memberId, dayNumber)` then `navigation.navigate('TrainerWorkoutSession', { memberId, memberName })`.
- `TrainerWorkoutSessionScreen` mirrors `WorkoutSessionScreen` structure (group sets, reps/weight inputs, Log per set, sticky Finish) but reads `memberSession` from the store and calls `patchMemberSet`/`finishMemberSession`; header title is `memberName`. Reuse identical testIDs (`screen-TrainerWorkoutSession`, `workout-set-…`, `set-reps-…`, `set-weight-…`, `log-set-…`, `set-logged-…`, `finish-workout-button`).
- Register `TrainerWorkoutSession` in `AppStackParamList` and `AppNavigator`.
- Max functional units this stage: 1 screen + 1 tab change + nav wiring (within limit).

**Sprint Contract**:

*Unit tests:*
- [ ] `MemberTrainingTab > renders a Log Session day button per plan day when fetchMemberPlan returns a plan`
- [ ] `MemberTrainingTab > renders no Log Session button when fetchMemberPlan returns null`
- [ ] `MemberTrainingTab > tapping a day button calls startMemberSession(memberId, dayNumber) then navigates to TrainerWorkoutSession with memberId and memberName`
- [ ] `TrainerWorkoutSessionScreen > renders memberName in the header and one set row per set in memberSession`
- [ ] `TrainerWorkoutSessionScreen > tapping Log on a set calls patchMemberSet with that set's exerciseId/setNumber and entered reps/weight`
- [ ] `TrainerWorkoutSessionScreen > tapping Finish Workout calls finishMemberSession(memberId) and navigates back`

*E2E (covered fully in Stage 4 — listed here as the user-facing flows this stage enables):*
- [ ] Trainer on member Training tab taps a Log Session day button → TrainerWorkoutSession screen appears with member name
- [ ] Trainer logs a set then finishes → returns to MemberDetail

**TDD sequence**:
1. Write failing component tests (RNTL) for tab + screen → Red
2. Implement `TrainerWorkoutSessionScreen`, `MemberTrainingTab` changes, navigation wiring → Green
3. Run `cd mobile && pnpm test` → pass; run design-reviewer on both files

**Dependencies**: Stage 2 (store actions exist).

---

## Stage 4: E2E — Detox trainer logs a session for a member

**Goal**: A Detox spec drives the full trainer-log flow against a real simulator + backend: trainer logs in, opens a seeded member, opens the Training tab, starts a session, logs a set, finishes, and is back on the member detail.

**Files to create/modify**:
- Create `mobile/e2e/trainer/trainer-log.spec.ts`

**Implementation notes**:
- Mirror `mobile/e2e/member/my-training.spec.ts` setup: seed an owner, a trainer (assigned to the member), and a member via `/auth/dev/seed-user-role`; create a non-bodyweight template via `/plan-templates` as owner; assign it to the member via `/training/dev/seed`.
- The seeded member's `trainerId` must point at the trainer account so trainer scoping passes — confirm `/auth/dev/seed-user-role` supports assigning a trainer; if not, assign via the trainer using `POST /training/members/:memberId/assign-plan` or extend the dev seed. (Generator: verify which path the seed endpoints support before writing the spec; do not add placeholder UI.)
- Navigate: drawer → Members → member card → Training tab → `log-session-day-1`.
- Reuse the same set testIDs as Stage 3.

**Sprint Contract**:

*E2E (Detox, real simulator + backend):*
- [ ] Golden path: trainer logs in → opens member → Training tab → taps `log-session-day-1` → `screen-TrainerWorkoutSession` visible → fills `set-reps-<exerciseId>-1` and `set-weight-<exerciseId>-1` → taps `log-set-<exerciseId>-1` → `set-logged-<exerciseId>-1` appears → taps `finish-workout-button` → returns to `screen-MemberDetail`
- [ ] Edge case: a member with no active plan shows no `log-session-day-1` button on the Training tab (Log Session affordance absent)

**TDD sequence**:
1. Write the Detox spec
2. Build + run against the simulator with the backend in dev mode → pass

**Dependencies**: Stages 1–3 complete.

**Status**: Not Started
