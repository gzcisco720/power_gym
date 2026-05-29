# v2 Visual Gaps — Implementation Plan

## Goal
Bring the v2 SPA (`frontend/`) to visual + functional parity with the v1 app (`web/`) for the member hub overview, nutrition template cards, equipment status, owner members management, and the member training landing — using only data the v2 backend already exposes.

## Scope

**In scope (this plan — frontend-only, all data already available from existing `/api/v1/...` endpoints):**
- Nutrition template cards: add the per-day macro row (kcal/d, protein, carbs, fat). Backend already returns denormalized per-item macros — compute averages client-side.
- Equipment Status on the Owner Dashboard: status-count badges (Active / Maintenance / Retired) + colored per-item status badges, replacing the plain text list.
- Member Hub Overview tab (`/trainer/members/:id`): member header (avatar, name, email, join date, "Log Workout" button); stat strip (Weight, Body Fat, Sessions last 90 days, Last Session); Active Plan card with recent sessions; Body Composition dual-line chart (weight + body-fat%); Training Frequency heatmap; Health sidebar (active injury).
- Owner Members page (`/owner/members`): Trainer filter dropdown ("All Trainers" + each trainer) that filters the list; "Unassign" action on member rows (sets trainerId to null via existing `assignTrainer` endpoint with null).
- Member My Training landing (`/member/my-training`): add the ActivityStrip (last-14-day streak dots + session count / month stats) above the existing path cards, matching v1.

**Out of scope (requires NEW backend aggregate endpoints — NOT covered here, see "Deferred — backend required"):**
- Trainer Dashboard (`/trainer/...`) full build: KPI strip, Today's Sessions, Needs Attention, Pending Check-ins, Member Compliance, Recent PRs, My Training card, This Week schedule. No aggregate endpoints exist; `/trainer` currently redirects to `/trainer/members`.
- Owner Dashboard "Trainer Performance: This Month" rows with per-trainer session counts. `getOwnerStats` and `listTrainers` return no session data.
- Owner Trainers page per-trainer "SESSIONS" count. Same missing data.
- Owner Dashboard "Sessions / Month" / active-members stat cards (currently "—").
- "View Hub →" button on owner member rows: there is NO owner member-detail route, and the owner role guard blocks `/trainer/*`. Adding owner-side member hub access is a separate feature.

**Corrections to the original gap report (verified against code):**
- `/member/my-training` is NOT a blank stub — it already renders Plan + Freestyle path cards. The real gap is the missing ActivityStrip (streak dots / session count). v1 uses path cards, not "day tabs / exercise list."
- Owner Dashboard Member Growth already renders as fl. CSS bars (not horizontal lines, not recharts). No fix needed; excluded.
- `/trainer/dashboard` route does not exist; `/trainer` → `/trainer/members`. Trainer dashboard is deferred (backend-blocked).

## Affected Files

**Created:**
- `frontend/src/lib/nutrition/macro-totals.ts` — pure helpers: sum/average template macros per day type
- `frontend/src/__tests__/lib/nutrition/macro-totals.test.ts`
- `frontend/src/components/owner/equipment-status-panel.tsx` — status counts + item badges
- `frontend/src/__tests__/components/owner/equipment-status-panel.test.tsx`
- `frontend/src/components/trainer/member-hub-overview.tsx` — Overview tab content (header + sections)
- `frontend/src/components/trainer/member-stat-strip.tsx`
- `frontend/src/components/trainer/member-plan-card.tsx`
- `frontend/src/components/trainer/member-body-composition-chart.tsx`
- `frontend/src/components/trainer/member-training-frequency.tsx`
- `frontend/src/components/trainer/member-health-panel.tsx`
- `frontend/src/lib/training/session-stats.ts` — pure helpers: sessions-in-window, last-session, 14-week heatmap buckets
- `frontend/src/__tests__/lib/training/session-stats.test.ts`
- `frontend/src/__tests__/components/trainer/member-hub-overview.test.tsx`
- `frontend/src/components/self-tracking/activity-strip.tsx` — member training streak strip
- `frontend/src/__tests__/components/self-tracking/activity-strip.test.tsx`
- `frontend/e2e/member-hub.spec.ts`
- `frontend/e2e/owner-members-filter.spec.ts`

**Modified:**
- `frontend/src/api/nutrition.ts` — fix `NutritionMeal`/`NutritionTemplate` item type to match backend (`foodName`, `quantityG`, `kcal`, `protein`, `carbs`, `fat`)
- `frontend/src/pages/trainer/nutrition.tsx` — render macro row using helpers
- `frontend/src/pages/owner/dashboard.tsx` — swap plain equipment list for `EquipmentStatusPanel`
- `frontend/src/pages/trainer/member-hub.tsx` — render `MemberHubOverview` under the tab nav
- `frontend/src/pages/owner/members.tsx` — add trainer filter dropdown + Unassign action
- `frontend/src/pages/member/my-training.tsx` — add `ActivityStrip`
- `frontend/src/stores/usersStore.ts` — add `unassignTrainer` (calls existing assign endpoint with null)
- `frontend/src/api/users.ts` — allow `assignTrainer` to accept `trainerId: string | null`
- `frontend/e2e/trainer.spec.ts` / `frontend/e2e/owner.spec.ts` — extend if existing specs touch these flows

## Deferred — backend required (NOT in this plan)
Trainer Dashboard, Owner trainer-performance rows, Owner/Trainer per-trainer session counts, and "View Hub" for owner all need new NestJS aggregate endpoints (e.g. `GET /api/v1/trainer/dashboard`, per-trainer session aggregation in `getOwnerStats`/`listTrainers`) plus an owner member-detail route. These should be a separate brainstorm + plan.

---

## Stage 1: Nutrition Macro Row + Equipment Status Panel

**Goal**: Nutrition template cards show a per-day average macro row; Owner Dashboard shows equipment status-count badges and colored per-item status badges.

Note: the v2 `NutritionTemplate` frontend type is currently wrong — it declares `items: { foodId, servingGrams }`, but the backend returns `items: { foodName, quantityG, kcal, protein, carbs, fat }` (see `backend/src/database/models/nutrition-template.model.ts`). Stage 1 corrects the type first, then computes averages client-side. No backend change.

**Sprint Contract**:

*Unit tests:*
- [ ] `macro-totals > averagePerDay > returns {kcal,protein,carbs,fat} averaged across all dayTypes for a multi-day template` — asserts numeric averages rounded to integers
- [ ] `macro-totals > averagePerDay > returns null when template has zero dayTypes` — asserts `null`
- [ ] `macro-totals > averagePerDay > sums all meal items within each day before averaging` — asserts a single-day template equals the sum of its items
- [ ] `EquipmentStatusPanel > renders counts > shows Active/Maintenance/Retired counts matching the equipment array` — asserts each count number
- [ ] `EquipmentStatusPanel > item badge > applies emerald tone for active, amber for maintenance, muted for retired` — asserts class tokens per status
- [ ] `EquipmentStatusPanel > empty > renders "No equipment tracked" when array is empty`

*Integration / E2E:*
- [ ] Trainer opens `/trainer/nutrition` with a seeded template that has meals → each template card shows a macro row containing a `kcal/d` value > 0 and protein/carbs/fat gram values
- [ ] Owner opens `/owner` (dashboard) with seeded equipment → Equipment Status panel shows a count badge for "Active" and at least one item row with a colored status badge whose text matches the item's status

**TDD sequence**:
1. Write failing unit tests for `macro-totals` and `EquipmentStatusPanel` → Red
2. Correct `api/nutrition.ts` types; implement helpers + panel; wire into `nutrition.tsx` and `dashboard.tsx` → Green
3. Write/extend E2E specs against the real backend seed → pass

**Status**: Complete

### Stage 1 Checkpoint
- [x] `frontend/src/lib/nutrition/macro-totals.ts`
- [x] `frontend/src/components/owner/equipment-status-panel.tsx`
- [x] `frontend/src/api/nutrition.ts` (fix item type)
- [x] `frontend/src/pages/trainer/nutrition.tsx` (macro row)
- [x] `frontend/src/pages/owner/dashboard.tsx` (EquipmentStatusPanel)
- [x] E2E: trainer /trainer/nutrition macro row
- [x] E2E: owner /owner dashboard equipment panel

---

## Stage 2: Member Hub Overview — Header + Stat Strip + Plan Card + Health Panel

**Goal**: The `/trainer/members/:id` Overview tab renders the member header (avatar, name, email, join date, "Log Workout" button), a 4-stat strip (Weight, Body Fat, Sessions last 90 days, Last Session), the Active Plan card with recent sessions, and the Health sidebar (active injury). Data comes from existing endpoints: `fetchMember`, `fetchBodyTests`, `fetchSessions`, `fetchMemberPlan`, `fetchInjuries`.

**Sprint Contract**:

*Unit tests:*
- [ ] `session-stats > countInWindow > counts only completed sessions within the last N days` — asserts integer count excluding older/incomplete sessions
- [ ] `session-stats > lastSession > returns the most recent completed session or null` — asserts correct object / null
- [ ] `MemberStatStrip > renders > shows latest weight and bodyFatPct from the most recent body test` — asserts displayed values
- [ ] `MemberStatStrip > empty > shows "—" for weight/body-fat when no body tests exist`
- [ ] `MemberPlanCard > with plan > renders plan name and a recent-sessions list of completed sessions` — asserts plan name + at least one session row
- [ ] `MemberPlanCard > no plan > renders an empty state prompting to assign a plan`
- [ ] `MemberHealthPanel > active injury > renders the active injury description; otherwise renders "No active injuries"`

*Integration / E2E:*
- [ ] Trainer navigates to `/trainer/members/:id` (Overview tab) for a seeded member with body tests + sessions → page shows the member name in the header, a "Log Workout" button, and a Sessions stat value (number)
- [ ] Trainer clicks "Log Workout" in the member header → URL changes to `/trainer/members/:id/log/new`

**TDD sequence**:
1. Write failing unit tests for `session-stats`, `MemberStatStrip`, `MemberPlanCard`, `MemberHealthPanel` → Red
2. Implement components + helpers; assemble in `MemberHubOverview`; render from `member-hub.tsx` under the tab nav → Green
3. Write `member-hub.spec.ts` E2E for the golden path + the "Log Workout" navigation → pass

**Status**: Complete

### Stage 2 Checkpoint
- [x] `frontend/src/lib/training/session-stats.ts`
- [x] `frontend/src/__tests__/lib/training/session-stats.test.ts`
- [x] `frontend/src/components/trainer/member-stat-strip.tsx`
- [x] `frontend/src/__tests__/components/trainer/member-stat-strip.test.tsx`
- [x] `frontend/src/components/trainer/member-plan-card.tsx`
- [x] `frontend/src/__tests__/components/trainer/member-plan-card.test.tsx`
- [x] `frontend/src/components/trainer/member-health-panel.tsx`
- [x] `frontend/src/__tests__/components/trainer/member-health-panel.test.tsx`
- [x] `frontend/src/components/trainer/member-hub-overview.tsx`
- [x] `frontend/src/pages/trainer/member-hub.tsx` (add MemberHubOverview + Log Workout button)
- [x] E2E: `frontend/e2e/member-hub.spec.ts`

---

## Stage 3: Member Hub Overview — Body Composition Chart + Training Frequency Heatmap

**Goal**: Add the dual-line Body Composition chart (weight + body-fat% over time, recharts) and the Training Frequency heatmap to the Overview tab, completing the member hub. recharts is already a dependency (used in `pages/member/journey.tsx`).

**Sprint Contract**:

*Unit tests:*
- [ ] `session-stats > frequencyBuckets > maps completed sessions to per-week counts over the trailing 14 weeks` — asserts an array of length 14 with correct counts
- [ ] `session-stats > frequencyBuckets > returns all-zero buckets when there are no sessions`
- [ ] `MemberBodyCompositionChart > with tests > renders chart with one point per body test (asserts data length via rendered point/legend nodes)`
- [ ] `MemberBodyCompositionChart > empty > renders an empty state when there are fewer than 2 body tests`
- [ ] `MemberTrainingFrequency > renders > renders 14 week cells and applies an intensity class to weeks with sessions`

*Integration / E2E:*
- [ ] Trainer opens `/trainer/members/:id` for a member with ≥2 body tests → a Body Composition chart region is visible (chart svg / legend present)
- [ ] Trainer opens `/trainer/members/:id` for a member with completed sessions → the Training Frequency heatmap renders and at least one week cell shows a non-empty intensity state

**TDD sequence**:
1. Write failing unit tests for `frequencyBuckets`, chart, and heatmap → Red
2. Implement `MemberBodyCompositionChart` (recharts dual-axis line) + `MemberTrainingFrequency`; add to `MemberHubOverview` → Green
3. Extend `member-hub.spec.ts` to assert chart + heatmap presence → pass

**Status**: Not Started

---

## Stage 4: Owner Members Filter + Unassign, and Member Training ActivityStrip

**Goal**: Owner Members page gains a Trainer filter dropdown ("All Trainers" + per trainer) that filters the list, plus an "Unassign" row action (existing `assignTrainer` endpoint with `trainerId: null`). Member My Training landing gains the v1 ActivityStrip (14-day streak dots + session count) above the path cards.

**Sprint Contract**:

*Unit tests:*
- [ ] `usersStore > unassignTrainer > calls assignTrainer with null and clears the member's trainerId in state` — asserts store member's `trainerId` becomes `null`
- [ ] `OwnerMembersPage > trainer filter > selecting a trainer in the dropdown re-fetches members with that trainerId` — asserts `fetchOwnerMembers` called with the trainer id
- [ ] `OwnerMembersPage > trainer filter > selecting "All Trainers" re-fetches with no trainerId`
- [ ] `ActivityStrip > full state > renders 14 day-dots and a month session count from props`
- [ ] `ActivityStrip > empty state > renders an encouraging empty message and zero filled dots`

*Integration / E2E:*
- [ ] Owner opens `/owner/members`, selects a specific trainer in the Trainer filter → list updates to show only that trainer's members (verify a member known to belong elsewhere is no longer listed)
- [ ] Owner clicks "Unassign" on an assigned member row → row's trainer badge changes to "Unassigned" and a success toast appears
- [ ] Member opens `/member/my-training` → the ActivityStrip is visible above the Plan/Freestyle path cards, and "Start Session" still navigates to a session

**TDD sequence**:
1. Write failing unit tests for `unassignTrainer`, filter behaviour, and `ActivityStrip` → Red
2. Add `unassignTrainer` to store; widen `assignTrainer` API type to `string | null`; add Base UI `Select` filter + Unassign button to `members.tsx`; build `ActivityStrip` and add to `my-training.tsx` → Green
3. Extend `owner-members-filter.spec.ts` and the member E2E for the strip → pass

**Status**: Not Started

---

## Notes for Generator
- TypeScript strict: no `any`/`unknown`. Define explicit interfaces.
- Use Base UI primitives (`@/components/ui/select`, etc.) — never native `<select>`.
- Colors via oklch tokens / documented semantic classes only. Macro colors per v1 `nutrition-template-list.tsx`: kcal `text-orange-300`, protein `text-rose-300`, carbs `text-sky-300`, fat `text-amber-300`. Equipment status tones already defined in `pages/owner/equipment.tsx` (`STATUS_COLOURS`).
- Animation: import variants from `@/lib/animations/variants`; wrap in `<LazyMotion features={domAnimation}>`; respect `useReducedMotion()`.
- Charts: recharts (see `pages/member/journey.tsx` for the existing LineChart pattern).
- v1 references: member hub sections in `web/src/app/(dashboard)/trainer/members/[id]/_components/`; nutrition macro row in `web/.../nutrition/_components/nutrition-template-list.tsx`; member training ActivityStrip in `web/src/components/self-tracking/activity-strip.tsx` and `member-training-landing.tsx`.
- After each Green: run `/simplify` + `cd frontend && npx react-doctor@latest`. Every stage needs Vitest unit tests AND a passing Playwright spec against the real backend.
