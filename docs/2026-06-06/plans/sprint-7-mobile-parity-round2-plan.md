# Sprint 7: Mobile Feature Parity (Round 2) Implementation Plan

## Goal
Close five confirmed gaps between the mobile app and the reference web app: an Owner can drill into a Trainer's members (with metrics + reassignment), calendar, training plans, and nutrition plans; a Trainer/Owner can view a member's Billing; a Member can log food freely without a plan; the Trainer dashboard's "Review" and "View all" buttons navigate correctly; and Members can no longer create body tests (matching web's read-only-for-members rule).

## Application
cross-app — `backend/` (NestJS API) + `mobile/` (React Native + Expo). No `web/` changes; web is the reference implementation only.

## Architectural Context & Decisions

Read before implementing:

**Gap 1 (Trainer Hub depth):**
- `backend/src/modules/trainers/trainers.controller.ts` — `@Controller('trainers')` is `@Roles('owner')`. Only `GET /trainers` and `GET /trainers/:id` exist. The detail response (`trainers.service.ts > findOne`) returns members as plain `{ id, name, email }` — no streak/sessions/status.
- `backend/src/modules/plan-templates/plan-templates.controller.ts` and `.../nutrition-templates/nutrition-templates.controller.ts` — both expose only `GET /` returning the *caller's own* templates (`req.user.sub`). There is **no** creator-scoped endpoint to fetch *another* user's templates.
- `backend/src/modules/scheduled-sessions/scheduled-sessions.controller.ts` — `GET /scheduled-sessions` lists for the staff caller (owner sees all sessions). There is **no** `trainerId` filter param.
- Streak logic already exists: `backend/src/modules/dashboard/member-dashboard.service.ts > getStreakDays(memberObjId, now)` and the `sessionsThisMonth` count pattern (countDocuments on `WorkoutSession` with `completedAt >= startOfMonth`). The web `status` derivation is: `no-plan` if no active member-plan, else `active` if streak > 0, else `needs-attn` (see `web/.../trainers/[id]/members/page.tsx`).
- No member-reassign endpoint exists anywhere in `backend/`. The web reassign mutates `user.trainerId`.

**Decision — Gap 1 backend surface:** Add to the existing `trainers` module (owner-only), four new endpoints scoped to a target `:trainerId`:
- `GET /trainers/:id/members` → members with `{ id, name, email, streak, sessionsThisMonth, status }`
- `GET /trainers/:id/sessions` → that trainer's scheduled sessions (read-only calendar feed; reuse `ScheduledSession` query filtered by `trainerId`)
- `GET /trainers/:id/training-plans` → that trainer's plan templates (creator-scoped)
- `GET /trainers/:id/nutrition-plans` → that trainer's nutrition templates (creator-scoped)
- `PATCH /trainers/:id/members/:memberId/reassign` body `{ trainerId: string }` → reassigns a member to another trainer (or the owner). The `:id` path segment is the *current* trainer; validation ensures the member currently belongs to `:id`.

Streak + sessionsThisMonth computation is **extracted into a shared helper** rather than duplicated — `TrainersService` will inject the same `WorkoutSession` model and reuse the streak algorithm (copy the proven `getStreakDays` logic into a small private method on `TrainersService`; do not import the dashboard service to avoid a cross-module dependency).

**Gap 2 (Member Billing tab):**
- `backend/src/modules/billing/billing.service.ts > getMyBilling(memberId, from, to)` already computes exactly the per-member billing shape the web member-billing page returns (`{ memberId, from, to, total, count, currency, lines[] }`). The web route `web/src/app/api/billing/member/[id]/route.ts` is functionally identical.
- `backend/.../billing.controller.ts` only exposes `GET /billing/summary` (owner/trainer, all members) and `GET /billing/my` (member, self). There is **no** scoped per-member endpoint for staff.
- Mobile `billing.store.ts` already has `period`, `setPeriod('prev'|'next')`, and `fetchMy`/`fetchSummary` but no per-member fetch.

**Decision — Gap 2 backend surface:** Add `GET /billing/members/:memberId` (`@Roles('owner','trainer')`). It enforces member-scoping (trainer may only view a member assigned to them → 404 otherwise; owner may view any) then delegates to a refactored `getMyBilling`. The response shape equals `MyBillingResult`.

**Gap 3 (Nutrition free-entry):**
- `backend/.../nutrition.service.ts > getToday` and `logFood` are strictly plan-bound: `getToday` throws `NotFoundException('No active nutrition plan found')` when the member has no active plan, and `logFood` calls `getToday`. There is therefore **no** way to log food without a plan today.
- The web freestyle path uses a dedicated `SelfNutritionLog` Mongoose collection (`web/src/lib/db/models/self-nutrition-log.model.ts`) keyed `{ userId, date }` unique, storing `meals[].items[]`. The web surface additionally supports calendar browsing and save-as-template.
- Mobile `foods.api.ts > searchFoods(q, limit)` hits `GET /foods` and returns `Food[]` — the food library the picker will use.

**Decision — Gap 3 scope & data source:** Introduce a new `SelfNutritionLog` Mongoose model in `backend/` keyed `{ userId, date }` (unique), matching the web collection name and the `{ foodName, quantityG, kcal, protein, carbs, fat }` item shape so the two apps share one collection. Mobile free-entry is a **single ad-hoc day log for the current date**: pick a food from the library, set quantity, append an item; the screen lists today's freestyle items and a running macro total. The web's calendar browsing, multi-day navigation, and save-as-template are **out of scope** for mobile this sprint. New endpoints (all `@Roles('member')`):
- `GET /nutrition/self/today` → today's `SelfNutritionLog` (or an empty `{ date, items: [], totals: {...} }` when none exists)
- `POST /nutrition/self/today/items` body `{ foodName, quantityG, kcal, protein, carbs, fat }` → upserts today's log and appends the item, returns the updated log
These live in the existing `nutrition` module and do **not** touch the plan-bound `getToday`/`logFood`.

**Gap 4 (Trainer dashboard dead links):**
- `mobile/src/screens/dashboard/TrainerDashboard.tsx` — the "Pending Check-ins" `Review →` Pressable (around line 304) and the "Needs Attention" `View all →` Pressable (around line 281) have **no** `onPress`.
- `PendingCheckin` (`mobile/src/types/dashboard.ts`) carries `{ memberId, memberName, checkinId, createdAt }`.
- The `CheckInDetail` route (`navigation/index.tsx`) takes a **full `CheckIn` object** (`{ checkIn: CheckIn }`), not an id. Backend `GET /check-ins/members/:memberId/:id` (`@Roles('owner','trainer')`, `findOneByMemberScoped`) returns a full member check-in.
- The `Members` screen is a **drawer** screen with no route params.

**Decision — Gap 4:** "Review →" fetches the full check-in via a new mobile api `fetchMemberCheckIn(memberId, checkinId)` (wrapping the existing `GET /check-ins/members/:memberId/:id`), then `navigation.navigate('CheckInDetail', { checkIn })`. "View all →" navigates to the `Members` drawer screen (`navigation.navigate('Drawer', { screen: 'Members' })`). No backend changes — the check-in-by-id endpoint already exists. Pure mobile wiring.

**Gap 5 (Member body-test creation removal):**
- `mobile/src/screens/my-body-tests/MyBodyTestsScreen.tsx` renders a `+` add button (`testID="bodytests-add-button"`) that navigates to `AddBodyTest`. This is the **only** navigation entry point to `AddBodyTest` in the app.
- `auth.store.ts` exposes `user.role` (`'owner' | 'trainer' | 'member'`).
- Backend already enforces the rule: `backend/.../body-tests.controller.ts` `@Post()` is `@Roles('owner')` — a member calling it gets 403. **No backend change is required**; an integration assertion will verify the guard.

**Decision — Gap 5:** Hide the `+` add button in `MyBodyTestsScreen` whenever `user.role === 'member'`. The `AddBodyTest` route stays registered (no other entry point exists, so it is unreachable for members). One-screen change.

**Store strategy:**
- Gap 1: extend `trainers.store.ts` with `trainerMembers`, `trainerSessions`, `trainerTrainingPlans`, `trainerNutritionPlans` slices + fetchers + a `reassignMember` action. Do not create a new store.
- Gap 2: extend the existing `billing.store.ts` with `memberData`/`memberLoading`/`memberError` + `fetchMember(memberId, from, to)`. Reuse the existing `period`/`setPeriod`.
- Gap 3: add a new `self-nutrition.store.ts` (freestyle logging is distinct from the plan-bound `nutrition.store.ts`; do not overload it).
- Gap 4 & 5: no new store.

## Scope

**In scope:**
- Backend: `GET /trainers/:id/members`, `/sessions`, `/training-plans`, `/nutrition-plans`; `PATCH /trainers/:id/members/:memberId/reassign`.
- Backend: `GET /billing/members/:memberId`.
- Backend: `SelfNutritionLog` model + `GET /nutrition/self/today` + `POST /nutrition/self/today/items`.
- Mobile: TrainerDetailScreen expanded to 5 tabs (Overview, Members w/ metrics + reassign, Calendar, Training Plans, Nutrition Plans).
- Mobile: MemberDetailScreen gains a 9th Billing tab with prev/next month navigation.
- Mobile: MyNutritionScreen gains a "Log freely" path (CTA when no plan, secondary option when a plan exists) + a free-entry food-picker flow writing to the self log.
- Mobile: Trainer dashboard "Review →" and "View all →" wired to navigation.
- Mobile: member-role `+` add button removed from MyBodyTestsScreen.
- Detox E2E specs for Gaps 1, 2, 3, 4. (Gap 5 is covered by an updated Detox assertion in the member body-tests spec.)

**Out of scope:**
- Web freestyle parity beyond single-day ad-hoc logging: no nutrition calendar browsing on mobile, no multi-day navigation, no save-as-template, no editing/deleting logged self items this sprint.
- Reassignment UI anywhere other than the Trainer Hub Members tab.
- Trainer-hub calendar *editing* — the trainer-hub Calendar tab is read-only (matches web `readOnly`).
- Any new body-test creation surface for members; deleting the `AddBodyTest` route.
- `web/` changes of any kind.
- New nutrient fields beyond the existing six macros (web's extended micronutrient fields are not ported).

## Affected Files

**Backend — Gap 1 (Trainer Hub):**
- `backend/src/modules/trainers/trainers.controller.ts` — add 5 endpoints (modify)
- `backend/src/modules/trainers/trainers.service.ts` — add members-with-metrics, sessions, training-plans, nutrition-plans, reassign (modify)
- `backend/src/modules/trainers/trainers.module.ts` — register `WorkoutSession`, `ScheduledSession`, `PlanTemplate`, `NutritionTemplate`, `MemberPlan` models if not already (modify)
- `backend/src/modules/trainers/dto/trainer-response.types.ts` — add response interfaces (modify)
- `backend/src/modules/trainers/dto/reassign-member.dto.ts` — reassign body DTO (create)
- `backend/src/modules/trainers/trainers.service.spec.ts` — unit tests (modify)
- `backend/src/modules/trainers/trainers.controller.spec.ts` — unit tests (modify)
- `backend/test/trainers.e2e-spec.ts` — integration tests (modify)

**Backend — Gap 2 (Billing):**
- `backend/src/modules/billing/billing.controller.ts` — add `GET members/:memberId` (modify)
- `backend/src/modules/billing/billing.service.ts` — add member-scoping guard + `getMemberBilling` (modify)
- `backend/src/modules/billing/billing.service.spec.ts` — unit tests (modify)
- `backend/src/modules/billing/billing.controller.spec.ts` — unit tests (modify)
- `backend/test/billing.e2e-spec.ts` — integration tests (modify)

**Backend — Gap 3 (Self nutrition):**
- `backend/src/common/models/self-nutrition-log.model.ts` — new Mongoose model (create)
- `backend/src/modules/nutrition/nutrition.controller.ts` — add `GET self/today`, `POST self/today/items` (modify)
- `backend/src/modules/nutrition/nutrition.service.ts` — add `getSelfToday`, `logSelfFood` (modify)
- `backend/src/modules/nutrition/nutrition.module.ts` — register `SelfNutritionLog` model (modify)
- `backend/src/modules/nutrition/dto/log-self-food.dto.ts` — body DTO (create)
- `backend/src/modules/nutrition/nutrition.service.spec.ts` — unit tests (modify)
- `backend/src/modules/nutrition/nutrition.controller.spec.ts` — unit tests (modify)
- `backend/test/nutrition.e2e-spec.ts` — integration tests (modify)

**Mobile — Gap 1:**
- `mobile/src/types/trainers.ts` — add `TrainerMemberMetrics`, `TrainerSessionItem`, `TrainerTemplateItem` (modify)
- `mobile/src/lib/api/trainers.api.ts` — add fetchers + `reassignMember` (modify)
- `mobile/src/lib/api/trainers.api.spec.ts` — api unit tests (create/modify)
- `mobile/src/stores/trainers.store.ts` — add slices, fetchers, `reassignMember` (modify)
- `mobile/src/stores/trainers.store.spec.ts` — store unit tests (modify)
- `mobile/src/screens/trainers/TrainerDetailScreen.tsx` — register 5 tabs (modify)
- `mobile/src/screens/trainers/components/TrainerMembersTab.tsx` — metrics + reassign (modify)
- `mobile/src/screens/trainers/components/TrainerCalendarTab.tsx` — read-only sessions list (create)
- `mobile/src/screens/trainers/components/TrainerTrainingPlansTab.tsx` — templates list (create)
- `mobile/src/screens/trainers/components/TrainerNutritionPlansTab.tsx` — templates list (create)
- `mobile/src/screens/trainers/components/ReassignMemberSheet.tsx` — trainer-picker sheet (create)
- corresponding `.spec.tsx` for each new/modified component (create/modify)
- `mobile/e2e/owner/trainer-hub.spec.ts` — Detox spec (create)

**Mobile — Gap 2:**
- `mobile/src/lib/api/billing.api.ts` — add `getMemberBilling` (modify)
- `mobile/src/lib/api/billing.api.spec.ts` — api unit tests (modify)
- `mobile/src/stores/billing.store.ts` — add member slice + `fetchMember` (modify)
- `mobile/src/stores/billing.store.spec.ts` — store unit tests (modify)
- `mobile/src/screens/members/tabs/MemberBillingTab.tsx` — new tab (create)
- `mobile/src/screens/members/tabs/MemberBillingTab.spec.tsx` — unit tests (create)
- `mobile/src/screens/members/MemberDetailScreen.tsx` — register Billing tab (modify)
- `mobile/e2e/trainer/member-billing.spec.ts` — Detox spec (create)

**Mobile — Gap 3:**
- `mobile/src/types/nutrition.ts` — add `SelfNutritionLog`, `SelfNutritionItem`, `LogSelfFoodInput` (modify)
- `mobile/src/lib/api/nutrition.api.ts` — add `fetchSelfToday`, `logSelfFood` (modify)
- `mobile/src/lib/api/nutrition.api.spec.ts` — api unit tests (modify/create)
- `mobile/src/stores/self-nutrition.store.ts` — new store (create)
- `mobile/src/stores/self-nutrition.store.spec.ts` — store unit tests (create)
- `mobile/src/screens/my-nutrition/MyNutritionScreen.tsx` — add "Log freely" CTA / option (modify)
- `mobile/src/screens/my-nutrition/MyNutritionScreen.spec.tsx` — unit tests (modify)
- `mobile/src/screens/my-nutrition/FreeLogScreen.tsx` — free-entry food picker + today list (create)
- `mobile/src/screens/my-nutrition/FreeLogScreen.spec.tsx` — unit tests (create)
- `mobile/src/navigation/index.tsx` — register `FreeLog` route (modify)
- `mobile/e2e/member/free-nutrition-log.spec.ts` — Detox spec (create)

**Mobile — Gap 4:**
- `mobile/src/lib/api/check-ins.api.ts` — add `fetchMemberCheckIn(memberId, id)` (modify)
- `mobile/src/lib/api/check-ins.api.spec.ts` — api unit tests (create/modify)
- `mobile/src/screens/dashboard/TrainerDashboard.tsx` — wire `Review →` + `View all →` (modify)
- `mobile/src/screens/dashboard/__tests__/TrainerDashboard.test.tsx` — unit tests (modify)
- `mobile/e2e/trainer/dashboard-navigation.spec.ts` — Detox spec (modify; exists)

**Mobile — Gap 5:**
- `mobile/src/screens/my-body-tests/MyBodyTestsScreen.tsx` — hide add button for member role (modify)
- `mobile/src/screens/my-body-tests/MyBodyTestsScreen.spec.tsx` — unit tests (create/modify)
- `mobile/e2e/member/body-tests.spec.ts` — Detox assertion add button absent (modify)

---

## Stage 1: Backend — Trainer Hub sub-data endpoints

**Goal**: Owner-only endpoints expose a trainer's members (with streak, sessionsThisMonth, status), scheduled sessions, training-plan templates, nutrition-plan templates, and a reassign action. Trainer scoping is enforced server-side; non-existent or non-trainer ids 404.

Response shapes:
- members item: `{ id, name, email, streak: number, sessionsThisMonth: number, status: 'active'|'needs-attn'|'no-plan' }`
- session item: `{ id, date, startTime, endTime, memberNames: string[], serviceTypeName: string|null, status }`
- training/nutrition plan item: `{ id, name, dayCount, createdAt }`

**Sprint Contract**:

*Unit tests:*
- [x] `TrainersService > getTrainerMembers > returns members of the trainer each with streak, sessionsThisMonth, and a status of active|needs-attn|no-plan`
- [x] `TrainersService > getTrainerMembers > derives status no-plan when the member has no active plan, active when streak>0, needs-attn otherwise`
- [x] `TrainersService > getTrainerMembers > throws NotFoundException when the id is not a trainer`
- [x] `TrainersService > getTrainerSessions > returns only sessions whose trainerId matches the target trainer`
- [x] `TrainersService > getTrainerTrainingPlans > returns only plan templates created by the target trainer`
- [x] `TrainersService > getTrainerNutritionPlans > returns only nutrition templates created by the target trainer`
- [x] `TrainersService > reassignMember > updates the member's trainerId to the new trainer and returns the updated member`
- [x] `TrainersService > reassignMember > throws NotFoundException when the member is not currently assigned to the path trainer`
- [x] `TrainersController > getTrainerMembers > delegates to service with the trainer id`
- [x] `TrainersController > reassignMember > delegates to service with current trainerId, memberId, and target trainerId`

*Integration (`backend/test/trainers.e2e-spec.ts`):*
- [x] `GET /trainers/:id/members` as owner → 200 with first member carrying numeric streak and sessionsThisMonth and a valid status
- [x] `GET /trainers/:id/training-plans` as owner → 200 with only that trainer's templates
- [x] `GET /trainers/:id/sessions` as a `trainer` role → 403
- [x] `PATCH /trainers/:id/members/:memberId/reassign` as owner with a valid target trainer → 200 and a follow-up `GET /trainers/:newTrainerId/members` includes that member
- [x] `GET /trainers/:id/members` with no JWT → 401

**TDD sequence**:
1. Write failing service unit tests (metrics, scoping, reassign) → Red
2. Implement service methods (reuse the streak algorithm; query WorkoutSession/ScheduledSession/PlanTemplate/NutritionTemplate/MemberPlan; mutate user.trainerId on reassign) → Green
3. Write failing controller unit tests → implement `@Get`/`@Patch` handlers under `@Roles('owner')` → Green
4. Extend integration spec covering 200/401/403/404 + reassign round-trip → passes against the real Nest test stack

**Status**: Complete

## Stage 2: Backend — Member Billing + Self-nutrition endpoints

**Goal**: A staff member can fetch one member's billing for a period; a member can read and append to a plan-independent self-nutrition day log.

**Sprint Contract**:

*Unit tests:*
- [ ] `BillingService > getMemberBilling > returns total, count, currency, and lines for the member's completed billable sessions in the period`
- [ ] `BillingService > getMemberBilling > throws NotFoundException when a trainer requests a member not assigned to them`
- [ ] `BillingService > getMemberBilling > allows an owner to fetch any member`
- [ ] `NutritionService > getSelfToday > returns an empty items array and zeroed totals when no self log exists for today`
- [ ] `NutritionService > getSelfToday > returns the existing self log for today when one exists`
- [ ] `NutritionService > logSelfFood > creates today's self log and appends the item when none exists`
- [ ] `NutritionService > logSelfFood > appends to the existing self log and recomputes macro totals`
- [ ] `NutritionController > logSelfFood > delegates to service with caller id and the food payload`

*Integration:*
- [ ] `GET /billing/members/:memberId` as the member's trainer → 200 with the per-member billing shape (`backend/test/billing.e2e-spec.ts`)
- [ ] `GET /billing/members/:memberId` as a trainer for an unassigned member → 404 (`billing.e2e-spec.ts`)
- [ ] `GET /billing/members/:memberId` as a `member` role → 403 (`billing.e2e-spec.ts`)
- [ ] `POST /nutrition/self/today/items` as a member with no active plan → 200/201 and `GET /nutrition/self/today` then returns that item (`backend/test/nutrition.e2e-spec.ts`)
- [ ] `POST /nutrition/self/today/items` as an `owner` role → 403 (`nutrition.e2e-spec.ts`)

**TDD sequence**:
1. Write failing `BillingService.getMemberBilling` unit tests (scoping + shape) → Red → implement (refactor `getMyBilling` core into a shared private; add scoping) → Green
2. Write failing controller unit/integration for `GET /billing/members/:memberId` → implement `@Roles('owner','trainer')` handler → Green
3. Create `SelfNutritionLog` model; write failing `getSelfToday`/`logSelfFood` unit tests → implement → Green
4. Write failing nutrition controller unit + integration tests for the two `self` endpoints → implement `@Roles('member')` handlers → Green
5. Run full `pnpm test` + `pnpm test:e2e` → no regressions

**Status**: Complete

### Stage 2 Checkpoint
- [x] BillingService.getMemberBilling unit tests + implementation
- [x] BillingController GET members/:memberId unit tests + implementation
- [x] billing.e2e-spec.ts integration tests
- [x] SelfNutritionLog model
- [x] NutritionService getSelfToday + logSelfFood unit tests + implementation
- [x] NutritionController self endpoints unit tests + implementation
- [x] nutrition.e2e-spec.ts self-log integration tests

**Status**: Complete

## Stage 3: Mobile — Trainer Hub depth (Gap 1)

**Goal**: TrainerDetailScreen shows 5 tabs. Members tab shows each member's streak, sessions-this-month, and a status badge, with a working reassignment sheet. Calendar, Training Plans, and Nutrition Plans tabs render the trainer's real data from Stage 1.

**Sprint Contract**:

*Unit tests:*
- [ ] `trainers.store > fetchTrainerMembers > populates trainerMembers with metrics and clears loading on success`
- [ ] `trainers.store > fetchTrainerTrainingPlans > populates trainerTrainingPlans on success`
- [ ] `trainers.store > fetchTrainerNutritionPlans > populates trainerNutritionPlans on success`
- [ ] `trainers.store > fetchTrainerSessions > populates trainerSessions on success`
- [ ] `trainers.store > reassignMember > calls the api with member and target trainer ids and refreshes the members list`
- [ ] `TrainerMembersTab > renders each member's streak, sessionsThisMonth, and a status badge`
- [ ] `TrainerTrainingPlansTab > renders an empty state when the trainer has no templates`

*Detox E2E (`mobile/e2e/owner/trainer-hub.spec.ts`):*
- [ ] Owner opens a trainer, taps the Members tab → a member row shows a streak/sessions metric line and a status badge
- [ ] Owner taps Reassign on a member, picks a different trainer, confirms → the member disappears from the current trainer's Members list (or a success toast appears)
- [ ] Owner taps the Training Plans tab → at least one template row (or the empty-state text) is visible

**TDD sequence**:
1. Write failing api + store unit tests → implement fetchers, slices, `reassignMember` → Green
2. Write failing component tests for each tab → implement tab components + register them in TrainerDetailScreen → Green
3. `/simplify` (mobile) → write Detox spec → run against simulator → passes

**Status**: Complete

### Stage 3 Checkpoint
- [x] trainers.store new slices + api fetchers (unit tests + impl)
- [x] TrainerMembersTab with metrics + reassign (unit tests + impl)
- [x] TrainerCalendarTab (unit tests + impl)
- [x] TrainerTrainingPlansTab (unit tests + impl)
- [x] TrainerNutritionPlansTab (unit tests + impl)
- [x] ReassignMemberSheet (impl)
- [x] TrainerDetailScreen 5-tab expansion
- [x] Detox E2E (owner/trainer-hub.spec.ts)

## Stage 4: Mobile — Member Billing tab (Gap 2)


**Goal**: MemberDetailScreen has a 9th Billing tab showing sessions completed, amount, and the per-session lines for the selected period, with prev/next month navigation.

**Sprint Contract**:

*Unit tests:*
- [ ] `billing.store > fetchMember > populates memberData and clears memberLoading on success`
- [ ] `billing.store > fetchMember > sets memberError on api failure`
- [ ] `MemberBillingTab > renders the period total, session count, and one row per billing line`
- [ ] `MemberBillingTab > renders an empty state when the member has no billable sessions in the period`
- [ ] `MemberBillingTab > tapping next month advances the period and refetches`

*Detox E2E (`mobile/e2e/trainer/member-billing.spec.ts`):*
- [ ] Trainer opens a member, taps the Billing tab → the period total and session count are visible
- [ ] Trainer taps the previous-month control → the displayed period label changes and data refetches (loading skeleton or new total appears)

**TDD sequence**:
1. Write failing api + store unit tests → implement `getMemberBilling` + `fetchMember` → Green
2. Write failing `MemberBillingTab` tests → implement tab + register in MemberDetailScreen TABS → Green
3. `/simplify` → write Detox spec → run against simulator → passes

**Status**: Complete

### Stage 4 Checkpoint
- [x] billing.api `getMemberBilling` + api spec
- [x] billing.store `fetchMember` + store spec
- [x] MemberBillingTab component + spec
- [x] MemberDetailScreen Billing tab registration
- [x] Detox E2E spec

## Stage 5: Mobile — Nutrition free-entry (Gap 3)

**Goal**: When no plan is assigned, MyNutritionScreen shows a "Log freely" CTA; when a plan exists, "Log freely" is offered alongside the plan. The FreeLog screen lets a member search the foods library, set a quantity, log an item, and see the item appear with an updated macro total.

**Sprint Contract**:

*Unit tests:*
- [ ] `self-nutrition.store > fetchToday > populates the self log items and totals on success`
- [ ] `self-nutrition.store > logFood > appends the logged item and updates totals`
- [ ] `self-nutrition.store > logFood > sets error state on api failure`
- [ ] `MyNutritionScreen > renders a "Log freely" CTA instead of only an empty state when no plan is assigned`
- [ ] `MyNutritionScreen > renders a "Log freely" option alongside plan meals when a plan exists`
- [ ] `FreeLogScreen > logging a selected food appends it to today's list and shows the new total`

*Detox E2E (`mobile/e2e/member/free-nutrition-log.spec.ts`):*
- [ ] A member with no plan opens My Nutrition, taps "Log freely", searches a food, sets a quantity, logs it → the item appears in today's free-log list with an updated calorie total
- [ ] A member opens the free-log without selecting any food and attempts to log → a validation message appears (no item is added)

**TDD sequence**:
1. Write failing api + store unit tests → implement `fetchSelfToday`/`logSelfFood` + store → Green
2. Write failing MyNutritionScreen + FreeLogScreen tests → implement CTA/option + FreeLogScreen + register `FreeLog` route → Green
3. `/simplify` → write Detox spec → run against simulator → passes

**Status**: Not Started

## Stage 6: Mobile — Dashboard nav wiring (Gap 4) + member body-test lockdown (Gap 5)

**Goal**: The Trainer dashboard "Review →" opens the correct check-in detail and "View all →" opens the Members screen; the Member body-tests screen no longer shows the add button.

**Sprint Contract**:

*Unit tests:*
- [x] `check-ins.api > fetchMemberCheckIn > requests GET /check-ins/members/:memberId/:id and returns the check-in`
- [x] `TrainerDashboard > tapping Review on a pending check-in fetches the check-in and navigates to CheckInDetail with it`
- [x] `TrainerDashboard > tapping View all on Needs Attention navigates to the Members screen`
- [x] `MyBodyTestsScreen > does not render the add button when the user role is member`
- [x] `MyBodyTestsScreen > renders the add button when the user role is owner`

*Detox E2E:*
- [x] (`mobile/e2e/trainer/dashboard-navigation.spec.ts`) Trainer taps "Review →" on a pending check-in → the Check-in Detail screen opens
- [x] (`mobile/e2e/trainer/dashboard-navigation.spec.ts`) Trainer taps "View all →" under Needs Attention → the Members screen is shown
- [x] (`mobile/e2e/member/body-tests.spec.ts`) A member opens My Body Tests → the add button (`bodytests-add-button`) is not present

**TDD sequence**:
1. Write failing `fetchMemberCheckIn` api test → implement → Green ✓
2. Write failing TrainerDashboard nav tests → add `onPress` handlers (fetch-then-navigate for Review; navigate to Members for View all) → Green ✓
3. Write failing MyBodyTestsScreen role test → gate the add button on `user.role !== 'member'` → Green ✓
4. Detox specs written + all unit tests green ✓

### Stage 6 Checkpoint
- [x] `fetchMemberCheckIn` api function
- [x] `TrainerDashboard` Review + View all nav wiring
- [x] `MyBodyTestsScreen` role-based add button gate
- [x] Detox E2E specs written

**Status**: Complete
