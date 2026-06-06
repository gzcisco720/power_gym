# Member Check-ins Tab (Mobile) Implementation Plan

## Goal
A Trainer or Owner opens a member's detail screen, taps the "Check-ins" tab, sees that member's check-in history, and taps any entry to open the existing read-only check-in detail screen.

## Application
cross-app — `backend/` (Sprint 2 Stage 1) and `mobile/` (Stages 2–3)

## Design Spec
`.superpowers/specs/2026-06-06-mobile-phase2-design.md` — "Sprint 2 — Member Check-ins Tab"

## Scope

**In scope:**
- Backend: two new guarded read endpoints in the existing `check-ins` module — list a member's check-ins and fetch one by id, scoped (trainer → own members only; owner → any member).
- Mobile: a new `MemberCheckInsTab` rendered inside `MemberDetailScreen` after the Health tab.
- Mobile: data layer to fetch a member's check-ins (API client function + store state), wired into the existing `MembersStore.fetchMemberDetail` aggregate.
- Mobile: tapping a check-in navigates to the **existing** `CheckInDetail` stack screen, passing the full check-in object.
- E2E: Detox specs — trainer views a seeded member's check-ins and opens a detail.

**Out of scope:**
- Any change to `CheckInDetailScreen` (reused as-is, read-only).
- Trainer/owner ability to create, edit, or delete a member's check-in (read-only only).
- Member-facing check-in flow (already shipped — `CheckInScreen`, `CheckInFormScreen`).
- Dev seed endpoint changes — `auth.dev.controller.ts` already seeds one check-in per seeded member.
- Sprints 1, 3, 4 of the Phase 2 spec.

## Affected Files

### Stage 1 — Backend
Create:
- `backend/test/check-ins-members.e2e-spec.ts` — integration tests for the two new endpoints (new file to keep member-scoped tests isolated; existing `check-ins.e2e-spec.ts` covers the member-facing endpoints).

Modify:
- `backend/src/modules/check-ins/check-ins.controller.ts` — add `GET members/:memberId` and `GET members/:memberId/:id`, both `@Roles('owner', 'trainer')`.
- `backend/src/modules/check-ins/check-ins.service.ts` — add `findByMemberScoped(memberId, requesterId, requesterRole)` and `findOneByMemberScoped(memberId, checkInId, requesterId, requesterRole)`; add private `resolveAndScopeMember` helper mirroring `MembersService` (the service already injects `userModel`).
- `backend/src/modules/check-ins/check-ins.controller.spec.ts` — add unit tests for the two new controller methods (arg pass-through).
- `backend/src/modules/check-ins/check-ins.service.spec.ts` — add unit tests for the two new service methods (scoping + not-found).

### Stage 2 — Mobile
Create:
- `mobile/src/screens/members/tabs/MemberCheckInsTab.tsx` — new tab component.
- `mobile/src/screens/members/tabs/MemberCheckInsTab.spec.tsx` — unit tests.

Modify:
- `mobile/src/types/check-ins.ts` — no new type needed (reuse existing `CheckIn`); confirm shape matches backend response. (No edit expected; listed only if a field gap surfaces.)
- `mobile/src/lib/api/members.api.ts` — add `fetchMemberCheckIns(id)` calling `GET /check-ins/members/:id`.
- `mobile/src/stores/members.store.ts` — add `checkIns: CheckIn[]` to `MemberDetail`; include `fetchMemberCheckIns(id)` in the `Promise.all` inside `fetchMemberDetail`.
- `mobile/src/stores/members.store.spec.ts` — add/extend store unit test (create if absent).
- `mobile/src/screens/members/MemberDetailScreen.tsx` — add `'checkins'` to `TabId`, a `Check-ins` tab entry after `health`, and render `MemberCheckInsTab` with `detail.checkIns` + an `onPressCheckIn` that navigates to `CheckInDetail`.

### Stage 3 — E2E
Create:
- `mobile/e2e/trainer/member-check-ins.spec.ts` — Detox golden path + edge case.

## Stage 1: Backend — member-scoped check-in read endpoints

**Goal**: `GET /check-ins/members/:memberId` returns a member's check-ins (sorted newest first) and `GET /check-ins/members/:memberId/:id` returns one check-in, both guarded `@Roles('owner', 'trainer')` and scoped so a trainer can only read their own members and an owner can read any member. Failures (missing member, wrong trainer, missing check-in, check-in not belonging to that member) all return 404 to avoid leaking existence.

**Implementation notes**:
- The controller is currently class-level `@Roles('member')`. Move the role decorator to per-method: keep `@Roles('member')` on `findAll`, `create`, `getUploadSignature`; add `@Roles('owner', 'trainer')` on the two new methods. Verify the existing member-facing endpoints still pass (`check-ins.e2e-spec.ts`).
- Reuse the proven scoping logic from `MembersService.resolveAndScopeMember`: resolve member by id, require `role === 'member'`, and for trainers require `member.trainerId === requesterId`; throw `NotFoundException` for every failure.
- `findOneByMemberScoped` must also 404 when the check-in exists but its `memberId` does not match the path `memberId`.

**Sprint Contract**:

*Unit tests (one per new or changed function/method):*
- [ ] `CheckInsService > findByMemberScoped > returns member's check-ins sorted by submittedAt desc when owner requests`
- [ ] `CheckInsService > findByMemberScoped > throws NotFoundException when trainer requests a member not assigned to them`
- [ ] `CheckInsService > findOneByMemberScoped > returns the check-in when it belongs to the scoped member`
- [ ] `CheckInsService > findOneByMemberScoped > throws NotFoundException when the check-in's memberId does not match the path memberId`
- [ ] `CheckInsController > findMemberCheckIns > passes memberId, req.user.sub, req.user.role to the service`
- [ ] `CheckInsController > findMemberCheckIn > passes memberId, id, req.user.sub, req.user.role to the service`

*Integration tests (one per endpoint / scoping rule):*
- [ ] `GET /check-ins/members/:memberId` as owner → 200, array of that member's check-ins (length ≥ 1 from seeded data), each item has `sleepQuality`, `energy`, `stress`, `submittedAt`
- [ ] `GET /check-ins/members/:memberId` as the member's own trainer → 200 with the member's check-ins
- [ ] `GET /check-ins/members/:memberId` as a different trainer (member not theirs) → 404
- [ ] `GET /check-ins/members/:memberId` with `member`-role token → 403 (RolesGuard)
- [ ] `GET /check-ins/members/:memberId` with no token → 401
- [ ] `GET /check-ins/members/:memberId/:id` as owner with a valid id → 200 with the matching check-in `_id`
- [ ] `GET /check-ins/members/:memberId/:id` as owner with an id that belongs to a different member → 404
- [ ] Regression: existing `GET /check-ins` (member-facing) still returns 200 for a member token

**TDD sequence**:
1. Write failing service + controller unit tests → Red
2. Implement service methods + scoping helper and controller routes (move `@Roles` to per-method) → Green
3. Write `check-ins-members.e2e-spec.ts` covering every criterion above → run against in-memory Mongo → passes
4. Run full `cd backend && pnpm test` to confirm no regression in `check-ins.e2e-spec.ts`

**Status**: Complete

## Stage 2: Mobile — MemberCheckInsTab + data layer + navigation

**Goal**: A new "Check-ins" tab appears in `MemberDetailScreen` after "Health". It lists the member's check-ins as cards (date + a wellness summary of sleep/energy/stress) using data loaded by the existing `fetchMemberDetail` aggregate. Loading shows skeleton rows; no data shows an empty state. Tapping a card navigates to the existing `CheckInDetail` screen with the full check-in object.

**Implementation notes**:
- Extend `MemberDetail` in `members.store.ts` with `checkIns: CheckIn[]`; add `fetchMemberCheckIns(id)` to the existing `Promise.all` in `fetchMemberDetail` so the tab data loads with the rest of the detail (consistent with body-tests/injuries pattern — no separate loading flag needed).
- Add `fetchMemberCheckIns(id)` to `members.api.ts` hitting `GET /check-ins/members/:id`.
- `MemberCheckInsTab` is presentational: receives `checkIns: CheckIn[]` and `onPressCheckIn: (c: CheckIn) => void` as props (mirror `MemberBodyTestsTab`). Card layout follows the `CheckInScreen` history row pattern: `flex-row items-center justify-between`, date on the left, wellness summary on the right; `testID={`member-checkin-item-${checkIn._id}`}`, `accessibilityRole="button"`.
- Wellness summary: render sleep/energy/stress as compact labelled values (e.g. `S 7 · E 6 · St 4`), using `text-foreground/65` for labels and `text-primary-light` for values — never `text-muted-foreground`, never hardcoded hex.
- In `MemberDetailScreen`: add `'checkins'` to `TabId`, insert the tab entry `{ id: 'checkins', label: 'Check-ins', testID: 'member-detail-tab-checkins' }` immediately after the `health` entry, and render `<MemberCheckInsTab checkIns={detail.checkIns} onPressCheckIn={(c) => navigation.navigate('CheckInDetail', { checkIn: c })} />` in the conditional block.
- Confirm the mobile `CheckIn` type matches the backend response (the backend returns Mongoose docs with `_id`, `submittedAt`, wellness fields). No type change anticipated.

**Sprint Contract**:

*Unit tests (one per new or changed function/method):*
- [ ] `MemberCheckInsTab > renders a member-checkin-item-{id} row for each check-in in props`
- [ ] `MemberCheckInsTab > shows the empty-state text when checkIns is an empty array`
- [ ] `MemberCheckInsTab > calls onPressCheckIn with the tapped check-in object`
- [ ] `MembersStore > fetchMemberDetail > populates selectedMembers[id].checkIns from fetchMemberCheckIns`

*E2E (Detox) — covered fully in Stage 3; Stage 2 lists the user-facing flows it must enable:*
- [ ] Trainer on a member's detail screen taps the "Check-ins" tab → the member's check-in list renders (at least one `member-checkin-item-*` row)
- [ ] Trainer taps a check-in row → `screen-CheckInDetail` becomes visible

**TDD sequence**:
1. Write failing `MemberCheckInsTab.spec.tsx` + store test → Red
2. Add api function, extend store, implement `MemberCheckInsTab`, wire the tab into `MemberDetailScreen` → Green
3. Run `cd mobile && pnpm test` for the changed files
4. Run `/simplify` (mobile), then `cd mobile && pnpm lint`

**Status**: Complete

## Stage 3: E2E — Detox trainer flow

**Goal**: A Detox spec proves, against a real simulator and backend, that a trainer can open their seeded member, switch to the Check-ins tab, see the seeded check-in, and open its detail.

**Implementation notes**:
- Follow `mobile/e2e/trainer/members.spec.ts` exactly for setup: seed a trainer via `POST /auth/dev/seed-user-role` with `seedMembers: true` (this already creates one check-in for the member — no backend change needed), log in, open drawer → Members, open the member card → `screen-MemberDetail`.
- Use `disableSynchronization`, `waitFor(...).withTimeout(...)`, and regex testID matchers consistent with the existing spec.
- Golden path: tap `member-detail-tab-checkins`, wait for a `member-checkin-item-*` row, tap it, assert `screen-CheckInDetail` is visible.
- Edge case: a member with no check-ins shows the empty state. If the dev seed always creates a check-in, instead assert the negative-access edge already covered by the backend (Stage 1 404) is not reachable from the UI — i.e. cover the empty state by asserting the empty-state text renders for a member seeded without a check-in, OR (if seeding an empty member is impractical) assert that switching back to another tab and returning re-shows the list without error. Pick the empty-state assertion if a no-checkin member can be seeded; otherwise document the substitution in the spec header.

**Sprint Contract**:

*E2E (Detox) criteria:*
- [ ] `Trainer: Member Check-ins` golden path — login as seeded trainer → Members → open member → tap `member-detail-tab-checkins` → a `member-checkin-item-*` row is visible
- [ ] golden path continued — tap the check-in row → `screen-CheckInDetail` is visible
- [ ] edge case — the Check-ins tab renders its empty-state text for a member with no check-ins (or the documented substitution if a no-checkin member cannot be seeded)

**TDD sequence**:
1. Write the Detox spec
2. `cd mobile && pnpm detox build --configuration <config>`
3. `cd mobile && pnpm detox test --configuration <config> --testPathPattern=trainer/member-check-ins` → passes against the real simulator + backend

**Status**: Not Started

## Architectural Notes / Risks
- **Controller role decorator move**: turning the class-level `@Roles('member')` into per-method decorators is the one change that can silently break the existing member-facing endpoints. The Stage 1 regression criterion (`GET /check-ins` still 200 for a member) guards this.
- **Scoping duplication**: `resolveAndScopeMember` logic is duplicated from `MembersService` rather than extracted to a shared util, to keep the change surgical and avoid a cross-module refactor. If a third consumer appears, extract then — not now.
- **Eager load vs separate fetch**: the tab piggybacks on `fetchMemberDetail`'s `Promise.all`. This adds one request to the aggregate but keeps the tab presentational and matches the existing body-tests/injuries pattern. The `MemberTrainingTab` self-fetch pattern was deliberately not copied — check-in data is small and benefits from loading with the rest of the detail.
- **No CheckInDetailScreen change**: it already guards `if (!checkIn) return null` and reads everything from route params, so trainer/owner reuse is safe with zero edits.
