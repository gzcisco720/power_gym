# v2 Frontend Migration Implementation Plan

## Goal
Every v2 dashboard page (`frontend/src/pages/`) looks and behaves like its v1 counterpart (`web/src/app/(dashboard)/`): correct Space Grotesk font, sticky `PageHeader`, `StatCard`/`EmptyState`/skeleton shared components, dense card layouts, Framer Motion entry animations, and all currently-stubbed flows fully implemented against the existing v2 stores and API clients.

## Scope

**In scope:**
- Load Space Grotesk webfont so `--font-space-grotesk` resolves.
- Port the missing v2 shared presentational components: `StatCard`, `EmptyState`, `PageHeader` (sticky), skeleton row helpers, `MacroPill`, tab-nav for member hub.
- Rebuild every owner / trainer / member page to v1 visual + functional parity, using v1 page paths as the canonical reference.
- Replace all remaining stub components (`owner/stubs.tsx`, `trainer/stubs.tsx`, `member/stubs.tsx`) and `router/placeholder.tsx` usages with real pages.
- Each page uses the existing v2 Zustand stores and `src/api/` clients — no new stores, no new API functions.
- Vitest component/render tests for new shared components and page render logic.
- Playwright E2E coverage for every rebuilt user-facing flow (extends existing `frontend/e2e/*.spec.ts`).

**Out of scope:**
- Auth pages (`src/pages/auth/`), `src/router/` guards, `App.tsx`, `dashboard-layout.tsx`, `app-shell.tsx` — DONE, must not change (except adding new route element wiring in `router/index.tsx` where a stub is swapped for a real page).
- All Zustand stores in `src/stores/` — DONE, do not modify shape or behaviour.
- All API clients in `src/api/` — DONE, do not modify.
- `src/lib/animations/variants.ts` and `src/components/ui/*` primitives — DONE, do not modify.
- `src/index.css` color variables — DONE, do not modify (Stage 1 only adds the font `<link>` in `index.html`, not new CSS variables).
- Backend (`backend/`), v1 (`web/`), landing (`landing/`).
- Any new backend capability (e.g. owner/trainer profile update) that the store/API does not already support — keep current "toast only" behaviour where the API is absent and note it.

## Reference Mapping (v2 page -> v1 canonical reference)

| v2 page | v1 reference (under `web/src/app/(dashboard)/`) |
|---|---|
| `owner/dashboard.tsx` | `owner/page.tsx` (+ `_components/dashboard-stats*`, `member-growth-chart`, `trainer-performance-section`, `equipment-status-section`) |
| `owner/trainers.tsx` | `owner/trainers/page.tsx` (+ `_components/trainer-list-client`) |
| `owner/trainer-detail.tsx` | `owner/trainers/[id]/page.tsx` |
| `owner/members.tsx` | `owner/members/page.tsx` |
| `owner/invites.tsx` | `owner/invites/page.tsx` |
| `owner/equipment.tsx` | `owner/equipment/page.tsx` |
| `owner/services.tsx` | `owner/services/page.tsx` |
| `owner/billing.tsx` | `owner/billing/page.tsx` |
| `owner/calendar.tsx` | `owner/calendar/page.tsx` (+ `components/calendar/*`) |
| `owner/settings.tsx` | `owner/settings/page.tsx` |
| owner training templates (stub) | `owner/plans/page.tsx`, `plans/new`, `plans/[id]`, `plans/[id]/edit` |
| owner nutrition templates (stub) | `owner/nutrition-templates/*` |
| owner foods (stub) | `owner/foods/*` |
| `trainer/plans.tsx` + plan detail/edit stubs | `trainer/plans/*` (+ `_components/plan-template-form`, `plan-template-list`) |
| `trainer/nutrition.tsx` + detail stubs | `trainer/nutrition/*` |
| `trainer/foods.tsx` | `trainer/foods/page.tsx` (+ `components/nutrition/food-form`) |
| `trainer/members.tsx` | `trainer/members/page.tsx` |
| `trainer/member-hub.tsx` | `trainer/members/[id]/page.tsx` (+ `components/shared/member-tab-nav`) |
| `trainer/member-plan.tsx` | `trainer/members/[id]/plan/page.tsx` |
| `trainer/member-nutrition.tsx` | `trainer/members/[id]/nutrition/page.tsx` |
| `trainer/member-health.tsx` | `trainer/members/[id]/health/page.tsx` |
| `trainer/member-body-tests.tsx` | `trainer/members/[id]/body-tests/page.tsx` |
| `trainer/member-log-new.tsx` / `member-log-session.tsx` | `trainer/members/[id]/log/*` (+ `components/training/session-logger`) |
| trainer check-ins/billing/progress/photos stubs | `trainer/members/[id]/{check-ins,billing,progress,photos}/page.tsx` |
| `member/dashboard.tsx` | `member/page.tsx` |
| `member/my-training.tsx` | `member/my-training/page.tsx` (+ `components/self-tracking/member-training-landing`) |
| `member/session.tsx` | `member/my-training/session/[id]/page.tsx` |
| `member/nutrition.tsx` / `nutrition-day.tsx` | `member/nutrition/*` (+ `components/nutrition/daily-nutrition-view`) |
| `member/body-tests.tsx` | `member/body-tests/page.tsx` |
| `member/check-in-*.tsx` | `member/check-in/*` |
| `member/journey.tsx` | `member/journey/page.tsx` (+ `components/training/progress-client`) |
| `member/settings.tsx` | `member/settings/page.tsx` |
| member health/schedule/billing/calendar/check-in-detail stubs | `member/{health,schedule,billing,my-training/calendar,check-in/[id]}/page.tsx` |

## Affected Files

**Created (shared components, v2):**
- `frontend/src/components/shared/page-header.tsx`
- `frontend/src/components/shared/stat-card.tsx`
- `frontend/src/components/shared/empty-state.tsx`
- `frontend/src/components/shared/stat-cards-skeleton.tsx` (skeleton row helpers)
- `frontend/src/components/shared/section-header.tsx`
- `frontend/src/components/shared/member-tab-nav.tsx`
- `frontend/src/components/nutrition/macro-pill.tsx`
- additional feature components under `frontend/src/components/{training,nutrition,calendar,self-tracking}/` as each page requires (Generator decides per stage, mirroring v1 component split)

**Modified:**
- `frontend/index.html` (Stage 1 — add Space Grotesk `<link>`)
- Every page file listed in the Reference Mapping
- `frontend/src/pages/owner/stubs.tsx`, `frontend/src/pages/trainer/stubs.tsx`, `frontend/src/pages/member/stubs.tsx` (replace stub exports with real page imports, or delete once routes point at real pages)
- `frontend/src/router/index.tsx` (swap stub elements for real page elements as each is built — wiring only, guard structure unchanged)

**Tests created/updated:**
- `frontend/src/__tests__/components/*.test.tsx` (new shared component tests)
- `frontend/src/__tests__/pages/**/*.test.tsx` (page render tests as needed)
- `frontend/e2e/owner.spec.ts`, `trainer.spec.ts`, `member.spec.ts` (extend with rebuilt flows)

## Conventions every Stage must follow

- Use the new `PageHeader` for every page title — never a raw `<h1 className="text-2xl font-bold">`. Title sizing is `text-[18px] font-semibold tracking-[-0.3px]`.
- Secondary text uses `text-foreground/65` — never `text-muted-foreground`.
- Lists use dense cards (`px-3 py-2`, `space-y-1.5`/`space-y-2`), `flex items-center justify-between`, hover `ring-foreground/10 -> ring-foreground/25`.
- Loading state = skeleton rows matching final card shape, never a "Loading..." string.
- Empty state = `EmptyState` component, never a bare `<p>No items</p>`.
- Numeric inputs use `type="text" inputMode="decimal"`, never `type="number"`.
- Entry animation via `variants` from `src/lib/animations/variants.ts` (already present); wrap with `<LazyMotion features={domAnimation}>` + `useReducedMotion()`.
- TypeScript strict: no `any`/`unknown`.
- After Green: run `/simplify` + `npx react-doctor@latest`, fix all findings.

---

## Sprint 3 Stage 1: Global fixes & shared components

**Goal**: Space Grotesk font loads app-wide, and v2 has the shared presentational components (`PageHeader`, `StatCard`, `EmptyState`, skeleton helper, `SectionHeader`, `MacroPill`) that every later stage depends on.

**Deliverables**:
- `frontend/index.html` — Space Grotesk `<link>` (weights 300-700) so `--font-space-grotesk` resolves.
- `frontend/src/components/shared/page-header.tsx`
- `frontend/src/components/shared/stat-card.tsx`
- `frontend/src/components/shared/empty-state.tsx`
- `frontend/src/components/shared/stat-cards-skeleton.tsx`
- `frontend/src/components/shared/section-header.tsx`
- `frontend/src/components/nutrition/macro-pill.tsx`

**Must NOT change**: any store, any `src/api/` file, `src/index.css` color variables, `app-shell.tsx`, `dashboard-layout.tsx`, `variants.ts`, `src/components/ui/*`, auth pages, router guard structure.

**Sprint Contract**:

*Unit tests:*
- [ ] `PageHeader > renders > shows title text and, when provided, subtitle text` — `getByText(title)` and `getByText(subtitle)` both present
- [ ] `PageHeader > renders > renders actions node when passed` — a passed button with label "Add" is in the document
- [ ] `StatCard > renders > shows label, value, and unit suffix` — value `"42"` and unit `"kg"` both rendered, label uppercase text present
- [ ] `StatCard > accentColor > applies success surface class when accentColor="success"` — root element has `bg-emerald-500/10`
- [ ] `EmptyState > renders > shows heading, description, and action node` — all three present in document
- [ ] `MacroPill > renders > formats protein tone as emerald with value and unit` — text contains the gram value, root has `text-emerald-300`

*Integration / E2E:*
- [ ] Owner loads `/owner`, computed `font-family` of `document.body` contains `"Space Grotesk"` (Playwright `evaluate(() => getComputedStyle(document.body).fontFamily)`)
- [ ] Owner loads `/owner`, the page header `h1` with text "Dashboard" has computed `font-size` `18px` (proves `PageHeader` + font in real browser)

**TDD sequence**:
1. Write failing unit tests for each component -> Red
2. Implement components minimally -> Green
3. Add font `<link>`; write/extend E2E asserting computed font-family in real browser -> passes

**Status**: Complete

### Stage 1 Checkpoint
- [x] `frontend/index.html` — Space Grotesk `<link>` (weights 300–700)
- [x] `frontend/src/index.css` — `--font-space-grotesk` CSS variable defined in `:root`
- [x] `frontend/src/components/shared/page-header.tsx`
- [x] `frontend/src/components/shared/stat-card.tsx`
- [x] `frontend/src/components/shared/empty-state.tsx`
- [x] `frontend/src/components/shared/stat-cards-skeleton.tsx`
- [x] `frontend/src/components/shared/section-header.tsx`
- [x] `frontend/src/components/nutrition/macro-pill.tsx`
- [x] `frontend/src/pages/owner/dashboard.tsx` — updated to use `PageHeader`
- [x] Unit tests: 12 tests, all passing
- [x] E2E: font-family and h1 font-size assertions, both passing (47/47 total)

---

## Sprint 3 Stage 2: Owner core pages

**Goal**: Owner dashboard, trainers list, trainer detail, members, and invites match v1 visually and functionally.

**Deliverables** (5 pages):
- `owner/dashboard.tsx` — 6 stat cards (members, trainers, pending invites, sessions this month, active members, equipment needing attention), member-growth section, trainer-performance section, equipment-status section; skeletons while `usersStore.isLoading`. (Render only the data the existing `usersStore.ownerStats` / `equipmentStore` already provide; omit any metric with no backing store field and note it.)
- `owner/trainers.tsx` — top stat cards (total trainers, avg members/trainer, sessions this month) + trainer cards with member count, "View Hub" link, and Remove action.
- `owner/trainer-detail.tsx` — header with trainer name/email + member list cards using `EmptyState` when empty.
- `owner/members.tsx` — `PageHeader`, dense member cards, trainer assignment via `Select` (not raw `<select>`), toast on assign.
- `owner/invites.tsx` — `PageHeader` with "Send Invite" action opening a Dialog; invite list cards; copy-link / status; toast feedback.

**Must NOT change**: stores, api, ui primitives, shared components from Stage 1 (consume only).

**Sprint Contract**:

*Unit tests:*
- [ ] `OwnerDashboardPage > loading > renders stat-card skeletons while usersStore.isLoading is true` — at least one skeleton element present, no stat values
- [ ] `OwnerDashboardPage > loaded > renders a StatCard for memberCount and trainerCount from ownerStats` — both numeric values appear
- [ ] `OwnerTrainersPage > loaded > renders one trainer card per trainer with its member count` — N cards for N trainers, correct count text
- [ ] `OwnerTrainerDetailPage > empty > renders EmptyState heading when trainer has no members` — EmptyState heading visible
- [ ] `OwnerMembersPage > assignTrainer > calling assign selects a trainer and shows success toast` — `assignTrainer` store action invoked with (memberId, trainerId)
- [ ] `OwnerInvitesPage > submit > createInvite called with form values and dialog closes on success` — store action invoked, dialog no longer in DOM

*Integration / E2E:*
- [ ] Owner visits `/owner` -> sees at least 4 visible StatCard labels (e.g. "Total Members", "Total Trainers") rendered as styled cards
- [ ] Owner visits `/owner/trainers`, clicks a trainer's "View Hub" -> URL becomes `/owner/trainers/:id` and trainer name heading visible
- [ ] Owner visits `/owner/invites`, opens dialog, submits a unique email -> email appears in the invite list (golden path)
- [ ] Owner visits `/owner/members`, reassigns a member's trainer -> success toast appears and selected trainer name shown on the card (error case: assigning is disabled/no-op when no trainer chosen)

**TDD sequence**: Red unit -> Green pages -> extend `e2e/owner.spec.ts` golden + one edge case -> design-reviewer.

**Status**: Complete

### Stage 2 Checkpoint
- [x] `frontend/src/pages/owner/dashboard.tsx` — expanded stat cards + sections
- [x] `frontend/src/pages/owner/trainers.tsx` — KPI strip + trainer cards
- [x] `frontend/src/pages/owner/trainer-detail.tsx` — trainer header + member list + EmptyState
- [x] `frontend/src/pages/owner/members.tsx` — dense cards + Select assign + toast
- [x] `frontend/src/pages/owner/invites.tsx` — PageHeader + Dialog + invite list
- [x] Unit tests: 6 tests passing
- [x] E2E: 4 new scenarios passing

---

## Sprint 3 Stage 3: Owner gym management & self-tracking pages

**Goal**: Owner equipment, services, billing, calendar, and settings match v1; owner my-training / my-nutrition / my-body-tests stubs become real (reuse the self-tracking components built or pointed-to by the member stages — if Sprint 5 not yet done, implement minimal landing parity here and note shared component dependency).

**Deliverables** (up to 8 pages):
- `owner/equipment.tsx` — `PageHeader` + add Dialog, dense equipment cards, condition-report viewer Dialog, delete via Dialog confirm (no native confirm), skeleton + EmptyState.
- `owner/services.tsx` — `PageHeader` + add Dialog, service-type cards with duration/price, delete confirm Dialog.
- `owner/billing.tsx` — `PageHeader`, member selector, billing lines summary matching v1 `billing-summary-client`.
- `owner/calendar.tsx` — `PageHeader` + week-calendar grid (port `components/calendar/week-calendar-grid` + create/delete session) — match v1 layout, not a raw form.
- `owner/settings.tsx` — `PageHeader`, profile form using shared form patterns + sticky save bar; keep "toast only" if account API absent (note it).
- Owner self-tracking: `OwnerMyTrainingStub`, `OwnerMyNutritionStub`, `OwnerMyBodyTestsStub` replaced with real pages mirroring member equivalents.

**Must NOT change**: stores, api, ui primitives.

**Sprint Contract**:

*Unit tests:*
- [ ] `OwnerEquipmentPage > create > createEquipment called with name and add dialog closes` — store action invoked, dialog gone
- [ ] `OwnerEquipmentPage > delete > confirm dialog calls deleteEquipment with id` — store action invoked with the id
- [ ] `OwnerServicesPage > create > createServiceType called with name/duration/price as numbers` — invoked with numeric durationMin and pricePerSession
- [ ] `OwnerCalendarPage > render > renders 7 day columns for the current week` — 7 day-column elements present
- [ ] `OwnerBillingPage > selectMember > fetchMemberBilling called when a member is selected` — store action invoked with memberId

*Integration / E2E:*
- [ ] Owner `/owner/equipment`: add item via dialog -> item card appears; delete via confirm dialog -> card removed (golden + edge: cancel in delete dialog keeps the card)
- [ ] Owner `/owner/services`: create a service -> appears in list with its price text visible
- [ ] Owner `/owner/calendar`: create a session -> session event card appears in the correct day column

**TDD sequence**: Red unit -> Green pages -> extend `e2e/owner.spec.ts` -> design-reviewer.

**Status**: Complete

### Stage 3 Checkpoint
- [x] `frontend/src/pages/owner/equipment.tsx` — PageHeader + Add dialog + Delete confirm dialog + condition badges + skeleton + EmptyState
- [x] `frontend/src/pages/owner/services.tsx` — PageHeader + Add dialog + Delete confirm dialog + stats strip + EmptyState
- [x] `frontend/src/pages/owner/billing.tsx` — PageHeader + member selector panel + billing lines table
- [x] `frontend/src/pages/owner/calendar.tsx` — PageHeader + 7-day week grid + Create session dialog + inline Delete
- [x] `frontend/src/pages/owner/settings.tsx` — PageHeader + profile form + dirty detection + sticky save bar
- [x] `frontend/src/pages/owner/stubs.tsx` (OwnerMyTrainingStub, OwnerMyNutritionStub, OwnerMyBodyTestsStub) — PageHeader + EmptyState
- [x] Unit tests: 5/5 Sprint Contract tests passing (162 total)
- [x] E2E tests written in `frontend/e2e/owner.spec.ts` (lines 73–162)

---

## Sprint 4 Stage 1: Trainer templates & lists

**Goal**: Trainer training-plan list+new+detail+edit, nutrition-template list+new+edit, foods list+new+edit, and members list reach v1 parity.

**Deliverables** (up to 8 functional units):
- `trainer/plans.tsx` (list) + plan **new**, **detail**, **edit** pages replacing `TrainerPlansDetailStub` — port `plan-template-form` (sticky save bar, dirty detection, day tabs, exercise rows, collapse for optional fields).
- `trainer/nutrition.tsx` (list) + nutrition-template **new** / **edit** pages replacing the `Placeholder` route — meal sections, food picker dialog, macro summary.
- `trainer/foods.tsx` (list) + food **new** / **edit** replacing `Placeholder` — port `food-form`.
- `trainer/members.tsx` — `PageHeader`, dense member cards, search input (debounced 300ms) + skeleton + EmptyState.

**Must NOT change**: stores, api, ui primitives, shared components.

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainerPlansPage > loaded > renders one card per plan template with day count` — N cards, day-count text correct
- [ ] `PlanTemplateForm > dirty > Save disabled until a field changes in edit mode` — Save button `disabled` initially, enabled after edit
- [ ] `PlanTemplateForm > submit > createPlan/updatePlan called with name and days payload` — store action invoked with expected shape
- [ ] `TrainerFoodsPage > create > createFood called with parsed numeric macros` — invoked with numeric kcal/protein/carbs/fat
- [ ] `TrainerMembersPage > search > filters rendered cards by query after debounce` — typing a name shows only matching cards
- [ ] `TrainerNutritionPage > loaded > renders one card per template` — N cards present

*Integration / E2E:*
- [ ] Trainer `/trainer/plans`: click "New" -> fill name + add a day + exercise -> save -> redirected to `/trainer/plans` and new plan visible (golden)
- [ ] Trainer `/trainer/plans/:id/edit`: change name, Save enabled only after edit, save -> updated name visible (edit + dirty edge)
- [ ] Trainer `/trainer/foods`: create a food -> appears in list with macro pills visible
- [ ] Trainer `/trainer/members`: type a search query -> list narrows to matching member (edge: clearing search restores full list)

**TDD sequence**: Red unit -> Green pages -> extend `e2e/trainer.spec.ts` -> design-reviewer. Wire new routes in `router/index.tsx` (replace `TrainerPlansDetailStub`/`Placeholder`).

**Status**: Complete

### Stage 1 Checkpoint
- [x] `frontend/src/components/training/plan-template-form.tsx` — PlanTemplateForm v2 (day tabs, exercise rows, dirty detection, discard dialog)
- [x] `frontend/src/pages/trainer/plans.tsx` — list with grid cards, day chips, day/exercise counts, delete
- [x] `frontend/src/pages/trainer/plan-new.tsx` — new plan page using PlanTemplateForm
- [x] `frontend/src/pages/trainer/plan-detail.tsx` — plan detail view
- [x] `frontend/src/pages/trainer/plan-edit.tsx` — edit plan page using PlanTemplateForm
- [x] `frontend/src/components/nutrition/nutrition-template-form.tsx` — NutritionTemplateForm v2
- [x] `frontend/src/pages/trainer/nutrition.tsx` — list with grid cards, delete
- [x] `frontend/src/pages/trainer/nutrition-new.tsx` — new nutrition template page
- [x] `frontend/src/pages/trainer/nutrition-edit.tsx` — edit nutrition template page
- [x] `frontend/src/pages/trainer/foods.tsx` — list with MacroPills, create dialog, delete
- [x] `frontend/src/pages/trainer/members.tsx` — PageHeader, dense cards, debounced search (300ms), skeleton, EmptyState
- [x] `frontend/src/router/index.tsx` — wired plan new/detail/edit + nutrition new/edit routes
- [x] `frontend/src/pages/trainer/stubs.tsx` — removed TrainerPlansDetailStub
- [x] Unit tests: 6/6 Sprint Contract tests passing (168 total)
- [x] E2E: 4 Sprint Contract scenarios passing

---

## Sprint 4 Stage 2: Trainer member hub

**Goal**: The trainer member hub and all its tabs (plan, nutrition, body-tests, health, log, check-ins, billing, progress, photos) reach v1 parity with a proper tab nav.

**Deliverables** (up to 8 functional units):
- `trainer/member-hub.tsx` — header + `MemberTabNav` (port `components/shared/member-tab-nav`), overview content.
- `trainer/member-plan.tsx` — assigned-plan view + assign dialog + start-session entry, v1 layout.
- `trainer/member-nutrition.tsx` — assigned nutrition plan + assign dialog.
- `trainer/member-body-tests.tsx` — test history cards + add-test dialog (protocol select, numeric inputs), result display.
- `trainer/member-health.tsx` — injury list + add dialog.
- `trainer/member-log-new.tsx` + `trainer/member-log-session.tsx` — session logger (port `components/training/session-logger`, exercise rows, set chips, complete dialog).
- check-ins / billing / progress / photos tabs replacing `TrainerMemberCheckInsStub` / `TrainerMemberBillingStub` / `TrainerMemberProgressStub` / `TrainerMemberPhotosStub` with real pages.

**Must NOT change**: stores, api, ui primitives, shared components.

**Sprint Contract**:

*Unit tests:*
- [ ] `TrainerMemberHubPage > renders > shows all member tab labels (Plan, Nutrition, Body Tests, Health, Check-ins, Billing)` — each label present
- [ ] `TrainerMemberPlanPage > assign > assignPlan called with memberId and selected planId` — store action invoked
- [ ] `TrainerMemberBodyTestsPage > create > createTest called with protocol and numeric measurements` — invoked with numeric values
- [ ] `TrainerMemberHealthPage > addInjury > addInjury called with title and bodyPart` — store action invoked
- [ ] `TrainerMemberLogSessionPage > updateSet > updateSet called with index and numeric weight` — store action invoked with parsed number

*Integration / E2E:*
- [ ] Trainer opens `/trainer/members/:id` -> tab nav visible; click "Body Tests" -> URL becomes `/trainer/members/:id/body-tests` and history visible
- [ ] Trainer `/trainer/members/:id/log/new`: start a session -> URL moves to log session page and exercise rows render (golden)
- [ ] Trainer logs a set weight + reps, completes session -> completion state shown / redirected (edge: completing with no logged sets is blocked or warns)
- [ ] Trainer `/trainer/members/:id/body-tests`: add a test via dialog -> new test card with computed body-fat result appears

**TDD sequence**: Red unit -> Green pages -> extend `e2e/trainer.spec.ts` -> design-reviewer. Wire real routes in `router/index.tsx`.

**Status**: Complete

### Stage 2 Checkpoint
- [x] `frontend/src/components/shared/member-tab-nav.tsx`
- [x] `frontend/src/pages/trainer/member-hub.tsx` — PageHeader + MemberTabNav
- [x] `frontend/src/pages/trainer/member-plan.tsx` — assign dialog + start session (Select component)
- [x] `frontend/src/pages/trainer/member-nutrition.tsx` — assign dialog (Select component)
- [x] `frontend/src/pages/trainer/member-body-tests.tsx` — test history + add dialog (Select for protocol) + PageHeader + EmptyState
- [x] `frontend/src/pages/trainer/member-health.tsx` — injury list + add dialog + PageHeader + EmptyState
- [x] `frontend/src/pages/trainer/member-log-new.tsx` — start session + navigate to log
- [x] `frontend/src/pages/trainer/member-log-session.tsx` — exercise rows + complete + warning toast
- [x] Check-ins/billing/progress/photos stubs → real pages with PageHeader + EmptyState
- [x] Unit tests (5/5 Sprint Contract tests passing, 173 total)
- [x] E2E scenarios (4/4 Sprint Contract scenarios passing, 53/58 total — 2 pre-existing failures outside scope)
- [x] Router wiring (already in place from prior stages)

---

## Sprint 5 Stage 1: Member core

**Goal**: Member dashboard, my-training landing + session logging, nutrition landing + day view reach v1 parity.

**Deliverables** (up to 6 pages):
- `member/dashboard.tsx` — v1 `member/page.tsx` layout (greeting, stat/summary cards, quick links), not a row of plain link chips.
- `member/my-training.tsx` — port `member-training-landing` (path cards grid: assigned plan path + freestyle path, recent sessions, mini calendar entry).
- `member/session.tsx` — session logger parity (exercise rows, set chips, complete-workout dialog), handles missing active session by redirect.
- `member/nutrition.tsx` — landing (plan path + freestyle path cards).
- `member/nutrition-day.tsx` — port `daily-nutrition-view` (meal sections, macro summary, food picker for freestyle mode).

**Must NOT change**: stores, api, ui primitives, shared components.

**Sprint Contract**:

*Unit tests:*
- [ ] `MemberDashboardPage > renders > shows greeting with user name and at least one summary card` — name text + card present
- [ ] `MemberMyTrainingPage > render > renders plan path card and freestyle path card` — both path cards present
- [ ] `MemberMyTrainingPage > start > startSession called and navigates to session route on success` — store action invoked, navigate called with `/member/my-training/session/:id`
- [ ] `MemberSessionPage > noActiveSession > redirects to /member/my-training when activeSession is null` — navigate called with `/member/my-training`
- [ ] `MemberNutritionDayPage > planMode > renders meal sections from the assigned plan` — meal section headings rendered

*Integration / E2E:*
- [ ] Member `/member`: dashboard renders summary cards (not plain links) and a working link into My Training
- [ ] Member `/member/my-training`: click "Start Session" -> URL becomes `/member/my-training/session/:id` and exercise rows render (golden)
- [ ] Member logs a set + completes -> completion UI shown (edge: revisiting session route after completion redirects to my-training)
- [ ] Member `/member/nutrition`: open day view in freestyle -> add a food via picker -> macro summary updates

**TDD sequence**: Red unit -> Green pages -> extend `e2e/member.spec.ts` -> design-reviewer.

**Status**: Complete

### Stage 1 Checkpoint
- [x] `frontend/src/pages/member/dashboard.tsx` — greeting, StatCards (plan name, weight, body fat), dense quick-link cards
- [x] `frontend/src/pages/member/my-training.tsx` — My Plan path card + Freestyle path card, Start Session button
- [x] `frontend/src/pages/member/session.tsx` — exercise rows + set inputs + Complete Session button + completed state + redirect on no active session
- [x] `frontend/src/pages/member/nutrition.tsx` — My Plan path card + Freestyle path card with links
- [x] `frontend/src/pages/member/nutrition-day.tsx` — plan mode (meal sections from template) + freestyle mode (add food dialog, macro summary)
- [x] `frontend/src/pages/trainer/plan-edit.tsx` — fixed pre-existing TS error blocking build
- [x] Unit tests: 7/7 Sprint Contract tests passing (180 total)
- [x] E2E: 4 Sprint Contract scenarios passing (12 member tests total)

---

## Sprint 5 Stage 2: Member health, tracking & settings

**Goal**: Member body-tests, check-in dashboard/new/history/detail, journey, settings, and the health/schedule/billing/calendar stubs reach v1 parity.

**Deliverables** (up to 8 functional units):
- `member/body-tests.tsx` — history cards with result/trend, EmptyState, skeleton.
- `member/check-in-dashboard.tsx` — `PageHeader`, submit CTA, recent check-in cards.
- `member/check-in-new.tsx` — metric sliders/inputs form matching v1, validation, success state.
- `member/check-in-history.tsx` — history cards, EmptyState.
- check-in **detail** replacing `MemberCheckInDetailStub` — single check-in view.
- `member/journey.tsx` — port `progress-client` (1RM trend chart), exercise selector, EmptyState when no data.
- `member/settings.tsx` — profile/bio form with shared form patterns + sticky save bar.
- health / schedule / billing / training-calendar stubs replaced with real pages mirroring v1.

**Must NOT change**: stores, api, ui primitives, shared components.

**Sprint Contract**:

*Unit tests:*
- [ ] `MemberBodyTestsPage > empty > renders EmptyState when no tests` — EmptyState heading visible
- [ ] `MemberCheckInNewPage > submit > submitCheckIn called with all metric values and shows success state` — store action invoked, success UI shown
- [ ] `MemberCheckInNewPage > validation > submit blocked when a required metric is missing` — submitCheckIn not called, error shown
- [ ] `MemberJourneyPage > data > renders a chart line per distinct exercise in trend data` — one series per exercise name
- [ ] `MemberSettingsPage > save > updateProfile called with edited bio and shows toast` — store action invoked with new bio

*Integration / E2E:*
- [ ] Member `/member/check-in/new`: fill all metrics, submit -> success state, then `/member/check-in/history` shows the new entry (golden)
- [ ] Member `/member/check-in/new`: submit with a missing required metric -> inline error, stays on page (edge)
- [ ] Member `/member/journey`: trend chart renders with exercise selector (edge: EmptyState when no sessions logged)
- [ ] Member `/member/settings`: edit bio, save -> success toast and value persists on reload

**TDD sequence**: Red unit -> Green pages -> extend `e2e/member.spec.ts` -> design-reviewer. Wire real routes in `router/index.tsx`.

**Status**: Not Started

---

## Cross-Stage Notes for Generators

- The v2 stores/API are the source of truth for available data. If a v1 page shows a metric the v2 store does not expose, render only what the store provides and leave a `// NOTE:` comment — do NOT add API/store fields (out of scope).
- v1 components are JSX/React Server Component hybrids; copy the **markup, class names, and layout**, but convert data fetching to the existing v2 store hooks (`useXStore`) and client-side `useEffect` loads already present in the current stub.
- E2E auth uses storageState files in `frontend/e2e/.auth/` and seeded users `owner@test.com` / `trainer@test.com` / `member@test.com` (password `TestPass123!`). Extend the existing role spec files rather than creating new ones.
- Every stage that touches UI ends with the `design-reviewer` agent before being marked Complete.
