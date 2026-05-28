# Backend V2 — NestJS API Migration Implementation Plan

**Date**: 2026-05-28
**Branch**: feature/v2
**Design doc**: `.archive/2026-05-28/backend-v2-design.md`

## Goal

A standalone NestJS API (`backend/`, port 3001, prefix `/api/v1`) that replicates every piece of backend business logic currently living in the Next.js web app, verifiable end-to-end via Supertest against a real Mongo test database.

## Scope

**In scope:**
- New NestJS code only under `backend/src/`
- DatabaseModule + 27 Mongoose schemas copied from `web/src/lib/db/models/`
- 27 repositories copied from `web/src/lib/repositories/` and adapted to `@Injectable` + `@InjectModel`
- JWT access+refresh auth (replacing NextAuth session strategy)
- All 88 route handlers re-expressed as NestJS controllers under `/api/v1`
- Cross-cutting: Email (9 templates), Storage (upload), Cron (4 jobs), FatSecret integration
- `.env.example` + global config (prefix, ValidationPipe, exception filter)
- Jest unit specs (service + mocked repo) and Supertest E2E specs per domain

**Out of scope:**
- Any change to `web/` — it is reference only, never modified
- Web frontend wiring to the new API (separate web-migration sprint)
- Mobile app
- Deployment / infrastructure / CI
- Re-init of the NestJS project or restructuring `backend/package.json` (deps are *added*, never the scaffold rewritten)
- Reproducing NextAuth's `[...nextauth]` cookie-session handler — it is replaced by JWT endpoints
- Reproducing web-only helpers that have no server role (animations, image client helpers, UI redirect helpers)

## Affected Files

All new files are created under `backend/`. Reference files in `web/` are read-only sources.

**Created — Foundation**
- `backend/.env.example`
- `backend/src/main.ts` (modify scaffold: prefix, pipe, filter)
- `backend/src/app.module.ts` (modify scaffold: wire all modules)
- `backend/src/database/database.module.ts`
- `backend/src/database/models/*.ts` (27 schemas copied from `web/src/lib/db/models/`)
- `backend/src/common/decorators/{current-user,roles,public}.decorator.ts`
- `backend/src/common/guards/{jwt-auth,roles,refresh-token}.guard.ts`
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/common/interfaces/auth-user.interface.ts`

**Created — per domain module** (`backend/src/<domain>/` each: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `dto/*.ts`)
- `auth`, `users`, `account`, `training`, `nutrition`, `body-tests`, `schedule`, `check-ins`, `equipment`, `health`, `progress`, `billing`, `email`, `storage`, `cron`

**Created — tests**
- `backend/src/**/*.spec.ts` (unit) and `backend/test/*.e2e-spec.ts` (Supertest, one per domain)

**Dependencies** (already installed):
`@nestjs/mongoose mongoose @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/config @nestjs/schedule @nestjs/throttler class-validator class-transformer bcryptjs nodemailer` plus `@types/passport-jwt @types/bcryptjs @types/nodemailer @types/multer`.

## E2E Test Environment

E2E tests run against real local services via `web/docker-compose.yml` (same setup as the web app). Start with `docker compose -f web/docker-compose.yml up -d` before running `pnpm test:e2e`.

| Service | URL | Used by |
|---|---|---|
| MongoDB | `mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym?authSource=admin` | All E2E specs |
| MinIO | `http://localhost:9000` | Storage E2E |
| Mailpit SMTP | `localhost:1025` (no auth) | Email / cron E2E |

No mocking needed for these services — use them directly in test env vars.

---

## Stage 1: Foundation

**Goal**: Bootable NestJS app on port 3001 with `/api/v1` prefix, global ValidationPipe + HttpExceptionFilter, live Mongo connection via DatabaseModule, and the common guards/decorators/interfaces in place (registered but exercised by later stages). A trivial public health endpoint proves the wiring.

**Sprint Contract** (Supertest):
- [ ] `GET /api/v1/health` returns `expect(res.status).toBe(200)` and `expect(res.body.status).toBe('ok')`
- [ ] A request to a path without the prefix, e.g. `GET /health`, returns `expect(res.status).toBe(404)` (prefix enforced)
- [ ] POSTing a body with an unknown field to a DTO-validated test endpoint returns `expect(res.status).toBe(400)` (ValidationPipe `whitelist`/`forbidNonWhitelisted` active)
- [ ] A thrown `NotFoundException` is serialized by the filter so `expect(res.body).toEqual({ statusCode: 404, message: expect.any(String) })`
- [ ] App boots with `MONGODB_URI` set and `expect(mongoose.connection.readyState).toBe(1)` (or the Nest connection token resolves) in a DB integration spec
- [ ] `.env.example` exists and lists `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY` (asserted by a config spec reading the file)

**TDD Test Cases**:
- [ ] `health (e2e)`: prefix present → 200, prefix absent → 404
- [ ] `validation pipe (e2e)`: unknown field rejected → 400
- [ ] `exception filter (unit)`: maps `HttpException` to `{ statusCode, message }`
- [ ] `database (integration)`: connection token resolves to a connected Mongoose connection

**Status**: Not Started

---

## Stage 2: Auth

**Goal**: JWT access + refresh auth. Endpoints: login, register (owner-initial vs invite), refresh, logout (revoke), forgot-password, reset-password. `JwtStrategy` + `RefreshTokenStrategy`, global `JwtAuthGuard`, `@Public()` on auth endpoints. Rate limiting via `@nestjs/throttler` on auth endpoints (10 requests / 15 minutes per IP) to prevent brute-force attacks. Reuses `user`, `invite-token`, `password-reset-token` repos and `bcryptjs` + invite validation logic from `web/src/lib/auth/invite.ts`.

**Sprint Contract** (Supertest):
- [ ] `POST /api/v1/auth/register` with no existing users and no token creates an owner → `expect(res.status).toBe(201)`
- [ ] `POST /api/v1/auth/register` without token when a user already exists → `expect(res.status).toBe(403)`
- [ ] `POST /api/v1/auth/register` with a valid invite token + matching email creates the invited role → `expect(res.status).toBe(201)`; with mismatched email → `expect(res.status).toBe(400)`
- [ ] `POST /api/v1/auth/login` with valid credentials → `expect(res.status).toBe(200)`, `expect(res.body.access_token).toBeDefined()`, `expect(res.body.refresh_token).toBeDefined()`, `expect(res.body.user.role).toBeDefined()`
- [ ] `POST /api/v1/auth/login` with wrong password → `expect(res.status).toBe(401)`
- [ ] `GET` on any protected route with no `Authorization` header → `expect(res.status).toBe(401)`
- [ ] `POST /api/v1/auth/refresh` with a valid refresh token → `expect(res.status).toBe(200)` and `expect(res.body.access_token).toBeDefined()`; after `POST /api/v1/auth/logout`, reusing that refresh token → `expect(res.status).toBe(401)`
- [ ] `POST /api/v1/auth/forgot-password` for a known email → `expect(res.status).toBe(200)`; `POST /api/v1/auth/reset-password` with the issued token → `expect(res.status).toBe(200)` and the new password then logs in successfully
- [ ] Exceeding 10 login attempts in 15 minutes from the same IP → `expect(res.status).toBe(429)` and `expect(res.body.message).toMatch(/too many/i)`

**TDD Test Cases**:
- [ ] `JwtStrategy (unit)`: valid token payload → `{ userId, email, role }`; expired → throws
- [ ] `RefreshTokenStrategy (unit)`: revoked DB record → rejects
- [ ] `auth.service (unit)`: register branch logic (owner-initial vs invite vs reject) with mocked repos
- [ ] `auth (e2e)`: full login → access protected route → refresh → logout → refresh-fails cycle

**Status**: Not Started

---

## Stage 3: Users & Account

**Goal**: User/member/trainer management and account self-service. Covers `members`, `owner/members`, `owner/trainers`, `owner/stats`, `invites` + `owner/invites` + `trainer/invites` (create/resend/revoke), `members/[memberId]/profile`, `profile`, `account/password`, `account/email`. Enforces ownership hierarchy (a trainer sees only their own members). Reuses `user`, `user-profile`, `invite` repos.

**Sprint Contract** (Supertest):
- [ ] `GET /api/v1/members` as owner → `expect(res.status).toBe(200)` and `expect(Array.isArray(res.body)).toBe(true)`
- [ ] `GET /api/v1/members` as member → `expect(res.status).toBe(403)`
- [ ] A trainer requesting another trainer's member, e.g. `GET /api/v1/members/:foreignMemberId`, → `expect(res.status).toBe(404)` (ownership-scoped, prevents enumeration)
- [ ] `POST /api/v1/invites` (or `owner/invites`) as owner with a valid body → `expect(res.status).toBe(201)` and `expect(res.body.token).toBeDefined()`
- [ ] `PATCH /api/v1/owner/members/:id/trainer` as owner reassigns trainer → `expect(res.status).toBe(200)`; same call as trainer → `expect(res.status).toBe(403)`
- [ ] `PATCH /api/v1/account/password` with correct current password → `expect(res.status).toBe(200)`; with wrong current password → `expect(res.status).toBe(400)`
- [ ] `PATCH /api/v1/account/email` to an email already in use → `expect(res.status).toBe(409)` (or `400` matching web behavior)
- [ ] `GET /api/v1/owner/stats` as owner → `expect(res.status).toBe(200)` and `expect(res.body).toHaveProperty('membersByMonth')` (shape matches web)

**TDD Test Cases**:
- [ ] `users.service (unit)`: trainer member-scoping filter applied
- [ ] `account.service (unit)`: password change verifies current hash before updating
- [ ] `invites.service (unit)`: token generation + role/trainer assignment
- [ ] `users (e2e)`: owner lists members, trainer cannot cross-access, member is forbidden

**Status**: Not Started

---

## Stage 4: Training

**Goal**: Plan templates, member plans, workout sessions (logging lifecycle: create/start, set updates, complete, seal), exercise notes, exercises catalog, personal bests, plus self-tracking variants (`me/workout-logs`, `self-*`). Covers `plan-templates`, `members/[memberId]/plan`, `sessions` + `me/workout-logs` (start/sets/complete/seal/active/range/export), `exercises`, `exercise-notes`, `members/[memberId]/pbs`, `members/[memberId]/exercise-last-weights`. Reuses `plan-template`, `member-plan`, `workout-session`, `exercise`, `exercise-note`, `personal-best`, `self-workout-log`, `self-personal-best` repos and `epley`/`session-summary` logic.

**Sprint Contract** (Supertest):
- [ ] `POST /api/v1/plan-templates` as trainer → `expect(res.status).toBe(201)`; as member → `expect(res.status).toBe(403)`
- [ ] `POST /api/v1/sessions` (start workout) for a member with an active plan → `expect(res.status).toBe(201)` and `expect(res.body.sets.length).toBeGreaterThan(0)`
- [ ] `POST /api/v1/sessions` when an active session for a different day already exists and `deleteActive` not set → `expect(res.status).toBe(409)` and `expect(res.body.error).toBe('ACTIVE_SESSION_EXISTS')`
- [ ] `POST /api/v1/sessions` when the day was already completed today → `expect(res.status).toBe(409)` and `expect(res.body.error).toBe('DAY_ALREADY_LOGGED')`
- [ ] `PATCH /api/v1/sessions/:id/sets/:setIndex` with weight+reps → `expect(res.status).toBe(200)` and `expect(res.body.sets[idx].completedAt).not.toBeNull()`
- [ ] `POST /api/v1/sessions/:id/complete` → `expect(res.status).toBe(200)` and `expect(res.body.completedAt).not.toBeNull()`
- [ ] `GET /api/v1/sessions?memberId=:id` as a member requesting another member's id → `expect(res.status).toBe(403)`
- [ ] `GET /api/v1/members/:memberId/pbs` returns Epley-estimated 1RMs → `expect(res.status).toBe(200)` and `expect(Array.isArray(res.body)).toBe(true)`

**TDD Test Cases**:
- [ ] `epley (unit)`: 1RM estimation matches web fixture values
- [ ] `training.service (unit)`: session creation builds sets from plan day; active/completed-today conflict branches
- [ ] `session-lifecycle (e2e)`: start → log sets → complete → seal golden path + 409 conflict cases

**Status**: Not Started

---

## Stage 5: Nutrition

**Goal**: Nutrition templates, foods CRUD, FatSecret food search (OAuth1/OAuth2), daily logs (plan + freestyle), and member nutrition (assign/history/recent/schedule/log). Covers `nutrition-templates`, `foods`/`food`, `food-search`, `me/nutrition-logs` + `me/nutrition-daily-logs`, `members/[memberId]/nutrition/*`. Reuses `nutrition-template`, `food`, `member-nutrition-plan`, `nutrition-daily-log`, `self-nutrition-log` repos, FatSecret client, `compute-day-type-targets`, `macros`, `schedule`, `template-overview` logic.

**Sprint Contract** (Supertest):
- [ ] `POST /api/v1/foods` as trainer with valid macros → `expect(res.status).toBe(201)` and `expect(res.body.proteinPer100g).toBeDefined()`
- [ ] `GET /api/v1/food-search?q=chicken` → `expect(res.status).toBe(200)` and `expect(Array.isArray(res.body)).toBe(true)` (FatSecret stubbed in test)
- [ ] `POST /api/v1/nutrition-templates` as trainer → `expect(res.status).toBe(201)`; as member → `expect(res.status).toBe(403)`
- [ ] `PUT /api/v1/members/:memberId/nutrition` assigns a plan → `expect(res.status).toBe(200)`; a trainer assigning to a foreign member → `expect(res.status).toBe(404)`
- [ ] `GET /api/v1/me/nutrition-logs/:date` for the member's own date → `expect(res.status).toBe(200)`
- [ ] `POST /api/v1/me/nutrition-logs` records intake and returns computed macro totals → `expect(res.status).toBe(201)` (or 200) and `expect(res.body.totals).toHaveProperty('protein')`
- [ ] `GET /api/v1/members/:memberId/nutrition/recent` checks BOTH plan log and freestyle log when deciding "logged today" → `expect(res.status).toBe(200)` and `expect(res.body).toHaveProperty('loggedToday')`

**TDD Test Cases**:
- [ ] `macros (unit)`: per-100g scaling and totals
- [ ] `compute-day-type-targets (unit)`: training vs rest day target calc
- [ ] `nutrition.service (unit)`: "logged today" combines `NutritionDailyLog` (plan) + `SelfNutritionLog` (freestyle)
- [ ] `nutrition (e2e)`: create food → build template → assign to member → member logs intake golden path

**Status**: Not Started

---

## Stage 6: Body Tests

**Goal**: Body composition tests (create/list/get/delete/export) for members plus self body tests. Covers `members/[memberId]/body-tests/*` and `me/body-tests/*`. Reuses `body-test` repo and `body-test/formulas.ts` (Jackson-Pollock).

**Sprint Contract** (Supertest):
- [ ] `POST /api/v1/members/:memberId/body-tests` as the owning trainer with valid skinfold inputs → `expect(res.status).toBe(201)` and `expect(res.body.bodyFatPercent).toBeDefined()`
- [ ] The computed body-fat for a known skinfold fixture → `expect(res.body.bodyFatPercent).toBeCloseTo(EXPECTED, 1)` (Jackson-Pollock formula correctness)
- [ ] `POST /api/v1/members/:memberId/body-tests` as a trainer for a foreign member → `expect(res.status).toBe(404)`
- [ ] `GET /api/v1/members/:memberId/body-tests` → `expect(res.status).toBe(200)` and `expect(Array.isArray(res.body)).toBe(true)`
- [ ] `DELETE /api/v1/members/:memberId/body-tests/:testId` as owning trainer → `expect(res.status).toBe(200)`; non-owner → `expect(res.status).toBe(404)`
- [ ] `GET /api/v1/me/body-tests/export` as a member → `expect(res.status).toBe(200)` and `expect(res.headers['content-type']).toMatch(/csv/)`

**TDD Test Cases**:
- [ ] `formulas (unit)`: Jackson-Pollock 3-site and 7-site against published fixtures
- [ ] `body-tests.service (unit)`: ownership check on member before write
- [ ] `body-tests (e2e)`: trainer creates test → member views own history → export CSV

**Status**: Not Started

---

## Stage 7: Schedule & Check-ins

**Goal**: Scheduled sessions (CRUD, recurring series, member calendar), and the check-in system (records + per-member config). Covers `schedule` + `schedule/[id]` + `schedule/member/[memberId]`, `check-ins` + `check-ins/[id]`, `check-in-config`. Reuses `scheduled-session`, `check-in`, `check-in-config` repos.

**Sprint Contract** (Supertest):
- [ ] `POST /api/v1/schedule` as trainer creates a session → `expect(res.status).toBe(201)` and `expect(res.body._id).toBeDefined()`
- [ ] `GET /api/v1/schedule/member/:memberId` as that member → `expect(res.status).toBe(200)`; as a different member → `expect(res.status).toBe(403)`
- [ ] `DELETE /api/v1/schedule/:id` (cancel) as owning trainer → `expect(res.status).toBe(200)` and `expect(res.body.status).toBe('cancelled')`
- [ ] `POST /api/v1/check-ins` as a member for today → `expect(res.status).toBe(201)`; a second check-in same day → `expect(res.status).toBe(409)`
- [ ] `GET /api/v1/check-ins` as a member returns their own records → `expect(res.status).toBe(200)` and `expect(Array.isArray(res.body)).toBe(true)`
- [ ] `PUT /api/v1/check-in-config` as a trainer for an owned member → `expect(res.status).toBe(200)`; foreign member → `expect(res.status).toBe(404)`

**TDD Test Cases**:
- [ ] `schedule.service (unit)`: recurring series expansion produces expected occurrence count
- [ ] `check-ins.service (unit)`: duplicate same-day check-in rejected
- [ ] `schedule (e2e)`: create session → member sees it on calendar → cancel
- [ ] `check-ins (e2e)`: member checks in → config drives reminder eligibility

**Status**: Not Started

---

## Stage 8: Equipment & Health

**Goal**: Equipment inventory + condition reports (owner/trainer), and member health (injuries, medical history, medications with drug-warning checks). Covers `owner/equipment/*`, `members/[memberId]/injuries/*`, `members/[memberId]/medical-history`, `members/[memberId]/medications/*`. Reuses `equipment`, `condition-report`, `member-injury`, `member-medical-history`, `member-medication` repos and `health/drug-warnings.ts`.

**Sprint Contract** (Supertest):
- [ ] `POST /api/v1/owner/equipment` as owner with a name → `expect(res.status).toBe(201)`; with empty name → `expect(res.status).toBe(400)`
- [ ] `POST /api/v1/owner/equipment` as trainer → `expect(res.status).toBe(403)` (create is owner-only)
- [ ] `GET /api/v1/owner/equipment` as member → `expect(res.status).toBe(403)`
- [ ] `POST /api/v1/owner/equipment/:id/condition-reports` → `expect(res.status).toBe(201)` and `expect(res.body.equipmentId).toBeDefined()`
- [ ] `POST /api/v1/members/:memberId/injuries` as owning trainer → `expect(res.status).toBe(201)`; foreign member → `expect(res.status).toBe(404)`
- [ ] `POST /api/v1/members/:memberId/medications` returns drug-interaction warnings when conflicting meds exist → `expect(res.status).toBe(201)` and `expect(Array.isArray(res.body.warnings)).toBe(true)`
- [ ] `GET /api/v1/members/:memberId/medical-history` as the member themselves → `expect(res.status).toBe(200)`

**TDD Test Cases**:
- [ ] `drug-warnings (unit)`: known interacting pair flagged; safe pair not flagged
- [ ] `equipment.service (unit)`: create requires owner role
- [ ] `health.service (unit)`: injury/medication writes scoped to owned member
- [ ] `equipment-health (e2e)`: owner adds equipment + condition report; trainer records member injury

**Status**: Not Started

---

## Stage 9: Progress & Billing

**Goal**: Progress charts/analytics (1RM trends, training heatmap) and billing (service types CRUD + per-member billing calculation). Covers `progress/[memberId]`, `service-types` + `service-types/[id]` + `service-types/active`, `billing` + `billing/member/[id]`. Reuses `service-type` repo, `scheduled-session` repo, and `billing/calculate-billing.ts`.

**Sprint Contract** (Supertest):
- [ ] `GET /api/v1/progress/:memberId` as owning trainer → `expect(res.status).toBe(200)` and `expect(res.body).toHaveProperty('oneRepMaxTrend')`
- [ ] `GET /api/v1/progress/:memberId` as a foreign trainer → `expect(res.status).toBe(404)`
- [ ] `POST /api/v1/service-types` as owner → `expect(res.status).toBe(201)`; as member → `expect(res.status).toBe(403)`
- [ ] `GET /api/v1/service-types/active` → `expect(res.status).toBe(200)` and every item `expect(item.active).toBe(true)`
- [ ] `GET /api/v1/billing/member/:id` → `expect(res.status).toBe(200)`, `expect(res.body.total).toEqual(expect.any(Number))`, `expect(res.body.lines)` excludes cancelled and future sessions
- [ ] Billing total for a fixture of past completed sessions → `expect(res.body.total).toBe(EXPECTED)` (calculation correctness)

**TDD Test Cases**:
- [ ] `calculate-billing (unit)`: skips cancelled, skips future-dated, sums priced past sessions against fixture
- [ ] `progress.service (unit)`: 1RM trend + heatmap aggregation shape
- [ ] `billing (e2e)`: owner defines service type → schedule completed session → member billing reflects it

**Status**: Not Started

---

## Stage 10: Cross-cutting (Email, Storage, Cron)

**Goal**: EmailModule (Nodemailer dev / Mailgun prod switched by `EMAIL_PROVIDER`, 9 templates), StorageModule (MinIO dev / Cloudinary prod switched by `UPLOAD_PROVIDER`, `POST /api/v1/upload`), and CronModule (`@nestjs/schedule`, 4 jobs). These are wired into earlier modules (e.g. auth uses password-reset email, invites use invite email) but verified independently here. Reuses `web/src/lib/email/*`, `web/src/lib/storage/*`, and the 4 `web/src/app/api/cron/*` handlers.

**Sprint Contract** (Supertest + unit):
- [ ] `POST /api/v1/upload` with a multipart file as an authenticated user → `expect(res.status).toBe(201)` and `expect(res.body.url).toMatch(/^https?:\/\//)` (storage provider stubbed)
- [ ] `POST /api/v1/upload` with no `Authorization` header → `expect(res.status).toBe(401)`
- [ ] `EmailService.send` resolves the correct provider for `EMAIL_PROVIDER=smtp` vs `mailgun` → `expect(provider).toBeInstanceOf(NodemailerProvider)` / `MailgunProvider` (unit, provider stubbed)
- [ ] Each of the 9 templates renders subject + html for sample data → `expect(rendered.subject).toBeTruthy()` and `expect(rendered.html).toContain(EXPECTED_TOKEN)` (unit, looped per template)
- [ ] `CronService.sessionReminders()` invoked directly queries due sessions and calls `EmailService.send` once per due session → `expect(emailSpy).toHaveBeenCalledTimes(N)` (unit, repos+email mocked)
- [ ] `CronService.sealStaleWorkouts()` invoked directly seals sessions older than the threshold → `expect(sealSpy).toHaveBeenCalled()` and stale session status becomes sealed (unit/integration)
- [ ] All 4 cron methods (`sessionReminders`, `checkInReminders`, `extendSeries`, `sealStaleWorkouts`) exist and are decorated with `@Cron(...)` → `expect(Reflect.getMetadata(...))` confirms the schedule expressions

**TDD Test Cases**:
- [ ] `email-provider-factory (unit)`: env-driven provider selection
- [ ] `templates (unit)`: 9 templates render required fields
- [ ] `storage.service (unit)`: provider selection + URL returned
- [ ] `cron.service (unit)`: each job calls the right service with the right query, idempotent on empty data
- [ ] `upload (e2e)`: authenticated upload returns URL; unauthenticated → 401

**Status**: Not Started

---

## Verification

End-to-end journey proving all stages cooperate (run as a single Supertest scenario against a real test Mongo):

1. **Bootstrap (S1, S2)**: app boots on `/api/v1`; `POST /auth/register` with no users creates the owner; owner logs in and receives `access_token` + `refresh_token`.
2. **Onboarding (S3, S10)**: owner invites a trainer (`POST /invites`) and an invite email is dispatched (email provider spy fires); the trainer registers via the invite token and logs in; the trainer invites a member who registers and logs in. Foreign-trainer access to the member returns 404.
3. **Programming (S4, S5, S6)**: trainer creates a plan template, assigns a plan to the member, creates a nutrition template + assigns it, and records a body-composition test (body-fat computed). Member starts a workout session, logs sets, completes it; PBs reflect an Epley-estimated 1RM.
4. **Scheduling & accountability (S7)**: trainer schedules a session (session-booked email fires); member sees it on their calendar; member submits today's check-in; a duplicate check-in is rejected with 409.
5. **Operations & money (S8, S9)**: owner adds equipment + a condition report; trainer records a member injury; owner defines a service type; after a past completed session, `GET /billing/member/:id` returns a non-zero total excluding cancelled/future sessions; `GET /progress/:memberId` returns trend + heatmap data.
6. **Background (S10)**: invoking `CronService.sessionReminders()` and `sealStaleWorkouts()` directly produces the expected email sends and sealed sessions.
7. **Session integrity (S2)**: member refreshes the access token successfully, logs out, and the now-revoked refresh token returns 401.

When this scenario passes via `cd backend && pnpm test:e2e`, all stages are verified together.
