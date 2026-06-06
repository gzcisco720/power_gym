# Training Plan Assignment (Mobile) Implementation Plan

## Goal
An owner or trainer can open a member's Training tab in the mobile app, assign or replace that member's training plan by picking from existing templates, and immediately see the new plan reflected.

## Application
cross-app — `backend/` (NestJS assign endpoint) + `mobile/` (assignment UI, store action, API client). Detox E2E lives in `mobile/`.

## Important context — most of this feature already exists in the codebase

A prior sprint already shipped almost all of this. The planner verified the following are present and working:

- **Backend**: `POST /training/members/:memberId/assign-plan` exists in `training.controller.ts` (`@Roles('owner','trainer')`), backed by `TrainingService.assignPlan` with template-ownership + trainer-member scoping, and a passing `assign-plan.dto.ts` (`@IsMongoId templateId`). Full coverage exists in `backend/test/training.e2e-spec.ts`.
- **Mobile API client**: `assignPlan(memberId, templateId)` in `mobile/src/lib/api/training.api.ts`, and `fetchTemplates()` in `mobile/src/lib/api/training-templates.api.ts` (hits the existing `GET /plan-templates`).
- **Mobile UI**: `mobile/src/screens/members/AssignPlanSheet.tsx` (template picker) with a passing unit spec `AssignPlanSheet.spec.tsx`; `MemberTrainingTab.tsx` renders the Assign / Reassign button (`onAssignPress`); `MemberDetailScreen.tsx` mounts the sheet overlay and wires `onAssigned`.

> The endpoint is `POST /training/members/:memberId/assign-plan`, **not** `POST /training/members/:memberId/plan` as the original request assumed. Do not add a second endpoint — reuse the existing one.

Because the implementation exists, Stages 1 and 2 are primarily **verification + one real gap fix** (Stage 2). The only substantially new artifact is the Detox spec in Stage 3.

## Scope
**In scope:**
- Verify the existing `POST /training/members/:memberId/assign-plan` endpoint meets the Sprint Contract (Stage 1).
- Verify the existing assignment UI (Assign/Reassign button → `AssignPlanSheet` → `assignPlan` API) and fix the post-assign refresh gap so the Log Session day buttons appear immediately after assigning (Stage 2).
- Add a Detox E2E spec covering assign-plan and change-plan golden paths plus the empty-templates edge case (Stage 3).
- Trainer scoping: trainer can only assign to their own members; owner can assign to any member (already enforced server-side — verify only).
- Template picker reuses `GET /plan-templates` via the existing `fetchTemplates()` / `training-templates.store`.

**Out of scope:**
- Session history list and progress chart in `MemberTrainingTab` / `MemberProgressTab` (already built — do not touch).
- Any nutrition-plan assignment (`AssignNutritionPlanSheet`).
- Creating/editing plan templates (`training-templates` screens).
- The member-facing `GET /training/my-plan` flow.
- Renaming or adding backend routes.

## Affected Files

**Stage 1 (verify only — no edits expected):**
- `backend/src/modules/training/training.controller.ts`
- `backend/src/modules/training/training.service.ts`
- `backend/src/modules/training/dto/assign-plan.dto.ts`
- `backend/test/training.e2e-spec.ts`

**Stage 2 (verify + one fix):**
- `mobile/src/screens/members/tabs/MemberTrainingTab.tsx` — fix: re-render Log Session days when `activePlan` prop changes after assignment
- `mobile/src/screens/members/AssignPlanSheet.tsx` (verify)
- `mobile/src/screens/members/AssignPlanSheet.spec.tsx` (verify; extend if a new criterion needs it)
- `mobile/src/screens/members/MemberDetailScreen.tsx` (verify wiring; may pass a refreshed plan down)
- `mobile/src/lib/api/training.api.ts` (verify `assignPlan`)
- `mobile/src/stores/training.store.ts` (verify; add an `assignMemberPlan` action only if Stage 2's fix needs store-level state)
- `mobile/src/screens/members/tabs/MemberTrainingTab.spec.tsx` (create if absent — covers the refresh fix)

**Stage 3 (new):**
- `mobile/e2e/trainer/assign-plan.spec.ts` — new Detox spec

---

## Stage 1: Backend — assign-plan endpoint (verification)

**Goal**: Confirm `POST /training/members/:memberId/assign-plan` fully satisfies the contract below against the real NestJS + Mongo-memory stack. No code changes expected; if any criterion fails, fix the endpoint.

**Sprint Contract**:

*Unit tests (one per service behaviour — in `training.service.spec.ts` or proven via integration):*
- [ ] `TrainingService > assignPlan > creates a MemberPlan copying template name and days, isActive true`
- [ ] `TrainingService > assignPlan > deactivates any pre-existing active plan for the member before creating the new one`
- [ ] `TrainingService > assignPlan > throws NotFoundException when templateId does not exist`
- [ ] `TrainingService > assignPlan > throws NotFoundException when caller is a trainer and the member is not assigned to that trainer`
- [ ] `TrainingService > assignPlan > throws NotFoundException when the template is not owned by the caller`

*Integration (per endpoint behaviour — in `training.e2e-spec.ts`):*
- [ ] `POST /training/members/:memberId/assign-plan` with member token → 401/403 (members cannot assign)
- [ ] `POST /training/members/:memberId/assign-plan` with owner token + valid templateId → 201 and body has `name` + non-empty `days[]`
- [ ] `POST /training/members/:memberId/assign-plan` with missing/invalid `templateId` → 400
- [ ] `POST /training/members/:memberId/assign-plan` where trainer does not own the member → 404
- [ ] After a successful assign, `GET /training/members/:memberId/plan` (assigned trainer) → 200 returns the newly assigned plan name

**TDD sequence**:
1. Run `cd backend && pnpm test:e2e -- --testPathPattern=training` → confirm all the above are Green.
2. If any are missing or red, add the failing test, then make minimal code change to pass.
3. Re-run full backend suite → no regressions.

**Status**: Not Started

---

## Stage 2: Mobile — assignment UI, store action, API client

**Goal**: From a member's Training tab, an owner/trainer with no plan sees an "Assign" action and with an existing plan sees "Reassign"; both open `AssignPlanSheet`, which lists templates from `GET /plan-templates`; tapping a template calls `assignPlan(memberId, templateId)`, closes the sheet, updates the displayed Active Plan, and makes the Log Session day buttons appear immediately (the refresh fix).

**Known gap to fix**: `MemberTrainingTab` reads Log Session days from its internal `memberPlan` state, populated only by the initial `fetchMemberPlan` effect. After assignment, `MemberDetailScreen` updates the `activePlan` prop but the internal state is stale, so day buttons do not appear until remount. Fix so the tab reflects the freshly assigned plan (e.g. derive Log Session days from the `activePlan` prop, or re-sync internal state when `activePlan` changes). Keep the change surgical.

**Sprint Contract**:

*Unit tests (RNTL — `AssignPlanSheet.spec.tsx`, `MemberTrainingTab.spec.tsx`):*
- [ ] `AssignPlanSheet > renders one template-result-{name} row per template returned by the store`
- [ ] `AssignPlanSheet > tapping a template row calls assignPlan(memberId, templateId), then onAssigned(plan), then onClose`
- [ ] `AssignPlanSheet > renders the empty-state message when the templates list is empty`
- [ ] `MemberTrainingTab > renders the Assign button (bg-primary) when activePlan is null`
- [ ] `MemberTrainingTab > renders the Reassign button when activePlan is non-null and shows the plan name`
- [ ] `MemberTrainingTab > when activePlan prop changes to a plan with days, Log Session day buttons (log-session-day-N) become visible without remount`

*Integration / E2E (deferred full simulator run to Stage 3 — these assert component-level flow):*
- [ ] Tapping the Active Plan "Assign" button calls the `onAssignPress` prop → MemberDetailScreen sets the sheet visible (assert via MemberDetailScreen render or prop spy)
- [ ] After `onAssigned(plan)` fires, the Active Plan row shows the assigned plan name and a "Reassign" affordance

**TDD sequence**:
1. Write the failing `MemberTrainingTab` refresh test (day buttons appear when `activePlan` prop updates) → Red.
2. Apply the minimal `MemberTrainingTab` fix → Green.
3. Confirm existing `AssignPlanSheet.spec.tsx` criteria pass; add the empty-state test if missing.
4. `cd mobile && pnpm test` → all green, then `/simplify`.

**Status**: Not Started

---

## Stage 3: E2E — Detox spec for plan assignment

**Goal**: A Detox spec runs on a booted iOS simulator against the real backend and proves a trainer can assign a plan to their member end-to-end, change it, and that the picker handles the no-templates case.

**Seeding pattern** (mirror `mobile/e2e/trainer/trainer-log.spec.ts`): seed a trainer with `POST /auth/dev/seed-user-role` (`role: 'trainer', seedMembers: true`) → member email is `seed-members-member-for-{TRAINER_EMAIL}`. Log in as the trainer, create one or two templates via `POST /plan-templates` with the trainer token. Do **not** pre-seed `/training/dev/seed` for the golden path — the member must start with no plan so the "Assign" path is exercised.

**Sprint Contract**:

*E2E (Detox — `mobile/e2e/trainer/assign-plan.spec.ts`):*
- [ ] Trainer logs in → Members → member card → Training tab → with no plan, the Active Plan row shows "No plan assigned" and the Assign button (`assign-plan-button`) is visible.
- [ ] Tapping `assign-plan-button` → `assign-plan-sheet` becomes visible and lists `template-result-{name}` rows for the trainer's templates.
- [ ] Tapping a `template-result-{name}` row → sheet closes, Active Plan row shows the assigned plan name, and `log-session-day-1` becomes visible (proves the Stage 2 refresh fix).
- [ ] After a plan is assigned, the Active Plan row shows a "Reassign" affordance; tapping it reopens `assign-plan-sheet`; tapping a different template updates the Active Plan name to the second template.
- [ ] Edge case: a trainer whose account has **no** templates opens the sheet → the empty-state message "No training templates available." is visible and no `template-result-` row exists.

**TDD sequence**:
1. Write the Detox spec following the trainer-log seeding helpers and testIDs (`assign-plan-button`, `assign-plan-sheet`, `template-result-{name}`, `log-session-day-1`).
2. `cd mobile && pnpm detox build --configuration ios.sim.debug` then `pnpm detox test --configuration ios.sim.debug --testPathPattern=trainer/assign-plan` against a running `backend` in dev mode.
3. Add any missing testIDs to components only as required by the spec; re-run.

**Status**: Not Started

---

## Architectural risks / notes
- **Endpoint name mismatch**: request assumed `POST .../plan`; actual is `POST .../assign-plan`. Reuse the existing route.
- **Feature largely pre-built**: the bulk of effort is verification. The one genuine code gap is the `MemberTrainingTab` post-assign refresh (Stage 2). Do not rebuild working components.
- **Detox simulator dependency**: Stage 3 needs a booted iOS sim + backend dev-seed endpoints; cannot run in a headless unit-test environment. Verify `pnpm detox` config names in `mobile/package.json` before assuming `ios.sim.debug`.
