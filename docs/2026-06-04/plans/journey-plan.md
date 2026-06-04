# Journey Implementation Plan

## Goal
A member opens the Journey screen and sees a single unified read-only progress dashboard — workout streak, last 7 sessions, last 7 days of nutrition adherence, and recent body-composition trend — fetched in one API call.

## Application
`backend/` (Stage 1) + `mobile/` (Stages 2–3). `web/` is read-only reference for model shapes — DO NOT modify it.

## Scope
**In scope:**
- One new backend module `journey` exposing a single member-only endpoint `GET /journey` that aggregates training, nutrition, and body-test data server-side.
- The endpoint reads three EXISTING models — `WorkoutSession`, `NutritionDailyLog`, `BodyTest` — via `MongooseModule.forFeature`. No new Mongoose models.
- Workout streak = number of consecutive calendar days (ending today or yesterday) that have at least one finished session (`completedAt !== null`).
- Last 7 finished sessions (most recent first): date, day name, completed-set count.
- Last 7 calendar days of nutrition: per day — whether a log exists, logged kcal, target kcal, and whether the daily kcal target was met (logged ≥ target when target > 0).
- Last up-to-10 body tests (most recent first): date, weight, body-fat %.
- Mobile data layer: `journey.api.ts`, `journey.store.ts` (Zustand), `journey.ts` types.
- Mobile Journey screen replacing the placeholder, plus a Detox E2E spec.

**Out of scope:**
- Any mutation (read-only feature — no POST/PATCH/DELETE).
- Charts/graphs/sparklines — render trends as a simple list/rows of numbers only.
- Trainer/owner access to a member's journey (member-only this sprint).
- Pagination, date-range filters, or "load more".
- Touching `web/`, the nutrition/training/body-test modules, or the drawer/nav config (Journey is already registered in `nav-config.ts` and `SCREEN_REGISTRY`).
- Personal bests / 1RM (separate roadmap item).

## Affected Files

**Stage 1 — Backend (create):**
- `backend/src/modules/journey/journey.module.ts`
- `backend/src/modules/journey/journey.service.ts`
- `backend/src/modules/journey/journey.service.spec.ts`
- `backend/src/modules/journey/journey.controller.ts`
- `backend/src/modules/journey/journey.controller.spec.ts`
- `backend/src/modules/journey/journey.dev.controller.ts` (dev-only seed for E2E)
- `backend/src/modules/journey/dto/seed-journey.dto.ts`
- `backend/test/journey.e2e-spec.ts`

**Stage 1 — Backend (modify):**
- `backend/src/app.module.ts` — register `JourneyModule` (add import + add to `imports` array).

**Stage 2 — Mobile data layer (create):**
- `mobile/src/types/journey.ts`
- `mobile/src/lib/api/journey.api.ts`
- `mobile/src/stores/journey.store.ts`
- `mobile/src/stores/journey.store.spec.ts`

**Stage 3 — Mobile screen + E2E (create):**
- `mobile/src/screens/journey/JourneyScreen.tsx`
- `mobile/src/screens/journey/JourneyScreen.spec.tsx`
- `mobile/e2e/member/journey.spec.ts`

**Stage 3 — Mobile screen + E2E (modify):**
- `mobile/src/navigation/index.tsx` — replace the `JourneyScreen` import from `'../screens/placeholders'` with `'../screens/journey/JourneyScreen'` (the `Journey` key already exists in `SCREEN_REGISTRY`; only the import source changes).
- `mobile/src/screens/placeholders/index.ts` — remove the now-unused `JourneyScreen` placeholder export (it is the only export besides the factory; keep `makePlaceholder`).

---

## Data Shapes (shared contract — backend response = mobile types)

```typescript
// One finished session summary.
interface JourneySessionSummary {
  _id: string;
  date: string;           // ISO date of completedAt
  dayName: string;
  completedSetCount: number; // sets with completedAt !== null
}

// One day of nutrition adherence.
interface JourneyNutritionDay {
  date: string;           // 'YYYY-MM-DD'
  logged: boolean;        // a NutritionDailyLog exists for that date
  loggedKcal: number;     // sum across meals.items (0 if not logged)
  targetKcal: number;     // 0 if no plan/day-type target resolvable
  targetMet: boolean;     // targetKcal > 0 && loggedKcal >= targetKcal
}

// One body-test trend point.
interface JourneyBodyTestPoint {
  _id: string;
  date: string;           // ISO date
  weight: number;
  bodyFatPct: number;
}

// GET /journey response (full aggregate).
interface JourneySummary {
  workoutStreak: number;                  // consecutive days with a finished session
  recentSessions: JourneySessionSummary[]; // up to 7, most recent first
  nutritionDays: JourneyNutritionDay[];    // exactly 7, oldest → newest (last 7 calendar days incl. today)
  bodyTests: JourneyBodyTestPoint[];       // up to 10, most recent first
}
```

**Streak definition (exact):** Collect the set of distinct local date strings (`YYYY-MM-DD`) from `completedAt` of all finished sessions. Starting from today, walk backwards one day at a time counting consecutive days present in the set. If today has no finished session but yesterday does, the streak still counts starting from yesterday (today not yet trained does not break the streak). If neither today nor yesterday has a finished session, streak = 0.

---

## Stage 1: Backend journey endpoint

**Goal**: `GET /journey` returns a `JourneySummary` aggregated from existing models, guarded to member role, with a dev-only seed endpoint for E2E.

**Scope**: 1 service (3 aggregation methods + 1 orchestrator), 1 controller (1 endpoint), 1 dev controller (1 seed endpoint), module registration. Reuse existing models only.

**Sprint Contract**:

*Unit tests — `JourneyService` (`journey.service.spec.ts`, mocked Mongoose models):*
- [x] `JourneyService > computeStreak > returns 0 when member has no finished sessions`
- [x] `JourneyService > computeStreak > counts consecutive days ending today (today + yesterday finished → 2)`
- [x] `JourneyService > computeStreak > counts from yesterday when today has no finished session but yesterday does`
- [x] `JourneyService > computeStreak > stops at the first gap (today + 2-days-ago finished, yesterday missing → 1)`
- [x] `JourneyService > getRecentSessions > returns only finished sessions, most recent first, capped at 7, with completedSetCount counting sets where completedAt !== null`
- [x] `JourneyService > getNutritionDays > returns exactly 7 days oldest→newest, marks logged=false and loggedKcal=0 for days with no log`
- [x] `JourneyService > getNutritionDays > sets targetMet=true only when targetKcal > 0 and loggedKcal >= targetKcal`
- [x] `JourneyService > getBodyTests > returns up to 10 tests most recent first with weight and bodyFatPct mapped`
- [x] `JourneyService > getSummary > composes streak, sessions, nutritionDays, and bodyTests into one object`

*Unit tests — `JourneyController` (`journey.controller.spec.ts`):*
- [x] `JourneyController > getMyJourney > calls service.getSummary with req.user.sub and returns its result`

*Integration — `backend/test/journey.e2e-spec.ts` (MongoMemoryServer, `maxWorkers: 1`):*
- [x] `GET /journey` without auth → `401`
- [x] `GET /journey` as an `owner` (wrong role) → `403`
- [x] `GET /journey` as a member with a seeded finished session + 1 nutrition log + 1 body test → `200` and body matches `JourneySummary` shape with `workoutStreak >= 1`, `recentSessions.length === 1`, `nutritionDays.length === 7`, `bodyTests.length === 1`
- [x] `GET /journey` as a brand-new member with no data → `200` with `workoutStreak === 0`, `recentSessions: []`, `nutritionDays.length === 7` (all `logged: false`), `bodyTests: []`

**TDD sequence**:
1. Write `journey.service.spec.ts` against the 9 method behaviors using mocked models → Red.
2. Implement `JourneyService` (`computeStreak`, `getRecentSessions`, `getNutritionDays`, `getBodyTests`, `getSummary`) → Green.
3. Write `journey.controller.spec.ts` → Red; implement controller with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('member')` on `GET /journey` → Green.
4. Create `journey.dev.controller.ts` (registered only when `NODE_ENV !== 'production'`, mirroring `training.dev.controller.ts`) that seeds a finished `WorkoutSession`, a `NutritionDailyLog` for today, and a `BodyTest` for a member by email — needed by the Detox spec and the e2e spec.
5. Register `JourneyModule` in `app.module.ts`; write `journey.e2e-spec.ts` covering the 4 integration criteria → Green against the real Nest stack.
6. Run `cd backend && pnpm test && pnpm test:e2e && pnpm lint && pnpm build` → all green. Then `/simplify`.

**Status**: Complete

---

## Stage 2: Mobile data layer

**Goal**: A typed Zustand store fetches the journey summary via one API call and exposes `summary`, `loading`, `error`, and `fetchJourney()`.

**Scope**: 1 types file, 1 api file (single GET), 1 store. No UI. Mirror the `training.api.ts` / `training.store.ts` structure.

**Sprint Contract**:

*Unit tests — `journey.store.spec.ts` (mock `journey.api.ts`):*
- [x] `useJourneyStore > fetchJourney > sets loading true while in flight then stores summary and clears loading on success`
- [x] `useJourneyStore > fetchJourney > stores error message and clears loading when the api rejects`
- [x] `useJourneyStore > fetchJourney > leaves summary null and error set after a failure (does not retain stale data on first load)`
- [x] `useJourneyStore > initial state > summary is null, loading is false, error is null`

*Integration (store ↔ api boundary, api mocked):*
- [x] `fetchJourney` resolves and `summary` deep-equals the `JourneySummary` returned by the mocked `fetchJourney` api function (verifies the type contract passes through unchanged)
- [x] On rejection, `summary` stays `null` and `error` equals the rejected `Error.message`

**TDD sequence**:
1. Add `journey.ts` types (exact shapes from the Data Shapes section) — no test needed for pure type declarations.
2. Write `journey.store.spec.ts` mocking `../lib/api/journey.api` → Red.
3. Implement `journey.api.ts` (`fetchJourney(): Promise<JourneySummary>` → `apiClient.get('/journey')`) and `journey.store.ts` → Green.
4. Run `cd mobile && pnpm test -- --testPathPattern=journey.store && pnpm lint` → green. Then `/simplify`.

**Status**: Complete

---

## Stage 3: Mobile Journey screen + Detox E2E

**Goal**: Replace the Journey placeholder with a real read-only dashboard that renders streak, sessions, nutrition adherence, and body-test trend, verified end-to-end on a simulator.

**Scope**: 1 screen, its Jest render spec, 1 Detox spec, and the two-line navigation rewire. Follow the screen-header / list-card / skeleton patterns from `MyTrainingScreen.tsx` and the design guidelines (dark theme tokens, `text-foreground/65` for secondary text, density `px-3 py-2`).

**testID conventions (exact):**
- `screen-Journey` (root Screen)
- `journey-streak` (streak counter element, text content includes the streak number)
- `journey-session-{_id}` (one per recent session)
- `journey-nutrition-day-{date}` (one per nutrition day, date = `YYYY-MM-DD`)
- `journey-body-test-{_id}` (one per body test)
- `journey-empty` (shown only when streak 0, no sessions, no body tests, and no nutrition logs)

**Sprint Contract**:

*Unit tests — `JourneyScreen.spec.tsx` (RNTL, store mocked):*
- [x] `JourneyScreen > on mount > calls fetchJourney exactly once`
- [x] `JourneyScreen > with summary > renders journey-streak showing the streak number`
- [x] `JourneyScreen > with summary > renders one journey-session-{id} per recentSession and shows its dayName + completedSetCount`
- [x] `JourneyScreen > with summary > renders 7 journey-nutrition-day-{date} rows and marks targetMet days distinctly from un-logged days`
- [x] `JourneyScreen > with summary > renders one journey-body-test-{id} per body test showing weight and bodyFatPct`
- [x] `JourneyScreen > with all-empty summary (streak 0, no sessions/tests, no logged days) > renders journey-empty`
- [x] `JourneyScreen > while loading > renders skeleton rows and not journey-empty`

*E2E — `mobile/e2e/member/journey.spec.ts` (Detox, seeds via `/auth/dev/seed-user-role` + `/journey/dev/seed`):*
- [x] Member logs in → opens drawer → taps `drawer-item-Journey` → `screen-Journey` is visible
- [x] On a member seeded with a finished session + nutrition log + body test: `journey-streak` is visible, at least one `journey-session-{id}` is visible, and at least one `journey-body-test-{id}` is visible (golden path: streak + session list + nutrition + body trend all render from one fetch)
- [x] Edge case: a member seeded with no data → `screen-Journey` visible and `journey-empty` visible

**TDD sequence**:
1. Write `JourneyScreen.spec.tsx` (7 criteria) mocking `useJourneyStore` → Red.
2. Implement `JourneyScreen.tsx` consuming the store, calling `fetchJourney` in `useEffect`, rendering header + four sections (streak, sessions, nutrition, body tests) + skeleton + empty state per the testID conventions → Green.
3. Rewire navigation: change the `JourneyScreen` import in `mobile/src/navigation/index.tsx` to the real screen; remove the placeholder export. Run `cd mobile && pnpm test && pnpm lint` → green (no broken imports/regressions).
4. Write `mobile/e2e/member/journey.spec.ts` mirroring the seed/login flow in `member/my-training.spec.ts`; run `cd mobile && pnpm detox:test --testPathPattern=member/journey` against a booted simulator + running backend → green.
5. `/simplify`, then run the `design-reviewer` agent on `mobile/src/screens/journey/JourneyScreen.tsx`.

**Stage 3 Checkpoint**
- [x] `mobile/src/screens/journey/JourneyScreen.tsx` (unit tests green)
- [x] `mobile/src/screens/journey/JourneyScreen.spec.tsx`
- [x] Navigation rewire (remove placeholder, update import)
- [x] `mobile/e2e/member/journey.spec.ts`

**Status**: Complete
