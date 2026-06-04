# My Training Implementation Plan

## Goal
A member can view their assigned training plan, start a workout for a day, log actual reps and weight per set, and finish the workout; a trainer/owner can assign a plan template to a member and view that member's workout history.

## Application
cross-app: `backend/` (NestJS API) + `mobile/` (React Native). `web/` is read-only reference only — do not modify.

## Scope

**In scope:**
- Backend `training` module: member reads active plan; member starts / patches / finishes a workout session; trainer/owner assigns a PlanTemplate to a member; trainer/owner reads a member's workout history.
- Backend dev seed controller for E2E setup (assign a plan + seed a completed session).
- Mobile data layer: types, `training.api.ts`, Zustand `training.store.ts` (member-facing) and assignment helpers reused by member-detail.
- Mobile member screens: My Training (active plan view), active Workout logging screen.
- Mobile trainer/owner: "Assign Plan" action + "Workout History" view inside the existing `MemberDetailScreen` (new tab + sheet).
- Detox E2E covering the member golden path: see plan → tap workout day → log a set → finish workout.

**Out of scope:**
- Plan template authoring (already exists: `training-templates` screens + `plan-templates` backend module).
- Cron auto-seal of stale sessions, RPE, member notes, supersets-specific UI, extra-sets, personal-best derivation (the `web/` models support these columns but this sprint does not surface them).
- Editing or un-assigning a plan once assigned (assign overwrites the active plan).
- Self-directed / freestyle workouts (`self-workout-log` model is out of scope).
- Any `web/` change.

## Affected Files

**Stage 1 — `backend/`**
- Create `backend/src/modules/training/training.module.ts`
- Create `backend/src/modules/training/training.controller.ts`
- Create `backend/src/modules/training/training.controller.spec.ts`
- Create `backend/src/modules/training/training.service.ts`
- Create `backend/src/modules/training/training.service.spec.ts`
- Create `backend/src/modules/training/training.dev.controller.ts`
- Create `backend/src/modules/training/dto/assign-plan.dto.ts`
- Create `backend/src/modules/training/dto/start-session.dto.ts`
- Create `backend/src/modules/training/dto/patch-set.dto.ts`
- Create `backend/src/modules/training/dto/seed-training.dto.ts`
- Create `backend/test/training.e2e-spec.ts`
- Modify `backend/src/app.module.ts` (register `TrainingModule`)
- Reuse (no change): `backend/src/common/models/member-plan.model.ts`, `workout-session.model.ts`, `plan-template.model.ts`, `user.model.ts`

**Stage 2 — `mobile/` data layer**
- Create `mobile/src/types/training.ts`
- Create `mobile/src/lib/api/training.api.ts`
- Create `mobile/src/lib/api/training.api.spec.ts`
- Create `mobile/src/stores/training.store.ts`
- Create `mobile/src/stores/training.store.spec.ts`

**Stage 3 — `mobile/` screens + Detox**
- Create `mobile/src/screens/my-training/MyTrainingScreen.tsx`
- Create `mobile/src/screens/my-training/MyTrainingScreen.spec.tsx`
- Create `mobile/src/screens/my-training/WorkoutSessionScreen.tsx`
- Create `mobile/src/screens/my-training/WorkoutSessionScreen.spec.tsx`
- Create `mobile/src/screens/members/tabs/MemberTrainingTab.tsx`
- Create `mobile/src/screens/members/tabs/MemberTrainingTab.spec.tsx`
- Create `mobile/src/screens/members/AssignPlanSheet.tsx`
- Create `mobile/src/screens/members/AssignPlanSheet.spec.tsx`
- Create `mobile/e2e/member/my-training.spec.ts`
- Modify `mobile/src/navigation/index.tsx` (real `MyTrainingScreen`, register `WorkoutSession` in `AppStack`)
- Modify `mobile/src/screens/placeholders/index.ts` (remove `MyTrainingScreen` placeholder)
- Modify `mobile/src/screens/members/MemberDetailScreen.tsx` (add `training` tab)

---

## Data Shapes (shared contract, mobile `types/training.ts` mirrors backend DTOs)

```typescript
// One prescribed exercise inside a plan day (mirrors web IPlanDayExercise).
export interface PlanDayExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: PlanDayExercise[];
}

// GET /training/my-plan  → null when no active plan assigned.
export interface ActivePlan {
  _id: string;
  name: string;
  templateId: string;
  assignedAt: string;   // ISO
  days: PlanDay[];
}

// One logged set inside a workout session.
export interface SessionSet {
  exerciseId: string;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  isExtraSet: boolean;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;  // ISO when logged
}

// Returned by start / patch / finish / history endpoints.
export interface WorkoutSession {
  _id: string;
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  dayName: string;
  startedAt: string;            // ISO
  completedAt: string | null;   // ISO once finished
  sets: SessionSet[];
}

// POST /training/sessions
export interface StartSessionInput { dayNumber: number; }

// PATCH /training/sessions/:id/sets
export interface PatchSetInput {
  setNumber: number;
  exerciseId: string;
  actualReps: number;
  actualWeight: number | null;   // null for bodyweight
}

// POST /training/members/:memberId/assign-plan (trainer/owner)
export interface AssignPlanInput { templateId: string; }
```

Backend builds the session `sets` array at start time by expanding each plan-day exercise into `exercise.sets` rows (`setNumber` 1..N), copying `prescribedRepsMin/Max`, `groupId`, `isSuperset`, `isBodyweight`, with `actualReps/actualWeight/completedAt = null` and `isExtraSet = false`. `lastActivityAt`, `autoSealed`, `loggedBy`, `rpe`, `memberNote` are persisted with model defaults but not surfaced in DTOs this sprint.

---

## Stage 1: Backend training endpoints

**Goal**: A `training` NestJS module exposing five guarded endpoints plus a dev seed route, fully covered by unit + integration tests against MongoMemoryServer.

**Endpoints**:
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/training/my-plan` | member | Active `MemberPlan` for caller, or `null` |
| POST | `/training/sessions` | member | Start a session for `dayNumber` (expands prescribed sets) |
| PATCH | `/training/sessions/:id/sets` | member | Log actual reps/weight for one set |
| POST | `/training/sessions/:id/finish` | member | Set `completedAt = now` |
| POST | `/training/members/:memberId/assign-plan` | owner, trainer | Copy a PlanTemplate's days into an active MemberPlan; deactivate prior active plan |
| GET | `/training/members/:memberId/history` | owner, trainer | Completed sessions for a member (desc by `startedAt`) |
| POST | `/training/dev/seed` | (dev only) | Assign a template + optionally seed one completed session |

**Service rules** (the Service must enforce, not the controller):
- `assignPlan`: trainer may only assign to a member where `member.trainerId === callerId`; owner may assign to any member. Template must be owned by caller (`createdBy`). Setting a new active plan first sets `isActive: false` on the member's existing active plans, then creates a new `MemberPlan` with `isActive: true`, `assignedAt: now`, copying `template.days` and `name`. Throws `NotFoundException` when template or member not found / not in scope.
- `startSession`: requires an active plan for the member; `dayNumber` must exist in that plan; expands sets as described. Throws `NotFoundException` when no active plan or day missing.
- `patchSet`: session must belong to caller and be uncompleted; locates the set by `setNumber + exerciseId`; sets `actualReps`, `actualWeight`, `completedAt = now`, bumps `lastActivityAt`. Throws `NotFoundException` for foreign/missing session, `BadRequestException` when set not found or session already completed.
- `finishSession`: session must belong to caller; idempotent guard — throws `BadRequestException` if already completed; sets `completedAt = now`.
- `getHistory`: reuse member-scoping pattern from `MembersService.resolveAndScopeMember` (trainer limited to own members); returns only `completedAt != null` sessions sorted `startedAt` desc.

**Sprint Contract**:

*Unit tests (`training.service.spec.ts`, `training.controller.spec.ts`):*
- [ ] `TrainingService > getMyPlan > returns null when member has no active MemberPlan`
- [ ] `TrainingService > getMyPlan > returns the active plan with days when one exists`
- [ ] `TrainingService > assignPlan > creates an active MemberPlan copying template name and days`
- [ ] `TrainingService > assignPlan > deactivates the member's previous active plan (isActive=false) before creating the new one`
- [ ] `TrainingService > assignPlan > throws NotFoundException when template not owned by caller`
- [ ] `TrainingService > assignPlan > trainer assigning to a member of another trainer throws NotFoundException`
- [ ] `TrainingService > startSession > expands a day into setNumber 1..N rows with null actuals and copied prescribed reps`
- [ ] `TrainingService > startSession > throws NotFoundException when dayNumber is not in the active plan`
- [ ] `TrainingService > patchSet > sets actualReps, actualWeight and completedAt on the matched set`
- [ ] `TrainingService > patchSet > throws BadRequestException when the session is already completed`
- [ ] `TrainingService > finishSession > sets completedAt and throws BadRequestException on a second call`
- [ ] `TrainingService > getHistory > returns only completed sessions sorted by startedAt desc`
- [ ] `TrainingController > assignPlan > delegates to service with memberId, templateId, caller role and id`

*Integration (`backend/test/training.e2e-spec.ts`, MongoMemoryServer, `maxWorkers: 1`):*
- [ ] `GET /training/my-plan` no token → 401; owner token → 403; member token with no plan → 200 and body `null`
- [ ] `POST /training/members/:memberId/assign-plan` member token → 403; owner token + valid templateId → 201 returns ActivePlan with `days`; then `GET /training/my-plan` as that member → 200 returns the same plan name
- [ ] `POST /training/members/:memberId/assign-plan` missing `templateId` → 400; unknown templateId → 404
- [ ] `POST /training/sessions` member token with `{dayNumber}` from assigned plan → 201 returns session whose `sets.length` equals total prescribed sets across that day's exercises, all `actualReps=null`
- [ ] `PATCH /training/sessions/:id/sets` with `{setNumber, exerciseId, actualReps, actualWeight}` → 200; returned session has that set with `actualReps` set and `completedAt != null`
- [ ] `POST /training/sessions/:id/finish` → 200 with `completedAt != null`; second call → 400
- [ ] `GET /training/members/:memberId/history` trainer not owning member → 404; owner → 200 array containing the finished session; member token → 403

**TDD sequence**:
1. Write `training.service.spec.ts` against an in-memory model → Red.
2. Implement `training.service.ts` minimally → Green.
3. Write `training.controller.spec.ts` (mocked service) → Red → implement controller → Green.
4. Wire `training.module.ts` + register in `app.module.ts`; add `training.dev.controller.ts` (guarded by `NODE_ENV !== 'production'`, same pattern as `scheduled-sessions.dev.controller.ts`).
5. Write `training.e2e-spec.ts` (build a test module importing only the modules it needs, mirror `scheduled-sessions.e2e-spec.ts` bootstrap) → run against MongoMemoryServer until Green.
6. `/simplify`, then `pnpm test && pnpm test:e2e && pnpm lint && pnpm build`.

**Status**: Complete

### Stage 1 Checkpoint
- [x] training.service.spec.ts + training.service.ts
- [x] training.controller.spec.ts + training.controller.ts
- [x] training.module.ts + training.dev.controller.ts + app.module.ts
- [x] training.e2e-spec.ts

---

## Stage 2: Mobile data layer

**Goal**: Typed API client and a Zustand store the member screens consume, with all branches unit-tested against a mocked `apiClient`.

**Scope**: `types/training.ts` (the interfaces above), `lib/api/training.api.ts`, `stores/training.store.ts`.

**`training.api.ts` functions** (all using `apiClient` from `lib/api/client.ts`):
- `fetchMyPlan(): Promise<ActivePlan | null>` → GET `/training/my-plan`
- `startSession(dayNumber: number): Promise<WorkoutSession>` → POST `/training/sessions`
- `patchSet(sessionId: string, input: PatchSetInput): Promise<WorkoutSession>` → PATCH `/training/sessions/:id/sets`
- `finishSession(sessionId: string): Promise<WorkoutSession>` → POST `/training/sessions/:id/finish`
- `assignPlan(memberId: string, templateId: string): Promise<ActivePlan>` → POST `/training/members/:memberId/assign-plan`
- `fetchMemberHistory(memberId: string): Promise<WorkoutSession[]>` → GET `/training/members/:memberId/history`

**`training.store.ts` state** (member-facing):
```typescript
interface TrainingState {
  plan: ActivePlan | null;
  activeSession: WorkoutSession | null;
  loading: boolean;
  error: string | null;
  fetchPlan(): Promise<void>;
  startWorkout(dayNumber: number): Promise<WorkoutSession>;
  logSet(input: PatchSetInput): Promise<void>;       // patches activeSession in place
  finishWorkout(): Promise<void>;                    // clears activeSession on success
  loggedSetCount(): number;                          // count of sets with completedAt != null
}
```

**Sprint Contract**:

*Unit tests (`training.api.spec.ts`, `training.store.spec.ts`):*
- [ ] `training.api > fetchMyPlan > GETs /training/my-plan and returns response.data`
- [ ] `training.api > startSession > POSTs /training/sessions with {dayNumber} and returns the session`
- [ ] `training.api > patchSet > PATCHes /training/sessions/:id/sets with the input body`
- [ ] `training.api > assignPlan > POSTs /training/members/:id/assign-plan with {templateId}`
- [ ] `trainingStore > fetchPlan > populates plan and clears loading on success`
- [ ] `trainingStore > fetchPlan > sets error and clears loading on rejection`
- [ ] `trainingStore > startWorkout > sets activeSession to the started session`
- [ ] `trainingStore > logSet > replaces the matched set in activeSession with the patched server response`
- [ ] `trainingStore > finishWorkout > clears activeSession on success`
- [ ] `trainingStore > loggedSetCount > returns the number of sets with completedAt != null`

*Integration criteria (store ↔ mocked api, no real network):*
- [ ] Calling `startWorkout(1)` then `logSet({...})` results in `activeSession.sets` containing exactly one set with `completedAt != null` and `loggedSetCount()` returning 1
- [ ] Calling `finishWorkout()` after a successful finish leaves `activeSession === null` and `error === null`

**TDD sequence**:
1. Write `training.api.spec.ts` mocking `apiClient` → Red → implement `training.api.ts` → Green.
2. Write `training.store.spec.ts` mocking the api module → Red → implement `training.store.ts` → Green.
3. `/simplify`, then `pnpm test && pnpm lint`.

**Status**: Not Started

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: Member can navigate My Training → see the plan → tap a day → log a set → finish; trainer/owner can assign a template and view history from the member detail screen. Member golden path verified by Detox on a simulator.

**Scope**:
- `MyTrainingScreen` (testID `screen-MyTraining`) — fetches plan on mount via store. Empty state `my-training-empty` when `plan === null`. Otherwise renders each day as a pressable card `workout-day-{dayNumber}` showing day name + exercise count; tapping calls `startWorkout(dayNumber)` then navigates to `WorkoutSession`.
- `WorkoutSessionScreen` (testID `screen-WorkoutSession`, registered in `AppStack` with param `{ session: WorkoutSession }`) — lists sets grouped by exercise; each set row `workout-set-{exerciseId}-{setNumber}` has a reps input `set-reps-{exerciseId}-{setNumber}`, a weight input `set-weight-{exerciseId}-{setNumber}` (hidden/disabled when `isBodyweight`), and a log button `log-set-{exerciseId}-{setNumber}` that calls `logSet`. A `finish-workout-button` calls `finishWorkout` then navigates back; logged set rows show a `set-logged-{exerciseId}-{setNumber}` check indicator.
- `MemberTrainingTab` — added as a 4th tab (`member-detail-tab-training`) in `MemberDetailScreen`; shows the member's active plan name (or none) with an `assign-plan-button` opening `AssignPlanSheet`, plus a history list of completed sessions (`history-session-{id}`) via `fetchMemberHistory`.
- `AssignPlanSheet` (testID `assign-plan-sheet`) — lists the caller's plan templates as rows `template-result-{name}` (follows the `{type}-result-${name}` convention); tapping a row calls `assignPlan(memberId, templateId)` and closes the sheet, refreshing the tab.
- Navigation: replace placeholder `MyTraining` with real screen; register `WorkoutSession` in `AppStackParamList` + navigator; remove `MyTrainingScreen` from `placeholders/index.ts`.

Design: follow `.claude/instructions/design.md` mobile rules — `text-foreground/65` for secondary text, `keyboardType="decimal-pad"` for weight, `flex-row items-center justify-between` dense rows, Skeleton loading, no `Alert.alert`. Reuse `ScreenHeader`, `Screen`, and React Native Reusables `Button`/`Input`/`Dialog`.

**Sprint Contract**:

*Unit tests (RNTL — `*.spec.tsx`):*
- [ ] `MyTrainingScreen > renders a workout-day-{n} card per plan day with the day name`
- [ ] `MyTrainingScreen > renders my-training-empty when the store plan is null`
- [ ] `MyTrainingScreen > tapping a day card calls startWorkout with that dayNumber and navigates to WorkoutSession`
- [ ] `WorkoutSessionScreen > renders a set row per prescribed set with reps and weight inputs`
- [ ] `WorkoutSessionScreen > weight input is absent for a bodyweight exercise set`
- [ ] `WorkoutSessionScreen > tapping log-set calls logSet with the entered reps and weight`
- [ ] `WorkoutSessionScreen > tapping finish-workout-button calls finishWorkout and navigates back`
- [ ] `AssignPlanSheet > renders a template-result-{name} row per template and calls assignPlan on tap`
- [ ] `MemberTrainingTab > shows the active plan name and a history-session-{id} row per completed session`

*E2E (`mobile/e2e/member/my-training.spec.ts`, Detox):*
- [ ] Golden path: seed a member via `/auth/dev/seed-user-role`, assign a plan + (no completed session) via `/training/dev/seed`; log in → open drawer → tap `drawer-item-MyTraining` → `screen-MyTraining` visible → tap `workout-day-1` → `screen-WorkoutSession` visible → type reps into `set-reps-...-1`, weight into `set-weight-...-1` → tap `log-set-...-1` → `set-logged-...-1` visible → tap `finish-workout-button` → returns to `screen-MyTraining`
- [ ] Edge case: seed a member with no assigned plan → log in → open `MyTraining` → `my-training-empty` is visible and no `workout-day-1` exists

**TDD sequence**:
1. Write each screen/component `.spec.tsx` with mocked store/navigation → Red → implement minimal screen → Green.
2. Wire navigation + remove placeholder; update `MemberDetailScreen` tabs.
3. `/simplify`; run `pnpm test && pnpm lint`.
4. Write `my-training.spec.ts`; `pnpm detox build` + `pnpm detox test --testPathPattern=member/my-training` against a booted simulator + running backend until Green.
5. Run the `design-reviewer` agent on the two new screens; fix violations.

**Status**: Not Started

---

## Architectural Risks
- **Dev seed coupling**: the Detox golden path depends on `/training/dev/seed` assigning a plan whose day 1 has at least one non-bodyweight exercise. The seed DTO must guarantee a deterministic exercise so the `set-weight` testID exists.
- **Member→trainer scoping**: `assignPlan` and `getHistory` must reuse the exact `resolveAndScopeMember` semantics from `MembersService` (NotFound, never Forbidden, to avoid leaking existence) — duplicating it loosely risks an authz hole. Consider importing/sharing that helper.
- **Set identity**: sets are keyed by `setNumber + exerciseId`. If a future superset UI reuses an exerciseId across groups this key collides; acceptable for this sprint since supersets are out of scope, but note it.
