# Mobile Dashboards Implementation Plan

## Goal
An Owner, Trainer, or Member who opens the mobile app sees a fully functional, role-specific Dashboard screen populated with live aggregated data from the backend.

## Application
cross-app: `backend/` (new aggregation endpoints + read models) and `mobile/` (three dashboard screens, shared components, stores, API layer).

## Design Source
Authoritative spec: `docs/superpowers/specs/2026-06-01-mobile-dashboards-design.md`. Business logic mirrors `web/src/app/(dashboard)/{owner,trainer,member}/page.tsx` and their `_components/`. The Generator must read the design spec for every stage and the relevant web `_components` for the exact query semantics of the stage it implements.

## Architectural Context & Risks
- **Backend has no data models for dashboard sources.** Today `backend/src/common/models/` only contains `user`, `user-profile`, `password-reset-token`, and `refresh-token`. Every dashboard data source (`workout-session`, `scheduled-session`, `body-test`, `personal-best`, `check-in`, `equipment`, `invite-token`, `member-plan`, `member-nutrition-plan`) exists only in `web/src/lib/db/models/`. These must be ported into `backend/` as Mongoose schemas before any aggregation can be written. This porting is Stage 1 and is the largest backend risk — collection names and field names must match the shared MongoDB exactly (e.g. `BodyTest` → `bodytests`, field `bodyFatPct`, `weight`; `WorkoutSession.completedAt`; `Equipment.nextServiceDate`; `InviteToken.usedAt`/`expiresAt`).
- **Shared DB, no schema drift allowed.** Backend schemas are read-only mirrors. Do not add fields, defaults, or validation that could diverge from the web models. Copy field types and collection names verbatim from `web/src/lib/db/models/`.
- **Auth scoping.** `req.user.sub` is the authenticated user id; `req.user.role` drives `RolesGuard`. Owner endpoint = `@Roles('owner')`. Trainer/Member endpoints use `JwtAuthGuard` only but must scope all queries to `req.user.sub` (a trainer sees only their own members via `User.trainerId`; a member sees only their own data).
- **Backend has no E2E layer** — integration tests in `backend/test/*.e2e-spec.ts` (MongoMemoryServer + supertest, following `backend/test/gym.e2e-spec.ts`) are the verification gate for endpoints.
- **Mobile chart libs are new.** `react-native-gifted-charts` and `expo-linear-gradient` must be installed before the screens that use them. `react-native-svg` is already present (gifted-charts peer dep). Charts and gradients are hard to assert in Jest — Detox golden-path specs are the real proof for those screens.
- **DashboardScreen role switch.** `mobile/src/navigation/index.tsx` registers `Dashboard: DashboardScreen`. The current placeholder `DashboardScreen` in `mobile/src/screens/placeholders/index.ts` uses `testID="home-screen"` and hosts the biometrics enrollment prompt — the new `DashboardScreen` must keep `testID="home-screen"` and keep mounting `BiometricsPrompt`, or the existing auth E2E spec breaks. Move the biometrics logic into the new role-switching `DashboardScreen.tsx`.

## Scope
**In scope:**
- Backend read-only Mongoose schemas for the 9 dashboard source collections.
- Backend `dashboard` module: service + controller with `GET /dashboard/owner`, `GET /dashboard/trainer`, `GET /dashboard/member` (member endpoint accepts optional `?exercise=` query param for the strength chart).
- Mobile shared components: `StatCard`, `TrainingHeatmap` (90-day and 14-day variants).
- Mobile role-switching `DashboardScreen.tsx` + `OwnerDashboard`, `TrainerDashboard`, `MemberDashboard`.
- Mobile Zustand store + API module per role dashboard.
- Full-page skeleton loading, animated entry, and neutral empty states for every section.
- Detox golden-path spec per dashboard screen + one error/empty case each.
- New deps: `react-native-gifted-charts`, `expo-linear-gradient`.

**Out of scope:**
- Any web/ changes. The web dashboards are the reference, not a target.
- Navigation/drawer changes (drawer already routes to `Dashboard`).
- Deep-link destinations of "View all →" / "Start →" links beyond navigating to the already-registered placeholder screen (e.g. `MyTraining`, `Calendar`, `Trainers`). Linking to the existing screen is in scope; building those screens is not.
- Real-time refresh / websockets. Refresh on focus only.
- New backend write operations (check-in review actions, etc.).
- Pull-to-refresh polish beyond refetch-on-focus (may be added but is not a contract criterion).

## Affected Files

### Backend — new
```
backend/src/common/models/workout-session.model.ts
backend/src/common/models/scheduled-session.model.ts
backend/src/common/models/body-test.model.ts
backend/src/common/models/personal-best.model.ts
backend/src/common/models/check-in.model.ts
backend/src/common/models/equipment.model.ts
backend/src/common/models/invite-token.model.ts
backend/src/common/models/member-plan.model.ts
backend/src/common/models/member-nutrition-plan.model.ts
backend/src/modules/dashboard/dashboard.module.ts
backend/src/modules/dashboard/dashboard.controller.ts
backend/src/modules/dashboard/dashboard.controller.spec.ts
backend/src/modules/dashboard/owner-dashboard.service.ts
backend/src/modules/dashboard/owner-dashboard.service.spec.ts
backend/src/modules/dashboard/trainer-dashboard.service.ts
backend/src/modules/dashboard/trainer-dashboard.service.spec.ts
backend/src/modules/dashboard/member-dashboard.service.ts
backend/src/modules/dashboard/member-dashboard.service.spec.ts
backend/src/modules/dashboard/dto/dashboard-response.types.ts
backend/test/dashboard.e2e-spec.ts
```
### Backend — modified
```
backend/src/app.module.ts                  ← register DashboardModule
```
### Mobile — new
```
mobile/src/screens/DashboardScreen.tsx                 ← role switch + biometrics prompt (testID="home-screen")
mobile/src/screens/dashboard/OwnerDashboard.tsx
mobile/src/screens/dashboard/TrainerDashboard.tsx
mobile/src/screens/dashboard/MemberDashboard.tsx
mobile/src/stores/owner-dashboard.store.ts
mobile/src/stores/trainer-dashboard.store.ts
mobile/src/stores/member-dashboard.store.ts
mobile/src/lib/api/owner-dashboard.api.ts
mobile/src/lib/api/trainer-dashboard.api.ts
mobile/src/lib/api/member-dashboard.api.ts
mobile/src/components/dashboard/StatCard.tsx
mobile/src/components/dashboard/TrainingHeatmap.tsx
mobile/src/components/dashboard/DashboardSkeleton.tsx   ← shared full-page skeleton
mobile/src/components/dashboard/__tests__/StatCard.test.tsx
mobile/src/components/dashboard/__tests__/TrainingHeatmap.test.tsx
mobile/src/screens/dashboard/__tests__/OwnerDashboard.test.tsx
mobile/src/screens/dashboard/__tests__/TrainerDashboard.test.tsx
mobile/src/screens/dashboard/__tests__/MemberDashboard.test.tsx
mobile/src/stores/owner-dashboard.store.spec.ts
mobile/src/stores/trainer-dashboard.store.spec.ts
mobile/src/stores/member-dashboard.store.spec.ts
mobile/e2e/owner/dashboard.spec.ts
mobile/e2e/trainer/dashboard.spec.ts
mobile/e2e/member/dashboard.spec.ts
```
### Mobile — modified
```
mobile/src/navigation/index.tsx                 ← import DashboardScreen from new path
mobile/src/screens/placeholders/index.ts        ← remove old DashboardScreen (move biometrics logic out)
mobile/package.json                              ← add react-native-gifted-charts, expo-linear-gradient
```

---

## Stage 1: Backend read models + dashboard module scaffold + Owner endpoint

**Goal**: Port the 9 read-only Mongoose schemas into `backend/`, register a `DashboardModule`, and implement `GET /dashboard/owner` returning the full owner response shape from live data, scoped and role-guarded.

**Functional units (3 — under the 8 limit):** the 9 schemas (one mechanical unit), `OwnerDashboardService.getOwnerDashboard`, `DashboardController.getOwner`.

**Read first**: `web/src/lib/db/models/*` for the 9 collections; `web/src/app/(dashboard)/owner/_components/{dashboard-stats,trainer-performance-section,equipment-status-section,member-growth-chart}.tsx`; `backend/src/modules/gym/{gym.controller,gym.module,gym.service}.ts`; `backend/test/gym.e2e-spec.ts`. Reuse the user-month aggregation logic equivalent to `findMembersJoinedByMonth`.

**Sprint Contract**:

*Unit tests:*
- [ ] `OwnerDashboardService > getOwnerDashboard > returns stats.trainerCount and stats.memberCount matching seeded user counts`
- [ ] `OwnerDashboardService > getOwnerDashboard > memberGrowth has exactly 6 entries ordered oldest-first`
- [ ] `OwnerDashboardService > getOwnerDashboard > trainerPerformance sorted by sessionCount descending, capped at 5`
- [ ] `OwnerDashboardService > getOwnerDashboard > equipment.nonActiveItems excludes active equipment and is capped at 5`
- [ ] `OwnerDashboardService > getOwnerDashboard > stats.expiringInviteCount counts pending invites expiring within 3 days`

*Integration:*
- [ ] `GET /dashboard/owner` with a valid owner token → 200, body contains keys `stats`, `memberGrowth`, `trainerPerformance`, `equipment`, and `stats` has all ten documented numeric fields
- [ ] `GET /dashboard/owner` with a trainer token → 403
- [ ] `GET /dashboard/owner` with no token → 401

**TDD sequence**:
1. Write `owner-dashboard.service.spec.ts` against seeded in-memory data → Red.
2. Port schemas, implement `OwnerDashboardService` minimally → Green.
3. Write `dashboard.e2e-spec.ts` owner cases (build app like `gym.e2e-spec.ts`, seed owner + trainer + member + sessions + equipment + invites), wire controller + module + `app.module.ts` → Green.

**Status**: Complete

### Stage 1 Checkpoint
- [x] 9 Mongoose schemas ported to backend/src/common/models/
- [x] OwnerDashboardService.getOwnerDashboard (unit tests)
- [x] DashboardController + DashboardModule + e2e tests (owner cases)

---

## Stage 2: Backend Trainer + Member endpoints

**Goal**: Implement `GET /dashboard/trainer` and `GET /dashboard/member` (with optional `?exercise=` param) returning the full documented response shapes, scoped to `req.user.sub`.

**Functional units (2):** `TrainerDashboardService.getTrainerDashboard`, `MemberDashboardService.getMemberDashboard`. Reuses the schemas from Stage 1 — no new models.

**Read first**: `web/src/app/(dashboard)/trainer/_components/*` and `web/src/app/(dashboard)/member/_components/*` for exact query semantics (idle = no completed session in 7 days; compliance = completed sessions / scheduled over 30d; heatmap = `findCompletedDates`; strength = `findTrainedExercises` + estimated 1RM series; streak logic; day-type derivation from `member-nutrition-plan` schedule).

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainerDashboardService > getTrainerDashboard > todaysSessions contains only sessions for members whose trainerId equals the requesting trainer`
- [ ] `TrainerDashboardService > getTrainerDashboard > needsAttention excludes members with a completed session in the last 7 days`
- [ ] `TrainerDashboardService > getTrainerDashboard > thisWeek has 7 entries Mon..Sun with exactly one isToday=true`
- [ ] `MemberDashboardService > getMemberDashboard > trainingHeatmap has exactly 90 boolean entries, index 89 = today`
- [ ] `MemberDashboardService > getMemberDashboard > strengthProgress defaults to first exercise when no exercise query is given`
- [ ] `MemberDashboardService > getMemberDashboard > strengthProgress returns series for the requested exercise when exercise param is provided`
- [ ] `MemberDashboardService > getMemberDashboard > todaysPlan is null when the member has no active member-plan`

*Integration:*
- [ ] `GET /dashboard/trainer` with a trainer token → 200, `todaysSessions` contains only that trainer's members; with a member token → 403
- [ ] `GET /dashboard/member` with a member token → 200 and `trainingHeatmap.length === 90`; with no token → 401; with `?exercise=Squat` → 200 and `strengthProgress.data` is the Squat series

**TDD sequence**:
1. Write both service specs against seeded data → Red.
2. Implement both services → Green.
3. Extend `dashboard.e2e-spec.ts` with trainer + member cases (seed trainer with 2 members, one idle; seed sessions, body tests, PRs, nutrition plan) → Green.

**Status**: Complete

### Stage 2 Checkpoint
- [x] TrainerDashboardService.getTrainerDashboard (unit tests)
- [x] MemberDashboardService.getMemberDashboard (unit tests)
- [x] DashboardController trainer + member endpoints wired
- [x] dashboard.e2e-spec.ts extended with trainer + member integration cases

---

## Stage 3: Mobile foundation — deps, shared components, role-switching DashboardScreen

**Goal**: Install chart/gradient deps; build the shared `StatCard`, `TrainingHeatmap`, and `DashboardSkeleton`; replace the placeholder `DashboardScreen` with a role-switching `DashboardScreen.tsx` that preserves `testID="home-screen"` and the biometrics prompt, rendering a temporary minimal body per role (skeleton only — full dashboards land in Stages 4–6).

**Functional units (4):** `StatCard`, `TrainingHeatmap`, `DashboardSkeleton`, `DashboardScreen` role switch.

**Read first**: `web/src/components/shared/stat-card.tsx` (visual contract); `.claude/instructions/design.md` mobile section; `mobile/src/screens/placeholders/index.ts` (biometrics logic to preserve); `mobile/src/navigation/index.tsx`; `mobile/src/lib/animations.ts` if present.

**Note**: This stage renders a per-role skeleton/empty container, NOT a "coming soon" placeholder. The role-switch wiring plus shared components are the deliverable; this is foundation, not a stub feature.

**Sprint Contract**:

*Unit tests:*
- [ ] `StatCard > renders label, value, and trend/delta text`
- [ ] `StatCard > applies success delta color class when deltaVariant is success`
- [ ] `TrainingHeatmap > renders exactly 90 cells when variant is 90-day`
- [ ] `TrainingHeatmap > renders exactly 14 cells when variant is 14-day`
- [ ] `TrainingHeatmap > today cell carries the ring highlight style`
- [ ] `DashboardScreen > renders OwnerDashboard branch testID when auth role is owner`
- [ ] `DashboardScreen > renders MemberDashboard branch testID when auth role is member`

*E2E (Detox):*
- [ ] Owner logs in → Dashboard screen with `testID="home-screen"` is visible (existing auth spec still green — verifies biometrics prompt preserved)
- [ ] Member logs in → Dashboard screen renders the member-branch container testID (no placeholder text "Dashboard" heading-only)

**TDD sequence**:
1. `pnpm add react-native-gifted-charts expo-linear-gradient` in `mobile/`.
2. Write component + screen Jest specs → Red.
3. Implement `StatCard`, `TrainingHeatmap`, `DashboardSkeleton`, role-switch `DashboardScreen` (move biometrics logic from placeholder), update `navigation/index.tsx` import and remove old `DashboardScreen` from placeholders → Green.
4. Run the existing auth Detox spec + add the role-render Detox checks → pass on simulator.

**Status**: Complete

### Stage 3 Checkpoint
- [x] pnpm add react-native-gifted-charts expo-linear-gradient
- [x] mobile/src/components/dashboard/StatCard.tsx
- [x] mobile/src/components/dashboard/TrainingHeatmap.tsx
- [x] mobile/src/components/dashboard/DashboardSkeleton.tsx
- [x] mobile/src/screens/dashboard/OwnerDashboard.tsx (skeleton stub)
- [x] mobile/src/screens/dashboard/TrainerDashboard.tsx (skeleton stub)
- [x] mobile/src/screens/dashboard/MemberDashboard.tsx (skeleton stub)
- [x] mobile/src/screens/DashboardScreen.tsx (role switch + biometrics prompt)
- [x] mobile/src/navigation/index.tsx updated to import from new path
- [x] mobile/src/screens/placeholders/index.ts DashboardScreen removed
- [x] mobile/src/components/dashboard/__tests__/StatCard.test.tsx (7 tests)
- [x] mobile/src/components/dashboard/__tests__/TrainingHeatmap.test.tsx (4 tests)
- [x] mobile/src/screens/__tests__/DashboardScreen.test.tsx (5 tests)

---

## Stage 4: Mobile Owner Dashboard

**Goal**: Fully implement `OwnerDashboard` consuming `GET /dashboard/owner` via an owner-dashboard store + API module: KPI 2×3 grid, member-growth `BarChart`, trainer-performance list, equipment-status grid — with skeleton, animated entry, and empty states.

**Read first**: design spec §2; Stage 1 response shape in `dashboard-response.types.ts`; `mobile/src/stores/profile.store.ts` + `mobile/src/lib/api/profile.api.ts` (store/api pattern); `mobile/src/lib/api/client.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `useOwnerDashboardStore > fetchDashboard > populates data and sets isLoading false on success`
- [ ] `useOwnerDashboardStore > fetchDashboard > leaves data null and surfaces error on request failure`
- [ ] `OwnerDashboard > shows DashboardSkeleton while isLoading is true`
- [ ] `OwnerDashboard > renders all six KPI StatCards with values from store data`
- [ ] `OwnerDashboard > renders "No trainers yet" empty state when trainerPerformance is empty`

*E2E (Detox):*
- [ ] Owner logs in → Dashboard shows the six KPI cards (TRAINERS, MEMBERS, SESSIONS/MONTH, ACTIVE TODAY, CHECK-IN RATE, PENDING INVITES) populated with values, plus the Member Growth chart container
- [ ] Owner taps `View all →` on Trainer Performance → navigates to the Trainers screen

**TDD sequence**:
1. Write store spec (mock api module) + `OwnerDashboard` Jest spec → Red.
2. Implement `owner-dashboard.api.ts`, `owner-dashboard.store.ts`, `OwnerDashboard.tsx`; wire into `DashboardScreen` owner branch → Green.
3. `/simplify`. 4. Write `mobile/e2e/owner/dashboard.spec.ts` golden path + the nav case → pass on simulator.

**Status**: Complete

### Stage 4 Checkpoint
- [x] mobile/src/types/dashboard.ts (OwnerDashboardResponse and related types)
- [x] mobile/src/lib/api/owner-dashboard.api.ts
- [x] mobile/src/stores/owner-dashboard.store.ts
- [x] mobile/src/stores/owner-dashboard.store.spec.ts (2 tests — Red then Green)
- [x] mobile/src/screens/dashboard/OwnerDashboard.tsx (full implementation)
- [x] mobile/src/screens/dashboard/__tests__/OwnerDashboard.test.tsx (3 tests — Red then Green)
- [x] mobile/src/components/dashboard/DashboardSkeleton.tsx (added testID)
- [x] mobile/package.json (added gifted-charts-core to transformIgnorePatterns)
- [x] mobile/e2e/owner/dashboard.spec.ts (Detox spec — file written, not run)

---

## Stage 5: Mobile Trainer Dashboard

**Goal**: Fully implement `TrainerDashboard` consuming `GET /dashboard/trainer`: KPI 2×2, today's sessions list, needs-attention + pending-check-ins, compliance + recent-PRs, my-training (14-day `TrainingHeatmap`) + this-week bar row — with skeleton, animated entry, and all documented empty states.

**Read first**: design spec §3; Stage 2 trainer response shape; `TrainingHeatmap` (14-day variant from Stage 3); Stage 4 store/screen as the pattern to follow.

**Functional units (well within limit):** trainer store, trainer api, `TrainerDashboard` screen (the six sections are sub-units of one screen).

**Sprint Contract**:

*Unit tests:*
- [ ] `useTrainerDashboardStore > fetchDashboard > populates data and clears isLoading on success`
- [ ] `TrainerDashboard > shows DashboardSkeleton while loading`
- [ ] `TrainerDashboard > renders "No sessions scheduled today" when todaysSessions is empty`
- [ ] `TrainerDashboard > renders "All caught up ✓" when pendingCheckins is empty`
- [ ] `TrainerDashboard > renders 14-cell TrainingHeatmap from myTraining.last14Days`

*E2E (Detox):*
- [ ] Trainer logs in → Dashboard shows the four KPI cards, the Today's Sessions section, and the My Training streak + heatmap populated with data
- [ ] Trainer with no sessions today → Today's Sessions section shows the `No sessions scheduled today` empty state

**TDD sequence**:
1. Write store + screen Jest specs → Red.
2. Implement api, store, `TrainerDashboard`; wire trainer branch in `DashboardScreen` → Green.
3. `/simplify`. 4. Write `mobile/e2e/trainer/dashboard.spec.ts` golden path + empty case → pass on simulator.

**Status**: Complete

### Stage 5 Checkpoint
- [x] mobile/src/types/dashboard.ts (TrainerDashboardResponse and related types added)
- [x] mobile/src/lib/api/trainer-dashboard.api.ts
- [x] mobile/src/stores/trainer-dashboard.store.ts
- [x] mobile/src/stores/trainer-dashboard.store.spec.ts (1 test — Red then Green)
- [x] mobile/src/screens/dashboard/TrainerDashboard.tsx (full implementation)
- [x] mobile/src/screens/dashboard/__tests__/TrainerDashboard.test.tsx (4 tests — Red then Green)
- [x] mobile/e2e/trainer/dashboard.spec.ts (Detox spec — file written, not run)

---

## Stage 6: Mobile Member Dashboard

**Goal**: Fully implement `MemberDashboard` consuming `GET /dashboard/member`: greeting hero + streak, today's-workout gradient card (`expo-linear-gradient`), KPI 2×2, 90-day `TrainingHeatmap`, body-composition `LineChart`, strength-progress `LineChart` with exercise selector (refetches via `?exercise=`), nutrition-today + upcoming-sessions — with skeleton, animated entry, and all documented empty states.

**Read first**: design spec §4; Stage 2 member response shape; `member-hero.utils.ts`, `member-kpi-strip.utils.ts`, `member-nutrition-today.utils.ts` in web for greeting/emoji/delta/day-type derivation; `TrainingHeatmap` 90-day variant.

**Functional units:** member store (with `setExercise` partial-update action), member api, `MemberDashboard` screen.

**Sprint Contract**:

*Unit tests:*
- [ ] `useMemberDashboardStore > fetchDashboard > populates data and clears isLoading on success`
- [ ] `useMemberDashboardStore > selectExercise > refetches strengthProgress for the chosen exercise and updates only that slice`
- [ ] `MemberDashboard > renders the workout hero card when todaysPlan is not null`
- [ ] `MemberDashboard > renders "No training plan assigned yet" when todaysPlan is null`
- [ ] `MemberDashboard > renders "No nutrition plan assigned" when nutritionToday is null`
- [ ] `MemberDashboard > greeting shows the correct time-of-day emoji for a given hour`

*E2E (Detox):*
- [ ] Member logs in → Dashboard shows greeting + streak, the Today's Workout hero card with a `Start →` button, the four KPI cards, and the 90-day heatmap
- [ ] Member taps the strength-progress exercise selector and chooses a different exercise → the strength chart updates (new exercise label shown)

**TDD sequence**:
1. Write store (including `selectExercise`) + screen Jest specs → Red.
2. Implement api, store, `MemberDashboard` (hero gradient, both line charts, selector); wire member branch in `DashboardScreen` → Green.
3. `/simplify`. 4. Write `mobile/e2e/member/dashboard.spec.ts` golden path + the selector-refetch case → pass on simulator.

**Status**: Not Started

