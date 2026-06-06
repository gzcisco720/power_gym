# Sprint 8 — Mobile Parity Round 3 Implementation Plan

## Goal
Close 5 confirmed mobile parity gaps so the mobile app's Check-In dashboard, Member Overview, Trainer Overview, Workout Session, and Journey screens match the depth of their web equivalents.

## Application
cross-app — `backend/` (NestJS) + `mobile/` (React Native + Expo). No `web/` changes.

Backend work is required for Gap 2 (member overview stats), Gap 3 (trainer overview stats), Gap 4 (RPE on finish + add/delete sets), and Gap 5 (journey timeline). All backend stages come before the mobile stages that depend on them. Gap 1 is mobile-only.

## Scope

**In scope:**
- Gap 1 — Member Check-In dashboard: add Achievements, Wellness Breakdown, Body Metrics, Progress Photos, Compare sections (all from already-fetched check-ins data)
- Gap 2 — Member Detail Overview tab: KPI strip, Active Plan card, Health summary, body-comp mini chart, 90-day training heatmap (backed by a new aggregate endpoint)
- Gap 3 — Trainer Detail Overview tab: 6-cell KPI grid, weekly schedule bar chart, 6-month sessions trend (backed by a new aggregate endpoint)
- Gap 4 — Workout Session: elapsed timer, RPE prompt at completion, add/delete sets (with backend support)
- Gap 5 — Journey screen: chronological timeline with cursor pagination + summary header (backed by a new timeline endpoint)

**Out of scope:**
- Superset visual grouping in the workout session (PlanDayExercise already carries `groupId`/`isSuperset`, but grouped UI is deferred — sets stay grouped by exercise only)
- Any new `web/` UI or `web/` parity work in the reverse direction
- Trainer-logged-on-behalf RPE/add-set flows in `TrainerWorkoutSessionScreen` (Gap 4 targets the member's own `WorkoutSessionScreen` only; trainer flow is a follow-up)
- Editing/deleting timeline events; the Journey timeline is read-only
- Nutrition-day events in the Journey timeline (the existing summary covers nutrition separately; timeline covers sessions, body tests, check-ins, streak milestones, joined)

## Affected Files

### Backend
- `backend/src/modules/training/dto/finish-session.dto.ts` (create) — optional `rpe` body for finish
- `backend/src/modules/training/dto/patch-set.dto.ts` (modify) — allow `isExtraSet` for newly added sets
- `backend/src/modules/training/dto/delete-set.dto.ts` (create) — `exerciseId` + `setNumber`
- `backend/src/modules/training/training.controller.ts` (modify) — accept `rpe` on finish, add `POST .../sets/add` + `DELETE .../sets`
- `backend/src/modules/training/training.service.ts` (modify) — `finishSession`/`finishMemberSession` accept rpe; `addSet`/`deleteSet` methods
- `backend/src/modules/training/training.controller.spec.ts` (modify)
- `backend/src/modules/training/training.service.spec.ts` (modify)
- `backend/test/training.e2e-spec.ts` (modify)
- `backend/src/modules/members/members.controller.ts` (modify) — add `GET :id/overview-stats`
- `backend/src/modules/members/members.service.ts` (modify) — `getOverviewStats`
- `backend/src/modules/members/dto/member-response.types.ts` (modify or create) — `MemberOverviewStats` shape
- `backend/src/modules/members/members.controller.spec.ts` / `members.service.spec.ts` (modify)
- `backend/test/members.e2e-spec.ts` (modify or create)
- `backend/src/modules/trainers/trainers.controller.ts` (modify) — add `GET :id/overview-stats`
- `backend/src/modules/trainers/trainers.service.ts` (modify) — `getOverviewStats`
- `backend/src/modules/trainers/dto/trainer-response.types.ts` (modify) — `TrainerOverviewStats` shape
- `backend/src/modules/trainers/trainers.controller.spec.ts` / `trainers.service.spec.ts` (modify)
- `backend/test/trainers.e2e-spec.ts` (modify)
- `backend/src/modules/journey/journey.controller.ts` (modify) — add `GET /journey/timeline`
- `backend/src/modules/journey/journey.service.ts` (modify) — `getTimeline` with cursor pagination
- `backend/src/modules/journey/dto/journey-timeline.dto.ts` (create) — query params (`cursor`, `limit`)
- `backend/src/modules/journey/journey.controller.spec.ts` / `journey.service.spec.ts` (modify)
- `backend/test/journey.e2e-spec.ts` (modify)

### Mobile — types & data
- `mobile/src/types/check-ins.ts` (no change expected — fields already present)
- `mobile/src/types/members.ts` (modify) — `MemberOverviewStats`
- `mobile/src/types/trainers.ts` (modify) — `TrainerOverviewStats`
- `mobile/src/types/training.ts` (modify) — `rpe` on finish input; add-set/delete-set inputs
- `mobile/src/types/journey.ts` (modify) — `JourneyTimelineItem`, `JourneyTimelinePage`
- `mobile/src/lib/api/members.api.ts` (modify) — `fetchMemberOverviewStats`
- `mobile/src/lib/api/trainers.api.ts` (modify) — `fetchTrainerOverviewStats`
- `mobile/src/lib/api/training.api.ts` (modify) — `finishSession(rpe)`, `addSet`, `deleteSet` (+ member variants)
- `mobile/src/lib/api/journey.api.ts` (modify) — `fetchJourneyTimeline(cursor)`
- `mobile/src/stores/members.store.ts` (modify) — hold overview stats in detail
- `mobile/src/stores/trainers.store.ts` (modify) — hold overview stats
- `mobile/src/stores/training.store.ts` (modify) — finish-with-rpe, add/delete set actions
- `mobile/src/stores/journey.store.ts` (modify) — paginated timeline state

### Mobile — UI
- `mobile/src/screens/check-in/CheckInScreen.tsx` (modify) — Gap 1
- `mobile/src/screens/check-in/components/AchievementsSection.tsx` (create)
- `mobile/src/screens/check-in/components/WellnessBreakdownSection.tsx` (create)
- `mobile/src/screens/check-in/components/BodyMetricsSummarySection.tsx` (create)
- `mobile/src/screens/check-in/components/ProgressPhotosSection.tsx` (create)
- `mobile/src/screens/check-in/components/CompareCard.tsx` (create)
- `mobile/src/lib/check-ins/wellness.ts` (create) — streak + wellness helpers, unit-tested
- `mobile/src/screens/members/tabs/MemberOverviewTab.tsx` (modify) — Gap 2
- `mobile/src/screens/members/components/TrainingHeatmap.tsx` (create)
- `mobile/src/screens/trainers/components/TrainerOverviewTab.tsx` (modify) — Gap 3
- `mobile/src/screens/trainers/components/WeeklyScheduleBar.tsx` (create)
- `mobile/src/screens/trainers/components/SessionsTrendChart.tsx` (create)
- `mobile/src/screens/my-training/WorkoutSessionScreen.tsx` (modify) — Gap 4
- `mobile/src/screens/my-training/components/RpeSheet.tsx` (create)
- `mobile/src/lib/training/elapsed.ts` (create) — elapsed-time formatter, unit-tested
- `mobile/src/screens/journey/JourneyScreen.tsx` (modify) — Gap 5
- `mobile/src/screens/journey/components/TimelineNode.tsx` (create)
- `mobile/src/screens/journey/components/JourneySummaryHeader.tsx` (create)

### Mobile — E2E (Detox)
- `mobile/e2e/member/check-in-dashboard.spec.ts` (create)
- `mobile/e2e/trainer/member-overview.spec.ts` (create)
- `mobile/e2e/trainer/trainer-overview.spec.ts` (create)
- `mobile/e2e/member/workout-session.spec.ts` (create or modify)
- `mobile/e2e/member/journey-timeline.spec.ts` (create)

---

## Stage 1: Backend — Member & Trainer overview-stats endpoints

**Goal**: Two new authenticated aggregate endpoints that supply every KPI/chart datum Gaps 2 and 3 need, so the mobile screens make exactly one call each.

`GET /members/:id/overview-stats` (owner, trainer scoped to own members) returns:
`{ sessionsThisMonth, weight: { value, deltaKg } | null, bodyFat: { pct, deltaPct } | null, topPR: { exerciseName, estimatedOneRM } | null, activePlan: { name, dayCount } | null, activeInjuryCount, activeMedicationCount, weightTrend: { date, weight }[] (last 4 body tests, oldest→newest), heatmap: { date, count }[] (last 90 days, only days with count>0) }`

`GET /trainers/:id/overview-stats` (owner only — matches existing trainers controller guard) returns:
`{ memberCount, sessionsThisMonth, templateCount, activeMembersThisMonth, newPRsThisMonth, avgStreakDays, weeklySchedule: { day: WeekDay, count }[] (Mon–Sun this week), sessionsTrend: { month: 'YYYY-MM', count }[] (last 6 months, oldest→newest) }`

Sources: `WorkoutSession` (completed, by member/trainer's members), `BodyTest`, `PersonalBest`, `MemberPlan`, `ScheduledSession`, `PlanTemplate`, injuries/medications models. `newPRsThisMonth` = count of PersonalBest docs with `achievedAt` in current month across the trainer's members. `avgStreakDays` = mean of per-member current streak (reuse the streak walk-back logic from `JourneyService.computeStreak`, extracted to a shared helper).

**Files**: members.controller/service(+spec), trainers.controller/service(+spec), member/trainer response DTO types, members & trainers e2e specs.

**Sprint Contract**:

*Unit tests:*
- [ ] `MembersService > getOverviewStats > returns sessionsThisMonth counting only this-month completed sessions for the member`
- [ ] `MembersService > getOverviewStats > returns weight delta as latest minus previous body test, null when fewer than 1 test`
- [ ] `MembersService > getOverviewStats > returns topPR with highest estimatedOneRM, null when member has no PRs`
- [ ] `MembersService > getOverviewStats > returns heatmap entries only for days with at least one completed session in the last 90 days`
- [ ] `MembersService > getOverviewStats > throws NotFoundException when trainer requests a member not assigned to them`
- [ ] `TrainersService > getOverviewStats > activeMembersThisMonth counts distinct members with a completed session this month`
- [ ] `TrainersService > getOverviewStats > newPRsThisMonth counts PersonalBest docs achieved this month across the trainer's members`
- [ ] `TrainersService > getOverviewStats > weeklySchedule returns 7 entries Mon–Sun with per-day scheduled-session counts`
- [ ] `TrainersService > getOverviewStats > sessionsTrend returns 6 month buckets oldest→newest`
- [ ] `TrainersService > getOverviewStats > throws NotFoundException when id is not a trainer`

*Integration:*
- [ ] `GET /members/:id/overview-stats` as owner → 200 with the full stats shape (all keys present)
- [ ] `GET /members/:id/overview-stats` as a trainer for a member of another trainer → 404
- [ ] `GET /members/:id/overview-stats` with no auth token → 401
- [ ] `GET /trainers/:id/overview-stats` as owner → 200 with all KPI + chart keys present
- [ ] `GET /trainers/:id/overview-stats` as a member (forbidden role) → 403

**TDD sequence**:
1. Write failing unit tests for both service methods → Red
2. Implement `getOverviewStats` in each service (extract shared streak helper) → Green
3. Add controller routes + integration tests against the real Nest test app → passes

**Status**: Not Started

---

## Stage 2: Backend — Workout finish RPE + add/delete sets

**Goal**: The finish endpoint accepts an optional RPE, and members (and trainers on behalf) can add an extra set or delete a non-prescribed set on an in-progress session.

`POST /training/sessions/:id/finish` body `{ rpe?: 1–10 }` → persists `session.rpe`.
`POST /training/sessions/:id/sets/add` body `{ exerciseId }` → appends a new set with `setNumber = max(existing setNumber for exercise)+1`, `isExtraSet: true`, prescribed reps copied from the exercise's existing sets, returns the updated session.
`DELETE /training/sessions/:id/sets` body `{ exerciseId, setNumber }` → removes the matching set; rejects with 400 if the set is not `isExtraSet` (prescribed sets cannot be deleted) or is already completed... allow deleting completed extra sets but never prescribed ones.
Mirror all three on the `members/:memberId/...` trainer-scoped routes.

`PatchSetDto` gains optional `isExtraSet` so logging an added set's reps/weight still validates.

**Files**: finish-session.dto.ts (create), delete-set.dto.ts (create), patch-set.dto.ts (modify), training.controller(+spec), training.service(+spec), training.e2e-spec.ts.

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainingService > finishSession > persists rpe when provided and leaves rpe null when omitted`
- [ ] `TrainingService > finishSession > throws BadRequestException when session already completed`
- [ ] `TrainingService > addSet > appends an isExtraSet set with setNumber one greater than the exercise's current max`
- [ ] `TrainingService > addSet > throws NotFoundException when the exerciseId is not part of the session`
- [ ] `TrainingService > deleteSet > removes the matching extra set and returns the updated session`
- [ ] `TrainingService > deleteSet > throws BadRequestException when targeting a prescribed (non-extra) set`

*Integration:*
- [ ] `POST /training/sessions/:id/finish` with `{ rpe: 8 }` as the owning member → 200 and response `rpe` equals 8
- [ ] `POST /training/sessions/:id/finish` with `{ rpe: 11 }` → 400 (validation)
- [ ] `POST /training/sessions/:id/sets/add` then `PATCH .../sets` logging that set → both 200, set appears completed in the returned session
- [ ] `DELETE /training/sessions/:id/sets` for a prescribed set → 400

**TDD sequence**:
1. Write failing service unit tests → Red
2. Implement `rpe` on finish + `addSet`/`deleteSet` and DTOs → Green
3. Wire controller routes + integration tests → passes

**Status**: In Progress

### Stage 2 Checkpoint
- [ ] finish-session.dto.ts (create)
- [ ] delete-set.dto.ts (create)
- [ ] patch-set.dto.ts (add isExtraSet)
- [ ] TrainingService unit tests (Red)
- [ ] TrainingService implementation (Green)
- [ ] TrainingController routes + controller tests
- [ ] Integration tests in training.e2e-spec.ts

---

## Stage 3: Backend — Journey timeline endpoint

**Goal**: A cursor-paginated chronological feed of a member's events powering the Journey timeline.

`GET /journey/timeline?cursor=<ISO>&limit=20` (member only) returns
`{ items: JourneyTimelineItem[], nextCursor: string | null }` sorted newest-first.
`JourneyTimelineItem = { id, type, date (ISO) } & typeData` where `type` is one of `session_completed | body_test | check_in | streak_milestone | joined`, with:
- `session_completed`: `{ dayName, completedSetCount }`
- `body_test`: `{ weight, bodyFatPct }`
- `check_in`: `{ wellnessAvg }`
- `streak_milestone`: `{ days }` (emitted at 7/14/30/60/100-day streak crossings derived from completed-session dates)
- `joined`: `{ }` (the member's `createdAt`, always the oldest item)

Pagination is by the `date` field: `cursor` is the date of the last item from the previous page; the next page returns items strictly older than the cursor. `limit` defaults to 20, capped at 50.

**Files**: journey.controller(+spec), journey.service(+spec), journey-timeline.dto.ts (create), journey.e2e-spec.ts.

**Sprint Contract**:

*Unit tests:*
- [ ] `JourneyService > getTimeline > merges sessions, body tests, check-ins, streak milestones and joined into one list sorted newest-first`
- [ ] `JourneyService > getTimeline > returns at most limit items and a nextCursor equal to the last item's date when more remain`
- [ ] `JourneyService > getTimeline > returns nextCursor null on the final page`
- [ ] `JourneyService > getTimeline > emits a streak_milestone item only at 7/14/30/60/100-day crossings`
- [ ] `JourneyService > getTimeline > always includes a joined item as the oldest entry`

*Integration:*
- [ ] `GET /journey/timeline` as a member → 200 with `items` and `nextCursor` keys, items in descending date order
- [ ] `GET /journey/timeline?limit=2` followed by a second call with the returned `nextCursor` → no duplicate ids across the two pages
- [ ] `GET /journey/timeline` as a trainer (forbidden role) → 403

**TDD sequence**:
1. Write failing service unit tests with seeded sessions/tests/check-ins → Red
2. Implement `getTimeline` + DTO → Green
3. Add controller route + pagination integration tests → passes

**Status**: Complete

### Stage 3 Checkpoint
- [x] JourneyService > getTimeline unit tests
- [x] JourneyService > getTimeline implementation
- [x] journey-timeline.dto.ts
- [x] JourneyController > timeline route + unit tests
- [x] journey.e2e-spec.ts integration tests

---

## Stage 4: Mobile — Check-In dashboard rich sections (Gap 1)

**Goal**: The member Check-In screen renders Achievements, Wellness Breakdown, Body Metrics, Progress Photos (with fullscreen modal), and a Compare card — all derived from the already-loaded check-ins list, no new API call.

Add `mobile/src/lib/check-ins/wellness.ts` with pure helpers: `computeCheckInStreakWeeks(items)`, `wellnessBreakdown(checkIn)` (returns the 7 labeled 0–10 values), `latestWithBodyMetrics(items)`, `latestPhotos(items, 6)`. Sections only render when their data exists. Achievement badges: 7/14/30/60/100, achieved (colored) vs locked (`text-foreground/35`). Photos use a 3-column grid; tap opens a fullscreen modal (reuse pattern from existing `FullscreenPhotoModal`). Compare card shows the two most recent check-ins side by side (date, wellness avg, weight).

**Files**: CheckInScreen.tsx (modify), 5 new section components, wellness.ts (create), check-in-dashboard.spec.ts (create).

**Sprint Contract**:

*Unit tests:*
- [ ] `wellness > computeCheckInStreakWeeks > returns consecutive-week count from most recent, breaking on a gap`
- [ ] `wellness > wellnessBreakdown > returns 7 entries with the slider label and value for the given check-in`
- [ ] `wellness > latestWithBodyMetrics > returns the most recent check-in having any non-null body metric, null when none`
- [ ] `wellness > latestPhotos > returns up to 6 most recent photos flattened from the check-ins`
- [ ] `AchievementsSection > renders > marks a badge achieved when streak >= its threshold and locked otherwise`
- [ ] `CompareCard > renders > shows two columns with each check-in's date and wellness average`

*E2E (Detox):*
- [ ] Member opens Check-In screen with seeded check-ins → Achievements, Last Check-In Wellness, Body Metrics, Progress Photos, and Compare sections are all visible
- [ ] Member taps a progress photo thumbnail → fullscreen photo modal opens and can be dismissed

**TDD sequence**:
1. Write failing Jest unit tests for `wellness.ts` helpers and section components → Red
2. Implement helpers + section components, wire into CheckInScreen → Green
3. Write Detox spec, run against simulator → passes

**Status**: Complete

### Stage 4 Checkpoint
- [x] wellness.ts helpers
- [x] AchievementsSection component
- [x] WellnessBreakdownSection component
- [x] BodyMetricsSummarySection component
- [x] ProgressPhotosSection component
- [x] CompareCard component
- [x] CheckInScreen wired up

---

## Stage 5: Mobile — Member Detail Overview hub (Gap 2)

**Goal**: Replace the 3-date overview with a KPI strip, Active Plan card, Health summary, body-comp mini chart, and 90-day training heatmap, fed by the Stage 1 `overview-stats` endpoint.

Add `fetchMemberOverviewStats` to members.api, hold the result in members.store detail, render in `MemberOverviewTab`. 4-cell KPI strip: Sessions This Month, Weight (kg)+delta, Body Fat %+delta, Top PR (name + 1RM). Active Plan card shows name + day count or "No plan assigned". Health panel shows active injury/medication counts. Mini chart = weight trend from `weightTrend`. `TrainingHeatmap` renders a 90-day grid colored by `count` (muted→primary intensity buckets). Quick-access links to Body Tests / Health remain.

**Files**: members.api.ts, members.store.ts, types/members.ts (modify), MemberOverviewTab.tsx (modify), TrainingHeatmap.tsx (create), member-overview.spec.ts (create).

**Sprint Contract**:

*Unit tests:*
- [ ] `membersStore > fetchMemberDetail > stores overviewStats alongside existing detail fields`
- [ ] `MemberOverviewTab > renders > displays sessionsThisMonth, weight+delta, bodyFat+delta, and top PR in the KPI strip`
- [ ] `MemberOverviewTab > renders > shows "No plan assigned" when activePlan is null`
- [ ] `MemberOverviewTab > renders > shows active injury and medication counts in the health panel`
- [ ] `TrainingHeatmap > renders > assigns a higher-intensity class to days with more sessions than days with fewer`

*E2E (Detox):*
- [ ] Trainer opens a member detail Overview tab → KPI strip, Active Plan card, Health panel, and training heatmap are all visible with seeded data
- [ ] Trainer opens Overview for a member with no plan → Active Plan card shows "No plan assigned"

**TDD sequence**:
1. Write failing store + component unit tests → Red
2. Add API/store wiring + rebuild MemberOverviewTab + TrainingHeatmap → Green
3. Write Detox spec, run against simulator → passes

**Status**: Not Started

---

## Stage 6: Mobile — Trainer Detail Overview metrics (Gap 3)

**Goal**: Replace the 2-KPI stub with a 6-cell KPI grid, weekly schedule bar chart, and 6-month sessions trend, fed by the Stage 1 trainer `overview-stats` endpoint.

Add `fetchTrainerOverviewStats` to trainers.api, hold in trainers.store, render in `TrainerOverviewTab`. KPI grid: Members, Sessions/Mo, Templates, Active/Mo, New PRs/Mo, Avg Streak. `WeeklyScheduleBar` renders Mon–Sun bars from `weeklySchedule`. `SessionsTrendChart` renders the 6-month `sessionsTrend` as a bar/area chart. All values come straight from the endpoint.

**Files**: trainers.api.ts, trainers.store.ts, types/trainers.ts (modify), TrainerOverviewTab.tsx (modify), WeeklyScheduleBar.tsx + SessionsTrendChart.tsx (create), trainer-overview.spec.ts (create).

**Sprint Contract**:

*Unit tests:*
- [ ] `trainersStore > fetchTrainerOverviewStats > stores stats and clears loading on success`
- [ ] `TrainerOverviewTab > renders > shows all 6 KPI cells with their values`
- [ ] `WeeklyScheduleBar > renders > renders 7 day bars Mon–Sun with heights proportional to counts`
- [ ] `SessionsTrendChart > renders > renders one bar per month for the 6-month trend`

*E2E (Detox):*
- [ ] Owner opens a trainer detail Overview tab → the 6 KPI cells, weekly schedule chart, and 6-month trend chart are all visible
- [ ] Owner opens Overview for a trainer with no sessions → KPI cells render zeros and charts render empty/zeroed without crashing

**TDD sequence**:
1. Write failing store + component unit tests → Red
2. Add API/store wiring + rebuild TrainerOverviewTab + charts → Green
3. Write Detox spec, run against simulator → passes

**Status**: Not Started

---

## Stage 7: Mobile — Workout Session timer, RPE, add/delete sets (Gap 4)

**Goal**: The member workout session shows an elapsed mm:ss timer, prompts for RPE on finish, and supports adding/deleting sets per exercise — all wired to the Stage 2 endpoints.

Add `mobile/src/lib/training/elapsed.ts` (`formatElapsed(startedAtISO, now)` → `mm:ss`). Header shows a live timer ticking from `session.startedAt` (interval cleared on unmount; respects `useReducedMotion` by still updating value). Each exercise group gets an "Add Set" button (calls `addSet`), each extra set row gets a delete button (calls `deleteSet`). Tapping "Finish Workout" opens `RpeSheet` (1–10 selector); confirming calls `finishSession(rpe)` then navigates back. Store gains `addSet`/`deleteSet`/`finishWorkout(rpe)` actions.

**Files**: WorkoutSessionScreen.tsx (modify), RpeSheet.tsx (create), elapsed.ts (create), training.store.ts + training.api.ts + types/training.ts (modify), workout-session.spec.ts (create/modify).

**Sprint Contract**:

*Unit tests:*
- [ ] `elapsed > formatElapsed > formats a 75-second difference as "01:15"`
- [ ] `trainingStore > finishWorkout > calls finishSession with the provided rpe and clears activeSession`
- [ ] `trainingStore > addSet > appends the returned session's new set to activeSession`
- [ ] `trainingStore > deleteSet > removes the set from activeSession on success`
- [ ] `RpeSheet > renders > calls onConfirm with the selected rpe value`

*E2E (Detox):*
- [ ] Member starts a session, taps "Add Set" on an exercise → a new editable set row appears and can be logged
- [ ] Member taps "Finish Workout", selects an RPE, confirms → returns to training screen and the elapsed timer was visible during the session

**TDD sequence**:
1. Write failing unit tests for `elapsed`, store actions, RpeSheet → Red
2. Implement timer, RpeSheet, add/delete UI + store actions → Green
3. Write Detox spec, run against simulator → passes

**Status**: Not Started

---

## Stage 8: Mobile — Journey timeline (Gap 5)

**Goal**: Replace the Journey summary view with a scrollable, infinitely-paginated timeline plus a summary header, backed by the Stage 3 timeline endpoint.

Add `fetchJourneyTimeline(cursor)` to journey.api; journey.store gains `items`, `nextCursor`, `loadingMore`, `fetchTimeline()`, `fetchMore()`. `JourneySummaryHeader` shows total sessions, current streak, total body tests, and member-since date (reuse the existing `/journey` summary call for the header counts). The list renders `TimelineNode` items (type-specific icon/label/data) and triggers `fetchMore` on end-reached when `nextCursor` is non-null. Empty state preserved when there are no events.

**Files**: JourneyScreen.tsx (modify), TimelineNode.tsx + JourneySummaryHeader.tsx (create), journey.store.ts + journey.api.ts + types/journey.ts (modify), journey-timeline.spec.ts (create).

**Sprint Contract**:

*Unit tests:*
- [ ] `journeyStore > fetchTimeline > populates items and nextCursor from the first page`
- [ ] `journeyStore > fetchMore > appends the next page's items and updates nextCursor`
- [ ] `journeyStore > fetchMore > is a no-op when nextCursor is null`
- [ ] `TimelineNode > renders > renders the correct label and data for a session_completed item`
- [ ] `TimelineNode > renders > renders the streak day count for a streak_milestone item`
- [ ] `JourneySummaryHeader > renders > shows total sessions, current streak, total body tests, and member-since date`

*E2E (Detox):*
- [ ] Member opens Journey → summary header and a chronological list of timeline nodes are visible
- [ ] Member scrolls to the end of the first page → additional older timeline items load (infinite scroll)

**TDD sequence**:
1. Write failing store + component unit tests → Red
2. Implement paginated store + TimelineNode + summary header, rebuild JourneyScreen → Green
3. Write Detox spec, run against simulator → passes

**Status**: Not Started
