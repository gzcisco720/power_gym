# Sprint 9 — Mobile Parity Round 4 Implementation Plan

## Goal
Close six confirmed web↔mobile parity gaps so trainers/owners see the same check-in, training, and nutrition richness on mobile that web already provides, and gain the same member/trainer management actions.

## Application
cross-app: `backend/` (NestJS — 3 new endpoint groups) + `mobile/` (React Native + Expo — 6 screen/tab enhancements). No `web/` changes.

## Codebase Findings (verified — Generators must rely on these, not re-investigate)

These were confirmed by reading the code on 2026-06-07. They override the assumptions in the original gap brief:

- **Check-in schedule (Gap 1A):** NO backend endpoint exists. The shared DB shape is `web/src/lib/db/models/check-in-config.model.ts` → collection `CheckInConfig`, unique index on `memberId`, fields: `memberId, trainerId, dayOfWeek (0-6), hour (0-23), minute (0-59), active, reminderSentAt, timestamps`. Backend must add a Mongoose model matching this exactly (same collection name `CheckInConfig`) plus GET/PUT endpoints. Web stores `minute` too — keep it (default 0 on PUT if mobile omits it).
- **Member personal-bests (Gap 2A):** NO `/members/:id/personal-bests` endpoint. Model `backend/src/common/models/personal-best.model.ts` exists with a UNIQUE index `{memberId, exerciseId}` → it stores ONE best row per exercise (latest PR), NOT history. Fields: `exerciseName, bestWeight, bestReps, estimatedOneRM, achievedAt`. A new GET endpoint must query this collection sorted by `estimatedOneRM` desc.
- **Strength chart history (Gap 2B):** Do NOT add a new endpoint. `GET /training/members/:memberId/exercise/:exerciseId` already returns per-session `estimatedOneRepMax` + date + sets — but it is CAPPED at 5 sessions (`if (result.length === 5) break;` at training.service.ts ~line 635). Change the cap to 20 and reverse for chronological x-axis. The exercise selector list comes from the existing `GET /training/members/:memberId/progress` which already returns `exercises: [{exerciseId, exerciseName}]`.
- **Workout volume + active session (Gap 2C/2D):** `GET /training/members/:memberId/history` returns full `WorkoutSession[]` with `sets[]` containing `actualWeight`/`actualReps`/`completedAt` → volume is computable client-side. BUT `getHistory` filters `completedAt: { $ne: null }`, so the in-progress session (Gap 2D) is NOT in that response. Add a new lightweight endpoint `GET /training/members/:memberId/active-session` returning the single session with `completedAt: null` (or null). Session has `dayName`, `startedAt`, `_id`.
- **Member nutrition for trainer/owner (Gap 3):** NO trainer/owner-scoped active-plan endpoint exists (`getMyPlan` is member-self only). `GET /nutrition/members/:memberId/history` exists and returns `NutritionDailyLog[]` with `meals[].items[]` (per-item kcal/protein/carbs/fat) — actuals are summable client-side. There is NO `dayCompleted` flag and NO stored target on the log; targets come from the active plan's day types. Add `GET /nutrition/members/:memberId/plan` (trainer/owner scoped) returning the `ActiveNutritionPlan` shape (dayTypes with meals→items). Day-type macro targets = sum of that day type's `meals[].items[]`. "Completion" is NOT a real backend concept — treat a log as "logged" (has ≥1 meal item); do NOT invent a fake completed badge. (This corrects Gap 3B/3C: render an "actual vs target" comparison and a "Logged" indicator, never a fabricated `dayCompleted`.)
- **Reassign / unassign member (Gap 5):** `PATCH /trainers/:id/members/:memberId/reassign` EXISTS but requires the member to currently belong to `:id` AND its DTO `@IsMongoId() trainerId` REJECTS null → it cannot unassign and is awkward for the owner Members screen. Add owner-scoped `PATCH /members/:id/assign-trainer` accepting `{ trainerId: string | null }` (null = unassign). Mobile members store/api must call the new endpoint.
- **Delete trainer (Gap 6):** NO `DELETE /trainers/:id`. Must be created (owner-only). On delete, set `trainerId: null` on all members assigned to that trainer (so they become unassigned), then remove the trainer user. Return the affected member count so the dialog warning is accurate.
- **Scoping helper:** All training service member methods use private `resolveScopedMember(memberId, callerId, callerRole)` (training.service.ts ~line 298): throws `NotFoundException` if not a member, and for trainers if `member.trainerId !== callerId`. New training/nutrition endpoints MUST reuse this exact pattern. Members controller is `@Roles('owner','trainer')`; trainers controller is `@Roles('owner')`.
- **Mobile charts:** `react-native-gifted-charts` (LineChart) + `react-native-svg` are installed. Use these for the wellness line chart and strength chart. The diet-compliance heatmap (Gap 1B) is colored `View` squares, not a chart lib.
- **Mobile data layer:** api in `mobile/src/lib/api/*.api.ts`, stores in `mobile/src/stores/*.store.ts`. `mobile/src/lib/api/training.api.ts` already has `fetchMemberHistory`, `fetchMemberPlan`. `mobile/src/stores/trainers.store.ts` already has `reassignMember`. Check-in fields confirmed on the check-in model: 7 sliders = `sleepQuality, stress, fatigue, hunger, recovery, energy, digestion`; plus `weight`, `stuckToDiet ('yes'|'no'|'partial')`, `photos: string[]`, `submittedAt`.
- Detox specs grouped by role: `mobile/e2e/{owner,trainer,member}/`. Existing relevant specs: `trainer/member-check-ins.spec.ts`, `trainer/members.spec.ts`, `owner/trainers.spec.ts`, `member/check-in.spec.ts`. Extend these where they exist rather than duplicating.

## Scope

**In scope:**
- Backend: `CheckInConfig` model + GET/PUT schedule endpoints (owner/trainer scoped)
- Backend: member personal-bests endpoint + raise exercise-history cap to 20 + active-session endpoint
- Backend: trainer/owner-scoped member nutrition active-plan endpoint
- Backend: `PATCH /members/:id/assign-trainer` (assign + unassign via null) and `DELETE /trainers/:id`
- Mobile Gap 1: check-in schedule config form + wellness line chart + diet heatmap + per-item list enrichment (weight, diet badge, photo count)
- Mobile Gap 2: PRs grid, strength progress chart with exercise selector, workout-row volume + day-type accent bar, active-session continue banner
- Mobile Gap 3: day-type macro target cards + actual-vs-target per log row + "Logged" indicator
- Mobile Gap 4: member self check-in history rows show diet badge + weight
- Mobile Gap 5: members screen inline Reassign (bottom sheet) + Unassign (dialog) + trainer filter row
- Mobile Gap 6: trainers screen Remove action with confirmation dialog

**Out of scope:**
- Web changes of any kind
- Mobile pagination on the members list (FlatList virtualizes — explicitly skipped per brief)
- Any `dayCompleted` persistence in nutrition (does not exist in the model; do not add)
- Editing/creating PR rows or check-in schedules from the member self-view
- Reminder cron/email wiring for the check-in schedule (only config CRUD is in scope)

## Affected Files

**Backend (create):**
- `backend/src/common/models/check-in-config.model.ts`
- `backend/src/modules/check-ins/dto/update-check-in-schedule.dto.ts`
- `backend/src/modules/members/dto/assign-trainer.dto.ts`
- `backend/test/check-in-schedule.e2e-spec.ts`
- `backend/test/member-training-extras.e2e-spec.ts`
- `backend/test/member-nutrition-plan.e2e-spec.ts`
- `backend/test/member-assign-trainer.e2e-spec.ts`
- `backend/test/trainer-delete.e2e-spec.ts`

**Backend (modify):**
- `backend/src/modules/check-ins/check-ins.controller.ts` + `.service.ts` + `.module.ts` (+ specs)
- `backend/src/modules/training/training.controller.ts` + `.service.ts` (+ specs) — personal-bests, active-session, history cap
- `backend/src/modules/training/training.module.ts` (register PersonalBest model if not already)
- `backend/src/modules/nutrition/nutrition.controller.ts` + `.service.ts` (+ specs)
- `backend/src/modules/members/members.controller.ts` + `.service.ts` (+ specs)
- `backend/src/modules/trainers/trainers.controller.ts` + `.service.ts` (+ specs)

**Mobile (create):**
- `mobile/src/lib/api/check-in-schedule.api.ts`
- `mobile/src/stores/check-in-schedule.store.ts` (+ `.spec.ts`)
- `mobile/src/screens/members/tabs/components/CheckInScheduleForm.tsx`
- `mobile/src/screens/members/tabs/components/WellnessTrendChart.tsx`
- `mobile/src/screens/members/tabs/components/DietComplianceHeatmap.tsx`
- `mobile/src/screens/members/tabs/components/PersonalBestsGrid.tsx`
- `mobile/src/screens/members/tabs/components/StrengthProgressChart.tsx`
- `mobile/src/screens/members/components/ReassignTrainerSheet.tsx`
- `mobile/e2e/trainer/member-training-rich.spec.ts`
- `mobile/e2e/trainer/member-nutrition-rich.spec.ts`
- `mobile/e2e/owner/member-assign.spec.ts`
- `mobile/src/lib/api/personal-bests.api.ts`

**Mobile (modify):**
- `mobile/src/screens/members/tabs/MemberCheckInsTab.tsx` (+ `.spec.tsx`)
- `mobile/src/screens/members/tabs/MemberTrainingTab.tsx` (+ `.spec.tsx`)
- `mobile/src/screens/members/tabs/MemberNutritionTab.tsx` (+ spec)
- `mobile/src/screens/check-in/CheckInScreen.tsx` (+ spec)
- `mobile/src/screens/members/MembersScreen.tsx` (+ `.spec.tsx`)
- `mobile/src/screens/trainers/TrainersScreen.tsx` (+ `.spec.tsx`)
- `mobile/src/lib/api/training.api.ts`, `mobile/src/lib/api/nutrition.api.ts`, `mobile/src/lib/api/members.api.ts`, `mobile/src/lib/api/trainers.api.ts`
- `mobile/src/stores/members.store.ts`, `mobile/src/stores/trainers.store.ts`
- `mobile/src/types/*` as needed (training, nutrition, check-ins, members, trainers)
- `mobile/e2e/trainer/member-check-ins.spec.ts`, `mobile/e2e/owner/trainers.spec.ts`, `mobile/e2e/member/check-in.spec.ts`

---

## Stage 1: Backend — Check-In Schedule + Member Assign/Unassign + Delete Trainer

**Goal**: Three independent owner/trainer-scoped backend capabilities that unblock mobile Gaps 1A, 5, and 6. (3 endpoint groups, 4 functional units — within limit.)

**Sprint Contract**:

*Unit tests:*
- [ ] `CheckInsService > getSchedule > returns existing CheckInConfig for a member the trainer owns`
- [ ] `CheckInsService > getSchedule > returns null when no config exists for the member`
- [ ] `CheckInsService > updateSchedule > upserts CheckInConfig with dayOfWeek/hour/active and defaults minute to 0`
- [ ] `CheckInsService > updateSchedule > throws NotFoundException when member is not under the requesting trainer`
- [ ] `MembersService > assignTrainer > sets member.trainerId to the given trainer id`
- [ ] `MembersService > assignTrainer > sets member.trainerId to null when trainerId is null (unassign)`
- [ ] `TrainersService > remove > unassigns all members of the trainer (sets trainerId null) and returns affectedMemberCount`
- [ ] `TrainersService > remove > throws NotFoundException when trainer id does not exist`

*Integration / E2E (backend integration):*
- [ ] `PUT /check-ins/members/:memberId/schedule` with `{dayOfWeek:1,hour:9,active:true}` → 200, body reflects saved config; `GET` same path → 200 returns it
- [ ] `GET /check-ins/members/:memberId/schedule` as a trainer who does NOT own the member → 404 (and 401 unauthenticated)
- [ ] `PATCH /members/:id/assign-trainer` `{trainerId:null}` as owner → 200, subsequent member fetch shows no trainer; malformed body (non-mongoid non-null) → 400
- [ ] `DELETE /trainers/:id` as owner → 200 with `{affectedMemberCount}`; as trainer role → 403

**TDD sequence**:
1. Write failing service unit tests → Red
2. Add `CheckInConfig` model (matching web shape, collection `CheckInConfig`), DTOs, service methods, controller routes → Green
3. Write/extend integration specs against the real Nest app → pass

**Status**: Complete

### Stage 1 Checkpoint
- [x] `CheckInsService > getSchedule > returns existing CheckInConfig for a member the trainer owns`
- [x] `CheckInsService > getSchedule > returns null when no config exists for the member`
- [x] `CheckInsService > updateSchedule > upserts CheckInConfig with dayOfWeek/hour/active and defaults minute to 0`
- [x] `CheckInsService > updateSchedule > throws NotFoundException when member is not under the requesting trainer`
- [x] `MembersService > assignTrainer > sets member.trainerId to the given trainer id`
- [x] `MembersService > assignTrainer > sets member.trainerId to null when trainerId is null (unassign)`
- [x] `TrainersService > remove > unassigns all members of the trainer (sets trainerId null) and returns affectedMemberCount`
- [x] `TrainersService > remove > throws NotFoundException when trainer id does not exist`
- [x] Integration: `PUT /check-ins/members/:memberId/schedule` + `GET` round-trip
- [x] Integration: `GET /check-ins/members/:memberId/schedule` 404 for non-owning trainer, 401 unauthenticated
- [x] Integration: `PATCH /members/:id/assign-trainer` owner assign/unassign + 400 malformed + 403 trainer
- [x] Integration: `DELETE /trainers/:id` owner 200 with affectedMemberCount + 403 trainer + 404 nonexistent

---

## Stage 2: Backend — Member Training Extras + Member Nutrition Plan

**Goal**: Endpoints/changes powering mobile Gaps 2A, 2B, 2D, and 3. (4 functional units: personal-bests, active-session, exercise-history cap change, nutrition plan.)

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainingService > getPersonalBests > returns member PRs sorted by estimatedOneRM descending`
- [ ] `TrainingService > getPersonalBests > throws NotFoundException for a member outside trainer scope`
- [ ] `TrainingService > getActiveSession > returns the session with completedAt null for the member`
- [ ] `TrainingService > getActiveSession > returns null when the member has no in-progress session`
- [ ] `TrainingService > getExerciseHistory > returns up to 20 sessions (not 5) ordered chronologically`
- [ ] `NutritionService > getMemberPlan > returns the member active plan with dayTypes for an owned member`
- [ ] `NutritionService > getMemberPlan > returns null when the member has no active plan`
- [ ] `NutritionService > getMemberPlan > throws NotFoundException when member is outside trainer scope`

*Integration / E2E (backend integration):*
- [ ] `GET /training/members/:memberId/personal-bests` as owner → 200 array sorted by estimatedOneRM desc; unauthenticated → 401
- [ ] `GET /training/members/:memberId/active-session` → 200 returns in-progress session or null; trainer not owning member → 404
- [ ] `GET /nutrition/members/:memberId/plan` as the owning trainer → 200 with dayTypes; as non-owning trainer → 404

**TDD sequence**:
1. Write failing unit tests → Red
2. Add `getPersonalBests` (query PersonalBest model, register in training.module if needed), `getActiveSession`, change exercise-history cap 5→20 + chronological order, add nutrition `getMemberPlan` + controller route → Green
3. Integration specs against real app → pass

**Status**: Complete

### Stage 2 Checkpoint
- [x] `TrainingService > getPersonalBests`
- [x] `TrainingService > getActiveSession`
- [x] `TrainingService > getExerciseHistory` (cap 5→20)
- [x] `NutritionService > getMemberPlan`
- [x] Integration tests (personal-bests, active-session, nutrition member plan)

---

## Stage 3: Mobile — Member Hub Training Tab (Gap 2)

**Goal**: `MemberTrainingTab` gains PRs grid, strength progress chart with exercise selector, workout-row volume + day-type accent bar, and an active-session continue banner.

**Sprint Contract**:

*Unit tests:*
- [ ] `PersonalBestsGrid > renders > shows exercise name, "best kg × reps", and "est. 1RM" for each PR`
- [ ] `StrengthProgressChart > selects exercise > refetches history and renders a line point per session`
- [ ] `MemberTrainingTab > volume > computes total volume = sum(actualWeight×actualReps) over completed sets for a history row`
- [ ] `MemberTrainingTab > accent bar > maps day name keyword to color (push→indigo, pull→emerald, leg→amber, upper→pink, lower→rose, default→muted)`
- [ ] `MemberTrainingTab > active session > renders Continue banner only when an in-progress session exists`

*Integration / E2E (Detox — `mobile/e2e/trainer/member-training-rich.spec.ts`):*
- [ ] Trainer opens a member's Training tab → Personal Bests cards visible with weight×reps and est. 1RM values
- [ ] Trainer taps a different exercise pill in the strength chart → chart updates (different data point count / value visible)
- [ ] (edge) Member with an in-progress session shows the "Continue" banner → tapping it navigates to the workout session screen

**TDD sequence**:
1. Write failing Jest tests for grid/chart/volume/accent/banner → Red
2. Add api fns (`fetchMemberPersonalBests`, `fetchMemberExerciseHistory` via existing endpoint, `fetchMemberActiveSession`), components, wire into tab → Green
3. Detox spec against simulator → pass; then design-reviewer on the tab + new components

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `PersonalBestsGrid > renders > shows exercise name, "best kg × reps", and "est. 1RM" for each PR`
- [x] `StrengthProgressChart > selects exercise > refetches history and renders a line point per session`
- [x] `MemberTrainingTab > volume > computes total volume = sum(actualWeight×actualReps) over completed sets for a history row`
- [x] `MemberTrainingTab > accent bar > maps day name keyword to color (push→indigo, pull→emerald, leg→amber, upper→pink, lower→rose, default→muted)`
- [x] `MemberTrainingTab > active session > renders Continue banner only when an in-progress session exists`
- [x] API functions: `fetchMemberPersonalBests`, `fetchMemberActiveSession`, `fetchMemberExerciseHistory`
- [x] Detox E2E: `mobile/e2e/trainer/member-training-rich.spec.ts` (PRs grid, strength chart exercise selector, active-session continue banner)

---

## Stage 4: Mobile — Member Hub Check-Ins Tab (Gap 1)

**Goal**: `MemberCheckInsTab` gains schedule config form (wired to Stage 1 endpoints), wellness trend line chart + diet-compliance heatmap (≥2 check-ins), and per-row enrichment (weight, diet badge, photo count).

**Sprint Contract**:

*Unit tests:*
- [ ] `check-in-schedule.store > fetchSchedule > populates schedule and clears loading on success`
- [ ] `CheckInScheduleForm > save button > disabled until a field changes (dirty), enabled after editing dayOfWeek/hour/active`
- [ ] `WellnessTrendChart > data > plots avg of the 7 sliders per check-in for up to the last 12 entries`
- [ ] `DietComplianceHeatmap > colors > maps stuckToDiet yes→emerald, partial→amber, no→rose for up to 16 squares`
- [ ] `MemberCheckInsTab > list row > shows weight when non-null, diet badge text (On track/Partial/Off track), and photo count when photos.length > 0`

*Integration / E2E (Detox — extend `mobile/e2e/trainer/member-check-ins.spec.ts`):*
- [ ] Trainer changes day-of-week + hour in the schedule form and taps Save → success toast, value persists on reload
- [ ] (edge) Member with ≥2 check-ins shows the wellness chart and heatmap; a member with <2 check-ins shows neither

**TDD sequence**:
1. Failing Jest tests → Red
2. Add schedule api/store, form, chart, heatmap, list enrichment → Green
3. Detox extension → pass; design-reviewer on tab + new components

**Status**: In Progress

### Stage 4 Checkpoint
- [x] `check-in-schedule.store > fetchSchedule > populates schedule and clears loading on success`
- [x] `CheckInScheduleForm > save button > disabled until a field changes (dirty), enabled after editing dayOfWeek/hour/active`
- [x] `WellnessTrendChart > data > plots avg of the 7 sliders per check-in for up to the last 12 entries`
- [x] `DietComplianceHeatmap > colors > maps stuckToDiet yes→emerald, partial→amber, no→rose for up to 16 squares`
- [x] `MemberCheckInsTab > list row > shows weight when non-null, diet badge text (On track/Partial/Off track), and photo count when photos.length > 0`
- [x] Detox E2E: extend `mobile/e2e/trainer/member-check-ins.spec.ts` (schedule form save, wellness chart/heatmap edge case)

---

## Stage 5: Mobile — Member Hub Nutrition Tab (Gap 3) + Member Self Check-In History (Gap 4)

**Goal**: `MemberNutritionTab` gains day-type macro target cards and actual-vs-target per log row with a "Logged" indicator; `CheckInScreen` self-history rows gain diet badge + weight. (Gap 4 is pure-UI, bundled here for efficiency.)

**Sprint Contract**:

*Unit tests:*
- [ ] `MemberNutritionTab > day type cards > renders kcal target and protein/carbs/fat target badges (emerald/amber/pink) per day type from the active plan`
- [ ] `MemberNutritionTab > target sum > computes a day type's macro target as the sum of its meals[].items[] macros`
- [ ] `MemberNutritionTab > log row > shows actual kcal/macros (summed from log meals) beside dimmed target values`
- [ ] `MemberNutritionTab > logged indicator > shows "Logged" emerald indicator only when the log has ≥1 meal item`
- [ ] `CheckInScreen > history row > shows diet badge (On track/Partial/Off track) and weight "X kg" when weight is non-null`

*Integration / E2E:*
- [ ] (Detox `mobile/e2e/trainer/member-nutrition-rich.spec.ts`) Trainer opens a member's Nutrition tab → day-type cards with macro badges visible; a log row shows actual-vs-target
- [ ] (Detox extend `mobile/e2e/member/check-in.spec.ts`) Member opens check-in history → a past row displays the diet badge and weight

**TDD sequence**:
1. Failing Jest tests → Red
2. Add nutrition member-plan api fn, tab sections, and CheckInScreen row enrichment → Green
3. Detox specs → pass; design-reviewer on both screens

**Status**: Complete

### Stage 5 Checkpoint
- [x] `fetchMemberNutritionPlan` API fn (`mobile/src/lib/api/nutrition.api.ts`)
- [x] `MemberNutritionTab > day type cards > renders kcal target and protein/carbs/fat target badges`
- [x] `MemberNutritionTab > target sum > computes day type macro target as sum of meals[].items[] macros`
- [x] `MemberNutritionTab > log row > shows actual kcal/macros beside dimmed target values`
- [x] `MemberNutritionTab > logged indicator > shows "Logged" emerald indicator only when ≥1 meal item`
- [x] `CheckInScreen > history row > shows diet badge (On track/Partial/Off track) and weight when non-null`
- [x] Detox `mobile/e2e/trainer/member-nutrition-rich.spec.ts` (golden path + edge case)
- [x] Detox extend `mobile/e2e/member/check-in.spec.ts` (diet badge after submit)

---

## Stage 6: Mobile — Owner Members Management (Gap 5) + Owner Trainers Remove (Gap 6)

**Goal**: `MembersScreen` gains inline Reassign (bottom sheet), Unassign (confirmation dialog), and a horizontal trainer filter row; `TrainersScreen` gains a destructive Remove action with a confirmation dialog. Both wired to Stage 1 endpoints. (No pagination — out of scope.)

**Sprint Contract**:

*Unit tests:*
- [ ] `members.store > assignTrainer > calls assign-trainer api and updates the member's trainer in local state`
- [ ] `members.store > unassignTrainer > calls assign-trainer api with null and clears the member's trainer`
- [ ] `MembersScreen > trainer filter > tapping a trainer chip filters the list to that trainer's members client-side`
- [ ] `MembersScreen > unassign action > Unassign button is shown only when the member has a trainer assigned`
- [ ] `trainers.store > removeTrainer > calls DELETE api and removes the trainer from local list`

*Integration / E2E:*
- [x] (Detox `mobile/e2e/owner/member-assign.spec.ts`) Owner taps Reassign on a member, picks a trainer in the sheet → toast confirms; member now appears under the new trainer filter
- [x] (Detox extend `mobile/e2e/owner/trainers.spec.ts`) Owner taps Remove on a trainer → dialog warns of "X members will become unassigned"; confirming removes the trainer from the list (and Cancel leaves it)

**TDD sequence**:
1. Failing Jest tests → Red
2. Add api fns + store methods, ReassignTrainerSheet, filter row, unassign dialog, trainer Remove dialog → Green
3. Detox specs → pass; design-reviewer on both screens + sheet

**Status**: Complete

### Stage 6 Checkpoint
- [x] `members.store > assignTrainer`
- [x] `members.store > unassignTrainer`
- [x] `trainers.store > removeTrainer`
- [x] `MembersScreen > trainer filter chip`
- [x] `MembersScreen > unassign button conditional`
- [x] Detox `mobile/e2e/owner/member-assign.spec.ts`
- [x] Detox `mobile/e2e/owner/trainers.spec.ts` extended with Remove tests

---

## Architectural Risks / Notes for Generators

1. **Shared DB model drift (high):** The `CheckInConfig` collection is shared with `web/`. The backend Mongoose model MUST use the same collection name and field shape as `web/src/lib/db/models/check-in-config.model.ts` (including `minute` and `reminderSentAt`) or web's reminder logic breaks. Do not rename the collection.
2. **Do not fabricate `dayCompleted` (high):** The nutrition daily-log model has no completion flag and no stored target. "Completion" must be derived ("Logged" = has meal items) and "actual vs target" computed client-side. Adding a fake field would be a placeholder violation.
3. **PersonalBest is one-row-per-exercise (medium):** Gap 2B's "history" line chart cannot come from PersonalBest — it must use the existing `exercise/:exerciseId` session-derived endpoint (cap raised to 20 in Stage 2). The PRs grid (2A) uses PersonalBest directly.
4. **Existing reassign endpoint is not reused for owner Members (medium):** `PATCH /trainers/:id/members/:memberId/reassign` requires a current owning trainer and rejects null. Stage 1 adds the cleaner `PATCH /members/:id/assign-trainer` for the owner screen; do not try to bend the old endpoint.
5. **Stage ordering:** Stages 1 and 2 (backend) must complete before Stages 3-6. Among mobile stages, 3/4/5/6 are independent and may be generated in any order once backend is green. Stage 5 bundles the pure-UI Gap 4 with Gap 3 for efficiency.
