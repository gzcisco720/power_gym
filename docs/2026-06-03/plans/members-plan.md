# Members (Mobile, Phase 3) Implementation Plan

## Goal
An Owner or Trainer can open the Members screen, search their member list, and tap into a member detail screen with Overview / Body Tests / Health tabs.

## Application
cross-app — `backend/` (new `members` module) + `mobile/` (new data layer, screens, navigation, Detox E2E). No `web/` changes.

## Scope

**In scope:**
- Backend `members` module exposing five read-only endpoints, all guarded by JWT + Roles (`owner`, `trainer`) and scoped:
  - Owner sees ALL members; Trainer sees only members where `trainerId === req.user.sub`.
  - `GET /members` — list with `id, name, email, trainerId, trainerName`
  - `GET /members/:id/overview` — `{ joinedAt, lastBodyTestDate, lastCheckinDate }` (each nullable)
  - `GET /members/:id/body-tests` — member's body tests, sorted `date` desc
  - `GET /members/:id/injuries` — member's `active` injuries
  - `GET /members/:id/medications` — member's `active` medications
  - Per-member scoping enforced on the `:id` endpoints: a Trainer requesting a member that is not theirs gets 404; a member id that does not resolve to a `member` role gets 404.
- Mobile data layer: `members` types, `members.api.ts`, `members.store.ts` (Zustand).
- Mobile `MembersScreen` (replaces the placeholder): role-aware list, avatar initials, name, email, trainer assignment, debounced name search.
- Mobile `MemberDetailScreen` (new stack screen in `AppStackParamList`): header (name, email, role badge, trainer name) + three tabs:
  1. Overview — join date, last body test date, last check-in date; quick-link cards that navigate to the already-built `BodyTests`, `CheckIn`, `MyHealth` drawer screens.
  2. Body Tests — read-only list of the member's body tests (reuses `BodyTest` type and the existing `BodyTestCard`; tapping opens the existing `BodyTestDetail` stack screen).
  3. Health — read-only summary of the member's active injuries + active medications.
- A dev-only seed flag (`seedMembers`) on the existing `POST /auth/dev/seed-user-role` endpoint so the Detox spec can deterministically seed an owner/trainer with one named member that has a body test, an active injury, an active medication, and a check-in.

**Out of scope:**
- Any create / edit / delete of members, body tests, injuries, medications from these screens (read-only throughout).
- Member-role access to these screens (Members is an Owner/Trainer feature only; the member's own equivalents already exist as `MyBodyTests` / `MyHealth` / `CheckIn`).
- Pagination / infinite scroll (list is filtered client-side).
- Avatar image upload — initials only.
- Web (`web/`) changes — the web member detail already exists and is reference-only.
- New nutrition or training tabs on the detail screen.

## Affected Files

**`backend/` — create:**
- `backend/src/modules/members/members.module.ts`
- `backend/src/modules/members/members.controller.ts`
- `backend/src/modules/members/members.controller.spec.ts`
- `backend/src/modules/members/members.service.ts`
- `backend/src/modules/members/members.service.spec.ts`
- `backend/test/members.e2e-spec.ts`

**`backend/` — modify:**
- `backend/src/app.module.ts` — register `MembersModule`
- `backend/src/modules/auth/auth.dev.controller.ts` — add `seedMembers` handling (dev only)
- `backend/src/modules/auth/dto/seed-user-role.dto.ts` — add optional `seedMembers?: boolean`

**`mobile/` — create:**
- `mobile/src/types/members.ts`
- `mobile/src/lib/api/members.api.ts`
- `mobile/src/stores/members.store.ts`
- `mobile/src/stores/members.store.spec.ts`
- `mobile/src/screens/members/MembersScreen.tsx`
- `mobile/src/screens/members/MemberDetailScreen.tsx`
- `mobile/src/screens/members/components/MemberCard.tsx`
- `mobile/src/screens/members/components/MemberOverviewTab.tsx`
- `mobile/src/screens/members/components/MemberBodyTestsTab.tsx`
- `mobile/src/screens/members/components/MemberHealthTab.tsx`
- `mobile/e2e/owner/members.spec.ts`
- `mobile/e2e/trainer/members.spec.ts`

**`mobile/` — modify:**
- `mobile/src/navigation/index.tsx` — add `MemberDetail` to `AppStackParamList`, register the screen, swap `MembersScreen` import from `placeholders` to the real screen in `SCREEN_REGISTRY`
- `mobile/src/screens/placeholders/index.tsx` (or the placeholders barrel) — remove the `MembersScreen` placeholder export

## Reuse Notes (read before implementing)
- Backend scoping pattern mirrors `body-tests.service.ts` / `health.service.ts`: inject `User` + the relevant Mongoose model, use `new Types.ObjectId(id)`, throw `NotFoundException` for both "not found" and "not yours" (do not leak existence).
- `User.name` is a Mongoose virtual (`firstName + ' ' + lastName`) and requires `toJSON: { virtuals: true }` (already set on the schema). The service returns plain objects, so build `name`/`trainerName` explicitly rather than relying on the virtual after `.lean()`.
- Controller guard pattern: `@UseGuards(JwtAuthGuard, RolesGuard)` at class level, `@Roles('owner', 'trainer')` — copy from `body-tests.controller.ts`. `req.user` is `JwtUser` (`sub`, `role`, `trainerId`).
- Mobile data-layer trio mirrors `body-tests`: `api` uses `apiClient`; store is a Zustand `create` with `{ items/data, loading, error, fetch...() }`. Match `body-tests.store.ts` shape.
- `MemberBodyTestsTab` reuses the existing `BodyTestCard` (`mobile/src/screens/body-test-shared/components/BodyTestCard.tsx`) and navigates to the existing `BodyTestDetail` stack screen — do not build a new card.
- Detail screen tabs follow the existing in-app tab-bar pattern used elsewhere in mobile (segmented control of `Pressable`s switching local state) — do not introduce a new bottom Tab navigator.
- Detox seeding/login pattern is identical to `mobile/e2e/owner/body-tests.spec.ts`: seed via `POST /auth/dev/seed-user-role`, fresh email per run, log in, open drawer, tap `drawer-item-Members`.

---

## Stage 1: Backend members module

**Goal**: Five guarded, role-scoped read endpoints under `/members`, plus a dev-only `seedMembers` flag, all covered by unit + integration tests.

**Sprint Contract**:

*Unit tests (one per service method / guard scenario):*
- [ ] `MembersService > listMembers > owner role returns all members with name and resolved trainerName (null when unassigned)`
- [ ] `MembersService > listMembers > trainer role returns only members whose trainerId equals the trainer's id`
- [ ] `MembersService > getOverview > returns joinedAt from member.createdAt, latest body-test date, and latest check-in submittedAt (each null when none exist)`
- [ ] `MembersService > getOverview > throws NotFoundException when the id is not a member-role user`
- [ ] `MembersService > getOverview > throws NotFoundException when a trainer requests a member not assigned to them`
- [ ] `MembersService > getBodyTests > returns the member's body tests sorted by date desc, scoped to the requesting trainer`
- [ ] `MembersService > getInjuries > returns only active injuries for the member`
- [ ] `MembersService > getMedications > returns only active medications for the member`
- [ ] `MembersController > every endpoint delegates to the service with req.user.sub, req.user.role, and req.user.trainerId`

*Integration / E2E (one per endpoint + guard):*
- [ ] `GET /members` as owner → 200, array includes a member object with `id`, `name`, `email`, `trainerId`, `trainerName`
- [ ] `GET /members` as trainer → 200, array contains only that trainer's members (a member owned by a different trainer is absent)
- [ ] `GET /members` with no token → 401; `GET /members` as a member-role user → 403
- [ ] `GET /members/:id/overview` as owner → 200 with `{ joinedAt, lastBodyTestDate, lastCheckinDate }` shape
- [ ] `GET /members/:id/overview` as trainer for a member NOT theirs → 404
- [ ] `GET /members/:id/body-tests` as owner → 200 array of the member's body tests sorted date desc
- [ ] `GET /members/:id/injuries` as owner → 200 array of only the member's `active` injuries (a `resolved` injury is absent)
- [ ] `GET /members/:id/medications` as owner → 200 array of only the member's `active` medications (an `ended` medication is absent)

**TDD sequence**:
1. Write `members.service.spec.ts` against a real `MongoMemoryServer`/mocked models → Red
2. Implement `MembersService` (inject `User`, `BodyTest`, `CheckIn`, `MemberInjury`, `MemberMedication` models) → Green
3. Write `members.controller.spec.ts` with a mocked service → Red → implement controller → Green
4. Write `members.e2e-spec.ts` (build app like `body-tests.e2e-spec.ts`, seed owner/trainer/member docs) covering all endpoints + 401/403/404 → passes against the real Nest stack
5. Register `MembersModule` in `app.module.ts`; add `seedMembers` to the dev controller + DTO (the seed creates one member assigned to the seeded owner/trainer, with one body test, one active injury, one active medication, one check-in)
6. `/simplify`, then `cd backend && pnpm test && pnpm test:e2e && pnpm lint && pnpm build`

**Status**: In Progress

### Stage 1 Checkpoint
- [x] members.service.spec.ts (unit tests — Red)
- [x] MembersService implementation (Green)
- [x] members.controller.spec.ts (unit tests — Red → Green)
- [x] members.e2e-spec.ts (integration tests — Red → Green)
- [x] Register MembersModule in app.module.ts
- [x] Add seedMembers to dev controller + DTO

---

## Stage 2: Mobile data layer

**Goal**: Types, API functions, and a Zustand store that load the member list and a single member's overview / body tests / injuries / medications, with loading and error state.

**Sprint Contract**:

*Unit tests (one per store action):*
- [ ] `useMembersStore > fetchMembers > populates members and sets loading false on success`
- [ ] `useMembersStore > fetchMembers > sets error message and loading false when the api rejects`
- [ ] `useMembersStore > fetchMemberDetail > populates overview, bodyTests, injuries, and medications for the given member id on success`
- [ ] `useMembersStore > fetchMemberDetail > sets detailError and detailLoading false when the api rejects`
- [ ] `useMembersStore > filteredMembers (or selector) > returns only members whose name matches the search query case-insensitively`

*Integration criteria (api ↔ store, no UI):*
- [ ] `members.api > fetchMembers > calls GET /members and returns the typed Member[]` (assert via mocked `apiClient`)
- [ ] `members.api > fetchMemberDetail helpers > call GET /members/:id/overview, /body-tests, /injuries, /medications with the correct id`

**TDD sequence**:
1. Define `mobile/src/types/members.ts` (`Member`, `MemberOverview`; reuse `BodyTest` from `types/body-tests`, `Injury`/`Medication` from `types/health`)
2. Write `members.store.spec.ts` mocking `members.api` → Red
3. Implement `members.api.ts` (thin `apiClient` wrappers) and `members.store.ts` (mirror `body-tests.store.ts`; add detail slice + search query) → Green
4. `/simplify`, then `cd mobile && pnpm test && pnpm lint`

**Status**: Not Started

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: A working `MembersScreen` list and `MemberDetailScreen` (3 tabs) wired into navigation, verified on a real simulator for both Owner and Trainer.

Functional units (5 — within the 8 limit): `MembersScreen`, `MemberDetailScreen`, `MemberOverviewTab`, `MemberBodyTestsTab`, `MemberHealthTab`.

**Sprint Contract**:

*Unit tests (RNTL, one per component behavior):*
- [ ] `MembersScreen > renders a MemberCard per member with initials, name, email, and trainer assignment`
- [ ] `MembersScreen > typing in the search input filters the rendered cards by name (debounced)`
- [ ] `MembersScreen > tapping a MemberCard navigates to MemberDetail with the member's id`
- [ ] `MemberDetailScreen > renders header with member name, email, role badge, and trainer name`
- [ ] `MemberDetailScreen > Overview tab shows join date, last body test date, last check-in date and three quick-link cards`
- [ ] `MemberBodyTestsTab > renders a BodyTestCard per body test and shows the empty state when none`
- [ ] `MemberHealthTab > renders active injuries and active medications sections (with empty states)`

*Detox E2E (real simulator — golden path + edge, per role):*
- [ ] `owner/members.spec.ts` golden path: log in as seeded owner → open drawer → tap Members → seeded member card visible → tap card → MemberDetail visible with header name → Overview tab shows last-body-test date → switch to Body Tests tab → a `body-test-card-*` is visible → switch to Health tab → seeded injury title and medication name are visible
- [ ] `owner/members.spec.ts` edge: typing a non-matching string in search → the seeded member card is no longer visible; clearing search → card visible again
- [ ] `trainer/members.spec.ts` golden path: log in as seeded trainer → Members list shows only the trainer's own seeded member → open detail → Health tab shows the member's active medication
- [ ] `trainer/members.spec.ts` access edge: the Members list does NOT contain a member belonging to a different trainer (seed two trainers, assert isolation)

**TDD sequence**:
1. Write RNTL component specs (mock the store) → Red
2. Build `MemberCard`, `MembersScreen`, the three tab components, and `MemberDetailScreen` (testIDs: `screen-Members`, `member-card-<id>`, `members-search-input`, `screen-MemberDetail`, `member-detail-tab-overview|bodytests|health`) → Green
3. Wire navigation: add `MemberDetail: { memberId: string }` to `AppStackParamList`, register the screen in `AppNavigator`, point `SCREEN_REGISTRY.Members` at the real `MembersScreen`, remove the placeholder export → Green
4. Run `design-reviewer` against `mobile/src/screens/members/` and fix violations (tokens, `text-foreground/65`, density, accessibilityLabels, skeleton loading, no `Alert.alert`)
5. Write `owner/members.spec.ts` and `trainer/members.spec.ts`; seed via `POST /auth/dev/seed-user-role` with `seedMembers: true`; run `cd mobile && pnpm detox build` + `pnpm detox test --testPathPattern=members` against a booted simulator + running backend
6. `/simplify`, then `cd mobile && pnpm test && pnpm lint`

**Status**: Not Started
