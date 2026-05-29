# Sprint 2 — Frontend Vite SPA Migration Implementation Plan

> Authoritative design source: `/Users/eric_gong/Projects/power_gym/.archive/2026-05-29/frontend-vite-spa-design.md`
> All architectural decisions in that spec are final. This plan operationalises them into testable Sprint Contract stages, corrected against the actual state of `web/` and `backend/` (surveyed 2026-05-29).

## Goal
A user (owner, trainer, or member) can do everything they do today in `web/` — log in, navigate every page, and complete every flow — against a brand-new standalone Vite + React SPA in `frontend/` that talks directly to the NestJS backend, with pixel-identical UI and identical URLs.

## Scope

**In scope:**
- New standalone `frontend/` package at repo root (Vite 6 + React 19 + TypeScript strict, own `package.json`).
- React Router v7 (`createBrowserRouter`) with `RequireAuth` + `RequireRole` guards mirroring all `web/` URLs.
- Zustand v5 domain stores (one per domain) covering component + async state. No TanStack Query / SWR.
- Thin API layer (`src/api/*`) — one file per NestJS domain + a shared `client.ts` with Bearer injection and single-retry 401 silent refresh.
- Auth: access token in JS memory (authStore), refresh token in httpOnly cookie set by NestJS.
- Verbatim copy of design tokens (`globals.css` / CSS vars, Tailwind config), `variants.ts`, Shadcn `components/ui/`, and shared domain components.
- All owner / trainer / member pages migrated 1:1 (full inventory below).
- Vitest + RTL (unit) and Playwright (E2E) configured against `localhost:5173` + real NestJS backend.
- Minimal, surgical NestJS `backend/` changes: CORS origin `http://localhost:5173`, `cookie-parser`, refresh/logout set/clear httpOnly cookie, logout/refresh read refresh token from cookie.

**Out of scope:**
- ANY change to `web/` (it stays live for the whole sprint; user deletes it manually after Stage 5 acceptance).
- Any UI/UX change — pixel parity is required; Shadcn primitives are copied, never regenerated.
- Any URL change — bookmarked links must keep working.
- New features, refactors of backend business logic, mobile app, production deploy, `landing/`.
- Re-architecting backend auth semantics beyond the cookie move (token TTLs 15m/7d, refresh-token DB revocation policy unchanged).

## Ground-truth survey findings (these correct the design spec's simplified examples — Generator must use these)

### Backend (`backend/src/`)
- 14 controllers, each at `src/<domain>/<domain>.controller.ts` (NOT `src/modules/...`): `account, auth, billing, body-tests, check-ins, equipment, health, member-health, nutrition, progress, schedule, training, upload, users`. These are the only endpoints `frontend/` calls.
- Global prefix `app.setGlobalPrefix('api/v1')` → all endpoints `/api/v1/...`. Port `process.env.PORT ?? 3001`.
- `src/main.ts` has CORS configured for `http://localhost:3000` only (must add `http://localhost:5173`). No `cookie-parser` wired.
- `AuthController` (`src/auth/auth.controller.ts`) — verified clean (no duplicate-method bug). Methods: `login` (POST, body→service.login), `register` (POST CREATED), `refresh` (POST, `@UseGuards(RefreshTokenGuard)` → passport `jwt-refresh` strategy, which currently extracts the refresh token from the **Authorization: Bearer header**; the controller then reads it via `@CurrentUser().refreshToken`), `logout` (POST, **reads `dto.refresh_token` from the BODY** via `@Body() dto: RefreshDto` — NOT access-token guarded), `forgotPassword`, `resetPassword`, plus `GET /auth/me` (returns the access-token user).
- `AuthService.issueTokens()` returns `{ access_token, refresh_token, user: { id, email, role, name } }` — `login`/`register`/`refresh` all currently leak `refresh_token` in the JSON body. The cookie migration moves `refresh_token` out of the body into an httpOnly cookie set by the CONTROLLER via `@Res({ passthrough: true })`, stripping it from the JSON.
- The refresh token is currently read in two places that must both switch to the httpOnly cookie (`req.cookies.refresh_token`): (a) `RefreshTokenStrategy` (`src/auth/strategies/refresh.strategy.ts`) — its `super({ jwtFromRequest })` AND its `validate()` both use `ExtractJwt.fromAuthHeaderAsBearerToken()` (Authorization header) and must instead extract from the cookie; (b) `AuthController.logout` reads `@Body() dto: RefreshDto` and must instead read the cookie. The `GET /auth/me` endpoint and `forgotPassword`'s non-prod `AUTH_EXPOSE_RESET_TOKEN` behaviour stay unchanged.
- The login/register clients (`src/api/auth.ts`) must NOT send a refresh token in any header or body — they rely entirely on the httpOnly cookie set by the server.
- `cookie-parser` and `@types/cookie-parser` are NOT backend deps — Stage 1 adds them and wires `app.use(cookieParser())`.

### Web frontend (`web/src/`) — source of truth for pages, nav, components
- UI primitives (`web/src/components/ui/`, 18 files, copy verbatim): `alert-dialog, badge, button, card, command, dialog, input-group, input, label, pagination, popover, select, sheet, skeleton, sonner, tabs, textarea, tooltip`.
- Shared component dirs (`web/src/components/`): `animations, billing, calendar, nutrition, self-tracking, settings, shared, training, ui`. Layout lives in `components/shared/` (`app-sidebar, sidebar-nav, user-menu, page-transition, dashboard-shell`).
- Sidebar nav is hard-coded in `web/src/components/shared/app-sidebar.tsx` (copy these labels/hrefs verbatim — they drive E2E observables):
  - **OWNER_NAV**: Dashboard `/owner`, Members `/owner/members`, Trainers `/owner/trainers`, Plans `/owner/plans`, Nutrition `/owner/nutrition-templates`, Foods `/owner/foods`, Services `/owner/services`, Billing `/owner/billing`, Calendar `/owner/calendar`, Equipment `/owner/equipment`, Settings `/owner/settings`
  - **TRAINER_NAV**: Members `/trainer/members`, Plans `/trainer/plans`, Nutrition `/trainer/nutrition`, Foods `/trainer/foods`, Calendar `/trainer/calendar`, Billing `/trainer/billing`, Settings `/trainer/settings`
  - **MEMBER_NAV**: Dashboard `/member`, My Training `/member/my-training`, My Nutrition `/member/nutrition`, Check-In `/member/check-in`, Schedule `/member/schedule`, Body Tests `/member/body-tests`, Journey `/member/journey`, Health `/member/health`, Billing `/member/billing`, Settings `/member/settings`
- Login/register/logout E2E observables (from `web/e2e/auth.spec.ts`, must be preserved): login form fields `#email` / `#password`, submit button labelled "Sign in"; owner→`/owner`, trainer→`/trainer/members`, member→`/member`; logout via "User menu" button → "Sign out" (popover) → "Sign out" (confirm dialog) → `/login`; wrong password shows text "Invalid email or password."; register fields `#firstName #lastName #email #password`, button "Create account".

### Library versions to match in `frontend/package.json` (from `web/package.json`)
react `19.2.4`, react-dom `19.2.4`, framer-motion `^12.38.0`, lucide-react `^1.8.0`, recharts `^3.8.1`, sonner `^2.0.7`, class-variance-authority `^0.7.1`, clsx `^2.1.1`, tailwind-merge `^3.5.0`, cmdk `^1.1.1`, `@base-ui/react` `^1.4.0`, react-easy-crop `^5.5.7`, `@aws-sdk/client-s3` `^3.1041.0` (only if any copied component imports it; otherwise omit). Tailwind: tailwindcss `^4`, `@tailwindcss/postcss` `^4`, `tw-animate-css` `^1.4.0`. Tests: `@playwright/test` `^1.59.1`, `@testing-library/react` `^16.3.2`, `@testing-library/jest-dom` `^6.9.1`, `@testing-library/user-event` `^14.6.1`. TypeScript `^5`, eslint `^9`. NOTE: `web/` does NOT use react-hook-form / zod / date-fns / react-day-picker — do not add them.
New deps to introduce: `vite ^6`, `@vitejs/plugin-react`, `react-router-dom ^7`, `zustand ^5`, `vitest`, `jsdom`, `@vitest/coverage-v8`.

## Affected Files

### Created (frontend/ — new package)
- Config: `frontend/package.json`, `index.html`, `.env.example`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `eslint.config.js`
- Entry: `src/main.tsx`, `src/App.tsx`, `src/index.css` (copy of web globals.css / CSS vars)
- Lib: `src/lib/utils.ts`, `src/lib/animations/variants.ts` (copied verbatim)
- UI primitives: `src/components/ui/*` (the 18 files above, copied verbatim)
- Shared/domain components ported from `web/src/components/`: `shared/` (app-sidebar, sidebar-nav, user-menu, page-transition, dashboard-shell), `animations/`, `billing/`, `calendar/`, `nutrition/`, `self-tracking/`, `settings/`, `training/` — replacing `next/link`/`next/navigation`/`next-auth` usages with React Router + authStore equivalents
- Router: `src/router/index.tsx`, `src/router/guards.tsx`
- API: `src/api/client.ts` + one file per domain consumed: `auth.ts, account.ts, billing.ts, body-tests.ts, check-ins.ts, equipment.ts, member-health.ts, nutrition.ts, progress.ts, schedule.ts, training.ts, users.ts, upload.ts`
- Stores: `src/stores/{authStore, usersStore, trainingStore, nutritionStore, bodyTestsStore, scheduleStore, checkInsStore, equipmentStore, memberHealthStore, progressStore, billingStore, accountStore}.ts`
- Types: `src/types/*` (shared API response interfaces — no `any`/`unknown`)
- Pages: `src/pages/auth/{login,register,forgot-password,reset-password}.tsx`, `src/pages/owner/*`, `src/pages/trainer/*`, `src/pages/member/*` (1:1 with inventory below)
- Tests: `src/__tests__/**` (Vitest), `frontend/e2e/**` (Playwright, adapted from `web/e2e/`)

### Modified (backend/ — ONLY these)
- `backend/package.json` — add `cookie-parser`, `@types/cookie-parser`
- `backend/src/main.ts` — add `http://localhost:5173` to CORS allowed origins, `app.use(cookieParser())`
- `backend/src/auth/auth.controller.ts` — `login`/`register`/`refresh` use `@Res({ passthrough: true })` to set the refresh_token httpOnly cookie and strip it from the JSON body; `logout` reads the token from `req.cookies.refresh_token` (no longer from the body) and clears the cookie (`Max-Age=0`)
- `backend/src/auth/strategies/refresh.strategy.ts` — change the `jwtFromRequest` extractor and the `validate()` extractor from `ExtractJwt.fromAuthHeaderAsBearerToken()` to a cookie extractor reading `req.cookies.refresh_token`
- `backend/src/auth/dto/refresh.dto.ts` — `refresh_token` no longer required in the body (read from cookie); keep the DTO only if still referenced, else drop its body usage
- Backend auth `*.spec.ts` updated for the cookie contract

### Page inventory (verified from `web/src/app/(dashboard)/`) — exact 1:1 targets, URLs unchanged

**Owner (Stage 2):** `/owner`, `/owner/members`, `/owner/members/:id/nutrition`, `/owner/trainers`, `/owner/trainers/:id`, `/owner/trainers/:id/members`, `/owner/trainers/:id/training-plans`, `/owner/trainers/:id/nutrition-plans`, `/owner/trainers/:id/calendar`, `/owner/plans`, `/owner/plans/new`, `/owner/plans/:id`, `/owner/plans/:id/edit`, `/owner/nutrition-templates`, `/owner/nutrition-templates/new`, `/owner/nutrition-templates/:id/edit`, `/owner/foods`, `/owner/foods/new`, `/owner/foods/:foodId/edit`, `/owner/services`, `/owner/billing`, `/owner/calendar`, `/owner/equipment`, `/owner/invites`, `/owner/settings`, plus owner self-tracking: `/owner/my-training`, `/owner/my-training/calendar`, `/owner/my-training/session/:id`, `/owner/my-nutrition`, `/owner/my-nutrition/day`, `/owner/my-body-tests`

**Trainer (Stage 3):** `/trainer`, `/trainer/members`, `/trainer/members/:id`, `/trainer/members/:id/plan`, `/trainer/members/:id/nutrition`, `/trainer/members/:id/nutrition/new`, `/trainer/members/:id/body-tests`, `/trainer/members/:id/health`, `/trainer/members/:id/check-ins`, `/trainer/members/:id/check-ins/:checkInId`, `/trainer/members/:id/billing`, `/trainer/members/:id/photos`, `/trainer/members/:id/progress`, `/trainer/members/:id/log/new`, `/trainer/members/:id/log/:sessionId`, `/trainer/plans`, `/trainer/plans/new`, `/trainer/plans/:id`, `/trainer/plans/:id/edit`, `/trainer/nutrition`, `/trainer/nutrition/new`, `/trainer/nutrition/:id/edit`, `/trainer/foods`, `/trainer/foods/new`, `/trainer/foods/:foodId/edit`, `/trainer/calendar`, `/trainer/billing`, `/trainer/invites`, `/trainer/settings`, plus trainer self-tracking: `/trainer/my-training`, `/trainer/my-training/calendar`, `/trainer/my-training/session/:id`, `/trainer/my-nutrition`, `/trainer/my-nutrition/day`

**Member (Stage 4):** `/member`, `/member/my-training`, `/member/my-training/calendar`, `/member/my-training/session/:id`, `/member/nutrition`, `/member/nutrition/day`, `/member/check-in`, `/member/check-in/new`, `/member/check-in/history`, `/member/check-in/:id`, `/member/schedule`, `/member/body-tests`, `/member/journey`, `/member/health`, `/member/billing`, `/member/settings`

---

## Stage 1: Scaffold + Auth

**Goal**: `frontend/` boots via Vite with all config wired; design tokens + 18 Shadcn primitives + `variants.ts` copied; React Router with guards live; `authStore` + API client working; the four auth pages render; and the full login → role-redirect → page-refresh-silent-refresh → logout cycle works end-to-end against the real NestJS backend with its cookie-based refresh changes landed.

**Sprint Contract** (acceptance criteria — each maps to one `expect()`):

*Frontend unit tests (Vitest + RTL) — mandatory for every store action, API client function, and guard:*
- [ ] `authStore > login > stores accessToken in memory and sets status 'authenticated' on success`
- [ ] `authStore > login > sets user (id, email, role, name) from the login response`
- [ ] `authStore > login > leaves status 'unauthenticated' and throws on 401 invalid credentials`
- [ ] `authStore > initAuth > on success sets status 'authenticated' and populates accessToken + user`
- [ ] `authStore > initAuth > on refresh failure sets status 'unauthenticated' and clears accessToken`
- [ ] `authStore > initAuth > sets status 'loading' while the refresh request is in flight`
- [ ] `authStore > refresh > returns the new access token string and stores it on success`
- [ ] `authStore > refresh > returns null and sets status 'unauthenticated' on failure`
- [ ] `authStore > logout > posts /api/v1/auth/logout, then clears accessToken + user and sets status 'unauthenticated'`
- [ ] `apiClient > request > attaches 'Authorization: Bearer <accessToken>' from authStore`
- [ ] `apiClient > request > on 401 calls authStore.refresh once then retries the request exactly once with the new token`
- [ ] `apiClient > request > when refresh returns null calls logout and throws 'Session expired' (no second retry)`
- [ ] `apiClient > request > passes a non-401 response through unchanged (no refresh attempt)`
- [ ] `RequireAuth > renders FullPageSpinner when status is 'idle' or 'loading'`
- [ ] `RequireAuth > redirects to /login when status is 'unauthenticated'`
- [ ] `RequireAuth > renders <Outlet /> when status is 'authenticated'`
- [ ] `RequireRole > renders <Outlet /> when user.role is in the allowed roles`
- [ ] `RequireRole > redirects to / when user.role is not allowed`

*Backend unit tests (Jest, `backend/`) — for the cookie contract change:*
- [ ] `AuthController > login > sets refresh_token as an httpOnly cookie and omits refresh_token from the JSON body`
- [ ] `AuthController > refresh > reads refresh_token from the cookie, sets a fresh httpOnly cookie, and returns access_token in body`
- [ ] `AuthController > logout > revokes the refresh token and clears the cookie (Max-Age=0)`

*Integration / E2E (Playwright vs real NestJS):*
- [ ] Login: fill `#email`/`#password` with owner creds on `/login`, click "Sign in" → URL becomes `/owner` and the sidebar shows "Members" (asserts redirect + authenticated shell)
- [ ] Role redirect: trainer login lands on `/trainer/members` and "Plans" is visible; member login lands on `/member` and "Check-In" is visible
- [ ] Silent refresh on reload: after owner login, `page.reload()` stays on `/owner` with "Members" still visible (no flash to `/login`) — proves the httpOnly cookie restores the session via `initAuth`
- [ ] Logout: "User menu" → "Sign out" → confirm "Sign out" → URL becomes `/login`; a subsequent `page.reload()` stays on `/login` (cookie cleared, refresh fails)
- [ ] Unauthenticated guard: navigating directly to `/owner/members` redirects to `/login`
- [ ] Wrong-role guard: a logged-in member navigating to `/owner` is redirected away (to `/member` or `/`)
- [ ] Invalid login: bad password shows the text "Invalid email or password." and stays on `/login`

**TDD sequence** (Generator must follow — no exceptions):
1. Backend first: write failing Jest tests for the AuthController cookie contract → Red. Add `cookie-parser` + `@types/cookie-parser`, wire `app.use(cookieParser())`, add `http://localhost:5173` to CORS, change controller to set/clear the httpOnly cookie via `@Res({ passthrough: true })`, make `refresh` + `logout` read the cookie, strip `refresh_token` from JSON bodies → Green. Run backend `pnpm test` → all green.
2. Scaffold `frontend/` (Vite, strict tsconfig, Tailwind v4 + postcss, components.json, vitest, playwright, eslint). Copy `globals.css`/CSS vars → `src/index.css`, `variants.ts`, `components/ui/*` (18 files), `utils.ts` verbatim. Confirm `vite dev` serves a blank routed shell.
3. Write the failing Vitest unit tests for `authStore`, `apiClient`, `RequireAuth`, `RequireRole` → Red.
4. Implement `authStore`, `client.ts`, `api/auth.ts`, guards, `router/index.tsx`, the four auth pages, `App.tsx` calling `initAuth()` on mount → Green.
5. Run `/simplify` on the diff → Refactor.
6. Write the Playwright auth spec (adapted from `web/e2e/auth.spec.ts`, base URL `localhost:5173`) and run it against the Vite server + real NestJS → all green.

**Status**: Not Started

---

## Stage 2: Owner Domain

**Goal**: Every owner page in the inventory renders and is fully functional against NestJS, backed by `usersStore`, `billingStore`, `scheduleStore`, `equipmentStore` and their `src/api/` files (`users.ts`, `billing.ts`, `schedule.ts`, `equipment.ts`). Owner sidebar matches `app-sidebar.tsx` OWNER_NAV verbatim.

**Sprint Contract**:

*Unit tests (Vitest + RTL) — at least one per new store action; mandatory representative set:*
- [ ] `usersStore > fetchMembers > populates members and clears isLoading on success`
- [ ] `usersStore > fetchMembers > sets error and clears isLoading on failure`
- [ ] `usersStore > fetchTrainers > populates trainers list`
- [ ] `usersStore > createInvite > appends the new invite to state and returns the invite token`
- [ ] `usersStore > assignTrainer > updates the member's trainerId in state`
- [ ] `usersStore > fetchOwnerStats > populates ownerStats used by the dashboard`
- [ ] `usersStore > reset > clears members, trainers, invites, ownerStats`
- [ ] `billingStore > fetchServiceTypes > populates serviceTypes`
- [ ] `billingStore > createServiceType > appends a new service type`
- [ ] `billingStore > deleteServiceType > removes the service type by id`
- [ ] `billingStore > fetchMemberBilling > populates billing lines for a member id`
- [ ] `scheduleStore > fetchSchedule > populates scheduled sessions`
- [ ] `scheduleStore > createSession > appends the new scheduled session`
- [ ] `scheduleStore > deleteSession > removes the session by id`
- [ ] `equipmentStore > fetchEquipment > populates equipment list`
- [ ] `equipmentStore > createEquipment > appends a new equipment item`
- [ ] `equipmentStore > deleteEquipment > removes equipment by id`
- [ ] `equipmentStore > addConditionReport > appends a report to the targeted equipment item`
- [ ] `api (users/billing/schedule/equipment) > each fn > calls the correct /api/v1 path + HTTP method` (one assertion per exported fn)

*Integration / E2E (Playwright vs real NestJS):*
- [ ] Invite member: owner opens `/owner/invites`, submits the invite form with an email → success toast and the invite appears in the list
- [ ] Member list: owner navigates to `/owner/members` and sees seeded members rendered
- [ ] Services: owner opens `/owner/services`, creates a service type → it appears; deleting it removes it
- [ ] Billing: owner navigates to `/owner/billing` and sees billing data render
- [ ] Calendar: owner opens `/owner/calendar`, creates a scheduled session → it appears on the calendar
- [ ] Equipment: owner opens `/owner/equipment`, creates an item → it appears; opening its detail and adding a condition report shows the report
- [ ] Trainers: owner navigates to `/owner/trainers` and sees seeded trainers; `/owner/trainers/:id` shows trainer detail
- [ ] Owner dashboard: `/owner` renders the ownerStats cards from `usersStore.fetchOwnerStats`

**TDD sequence**:
1. Write failing Vitest unit tests for each store action + api fn → Red.
2. Implement `src/api/{users,billing,schedule,equipment}.ts` and the four stores minimally → Green.
3. `/simplify` → Refactor.
4. Build the owner pages consuming the stores (no local async state), then write/adapt the Playwright owner specs from `web/e2e/owner/*` for `localhost:5173` → all green against real NestJS.

**Status**: Not Started

---

## Stage 3: Trainer Domain

**Goal**: Every trainer page renders and works against NestJS, backed by `trainingStore`, `nutritionStore`, `bodyTestsStore`, `memberHealthStore` (these stores also expose the member-facing slices reused in Stage 4) plus their `src/api/` files (`training.ts`, `nutrition.ts`, `body-tests.ts`, `member-health.ts`). Trainer sidebar matches TRAINER_NAV verbatim.

**Sprint Contract**:

*Unit tests (Vitest + RTL) — at least one per new store action; mandatory representative set:*
- [ ] `trainingStore > fetchPlans > populates plan templates`
- [ ] `trainingStore > createPlan > appends a template; updatePlan > replaces it; deletePlan > removes it`
- [ ] `trainingStore > fetchMemberPlan > populates the member's active plan for a member id`
- [ ] `trainingStore > assignPlan > sets the member's active plan and returns success`
- [ ] `trainingStore > startSession > sets activeSession`
- [ ] `trainingStore > updateSet > mutates the targeted set inside activeSession`
- [ ] `trainingStore > completeSession > marks activeSession completed and clears the active reference`
- [ ] `trainingStore > saveExerciseNote > stores the note for the exercise`
- [ ] `trainingStore > fetchPbs > populates PBs for a member id`
- [ ] `nutritionStore > fetchTemplates > populates templates; create/update/delete update state`
- [ ] `nutritionStore > fetchFoods > populates foods; create/update/delete update state`
- [ ] `nutritionStore > searchFood > populates external (FatSecret) food search results`
- [ ] `nutritionStore > assignPlan > sets the member's nutrition plan`
- [ ] `nutritionStore > fetchMemberPlan > populates memberPlan for a member id`
- [ ] `bodyTestsStore > fetchTests > populates tests for a member id`
- [ ] `bodyTestsStore > createTest > appends a test and exposes the computed body-fat result`
- [ ] `bodyTestsStore > exportCsv > requests the export endpoint and returns the blob/url`
- [ ] `memberHealthStore > fetchHealth > populates injuries, medical history, medications`
- [ ] `memberHealthStore > addInjury > appends an injury; deleteInjury > removes it`
- [ ] `api (training/nutrition/body-tests/member-health) > each fn > hits the correct /api/v1 path + method` (one assertion per exported fn)

*Integration / E2E (Playwright vs real NestJS):*
- [ ] Assign training plan: trainer opens `/trainer/members/:id/plan`, assigns a plan template → confirmation and the active plan reflected
- [ ] Log session on behalf of member: trainer opens `/trainer/members/:id/log/new`, logs ≥1 set's weight + reps, completes it → completed state shown (golden path adapted from `web/e2e/trainer/member-session-lifecycle.spec.ts`)
- [ ] Create body test: trainer opens `/trainer/members/:id/body-tests`, enters skinfold values, saves → computed body-fat result shows and the test appears in the list
- [ ] Foods: trainer creates a food at `/trainer/foods/new` → it appears in `/trainer/foods`
- [ ] Nutrition template: trainer creates a template at `/trainer/nutrition/new` → it appears in `/trainer/nutrition`
- [ ] Member health: trainer adds an injury on `/trainer/members/:id/health` → it appears in the list
- [ ] Plans list: `/trainer/plans` renders templates; creating one at `/trainer/plans/new` adds it
- [ ] Edge case: assigning a plan, then re-assigning a different plan, shows the latest active plan (no stale data)

**TDD sequence**:
1. Write failing Vitest unit tests for each store action + api fn → Red.
2. Implement `src/api/{training,nutrition,body-tests,member-health}.ts` and the four stores minimally → Green.
3. `/simplify` → Refactor.
4. Build trainer pages from the stores, then write/adapt Playwright specs from `web/e2e/trainer/*` for `localhost:5173` → all green against real NestJS.

**Status**: Not Started

---

## Stage 4: Member Domain

**Goal**: Every member page renders and works against NestJS, backed by `checkInsStore`, `progressStore`, `accountStore` (member-facing training/nutrition slices built in Stage 3 are reused). Member sidebar matches MEMBER_NAV verbatim. Note URLs: My Nutrition is `/member/nutrition` (not `/member/my-nutrition`).

**Sprint Contract**:

*Unit tests (Vitest + RTL) — at least one per new store action; mandatory representative set:*
- [ ] `checkInsStore > fetchCheckIns > populates the check-ins list`
- [ ] `checkInsStore > fetchConfig > populates the check-in config (schedule)`
- [ ] `checkInsStore > submitCheckIn > appends today's check-in and returns success`
- [ ] `checkInsStore > submitCheckIn > sets error when a check-in for today already exists`
- [ ] `progressStore > fetchTrend > populates 1RM trend data for a member id`
- [ ] `progressStore > fetchTrend > sets error and clears isLoading on failure`
- [ ] `accountStore > fetchProfile > populates the user profile`
- [ ] `accountStore > updateProfile > merges the updated fields into state`
- [ ] `accountStore > changePassword > returns success on 200`
- [ ] `accountStore > changeEmail > updates the stored email on success`
- [ ] `accountStore > reset > clears profile`
- [ ] `api (check-ins/progress/account) > each fn > hits the correct /api/v1 path + method` (one assertion per exported fn)

*Integration / E2E (Playwright vs real NestJS):*
- [ ] Session lifecycle: member opens `/member/my-training`, starts the session, logs sets (weight + reps), completes → completed state shows (golden path adapted from `web/e2e/member/session-lifecycle.spec.ts`, the canonical animation-timer pattern)
- [ ] Submit check-in: member opens `/member/check-in/new`, fills the form, submits → success toast and today shows as checked in
- [ ] Check-in edge case: re-submitting the same day shows an "already submitted" state (no duplicate) — adapted from `web/e2e/member/day-already-logged.spec.ts`
- [ ] Log nutrition day: member opens `/member/nutrition/day`, logs a food/meal → the day total updates and the entry appears (adapted from `web/e2e/member/nutrition.spec.ts`)
- [ ] Body tests: member opens `/member/body-tests` and sees their test history
- [ ] Journey/Progress: member opens `/member/journey` and the 1RM trend chart renders for at least one exercise (adapted from `web/e2e/member/progress.spec.ts`)
- [ ] Settings: member updates a profile field on `/member/settings` and sees a save-success toast (adapted from `web/e2e/member/settings.spec.ts`)

**TDD sequence**:
1. Write failing Vitest unit tests for each store action + api fn → Red.
2. Implement `src/api/{check-ins,progress,account}.ts` and the three stores minimally → Green.
3. `/simplify` → Refactor.
4. Build member pages from the stores, then write/adapt Playwright specs from `web/e2e/member/*` for `localhost:5173` → all green against real NestJS.

**Status**: Not Started

---

## Stage 5: Integration & Verification

**Goal**: Full cross-role regression passes, production build is clean, lint and Vitest pass, backend tests still green — unblocking manual deletion of `web/`.

**Sprint Contract**:

*Integration / E2E (Playwright vs real NestJS):*
- [ ] Cross-role journey (single spec, real backend): owner logs in → creates an invite → new member registers via the invite token and lands on `/member` → trainer logs in → assigns a training plan to that member → member logs in → starts and completes the assigned session; each step asserts its observable success state, proving all stores/pages/auth interoperate
- [ ] Access-control regression: adapted from `web/e2e/access-control.spec.ts` — each role is blocked from the other roles' routes (redirect asserted)
- [ ] Deep-link + refresh regression: navigate directly to a deep member URL (e.g. `/member/my-training/session/:id`) while authenticated, then reload, and the user stays on that URL (silent refresh + router parity)

*Build / quality gates (each is a runnable pass/fail check):*
- [ ] `cd frontend && pnpm build` exits 0 (Vite production build, no TS errors)
- [ ] `cd frontend && pnpm lint` exits 0 (no warnings, no errors)
- [ ] `cd frontend && pnpm test` exits 0 (all Vitest unit/integration specs pass)
- [ ] `cd frontend && pnpm test:e2e` exits 0 (all Playwright specs pass against real NestJS)
- [ ] `cd backend && pnpm test` exits 0 (backend Jest still green after the Stage 1 cookie changes)

**TDD sequence**:
1. Write the failing cross-role Playwright journey spec → Red (it fails until all prior stages are correct end-to-end).
2. Fix integration gaps one at a time, reverting any unverified fix before trying the next → Green.
3. `/simplify` on any integration-glue code touched → Refactor.
4. Run the full gate set (build, lint, vitest, frontend e2e, backend test) → all green.

**Status**: Not Started

---

## Verification (end-to-end proof all stages work together)

Start the real NestJS backend (`cd backend && pnpm start:dev`, port 3001) and the Vite dev server (`cd frontend && pnpm dev`, port 5173, proxying `/api` → 3001). Then, with no manual DB poking:

1. Visit `/login` unauthenticated → guard redirects hold; deep links to `/owner/*`, `/trainer/*`, `/member/*` all bounce to `/login`.
2. Log in as owner → land on `/owner`, sidebar shows OWNER_NAV verbatim. Create an invite, create a service type, create a scheduled session, create an equipment item + condition report — each persists and re-renders from its store.
3. Reload any owner page → silent refresh keeps the session (no `/login` flash).
4. The invited member registers via the invite token → lands on `/member`.
5. Log in as trainer (lands on `/trainer/members`) → assign a training plan and a nutrition plan to that member, log a session on their behalf, create a body test (body-fat result computed), add an injury.
6. Log in as that member → start and complete their assigned session (sets persist through the animation flow), submit a check-in, log a nutrition day, view their journey chart and body-test history.
7. Log out from any role → land on `/login`; reload stays on `/login` (cookie cleared).
8. All five Stage 5 gates pass (`build`, `lint`, frontend `test`, frontend `test:e2e`, backend `test`).

When all of the above holds, `web/` deletion is unblocked (performed manually by the user).
