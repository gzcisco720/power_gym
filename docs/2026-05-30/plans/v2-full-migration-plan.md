# v2 Full Migration Implementation Plan

## Goal
Every owner, trainer, and member can perform in the v2 stack (`frontend/` React SPA + `backend/` NestJS API) exactly what they could do in v1 (`web/` Next.js), with pixel-identical UI and identical business logic — auth excluded (already complete).

## Migration Principle: 1:1, No New Features
This is a straight port. For every feature:
- **Backend stage**: build a NestJS controller + service + DTOs + module that replicates the behavior, payload shapes, status codes, and role guards of the matching v1 route(s) under `web/src/app/api/`. Models and repositories already exist in `backend/src/database/models/` and `backend/src/repositories/` — **do not modify them**.
- **Frontend stage**: build React page(s) + a Zustand store + `api/*.ts` client functions that reproduce the v1 page under `web/src/app/(dashboard)/` exactly, following `.claude/instructions/design.md`.

Do not redesign, do not add fields, do not "improve" v1 behavior. If v1 has a quirk, replicate it.

## Conventions (apply to every stage)

**Backend**
- Controllers mirror v1 route paths but **without** the `/api` prefix where the global prefix already supplies it (confirm `main.ts` prefix before first stage; match existing auth/account controllers' path style).
- Auth: use `@CurrentUser()`, `JwtAuthGuard` (global), `@Roles('owner'|'trainer'|'member')` + `RolesGuard`. Use `@Public()` only where v1 had no session check.
- Validation: `class-validator` DTOs. No `any`/`unknown`.
- Response shapes must byte-match v1's `Response.json(...)` payloads (same keys, same casing, `_id` serialization).
- Ownership checks (trainer can only touch own members, owner can touch all) must replicate v1 exactly — port the guard logic from each v1 route.
- Every service method gets a Jest unit spec (`*.service.spec.ts`).

**Frontend**
- Pages under `frontend/src/pages/{owner|trainer|member}/`. Shared feature components under `frontend/src/components/<domain>/`.
- One Zustand store per domain under `frontend/src/stores/`. API client functions under `frontend/src/api/<domain>.ts` using `request`/`requestVoid` from `api/client.ts`.
- Register routes in `frontend/src/router/index.tsx` (replace the per-role `Navigate` placeholder children incrementally — keep a placeholder for not-yet-built routes).
- Use existing shared components (`page-header`, `stat-card`, `empty-state`, `dashboard-layout`, etc.) and `lib/animations/variants.ts`. Do not redefine spring configs.
- TypeScript strict, no `any`/`unknown`. `text-foreground/65` not `text-muted-foreground`. Numeric inputs `type="text" inputMode="decimal"`. No native `confirm()`/`alert()`.

**Verification per stage**
- Backend stages: Jest unit specs + a documented manual/`curl` check OR a backend e2e spec where one exists. Criteria expressed as `expect()`-able assertions.
- Frontend stages: Vitest component/store tests + a Playwright E2E spec in `frontend/e2e/` running the changed flow against the real stack (seeded DB + running backend).

## Source-of-Truth Map (v1 → v2)
| Domain | v1 pages | v1 API routes |
|---|---|---|
| Owner dashboard | `web/src/app/(dashboard)/owner/page.tsx`, `owner/_components/*` | `api/owner/stats`, `api/owner/trainers`, `api/owner/equipment` |
| Owner people | `owner/trainers/**`, `owner/members/**`, `owner/invites/**` | `api/owner/trainers/**`, `api/owner/members/**`, `api/owner/invites/**` |
| Templates/equipment | `owner/plans/**`, `owner/nutrition-templates/**`, `owner/foods/**`, `owner/equipment/**` | `api/plan-templates/**`, `api/nutrition-templates/**`, `api/foods/**`, `api/owner/equipment/**` |
| Self-tracking | `*/my-training/**`, `*/my-nutrition/**`, `owner/my-body-tests` | `api/me/**`, `api/service-types/**`, `api/billing/**`, `api/schedule/**` |
| Trainer member hub | `trainer/members/[id]/**` | `api/members/[memberId]/**`, `api/check-ins/**`, `api/check-in-config`, `api/progress/**` |
| Member portal | `member/**` | `api/me/**`, `api/check-ins/**`, `api/members/[memberId]/journey` |

---

# Sprint 1 — Dev Seeding + E2E Infrastructure

Goal: a seeded v2 database and a runnable Playwright harness so every later sprint can write E2E specs against a real stack.

## Affected Files
- `backend/scripts/seed-dev.ts` (new — port of `web/scripts/seed-dev.ts`)
- `backend/scripts/food-extras.ts` (new — port of `web/scripts/food-extras.ts`)
- `backend/context/data/exercises_catalog.json`, `backend/context/data/gym_equipment.json` (new — copied from `web/context/data/`)
- `backend/package.json` (add `seed:dev`, `seed:dev:reset` scripts)
- `frontend/playwright.config.ts` (new)
- `frontend/e2e/global-setup.ts` (new — seeds test DB, saves auth storage state per role)
- `frontend/e2e/seed.ts` (new — test-fixture seed, port of `web/e2e/seed.ts`)
- `frontend/e2e/.auth/.gitkeep`
- `frontend/e2e/helpers/api.ts` (new — login helper hitting backend `/auth/login`)
- `frontend/e2e/auth.spec.ts` (new — port of `web/e2e/auth.spec.ts`)
- `frontend/e2e/access-control.spec.ts` (new — port of `web/e2e/access-control.spec.ts`)

## Stage 1: Dev seed script for v2 backend

**Goal**: `pnpm --filter backend seed:dev:reset` populates a MongoDB with the same dev dataset v1 produces (4 users, profiles, equipment, exercises, plans, sessions, PBs, nutrition, check-ins, injuries), using v2 model imports from `backend/src/database/models/`.

**Source of truth**: `web/scripts/seed-dev.ts` (1642 lines — port in full), `web/scripts/food-extras.ts`, `web/context/data/*.json`.

**What gets built**: `backend/scripts/seed-dev.ts`, `backend/scripts/food-extras.ts`, copied JSON catalogs, two `package.json` scripts.

**Sprint Contract**:

*Unit tests:*
- [ ] `seed-dev > seedCatalogs > upserts all exercises from exercises_catalog.json (count matches file length)`
- [ ] `seed-dev > seedDevData > creates exactly 4 users with emails owner@dev.com, trainer@dev.com, member@dev.com, member2@dev.com`
- [ ] `seed-dev > seedDevData > member.trainerId references trainer._id and member2.trainerId references owner._id`

*Integration / E2E:*
- [ ] Run `seed:dev:reset` against a throwaway DB → querying `users` returns 4 docs, `equipment` returns 12 docs, `workoutsessions` for member returns 12 docs (assert via a script that connects and counts)
- [ ] Run `seed:dev:reset` twice in a row → second run does not error and `users` count stays 4 (idempotency of `--reset`)

**TDD sequence**: Write failing count assertions against an in-memory/throwaway Mongo → port seed logic until green → run reset twice to confirm idempotency.

**Status**: Complete

### Stage 1 Checkpoint
- [x] `backend/scripts/food-extras.ts`
- [x] `backend/context/data/exercises_catalog.json` + `backend/context/data/gym_equipment.json`
- [x] `backend/scripts/seed-dev.ts`
- [x] Unit tests in `backend/src/scripts/seed-dev.spec.ts`
- [x] `backend/package.json` scripts

## Stage 2: Playwright harness + global setup + auth storage states

**Goal**: `cd frontend && pnpm test:e2e` boots the backend + frontend (or assumes running), resets+seeds a test DB, logs in as each role via the SPA, and saves `e2e/.auth/{owner,trainer,member}.json` storage states reusable by all specs.

**Source of truth**: `web/e2e/global-setup.ts`, `web/e2e/seed.ts`, `web/playwright.config.ts`, `frontend/src/pages/auth/login.tsx` (selectors), `frontend/src/stores/authStore.ts` (token storage mechanism — confirm whether access token lives in memory/localStorage so storageState captures auth).

**What gets built**: `frontend/playwright.config.ts`, `frontend/e2e/global-setup.ts`, `frontend/e2e/seed.ts`, `frontend/e2e/helpers/api.ts`, `frontend/e2e/.auth/.gitkeep`.

**Note for Generator**: v2 auth uses a JWT access token (likely in JS memory) + httpOnly refresh cookie, unlike v1's NextAuth cookie. If the access token is not persisted to storage, `storageState` alone will not restore an authenticated session. Confirm `authStore` rehydration behavior first; if access token is memory-only, the harness must either (a) persist a bootstrap token to localStorage that the store rehydrates, or (b) perform programmatic login in a `beforeEach` fixture. Pick whichever matches how the app actually restores sessions on reload — replicate the real flow, do not invent persistence the app doesn't have.

**Sprint Contract**:

*Unit tests:*
- [ ] `e2e/seed > seed > creates test users owner@test.com / trainer@test.com / member@test.com with TestPass123!`
- [ ] `e2e/helpers/api > loginAs > returns a valid access token for seeded credentials (token decodes to expected role)`
- [ ] `e2e/global-setup > resets DB before seeding (collections dropped → counts match fresh seed)`

*Integration / E2E:*
- [ ] After global-setup, a spec using `storageState: owner.json` navigates to `/owner` → does NOT redirect to `/login` (authenticated session restored)
- [ ] Member storage state navigating to `/member` → does NOT redirect to `/login`

**TDD sequence**: Write a smoke spec that loads each role's protected root and asserts no redirect → build config/global-setup/seed until it passes against the real backend.

**Status**: Complete

### Stage 2 Checkpoint
- [x] `frontend/playwright.config.ts` (updated — backend+frontend webServers, per-role projects)
- [x] `frontend/e2e/global-setup.ts` (new — seeds DB, saves auth storage states per role)
- [x] `frontend/e2e/seed.ts` (new — wraps backend seed script)
- [x] `frontend/e2e/helpers/api.ts` (new — `loginAs` helper)
- [x] `frontend/e2e/.auth/.gitkeep`
- [x] `backend/scripts/seed-e2e.ts` (new — E2E fixture seed with 3 test users + data)
- [x] `backend/src/database/models/index.ts` (MemberMedication + MemberMedicalHistory exports)
- [x] `backend/package.json` (seed:e2e / seed:e2e:reset scripts)
- [x] `frontend/e2e/smoke.spec.ts` (Sprint Contract criteria verified — both PASS)
- [x] `frontend/src/router/index.tsx` (placeholder routes changed from redirect-to-login to actual placeholders)

## Stage 3: Port auth + access-control E2E specs

**Goal**: the v1 auth and cross-role access-control E2E behaviors pass against the v2 stack.

**Source of truth**: `web/e2e/auth.spec.ts`, `web/e2e/access-control.spec.ts`.

**What gets built**: `frontend/e2e/auth.spec.ts`, `frontend/e2e/access-control.spec.ts`.

**Sprint Contract**:

*Unit tests:* (n/a — E2E-only stage; the existing auth Jest specs already cover units)

*Integration / E2E:*
- [ ] Visitor at `/login` enters `owner@test.com` / `TestPass123!`, clicks Sign in → URL becomes `/owner`
- [ ] Visitor enters wrong password → an error message renders and URL stays `/login`
- [ ] Logged-in member navigating to `/owner` → redirected away (to `/member` or `/login`, matching v1 behavior)
- [ ] Logged-in trainer navigating to `/owner/trainers` → redirected away
- [ ] Unauthenticated visit to `/member` → redirected to `/login`

**TDD sequence**: Port each v1 spec assertion, run against the seeded stack, adjust selectors to v2 markup, green.

**Status**: Complete

### Stage 3 Checkpoint
- [x] `frontend/e2e/auth.spec.ts`
- [x] `frontend/e2e/access-control.spec.ts`

---

# Sprint 2 — Owner Dashboard

Goal: owner sees the dashboard with stat cards, member-growth chart, trainer performance breakdown, and equipment-status panel — data identical to v1.

## Affected Files
- `backend/src/owner-dashboard/` (controller, service, spec, module) — endpoints: stats, trainer breakdown, equipment status
- `backend/src/app.module.ts` (register module)
- `frontend/src/api/owner-dashboard.ts`
- `frontend/src/stores/ownerDashboardStore.ts`
- `frontend/src/pages/owner/dashboard.tsx`
- `frontend/src/components/owner/dashboard-stats.tsx`, `member-growth-chart.tsx`, `trainer-breakdown-table.tsx`, `equipment-status-section.tsx`
- `frontend/src/router/index.tsx`
- `frontend/e2e/owner/dashboard.spec.ts`

## Stage 1: Backend — owner dashboard endpoints

**Goal**: `GET /owner/stats` (counts), trainer-breakdown data, and equipment-status data return v1-identical payloads with owner-only guards.

**Source of truth**: `web/src/app/api/owner/stats/route.ts`, `web/src/app/api/owner/trainers/route.ts` (breakdown shape), `web/src/app/api/owner/equipment/route.ts`, and `owner/_components/{dashboard-stats,trainer-breakdown-table,equipment-status-section}.tsx` for the exact fields consumed.

**Sprint Contract**:

*Unit tests:*
- [ ] `OwnerDashboardService > getStats > returns { trainerCount, memberCount, pendingInviteCount, sessionsThisMonth } counting only this-month sessions`
- [ ] `OwnerDashboardService > getTrainerBreakdown > returns one row per trainer with assigned member count`
- [ ] `OwnerDashboardService > getEquipmentStatus > groups equipment by status (active/maintenance/retired) with counts`

*Integration / E2E:*
- [ ] `GET /owner/stats` as owner token → 200 with the four numeric keys matching seeded data (1 trainer, 2 members)
- [ ] `GET /owner/stats` as member token → 403

**TDD sequence**: Red specs against seeded repo → implement service/controller → green; verify 403 guard.

**Status**: In Progress

### Stage 1 Checkpoint
- [x] `backend/src/repositories/workout-session.repository.ts` (add `countByMemberIdsSince`)
- [x] `backend/src/owner-dashboard/owner-dashboard.service.spec.ts`
- [x] `backend/src/owner-dashboard/owner-dashboard.service.ts`
- [x] `backend/src/owner-dashboard/owner-dashboard.controller.ts`
- [x] `backend/src/owner-dashboard/owner-dashboard.module.ts`
- [x] `backend/src/app.module.ts` (register module)

## Stage 2: Frontend — dashboard stat cards + equipment status panel

**Goal**: `/owner` renders the four StatCards and the equipment-status panel from live API data, matching v1 layout.

**Source of truth**: `owner/page.tsx`, `owner/_components/dashboard-stats.tsx`, `dashboard-stats-skeleton.tsx`, `equipment-status-section.tsx`.

**Sprint Contract**:

*Unit tests:*
- [x] `ownerDashboardStore > fetchStats > populates stats and clears isLoading on success`
- [x] `ownerDashboardStore > fetchStats > sets error and clears isLoading on failure`
- [x] `DashboardStats > renders four stat values from store data`

*Integration / E2E:*
- [x] Owner navigates to `/owner` → four stat cards show seeded numbers (Trainers 1, Members 2)
- [x] `/owner` equipment panel lists at least one item under a status group → text "maintenance" visible (seed has a maintenance item)

**Status**: Complete

### Stage 2 Checkpoint
- [x] `frontend/src/api/owner-dashboard.ts`
- [x] `frontend/src/stores/ownerDashboardStore.ts`
- [x] `frontend/src/stores/ownerDashboardStore.spec.ts`
- [x] `frontend/src/components/owner/dashboard-stats.tsx`
- [x] `frontend/src/components/owner/equipment-status-section.tsx`
- [x] `frontend/src/pages/owner/dashboard.tsx`
- [x] `frontend/src/pages/owner/dashboard.spec.tsx`
- [x] `frontend/src/router/index.tsx` (register `/owner` route with DashboardLayout)
- [x] `frontend/src/components/shared/dashboard-layout.tsx` (add LazyMotion wrapper)
- [x] `frontend/tsconfig.app.json` (exclude spec files from production build)
- [x] `frontend/e2e/owner/dashboard.spec.ts`

## Stage 3: Frontend — member-growth chart + trainer performance breakdown

**Goal**: the member-growth chart and trainer-breakdown table render from API data, matching v1.

**Source of truth**: `owner/_components/{member-growth-chart,member-growth-chart-client,trainer-breakdown-section,trainer-breakdown-table,trainer-performance-section}.tsx`.

**Sprint Contract**:

*Unit tests:*
- [x] `ownerDashboardStore > fetchTrainerBreakdown > populates rows array`
- [x] `TrainerBreakdownTable > renders a row per trainer with member count`
- [x] `MemberGrowthChart > renders a data point per month bucket returned`

*Integration / E2E:*
- [ ] Owner on `/owner` → trainer-breakdown table shows the seeded trainer "Dev Trainer" with its assigned-member count
- [ ] Member-growth chart container is visible with a rendered series (chart svg/canvas present)

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `backend/src/owner-dashboard/owner-dashboard.service.ts` (add `getMemberGrowth`)
- [x] `backend/src/owner-dashboard/owner-dashboard.controller.ts` (add `GET owner/member-growth`)
- [x] `backend/src/owner-dashboard/owner-dashboard.service.spec.ts` (add `getMemberGrowth` test)
- [x] `frontend/src/api/owner-dashboard.ts` (add `fetchTrainerBreakdown` + `fetchMemberGrowth`)
- [x] `frontend/src/stores/ownerDashboardStore.ts` (add `trainerBreakdown` + `memberGrowth` state + actions)
- [x] `frontend/src/stores/ownerDashboardStore.spec.ts` (add `fetchTrainerBreakdown` test)
- [x] `frontend/src/components/owner/member-growth-chart.tsx` (new)
- [x] `frontend/src/components/owner/member-growth-chart.spec.tsx` (new)
- [x] `frontend/src/components/owner/trainer-breakdown-table.tsx` (new)
- [x] `frontend/src/components/owner/trainer-breakdown-table.spec.tsx` (new)
- [x] `frontend/src/pages/owner/dashboard.tsx` (integrate both panels)
- [ ] `frontend/e2e/owner/dashboard.spec.ts` (add E2E tests — pending evaluator run)

---

# Sprint 3 — Owner People (Trainers, Trainer Detail, Members, Invites)

Goal: owner manages trainers (list + detail hub with sub-tabs), members (list + reassign), and invites (create/resend/revoke).

## Affected Files
- `backend/src/owner-people/` (trainers controller/service, members controller/service, invites controller/service, DTOs, module)
- `frontend/src/api/{trainers,members,invites}.ts`
- `frontend/src/stores/{trainersStore,membersStore,invitesStore}.ts`
- `frontend/src/pages/owner/trainers/{list,detail-layout,overview,members,training-plans,nutrition-plans,calendar}.tsx`
- `frontend/src/pages/owner/{members,invites}.tsx`
- `frontend/src/components/owner/{trainer-list,member-list,reassign-modal,invite-dialog,invite-list}.tsx`
- `frontend/src/router/index.tsx`
- `frontend/e2e/owner/{trainers,members,invites}.spec.ts`

## Stage 1: Backend — trainers + members + reassign endpoints

**Goal**: list trainers, get one trainer (with stats/members/plans for the detail hub), list members, and reassign a member's trainer — owner-only, v1-identical payloads.

**Source of truth**: `api/owner/trainers/route.ts`, `api/owner/trainers/[id]/route.ts`, `api/owner/members/route.ts`, `api/owner/members/[id]/trainer/route.ts`, and the trainer-detail sub-page data needs in `owner/trainers/[id]/**`.

**Sprint Contract**:

*Unit tests:*
- [ ] `OwnerTrainersService > list > returns trainers with assigned-member counts`
- [ ] `OwnerTrainersService > getById > returns trainer profile + stats consumed by the detail hub`
- [ ] `OwnerMembersService > reassignTrainer > updates member.trainerId and rejects non-existent member with 404`

*Integration / E2E:*
- [ ] `GET /owner/members` as owner → 200 listing both seeded members with their trainer names
- [ ] `PATCH /owner/members/:id/trainer` reassigning member to owner → member.trainerId equals owner id on re-fetch
- [ ] Same endpoints as trainer/member token → 403

**Status**: In Progress

### Stage 1 Checkpoint
- [x] `backend/src/owner-people/owner-people.service.ts`
- [x] `backend/src/owner-people/owner-people.service.spec.ts`
- [x] `backend/src/owner-people/owner-people.controller.ts`
- [x] `backend/src/owner-people/owner-people.module.ts`
- [x] `backend/src/app.module.ts` (register OwnerPeopleModule)

## Stage 2: Backend — invites endpoints

**Goal**: create invite, list invites, resend invite, revoke invite — owner scope, sends invite email (use existing `EmailService`), v1-identical.

**Source of truth**: `api/owner/invites/route.ts`, `api/owner/invites/[id]/route.ts`, `api/owner/invites/[id]/resend/route.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `OwnerInvitesService > create > persists invite token and calls EmailService.sendInvite once`
- [ ] `OwnerInvitesService > list > returns pending invites for the gym`
- [ ] `OwnerInvitesService > revoke > deletes/expires the invite and 404s on unknown id`

*Integration / E2E:*
- [ ] `POST /owner/invites` with a new email → 201, invite appears in subsequent `GET /owner/invites`
- [ ] `DELETE /owner/invites/:id` → invite no longer listed

**Status**: Complete

### Stage 2 Checkpoint
- [x] `backend/src/owner-invites/owner-invites.service.spec.ts`
- [x] `backend/src/owner-invites/owner-invites.service.ts`
- [x] `backend/src/owner-invites/owner-invites.controller.ts`
- [x] `backend/src/owner-invites/owner-invites.module.ts`
- [x] `backend/src/app.module.ts` (register OwnerInvitesModule)

## Stage 3: Frontend — trainers list + members list + invites

**Goal**: `/owner/trainers`, `/owner/members` (with reassign modal), and `/owner/invites` (with create/resend/revoke dialogs) render and operate against the API, matching v1.

**Source of truth**: `owner/trainers/_components/trainer-list-client.tsx`, `owner/members/_components/{member-list-client,reassign-modal}.tsx`, `owner/invites/_components/*`.

**Sprint Contract**:

*Unit tests:*
- [ ] `membersStore > reassign > optimistically updates the member's trainer then confirms from server`
- [ ] `invitesStore > createInvite > prepends new invite to list`
- [ ] `ReassignModal > submitting calls store.reassign with selected trainer id`

*Integration / E2E:*
- [ ] Owner on `/owner/members` opens reassign modal, picks a different trainer, confirms → row reflects new trainer name (toast success)
- [ ] Owner on `/owner/invites` creates an invite for a new email → it appears in the list
- [ ] Owner on `/owner/trainers` clicks a trainer → URL changes to `/owner/trainers/:id`

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `frontend/src/api/trainers.ts`
- [x] `frontend/src/api/members.ts`
- [x] `frontend/src/api/invites.ts`
- [x] `frontend/src/stores/trainersStore.ts`
- [x] `frontend/src/stores/membersStore.ts`
- [x] `frontend/src/stores/membersStore.spec.ts`
- [x] `frontend/src/stores/invitesStore.ts`
- [x] `frontend/src/stores/invitesStore.spec.ts`
- [x] `frontend/src/components/owner/reassign-modal.tsx`
- [x] `frontend/src/components/owner/reassign-modal.spec.tsx`
- [x] `frontend/src/pages/owner/trainers.tsx`
- [x] `frontend/src/pages/owner/members.tsx`
- [x] `frontend/src/pages/owner/invites.tsx`
- [x] `frontend/src/router/index.tsx` (add /owner/trainers, /owner/members, /owner/invites, /owner/trainers/:id placeholder)
- [x] `frontend/e2e/owner/trainers.spec.ts`
- [x] `frontend/e2e/owner/members.spec.ts`
- [x] `frontend/e2e/owner/invites.spec.ts`

## Stage 4: Frontend — trainer detail hub + sub-tabs

**Goal**: `/owner/trainers/:id` renders the detail layout with Overview, Members, Training Plans, Nutrition Plans, and Calendar sub-tabs, each loading its data, matching v1.

**Source of truth**: `owner/trainers/[id]/layout.tsx`, `owner/trainers/[id]/page.tsx`, `owner/trainers/[id]/{members,training-plans,nutrition-plans,calendar}/**`, `_components/*`.

**Sprint Contract**:

*Unit tests:*
- [x] `trainersStore > fetchTrainerDetail > populates trainer + members + plans`
- [x] `TrainerDetailLayout > renders a tab per sub-route`
- [x] `TrainerHubMembers > renders a row per assigned member`

*Integration / E2E:*
- [x] Owner on `/owner/trainers/:id` clicks "Members" tab → URL is `/owner/trainers/:id/members` and seeded assigned member(s) listed
- [x] Clicks "Training Plans" tab → URL changes and the trainer's plan templates render

**Status**: Complete

### Stage 4 Checkpoint
- [x] `frontend/src/api/trainers.ts` (add `fetchTrainerMembers`, `fetchTrainerPlans`, `fetchTrainerNutritionPlans` + interfaces)
- [x] `frontend/src/stores/trainersStore.ts` (add `trainerMembers`, `trainerPlans`, `trainerNutritionPlans` state; fetch all in parallel in `fetchTrainerDetail`)
- [x] `frontend/src/stores/trainersStore.spec.ts` (new — `fetchTrainerDetail > populates trainer + members + plans`)
- [x] `frontend/src/pages/owner/trainer-detail.tsx` (new — tabbed layout + all 5 sub-tabs)
- [x] `frontend/src/pages/owner/trainer-detail.spec.tsx` (new — `TrainerDetailLayout > renders a tab per sub-route`, `TrainerHubMembers > renders a row per assigned member`)
- [x] `frontend/src/router/index.tsx` (replace placeholder with `OwnerTrainerDetailPage`; add sub-routes)
- [x] `frontend/e2e/owner/trainer-detail.spec.ts` (new — Sprint Contract E2E criteria)
- [x] `backend/src/owner-invites/owner-invites.controller.ts` (fix pre-existing TS1272 error that blocked backend startup)

---

# Sprint 4 — Owner Templates + Equipment

Goal: owner manages training-plan templates (CRUD), nutrition templates (CRUD), foods (CRUD), and equipment (CRUD + condition reports).

## Affected Files
- `backend/src/plan-templates/`, `backend/src/nutrition-templates/`, `backend/src/foods/`, `backend/src/equipment/` (controllers/services/DTOs/specs/modules)
- `frontend/src/api/{plans,nutrition-templates,foods,equipment}.ts`
- `frontend/src/stores/{plansStore,nutritionTemplatesStore,foodsStore,equipmentStore}.ts`
- `frontend/src/pages/owner/{plans,nutrition-templates,foods,equipment}/**`
- `frontend/src/components/{training,nutrition,equipment}/**` (shared form components)
- `frontend/e2e/owner/{plans,nutrition-templates,foods,equipment}.spec.ts`

## Stage 1: Backend — plan-templates + nutrition-templates CRUD

**Goal**: full CRUD for plan templates and nutrition templates, scoped to the requester (owner/trainer can manage own), v1-identical payloads including nested days/dayTypes/meals.

**Source of truth**: `api/plan-templates/route.ts`, `api/plan-templates/[id]/route.ts`, `api/nutrition-templates/route.ts`, `api/nutrition-templates/[id]/route.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `PlanTemplatesService > create > persists template with nested days/exercises and createdBy = requester`
- [ ] `PlanTemplatesService > update > rejects editing a template not owned by requester (403)`
- [ ] `NutritionTemplatesService > create > persists dayTypes with meals and computed/echoed macros`
- [ ] `NutritionTemplatesService > remove > 404 on unknown id`

*Integration / E2E:*
- [ ] `POST /plan-templates` → 201; `GET /plan-templates` lists it; `GET /plan-templates/:id` returns nested days
- [ ] `DELETE /plan-templates/:id` → subsequent GET 404

**Status**: Complete

### Stage 1 Checkpoint
- [x] `backend/src/plan-templates/plan-templates.service.spec.ts`
- [x] `backend/src/plan-templates/plan-templates.service.ts`
- [x] `backend/src/plan-templates/plan-templates.controller.ts`
- [x] `backend/src/plan-templates/plan-templates.module.ts`
- [x] `backend/src/nutrition-templates/nutrition-templates.service.spec.ts`
- [x] `backend/src/nutrition-templates/nutrition-templates.service.ts`
- [x] `backend/src/nutrition-templates/nutrition-templates.controller.ts`
- [x] `backend/src/nutrition-templates/nutrition-templates.module.ts`
- [x] `backend/src/app.module.ts` (register both modules)

## Stage 2: Backend — foods + equipment CRUD (+ condition reports)

**Goal**: foods CRUD and equipment CRUD with condition-report sub-resource, owner-scoped where v1 requires, v1-identical.

**Source of truth**: `api/foods/route.ts`, `api/foods/[foodId]/route.ts`, `api/owner/equipment/route.ts`, `api/owner/equipment/[id]/route.ts`, `api/owner/equipment/[id]/condition-reports/route.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `FoodsService > create > persists food with per-100g macros and createdBy`
- [ ] `FoodsService > list > returns requester-visible foods`
- [ ] `EquipmentService > update > changes status and validates enum (active/maintenance/retired)`
- [ ] `EquipmentService > addConditionReport > appends a report linked to equipmentId`

*Integration / E2E:*
- [ ] `POST /owner/equipment` then `GET /owner/equipment` → new item present with status
- [ ] `POST /owner/equipment/:id/condition-reports` → report retrievable for that equipment
- [ ] Foods endpoints as member token → 403 (match v1 access rules)

**Status**: Complete

### Stage 2 Checkpoint
- [x] `backend/src/foods/foods.service.spec.ts`
- [x] `backend/src/foods/foods.service.ts`
- [x] `backend/src/foods/foods.controller.ts`
- [x] `backend/src/foods/foods.module.ts`
- [x] `backend/src/repositories/food.repository.ts` (added `UpdateFoodData` interface + `update` method)
- [x] `backend/src/equipment/equipment.service.spec.ts`
- [x] `backend/src/equipment/equipment.service.ts`
- [x] `backend/src/equipment/equipment.controller.ts`
- [x] `backend/src/equipment/equipment.module.ts`
- [x] `backend/src/app.module.ts` (register FoodsModule + EquipmentModule)

## Stage 3: Frontend — plans + nutrition templates pages

**Goal**: `/owner/plans` (list + new + edit + preview) and `/owner/nutrition-templates` (list + new + edit) operate against the API with the v1 multi-section forms (sticky save bar, dirty detection, collapse).

**Source of truth**: `owner/plans/**` + shared `trainer/plans/_components/plan-template-form.tsx`; `owner/nutrition-templates/**` + `trainer/nutrition/_components/nutrition-template-form.tsx`.

**Sprint Contract**:

*Unit tests:*
- [ ] `plansStore > save > posts new template and adds to list`
- [ ] `PlanTemplateForm > Save disabled when not dirty in edit mode`
- [ ] `nutritionTemplatesStore > fetchOne > populates editable dayTypes`

*Integration / E2E:*
- [ ] Owner creates a plan template at `/owner/plans/new`, adds a day + exercise, saves → redirected to list, new template visible
- [ ] Owner edits the template, changes name, saves → list shows new name; Cancel while dirty shows discard dialog

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `frontend/src/api/plans.ts`
- [x] `frontend/src/api/nutrition-templates.ts`
- [x] `frontend/src/stores/plansStore.ts`
- [x] `frontend/src/stores/plansStore.spec.ts`
- [x] `frontend/src/stores/nutritionTemplatesStore.ts`
- [x] `frontend/src/stores/nutritionTemplatesStore.spec.ts`
- [x] `frontend/src/lib/training/label-exercises.ts`
- [x] `frontend/src/lib/nutrition/macros.ts`
- [x] `frontend/src/components/training/exercise-badge.tsx`
- [x] `frontend/src/components/training/exercise-thumbnail.tsx`
- [x] `frontend/src/components/training/exercise-row.tsx`
- [x] `frontend/src/components/training/day-tabs.tsx`
- [x] `frontend/src/components/training/superset-block.tsx`
- [x] `frontend/src/components/training/exercise-search-sheet.tsx`
- [x] `frontend/src/components/training/plan-template-form.tsx`
- [x] `frontend/src/components/training/plan-template-form.spec.tsx`
- [x] `frontend/src/components/training/plan-template-list.tsx`
- [x] `frontend/src/components/training/template-preview.tsx`
- [x] `frontend/src/components/nutrition/macro-pill.tsx`
- [x] `frontend/src/components/nutrition/macro-ring.tsx`
- [x] `frontend/src/components/nutrition/macro-summary-card.tsx`
- [x] `frontend/src/components/nutrition/food-picker.types.ts`
- [x] `frontend/src/components/nutrition/food-picker-dialog.tsx`
- [x] `frontend/src/components/nutrition/nutrition-template-form.tsx`
- [x] `frontend/src/components/nutrition/nutrition-template-list.tsx`
- [x] `frontend/src/pages/owner/plans.tsx`
- [x] `frontend/src/pages/owner/plan-new.tsx`
- [x] `frontend/src/pages/owner/plan-detail.tsx`
- [x] `frontend/src/pages/owner/plan-edit.tsx`
- [x] `frontend/src/pages/owner/nutrition.tsx`
- [x] `frontend/src/pages/owner/nutrition-new.tsx`
- [x] `frontend/src/pages/owner/nutrition-edit.tsx`
- [x] `frontend/src/router/index.tsx` (add plan + nutrition template routes)
- [x] `frontend/e2e/owner/plans.spec.ts`

## Stage 4: Frontend — foods + equipment pages

**Goal**: `/owner/foods` (list + new + edit) and `/owner/equipment` (list + add/edit dialogs + condition reports) operate against the API, matching v1.

**Source of truth**: `owner/foods/**` + `trainer/foods/_components/*`; `owner/equipment/_components/*`.

**Sprint Contract**:

*Unit tests:*
- [x] `foodsStore > deleteFood > removes item and shows it gone from list`
- [x] `equipmentStore > updateStatus > reflects new status in list`
- [x] `AddEquipmentDialog > submit calls store.create with form values`

*Integration / E2E:*
- [ ] Owner on `/owner/equipment` adds equipment via dialog → appears in list
- [ ] Owner opens an item, adds a condition report → report shows in its history
- [ ] Owner on `/owner/foods` creates a food → appears in list; deletes it → removed (toast)

**Status**: In Progress

### Stage 4 Checkpoint
- [x] `frontend/src/api/foods.ts`
- [x] `frontend/src/stores/foodsStore.ts`
- [x] `frontend/src/stores/foodsStore.spec.ts`
- [x] `frontend/src/api/equipment.ts`
- [x] `frontend/src/stores/equipmentStore.ts`
- [x] `frontend/src/stores/equipmentStore.spec.ts`
- [x] `frontend/src/components/nutrition/food-form.tsx`
- [x] `frontend/src/components/owner/add-equipment-dialog.tsx`
- [x] `frontend/src/components/owner/add-equipment-dialog.spec.tsx`
- [x] `frontend/src/components/owner/edit-equipment-dialog.tsx`
- [x] `frontend/src/components/owner/equipment.types.ts`
- [x] `frontend/src/pages/owner/foods.tsx`
- [x] `frontend/src/pages/owner/food-new.tsx`
- [x] `frontend/src/pages/owner/food-edit.tsx`
- [x] `frontend/src/pages/owner/equipment.tsx`
- [x] `frontend/src/data/gym_equipment.json`
- [x] `frontend/src/router/index.tsx` (add foods + equipment routes)
- [x] `frontend/e2e/owner/foods.spec.ts`
- [x] `frontend/e2e/owner/equipment.spec.ts`

---

# Sprint 5 — Owner Personal + Settings

Goal: owner's self-tracking (My Training incl. live session, My Nutrition, My Body Tests), Settings (profile + gym info), Services, Billing, and Calendar.

## Affected Files
- `backend/src/self-training/`, `backend/src/self-nutrition/`, `backend/src/body-tests/`, `backend/src/service-types/`, `backend/src/billing/`, `backend/src/schedule/`, `backend/src/owner-settings/` (controllers/services/DTOs/specs/modules)
- `frontend/src/api/{self-training,self-nutrition,body-tests,service-types,billing,schedule,settings}.ts`
- `frontend/src/stores/*` (one per domain)
- `frontend/src/pages/owner/{my-training,my-nutrition,my-body-tests,settings,services,billing,calendar}/**`
- `frontend/src/components/{training,nutrition,calendar}/**`
- `frontend/e2e/owner/{my-body-tests,service-types,settings,billing,calendar}.spec.ts`, `frontend/e2e/self-tracking/owner-*.spec.ts`

## Stage 1: Backend — self workout logs (My Training live session lifecycle)

**Goal**: active log, create/start, append/update sets, complete, seal, range query — the freestyle self-tracking session lifecycle, v1-identical.

**Source of truth**: `api/me/workout-logs/route.ts`, `.../active`, `.../range`, `.../[id]/route.ts`, `.../[id]/sets/**`, `.../[id]/complete`, `.../[id]/seal`.

**Sprint Contract**:

*Unit tests:*
- [ ] `SelfTrainingService > getActive > returns the in-progress unsealed log or null`
- [ ] `SelfTrainingService > addSet > appends a set and updates lastActivityAt`
- [ ] `SelfTrainingService > complete > sets completedAt and recomputes self PBs`
- [ ] `SelfTrainingService > seal > marks autoSealed and blocks further edits`

*Integration / E2E:*
- [ ] `POST /me/workout-logs` (start) → `GET /me/workout-logs/active` returns it; add a set → set persisted
- [ ] `POST /me/workout-logs/:id/complete` → completedAt set; further set edit rejected after seal

**Status**: Complete

### Stage 1 Checkpoint
- [x] `backend/src/repositories/self-workout-log.repository.ts` (add missing methods: appendSet, findByUserMonth, findByUserDateRange, seal)
- [x] `backend/src/self-training/self-training.service.spec.ts`
- [x] `backend/src/self-training/self-training.service.ts`
- [x] `backend/src/self-training/self-training.controller.ts`
- [x] `backend/src/self-training/self-training.module.ts`
- [x] `backend/src/app.module.ts` (register SelfTrainingModule)

## Stage 2: Backend — self nutrition logs + body tests + service-types + billing + schedule

**Goal**: self nutrition daily logs, owner/self body tests (incl. export), service-types CRUD + active list, billing read, and schedule CRUD — v1-identical.

**Source of truth**: `api/me/nutrition-logs/**`, `api/me/nutrition-daily-logs`, `api/me/body-tests/export`, `api/members/[memberId]/body-tests/**` (owner-self path), `api/service-types/**`, `api/billing/**`, `api/schedule/**`.

**Sprint Contract**:

*Unit tests:*
- [ ] `SelfNutritionService > getDay > returns the day's logged meals or empty shell`
- [ ] `BodyTestsService > create > stores skinfolds and computes body-fat % (Jackson-Pollock) matching v1`
- [ ] `ServiceTypesService > listActive > returns only active service types`
- [ ] `ScheduleService > create > persists a scheduled session (and recurring series when specified)`

*Integration / E2E:*
- [ ] `POST /service-types` then `GET /service-types/active` → new active type listed
- [ ] `GET /me/body-tests/export` → returns export payload (CSV/JSON) for seeded owner tests

**Status**: Complete

### Stage 2 Checkpoint
- [x] `backend/src/self-nutrition/self-nutrition.service.ts`
- [x] `backend/src/self-nutrition/self-nutrition.service.spec.ts`
- [x] `backend/src/self-nutrition/self-nutrition.controller.ts`
- [x] `backend/src/self-nutrition/self-nutrition.module.ts`
- [x] `backend/src/body-tests/body-tests.service.ts`
- [x] `backend/src/body-tests/body-tests.service.spec.ts`
- [x] `backend/src/body-tests/body-tests.controller.ts`
- [x] `backend/src/body-tests/body-tests.module.ts`
- [x] `backend/src/common/body-test-formulas.ts` (Jackson-Pollock port from v1)
- [x] `backend/src/service-types/service-types.service.ts`
- [x] `backend/src/service-types/service-types.service.spec.ts`
- [x] `backend/src/service-types/service-types.controller.ts`
- [x] `backend/src/service-types/service-types.module.ts`
- [x] `backend/src/repositories/service-type.repository.ts` (add `update` method)
- [x] `backend/src/billing/billing.service.ts`
- [x] `backend/src/billing/billing.service.spec.ts`
- [x] `backend/src/billing/billing.controller.ts`
- [x] `backend/src/billing/billing.module.ts`
- [x] `backend/src/schedule/schedule.service.ts`
- [x] `backend/src/schedule/schedule.service.spec.ts`
- [x] `backend/src/schedule/schedule.controller.ts`
- [x] `backend/src/schedule/schedule.module.ts`
- [x] `backend/src/repositories/scheduled-session.repository.ts` (add findByDateRange, findById, updateOne/Future/All, cancelOne/Future/All, findSessionsForBillingRange)
- [x] `backend/src/app.module.ts` (register all new modules)

## Stage 3: Frontend — My Training (landing + live session + calendar) + My Nutrition

**Goal**: `/owner/my-training`, `/owner/my-training/session/:id` (live logging), `/owner/my-training/calendar`, `/owner/my-nutrition` (+ day view) operate against the API, matching v1 (including the session timer behavior that broke in v1 — must survive parent re-renders).

**Source of truth**: `owner/my-training/**`, `owner/my-nutrition/**`, shared `web/src/components/training/exercise-row.tsx`.

**Sprint Contract**:

*Unit tests:*
- [x] `selfTrainingStore > startSession > creates log and navigates state to active`
- [x] `selfTrainingStore > logSet > appends set without resetting timer state`
- [x] `selfNutritionStore > fetchDay > populates meals for the date`

*Integration / E2E:*
- [x] Owner starts a freestyle session, logs a set → set appears; rest timer continues across a set log (no reset)
- [x] Owner completes the session → marked complete and read-only on revisit
- [x] Owner on `/owner/my-nutrition` opens a day → logged macros render

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `frontend/src/api/self-training.ts`
- [x] `frontend/src/api/self-nutrition.ts`
- [x] `frontend/src/stores/selfTrainingStore.ts`
- [x] `frontend/src/stores/selfTrainingStore.spec.ts`
- [x] `frontend/src/stores/selfNutritionStore.ts`
- [x] `frontend/src/stores/selfNutritionStore.spec.ts`
- [x] `frontend/src/components/training/exercise-row.tsx` (add logging mode)
- [x] `frontend/src/components/training/superset-block.tsx` (add logging mode)
- [x] `frontend/src/components/self-tracking/activity-strip.tsx`
- [x] `frontend/src/components/self-tracking/path-cards-grid.tsx`
- [x] `frontend/src/components/self-tracking/build-planned-sets.ts`
- [x] `frontend/src/components/self-tracking/active-session-conflict-dialog.tsx`
- [x] `frontend/src/components/self-tracking/day-already-logged-dialog.tsx`
- [x] `frontend/src/components/self-tracking/freestyle-path-card.tsx`
- [x] `frontend/src/components/self-tracking/template-path-card.tsx`
- [x] `frontend/src/components/self-tracking/active-session-prompt.tsx`
- [x] `frontend/src/components/self-tracking/complete-workout-dialog.tsx`
- [x] `frontend/src/components/self-tracking/self-workout-calendar.tsx`
- [x] `frontend/src/components/self-tracking/mini-workout-calendar.tsx`
- [x] `frontend/src/components/self-tracking/week-calendar-grid.tsx`
- [x] `frontend/src/components/self-tracking/nutrition-activity-strip.tsx`
- [x] `frontend/src/components/self-tracking/nutrition-template-path-card.tsx`
- [x] `frontend/src/components/self-tracking/nutrition-freestyle-path-card.tsx`
- [x] `frontend/src/components/self-tracking/self-nutrition-calendar.tsx`
- [x] `frontend/src/components/self-tracking/mini-nutrition-calendar.tsx`
- [x] `frontend/src/components/nutrition/meal-section.tsx`
- [x] `frontend/src/pages/owner/my-training.tsx`
- [x] `frontend/src/pages/owner/session.tsx` (live session with isolated RestTimer)
- [x] `frontend/src/pages/owner/training-calendar.tsx`
- [x] `frontend/src/pages/owner/my-nutrition.tsx`
- [x] `frontend/src/pages/owner/nutrition-day.tsx`
- [x] `frontend/src/router/index.tsx` (add my-training, session, calendar, my-nutrition, day routes)
- [x] `frontend/e2e/self-tracking/owner-training.spec.ts`

## Stage 4: Frontend — My Body Tests + Settings + Services + Billing + Calendar

**Goal**: `/owner/my-body-tests`, `/owner/settings` (profile + gym-info tabs), `/owner/services`, `/owner/billing`, `/owner/calendar` operate against the API, matching v1.

**Source of truth**: `owner/my-body-tests/page.tsx`, `owner/settings/**`, `owner/services/**`, `owner/billing/page.tsx`, `owner/calendar/page.tsx`.

**Sprint Contract**:

*Unit tests:*
- [x] `settingsStore > saveProfile > patches profile and updates store`
- [x] `serviceTypesStore > create > adds a service type to the list`
- [x] `GymInfoTab > Save disabled when not dirty`

*Integration / E2E:*
- [ ] Owner on `/owner/settings` edits gym name, saves → reload shows persisted value
- [ ] Owner on `/owner/services` adds a service type → appears in list
- [ ] Owner on `/owner/calendar` sees a seeded scheduled session rendered

**Status**: In Progress

### Stage 4 Checkpoint
- [x] `frontend/src/api/body-tests.ts`
- [x] `frontend/src/api/settings.ts`
- [x] `frontend/src/api/service-types.ts`
- [x] `frontend/src/api/billing.ts`
- [x] `frontend/src/api/schedule.ts`
- [x] `frontend/src/lib/body-test/formulas.ts`
- [x] `frontend/src/lib/time.ts`
- [x] `frontend/src/stores/settingsStore.ts`
- [x] `frontend/src/stores/settingsStore.spec.ts`
- [x] `frontend/src/stores/serviceTypesStore.ts`
- [x] `frontend/src/stores/serviceTypesStore.spec.ts`
- [x] `frontend/src/pages/owner/my-body-tests.tsx`
- [x] `frontend/src/pages/owner/settings.tsx`
- [x] `frontend/src/pages/owner/settings.spec.tsx`
- [x] `frontend/src/pages/owner/services.tsx`
- [x] `frontend/src/pages/owner/billing.tsx`
- [x] `frontend/src/pages/owner/calendar.tsx`
- [x] `frontend/src/router/index.tsx` (add all 5 new routes)
- [x] `frontend/e2e/owner/settings.spec.ts`

---

# Sprint 6 — Trainer Members + Member Hub

Goal: trainer's Members list and the full Member Hub: overview + Plan, Nutrition, Body Tests, Health, Check-ins, Progress, Photos tabs. (Owner reuses the same member-hub via owner routes where v1 does.)

## Affected Files
- `backend/src/members/` (member profile, plan, nutrition, body-tests, injuries, medical-history, medications, pbs, progress, exercise-last-weights, journey controllers/services/DTOs/specs/module)
- `backend/src/check-ins/`, `backend/src/check-in-config/`
- `frontend/src/api/member-hub.ts` (+ split per tab as needed)
- `frontend/src/stores/memberHubStore.ts` (+ per-tab stores)
- `frontend/src/pages/trainer/members/{list,hub-layout,overview,plan,nutrition,body-tests,health,check-ins,progress,photos}.tsx`
- `frontend/src/components/member-hub/**`
- `frontend/e2e/trainer/{members,body-tests,member-health,member-check-ins,member-photos,member-strength-chart,member-session-lifecycle}.spec.ts`

## Stage 1: Backend — member profile + plan + nutrition + progress/pbs

**Goal**: trainer/owner read a member's profile, active plan, nutrition (current + history + schedule), PBs, progress, and last weights — with ownership guard (trainer only own members), v1-identical.

**Source of truth**: `api/members/[memberId]/{profile,plan,nutrition/**,pbs,exercise-last-weights}/route.ts`, `api/progress/[memberId]/route.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `MembersService > getProfile > returns member profile; throws 403 when requester is not the member's trainer/owner`
- [ ] `MembersService > getActivePlan > returns the active member plan with days`
- [ ] `MembersService > getProgress > returns 1RM trend series per exercise`
- [ ] `MembersService > getPbs > returns personal bests for the member`

*Integration / E2E:*
- [ ] `GET /members/:id/profile` as the member's trainer → 200; as a different trainer → 403
- [ ] `GET /progress/:memberId` as trainer → 200 with seeded bench/deadlift/squat series

**Status**: Complete

### Stage 1 Checkpoint
- [x] `backend/src/repositories/member-nutrition-plan.repository.ts` (add `updateSchedule`)
- [x] `backend/src/repositories/workout-session.repository.ts` (add `findExerciseHistory` + `findLastWeightsForExercises`)
- [x] `backend/src/members/members.service.spec.ts`
- [x] `backend/src/members/members.service.ts`
- [x] `backend/src/members/members.controller.ts`
- [x] `backend/src/members/progress.controller.ts`
- [x] `backend/src/members/members.module.ts`
- [x] `backend/src/app.module.ts` (register MembersModule)

## Stage 2: Backend — body tests + health (injuries, medical history, medications) + check-ins + config

**Goal**: member body-tests CRUD/export, injuries CRUD, medical-history get/update, medications CRUD, check-ins list/detail, check-in config — ownership-guarded, v1-identical.

**Source of truth**: `api/members/[memberId]/{body-tests/**,injuries/**,medical-history,medications/**}`, `api/check-ins/**`, `api/check-in-config/route.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `BodyTestsService > createForMember > stores test and computes body-fat % matching v1`
- [ ] `HealthService > addInjury > persists injury linked to member`
- [ ] `HealthService > updateMedicalHistory > upserts the member's medical history`
- [ ] `CheckInsService > list > returns the member's check-ins newest-first`
- [ ] `CheckInConfigService > upsert > stores schedule config for the member`

*Integration / E2E:*
- [ ] `POST /members/:id/body-tests` as trainer → test retrievable; `GET .../export` returns export
- [ ] `GET /check-ins?memberId=:id` as the member's trainer → 200 with seeded check-ins

**Status**: In Progress

### Stage 2 Checkpoint
- [x] `backend/src/body-tests/body-tests.service.ts` (add `createForMember`, `exportCsvForMember`, `assertMemberAccess`)
- [x] `backend/src/body-tests/body-tests.service.spec.ts` (add `createForMember` + `exportCsvForMember` tests)
- [x] `backend/src/body-tests/body-tests.controller.ts` (use `createForMember`; add `GET export` endpoint)
- [x] `backend/src/body-tests/body-tests.module.ts` (add `UserRepository` + `UserModel`)
- [x] `backend/src/member-health/member-health.service.ts` (new)
- [x] `backend/src/member-health/member-health.service.spec.ts` (new)
- [x] `backend/src/member-health/member-health.controller.ts` (new)
- [x] `backend/src/member-health/member-health.module.ts` (new)
- [x] `backend/src/check-ins/check-ins.service.ts` (new)
- [x] `backend/src/check-ins/check-ins.service.spec.ts` (new)
- [x] `backend/src/check-ins/check-ins.controller.ts` (new)
- [x] `backend/src/check-ins/check-ins.module.ts` (new)
- [x] `backend/src/check-in-config/check-in-config.service.ts` (new)
- [x] `backend/src/check-in-config/check-in-config.service.spec.ts` (new)
- [x] `backend/src/check-in-config/check-in-config.controller.ts` (new)
- [x] `backend/src/check-in-config/check-in-config.module.ts` (new)
- [x] `backend/src/repositories/check-in.repository.ts` (add `findById`)
- [x] `backend/src/repositories/check-in-config.repository.ts` (add `findByMember`)
- [x] `backend/src/app.module.ts` (register `MemberHealthModule`, `CheckInsModule`, `CheckInConfigModule`)

## Stage 3: Frontend — Members list + Member Hub overview + Plan + Nutrition tabs

**Goal**: `/trainer/members`, `/trainer/members/:id` (overview), and the Plan + Nutrition tabs render and operate against the API, matching v1.

**Source of truth**: `trainer/members/_components/trainer-members-client.tsx`, `trainer/members/[id]/{layout,page}.tsx`, `_components/*`, `plan/**`, `nutrition/**`.

**Sprint Contract**:

*Unit tests:*
- [x] `memberHubStore > fetchOverview > populates member, plan card, stat strip, health summary`
- [x] `memberHubStore > fetchPlan > populates the active plan days`
- [x] `StatStripSection > renders seeded stat values`

*Integration / E2E:*
- [x] Trainer on `/trainer/members` clicks a member → URL `/trainer/members/:id`, overview renders header + stat strip
- [x] Trainer clicks "Plan" tab → active plan days render; "Nutrition" tab → nutrition plan + schedule render

**Status**: Complete

### Stage 3 Checkpoint
- [x] `frontend/src/api/member-hub.ts`
- [x] `frontend/src/stores/memberHubStore.ts`
- [x] `frontend/src/stores/memberHubStore.spec.ts`
- [x] `frontend/src/components/member-hub/stat-strip-section.tsx`
- [x] `frontend/src/components/member-hub/stat-strip-section.spec.tsx`
- [x] `frontend/src/components/member-hub/plan-card-section.tsx`
- [x] `frontend/src/components/member-hub/health-panel-section.tsx`
- [x] `frontend/src/components/member-hub/member-hub-tab-nav.tsx`
- [x] `frontend/src/components/member-hub/plan-tab.tsx`
- [x] `frontend/src/components/member-hub/nutrition-tab.tsx`
- [x] `frontend/src/pages/trainer/members.tsx`
- [x] `frontend/src/pages/trainer/member-hub.tsx`
- [x] `frontend/src/api/members.ts` (add `fetchTrainerMembers`)
- [x] `frontend/src/router/index.tsx` (add trainer routes)
- [x] `backend/src/members/members.service.ts` (add `listForTrainer`, update `getProfile` to return user basic info)
- [x] `backend/src/members/members.controller.ts` (add `GET /members` list endpoint)
- [x] `frontend/e2e/trainer/member-hub.spec.ts`

## Stage 4: Frontend — Member Hub Body Tests + Health + Check-ins + Progress + Photos tabs

**Goal**: the remaining Member Hub tabs render and operate against the API, matching v1.

**Source of truth**: `trainer/members/[id]/{body-tests,health,check-ins,progress,photos}/**`.

**Sprint Contract**:

*Unit tests:*
- [x] `memberHubStore > fetchBodyTests > populates test history`
- [x] `memberHubStore > addInjury > prepends injury to health list`
- [x] `CheckInTrends > renders a series from check-in data`

*Integration / E2E:*
- [ ] Trainer on member Health tab adds an injury via sheet → it appears in the list
- [ ] Trainer on Body Tests tab opens "New body test" dialog, submits skinfolds → body-fat % computed and test listed
- [ ] Trainer on Progress tab → strength chart renders seeded 1RM trend; Check-ins tab lists seeded check-ins

**Status**: In Progress

### Stage 4 Checkpoint
- [x] `frontend/src/api/member-hub.ts` (add body-tests, health, check-ins, progress API functions)
- [x] `frontend/src/stores/memberHubStore.ts` (add bodyTests, injuries, medicalHistory, medications, checkIns, progress state + actions)
- [x] `frontend/src/stores/memberHubStore.spec.ts` (fetchBodyTests + addInjury tests)
- [x] `frontend/src/lib/health/drug-warnings.ts` (new — port from v1)
- [x] `frontend/src/components/member-hub/body-tests-tab.tsx` (new)
- [x] `frontend/src/components/member-hub/health-tab.tsx` (new)
- [x] `frontend/src/components/member-hub/check-ins-tab.tsx` (new — includes CheckInTrends)
- [x] `frontend/src/components/member-hub/check-ins-tab.spec.tsx` (CheckInTrends unit test)
- [x] `frontend/src/components/member-hub/progress-tab.tsx` (new)
- [x] `frontend/src/components/member-hub/photos-tab.tsx` (new — placeholder)
- [x] `frontend/src/components/member-hub/member-hub-tab-nav.tsx` (add Progress tab)
- [x] `frontend/src/pages/trainer/member-hub.tsx` (replace TabPlaceholders with real tab wrappers)
- [x] `frontend/src/router/index.tsx` (add /progress route)
- [x] `frontend/e2e/trainer/member-hub.spec.ts` (add Stage 4 E2E specs)

---

# Sprint 7 — Trainer Templates + Personal

Goal: trainer's Plans CRUD, Nutrition templates CRUD, Foods list, My Training, My Nutrition, Settings, Calendar, Invites, Billing. (Backend CRUD largely reuses Sprint 4 modules — these stages are mostly frontend + the trainer-invites endpoint.)

## Affected Files
- `backend/src/trainer-invites/` (controller/service/spec/module) — trainer-scoped invites
- `frontend/src/pages/trainer/{plans,nutrition,foods,my-training,my-nutrition,settings,calendar,invites,billing}/**`
- Reuse `frontend/src/stores/{plansStore,nutritionTemplatesStore,foodsStore,selfTrainingStore,selfNutritionStore,settingsStore,scheduleStore,invitesStore,billingStore}.ts`
- `frontend/e2e/trainer/{plans,nutrition,foods,my-training-cockpit,settings,calendar,invites,billing}.spec.ts`, `frontend/e2e/self-tracking/trainer-*.spec.ts`

## Stage 1: Backend — trainer invites endpoint

**Goal**: trainer creates/lists/resends/revokes invites scoped to their own members, v1-identical.

**Source of truth**: `api/trainer/invites/route.ts`, `api/trainer/invites/[id]/route.ts`, `api/trainer/invites/[id]/resend/route.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainerInvitesService > create > persists invite with inviterId = trainer and sends email`
- [ ] `TrainerInvitesService > list > returns only invites created by the requesting trainer`
- [ ] `TrainerInvitesService > revoke > 404 on an invite the trainer does not own`

*Integration / E2E:*
- [ ] `POST /trainer/invites` as trainer → 201, listed in `GET /trainer/invites`
- [ ] As owner token hitting trainer invites scope → matches v1 access rule

**Status**: Not Started

## Stage 2: Frontend — trainer Plans + Nutrition + Foods

**Goal**: `/trainer/plans`, `/trainer/nutrition`, `/trainer/foods` (list/new/edit) operate against the API (reusing Sprint 4 backend), matching v1.

**Source of truth**: `trainer/plans/**`, `trainer/nutrition/**`, `trainer/foods/**`.

**Sprint Contract**:

*Unit tests:*
- [ ] `plansStore > list (trainer scope) > returns trainer's own templates`
- [ ] `PlanTemplateList > renders a card per template`
- [ ] `NutritionTemplateForm > computes day-type macro totals from items`

*Integration / E2E:*
- [ ] Trainer creates a plan template → appears in `/trainer/plans` list
- [ ] Trainer creates a nutrition template with a meal → totals shown; appears in list

**Status**: Not Started

## Stage 3: Frontend — trainer My Training + My Nutrition + self-tracking flows

**Goal**: `/trainer/my-training` (landing + session + calendar) and `/trainer/my-nutrition` operate against the API (reuse Sprint 5 backend), matching v1, including template-sourced and freestyle workouts.

**Source of truth**: `trainer/my-training/**`, `trainer/my-nutrition/**`, `web/e2e/self-tracking/trainer-*.spec.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `selfTrainingStore > startFromTemplate > seeds session sets from a plan template day`
- [ ] `selfTrainingStore > freestyleAddExercise > adds an exercise group to the active session`

*Integration / E2E:*
- [ ] Trainer starts a template-based session → prescribed sets pre-filled; logs them → completes
- [ ] Trainer starts a freestyle session, adds an exercise + set → persists and completes

**Status**: Not Started

## Stage 4: Frontend — trainer Settings + Calendar + Invites + Billing

**Goal**: `/trainer/settings`, `/trainer/calendar`, `/trainer/invites`, `/trainer/billing` operate against the API, matching v1.

**Source of truth**: `trainer/settings/**`, `trainer/calendar/page.tsx`, `trainer/invites/_components/*`, `trainer/billing/page.tsx`.

**Sprint Contract**:

*Unit tests:*
- [ ] `settingsStore > saveProfile (trainer) > patches and updates store`
- [ ] `invitesStore > resend > triggers resend API for the invite`
- [ ] `scheduleStore > fetchRange > populates calendar sessions`

*Integration / E2E:*
- [ ] Trainer on `/trainer/invites` creates an invite → listed; resend shows success toast
- [ ] Trainer on `/trainer/settings` edits profile bio, saves → persisted on reload
- [ ] Trainer on `/trainer/calendar` sees a seeded session

**Status**: Not Started

---

# Sprint 8 — Member Portal

Goal: member's Dashboard, My Training (+ live session + calendar), Check-ins (dashboard/new/history/detail), Nutrition (landing + day), Body Tests, Journey, Health, Schedule, Settings, Billing.

## Affected Files
- `backend/src/member-portal/` (member-facing aggregation: dashboard data, journey) + reuse `members`, `check-ins`, `self`/`me` modules
- `frontend/src/api/member-portal.ts` (+ reuse existing domain api files)
- `frontend/src/stores/{memberDashboardStore,memberCheckInStore,memberJourneyStore}.ts` (+ reuse)
- `frontend/src/pages/member/{dashboard,my-training,check-in,nutrition,body-tests,journey,health,schedule,settings,billing}/**`
- `frontend/src/components/member/**`
- `frontend/e2e/member/*.spec.ts`

## Stage 1: Backend — member dashboard data + journey + member-scoped reads

**Goal**: `me`-scoped endpoints for the member dashboard (hero, KPI strip, upcoming sessions, nutrition-today, strength selector) and the journey timeline, v1-identical.

**Source of truth**: `member/_components/*` (data needs), `api/members/[memberId]/journey/route.ts`, `api/me/**` reads, `api/schedule/member/[memberId]/route.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `MemberPortalService > getDashboard > returns hero, kpis, upcoming sessions, today nutrition for the current member`
- [ ] `MemberPortalService > getJourney > returns chronological milestone timeline`
- [ ] `MemberPortalService > guards > a member cannot read another member's data`

*Integration / E2E:*
- [ ] `GET /me/dashboard` as seeded member → 200 with KPI numbers reflecting seeded sessions/PBs
- [ ] `GET /members/:meId/journey` as that member → 200 timeline; as another member → 403

**Status**: Not Started

## Stage 2: Frontend — member Dashboard + My Training (landing + session + calendar)

**Goal**: `/member`, `/member/my-training`, `/member/my-training/session/:id`, `/member/my-training/calendar` operate against the API, matching v1 (assigned-plan sessions, prescribed sets, progressive overload hints).

**Source of truth**: `member/page.tsx`, `member/_components/*`, `member/my-training/**`, `web/e2e/member/{plan,session-lifecycle,session-progressive-overload,plan-calendar}.spec.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `memberDashboardStore > fetch > populates hero + kpis + upcoming + nutritionToday`
- [ ] `MemberKpiStrip > renders seeded KPI values`
- [ ] `memberTrainingStore > startPlanSession > seeds prescribed sets from the active plan day`

*Integration / E2E:*
- [ ] Member on `/member` sees hero + KPI strip with seeded numbers
- [ ] Member starts a plan session, logs prescribed sets, completes → session read-only on revisit
- [ ] Progressive-overload hint shows last session's weight for a repeated exercise

**Status**: Not Started

## Stage 3: Frontend — member Check-ins + Nutrition + Body Tests

**Goal**: `/member/check-in` (dashboard/new/history/detail), `/member/nutrition` (landing + day), `/member/body-tests` operate against the API, matching v1.

**Source of truth**: `member/check-in/**`, `member/nutrition/**`, `member/body-tests/**`, `web/e2e/member/{check-in,check-in-dashboard,nutrition,member-nutrition-*,body-tests}.spec.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `memberCheckInStore > submit > posts a check-in and adds it to history`
- [ ] `memberNutritionStore > fetchDay > populates the day's plan + logged items`
- [ ] `CheckInForm > validates required fields before submit`

*Integration / E2E:*
- [ ] Member completes a new check-in via the form → it appears in history and the dashboard "this week" card updates
- [ ] Member on `/member/nutrition` opens today → assigned day-type meals render; freestyle restriction matches v1
- [ ] Member on `/member/body-tests` sees seeded test history + chart

**Status**: Not Started

## Stage 4: Frontend — member Journey + Health + Schedule + Settings + Billing

**Goal**: `/member/journey`, `/member/health`, `/member/schedule`, `/member/settings`, `/member/billing` operate against the API, matching v1.

**Source of truth**: `member/journey/**`, `member/health/**`, `member/schedule/**`, `member/settings/**`, `member/billing/page.tsx`, `web/e2e/member/{health,schedule,settings,billing}.spec.ts`.

**Sprint Contract**:

*Unit tests:*
- [ ] `memberJourneyStore > fetch > populates milestone timeline`
- [ ] `memberHealthStore > addInjury > adds to the member's injury list`
- [ ] `ProfileTab > Save disabled when not dirty`

*Integration / E2E:*
- [ ] Member on `/member/journey` sees a chronological timeline with seeded milestones
- [ ] Member on `/member/health` adds an injury → appears in list
- [ ] Member on `/member/settings` edits profile, saves → persisted on reload; `/member/schedule` shows seeded upcoming session

**Status**: Not Started

---

## Closing the Plan
When all 8 sprints' stages are `Complete` (evaluator-verified, design-reviewed for UI stages), delete this file and its `docs/INDEX.md` row. Given the size, the row may stay `In Progress` for the full migration; do not let it block per-sprint closure in the plan file's stage statuses.
