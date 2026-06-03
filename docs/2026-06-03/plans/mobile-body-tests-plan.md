# Mobile Body Tests Implementation Plan

## Goal
An Owner can record and view their own body composition tests (with live body-fat calculation) and a Member can view their own body test history read-only, all from the mobile app backed by a new `/body-tests` API.

## Application
cross-app — `backend/` (new body-tests NestJS module) + `mobile/` (types, formulas, API, store, 4 screens, navigation, Detox E2E)

## Design Spec
`.superpowers/specs/2026-06-03-mobile-body-tests-design.md`

## Scope

**In scope:**
- Backend `body-tests` module: 3 endpoints — `GET /body-tests/me` (Member + Owner), `POST /body-tests` (Owner only), `DELETE /body-tests/:id` (Owner only)
- Backend body-fat formula port (Jackson-Pollock 3/7-site, Parrillo 9-site, manual) with server-side body composition calculation
- Mobile types, client-side preview formula lib (identical results to backend), Axios API layer, Zustand store
- Four mobile screens: `MyBodyTestsScreen` (Owner), `BodyTestsScreen` (Member), `AddBodyTestScreen` (Owner), `BodyTestDetailScreen` (shared)
- Shared components: `BodyTestCard`, `MeasurementsSection`, `LivePreview`
- Navigation wiring: `AddBodyTest` + `BodyTestDetail` stack screens; remove both body-test placeholders
- Detox E2E: Owner golden path (create → view → delete) + Member read-only path

**Out of scope:**
- Web app changes (web body-tests already exists; only the formula file is referenced as the porting source)
- Trainer role creating tests for members (this feature is Owner-self-testing only; `trainerId` is stored `null`)
- Editing an existing body test (no PATCH endpoint)
- Charts / trend visualisation of body fat over time
- The `body-test.model.ts` Mongoose model — it already exists in `backend/src/common/models/` and must NOT be recreated
- Any `DrawerParamList` / `nav-config.ts` changes (both list screens stay as existing Drawer routes)

## Affected Files

**Backend (Stage 1):**
- `backend/src/modules/body-tests/body-test-formulas.ts` (new — pure functions)
- `backend/src/modules/body-tests/body-test-formulas.spec.ts` (new — unit)
- `backend/src/modules/body-tests/dto/create-body-test.dto.ts` (new)
- `backend/src/modules/body-tests/body-tests.service.ts` (new)
- `backend/src/modules/body-tests/body-tests.service.spec.ts` (new — unit)
- `backend/src/modules/body-tests/body-tests.controller.ts` (new)
- `backend/src/modules/body-tests/body-tests.controller.spec.ts` (new — unit)
- `backend/src/modules/body-tests/body-tests.module.ts` (new)
- `backend/src/app.module.ts` (modify — register `BodyTestsModule`)
- `backend/test/body-tests.e2e-spec.ts` (new — integration)
- `backend/src/common/models/body-test.model.ts` (read-only reference — DO NOT recreate)

**Mobile (Stage 2):**
- `mobile/src/types/body-tests.ts` (new)
- `mobile/src/lib/body-test-formulas.ts` (new — client preview formulas)
- `mobile/src/lib/api/body-tests.api.ts` (new)
- `mobile/src/stores/body-tests.store.ts` (new)
- `mobile/__tests__/lib/body-test-formulas.test.ts` (new — unit; path follows project test convention)
- `mobile/__tests__/stores/body-tests.store.test.ts` (new — unit)
- `mobile/__tests__/lib/api/body-tests.api.test.ts` (new — unit)

**Mobile (Stage 3):**
- `mobile/src/screens/my-body-tests/MyBodyTestsScreen.tsx` (new)
- `mobile/src/screens/body-tests/BodyTestsScreen.tsx` (new)
- `mobile/src/screens/body-test-shared/AddBodyTestScreen.tsx` (new)
- `mobile/src/screens/body-test-shared/BodyTestDetailScreen.tsx` (new)
- `mobile/src/screens/body-test-shared/components/BodyTestCard.tsx` (new)
- `mobile/src/screens/body-test-shared/components/MeasurementsSection.tsx` (new)
- `mobile/src/screens/body-test-shared/components/LivePreview.tsx` (new)
- `mobile/src/screens/placeholders/index.ts` (modify — remove `MyBodyTestsScreen` + `BodyTestsScreen` exports)
- `mobile/src/navigation/index.tsx` (modify — import real screens, register `AddBodyTest` + `BodyTestDetail`, add to `AppStackParamList` + `SCREEN_REGISTRY`)
- `mobile/__tests__/screens/MyBodyTestsScreen.test.tsx` (new)
- `mobile/__tests__/screens/BodyTestsScreen.test.tsx` (new)
- `mobile/__tests__/screens/AddBodyTestScreen.test.tsx` (new)
- `mobile/__tests__/screens/BodyTestDetailScreen.test.tsx` (new)

**Mobile (Stage 4):**
- `mobile/e2e/owner/body-tests.spec.ts` (new)
- `mobile/e2e/member/body-tests.spec.ts` (new)

> Note on test file paths: Stages 2–3 use `mobile/__tests__/...`. If the existing mobile suite colocates tests next to source instead, the Generator must follow whichever convention is already in use — match the existing pattern, do not invent a new one.

---

## Stage 1: Backend — body-tests module

**Goal**: A working NestJS `body-tests` module with 3 role-guarded endpoints and server-side body-fat calculation, registered in `AppModule`, with all unit + integration tests passing.

**Key implementation notes:**
- Reuse the existing `BodyTest` model from `backend/src/common/models/body-test.model.ts`. Register it via `MongooseModule.forFeature` in `body-tests.module.ts`. Also register `User` model (needed for create — verify the requesting user exists, mirror `CheckInsService`).
- `body-test-formulas.ts` is a near-verbatim port of `web/src/lib/body-test/formulas.ts` (`calculateBodyFat(input)` discriminated-union + `calculateComposition(weightKg, bodyFatPct)`), PLUS a clamp step: final `bodyFatPct` is clamped to `min 1, max 60`. Apply the clamp inside the service (or a thin wrapper) so both the formula port and the clamp are independently testable.
- Controller: class-level `@UseGuards(JwtAuthGuard, RolesGuard)`. The GET handler uses method-level `@Roles('member', 'owner')`; POST and DELETE use method-level `@Roles('owner')`. The `RolesGuard` uses `getAllAndOverride([handler, class])`, so method-level decorators override the class — confirmed against `roles.guard.ts`.
- `POST /body-tests`: `memberId` stamped from `req.user.sub`; `trainerId` set to `null`; for protocols `3site/7site/9site` the service computes `bodyFatPct` (ignoring any client-sent `bodyFatPct`); for `other` it uses the client `bodyFatPct`. Always compute `fatMassKg` / `leanMassKg` server-side. `@HttpCode(HttpStatus.CREATED)`.
- `DELETE /body-tests/:id`: load by id, throw `NotFoundException` if missing OR if `memberId !== req.user.sub`. `@HttpCode(HttpStatus.NO_CONTENT)`.
- `CreateBodyTestDto`: validators exactly as the spec's DTO section (date `@IsDateString`, age `@IsInt @Min(1) @Max(120)`, sex `@IsEnum`, weight `@IsNumber @Min(1)`, protocol `@IsEnum`, all 9 skinfolds `@IsOptional @IsNumber @Min(0)`, bodyFatPct `@IsOptional @IsNumber @Min(1) @Max(60)`, targets `@IsOptional @IsNumber`).
- Add `BodyTestsModule` to `app.module.ts` imports. Add `BodyTestsModule` to the `buildApp` imports list inside `body-tests.e2e-spec.ts` (model the e2e harness on `check-ins.e2e-spec.ts`).

**Sprint Contract**:

*Unit tests:*
- [ ] `body-test-formulas > calculateBodyFat > 3site male (chest/abdominal/thigh) returns Siri-equation value matching the JP density formula for a known input`
- [ ] `body-test-formulas > calculateBodyFat > 3site female (tricep/suprailiac/thigh) returns the female-density Siri value for a known input`
- [ ] `body-test-formulas > calculateBodyFat > 7site male and female return their respective JP-7 density Siri values for a known input`
- [ ] `body-test-formulas > calculateBodyFat > 9site Parrillo returns sum*0.1051 + 2.585, identical for male and female with the same measurements`
- [ ] `body-test-formulas > calculateBodyFat > other returns the supplied bodyFatPct unchanged`
- [ ] `body-test-formulas > calculateComposition > returns fatMassKg = weight*(pct/100) and leanMassKg = weight - fatMassKg`
- [ ] `BodyTestsService > findByMember > queries with memberId ObjectId and sorts by date desc`
- [ ] `BodyTestsService > create > stamps memberId from sub, sets trainerId null, and persists calculated bodyFatPct/fatMassKg/leanMassKg for a 3site test (ignores any client-sent bodyFatPct)`
- [ ] `BodyTestsService > create > for protocol "other" persists the client-supplied bodyFatPct and clamps an out-of-range computed value to the [1,60] range`
- [ ] `BodyTestsService > remove > throws NotFoundException when the test does not exist or memberId !== requesting sub`
- [ ] `BodyTestsController > findMine > calls service.findByMember with req.user.sub`
- [ ] `BodyTestsController > create > calls service.create with dto and req.user.sub`

*Integration (`backend/test/body-tests.e2e-spec.ts`):*
- [ ] `GET /body-tests/me` with owner token → 200 array (owner sees own tests)
- [ ] `GET /body-tests/me` with member token → 200 array (member allowed)
- [ ] `GET /body-tests/me` with no token → 401
- [ ] `POST /body-tests` with owner token + valid 3site body → 201 with `_id`, numeric `bodyFatPct`, `fatMassKg`, `leanMassKg`, and `trainerId` null
- [ ] `POST /body-tests` with member token → 403
- [ ] `POST /body-tests` with owner token + age:200 (out of range) → 400
- [ ] `DELETE /body-tests/:id` with owner token on own test → 204, and a subsequent `GET /body-tests/me` no longer contains it
- [ ] `DELETE /body-tests/:id` with owner token on a test owned by another user → 404

**TDD sequence**:
1. Write `body-test-formulas.spec.ts` → Red → implement `body-test-formulas.ts` → Green
2. Write `body-tests.service.spec.ts` (mock models) → Red → implement service → Green
3. Write `body-tests.controller.spec.ts` → Red → implement controller + DTO + module, register in `app.module.ts` → Green
4. Write `body-tests.e2e-spec.ts` against Mongo-memory + real guards → passes
5. Run `cd backend && pnpm test && pnpm test:e2e && pnpm lint && pnpm build`

**Status**: Complete

### Stage 1 Checkpoint
- [x] `body-test-formulas.ts` + `body-test-formulas.spec.ts`
- [x] `body-tests.service.ts` + `body-tests.service.spec.ts`
- [x] `body-tests.controller.ts` + `body-tests.controller.spec.ts` + `dto/create-body-test.dto.ts` + `body-tests.module.ts`
- [x] `app.module.ts` — `BodyTestsModule` registered
- [x] `body-tests.e2e-spec.ts` — all 8 integration assertions passing

---

## Stage 2: Mobile — types, client formula, API, store

**Goal**: Mobile data layer for body tests — shared types, a client-side preview formula lib producing identical numbers to the backend, an Axios API module, and a Zustand store — all unit tested.

**Key implementation notes:**
- `types/body-tests.ts`: `Protocol`, `Sex`, `BodyTest`, `CreateBodyTestDto` exactly as the spec's Types section. Also export `PROTOCOL_LABELS` here (or a shared constants file) for reuse across screens.
- `lib/body-test-formulas.ts`: `calculateBodyFat(protocol, sex, age, measurements): number | null` returns `null` when any required site for the protocol is missing/NaN; `calculateComposition(weight, bodyFatPct)`. Must apply the same `[1,60]` clamp as the backend so the preview equals the stored value. Numbers must match the backend formula port bit-for-bit for the shared test vectors (use the same known inputs as Stage 1).
- `lib/api/body-tests.api.ts`: `fetchMyBodyTests()` → GET `/body-tests/me`; `createBodyTest(dto)` → POST `/body-tests`; `deleteBodyTest(id)` → DELETE `/body-tests/:id` (returns void). Model on `check-ins.api.ts` / `equipment.api.ts` using `apiClient`.
- `stores/body-tests.store.ts`: `{ items, loading, error, fetchMyBodyTests(), addItem(item) (prepend), removeItem(id) (filter by _id) }`. Model on `equipment.store.ts` (it already has `addItem`/`removeItem`).

**Sprint Contract**:

*Unit tests:*
- [ ] `body-test-formulas > calculateBodyFat > returns null when a required 3site site is missing`
- [ ] `body-test-formulas > calculateBodyFat > 3site/7site/9site/other for the shared test vectors return values equal to the backend formula outputs (clamped to [1,60])`
- [ ] `body-test-formulas > calculateComposition > returns matching fatMassKg/leanMassKg`
- [ ] `body-tests.api > fetchMyBodyTests > GETs /body-tests/me and returns response.data (apiClient mocked)`
- [ ] `body-tests.api > createBodyTest > POSTs dto to /body-tests and returns created BodyTest (apiClient mocked)`
- [ ] `body-tests.api > deleteBodyTest > DELETEs /body-tests/:id (apiClient mocked)`
- [ ] `useBodyTestsStore > fetchMyBodyTests > sets items and clears loading on success`
- [ ] `useBodyTestsStore > fetchMyBodyTests > sets error and clears loading on failure`
- [ ] `useBodyTestsStore > addItem > prepends the new test to items`
- [ ] `useBodyTestsStore > removeItem > removes the test whose _id matches`

*Integration / E2E:*
- [ ] (Deferred to Stage 4 — this stage is pure data layer with no user-facing flow; covered by the minimum-criteria exception for non-UI stages. The two E2E flows are specified in Stage 4.)

**TDD sequence**:
1. Write formula tests (reuse Stage 1 vectors) → Red → implement `lib/body-test-formulas.ts` → Green
2. Write api tests (mock `apiClient`) → Red → implement `lib/api/body-tests.api.ts` → Green
3. Write store tests (mock api module) → Red → implement `stores/body-tests.store.ts` → Green
4. Run `cd mobile && pnpm test && pnpm lint`

**Status**: Not Started

---

## Stage 3: Mobile — screens, shared components, navigation

**Goal**: Four functional screens wired into navigation, replacing both body-test placeholders, with real data, live preview, and Owner-only create/delete affordances — verified by render/interaction unit tests.

**Key implementation notes:**
- `BodyTestCard` (shared): left = date `formatDate` ("Mon, 2 Jun 2026", reuse the `en-GB` formatter pattern from `CheckInScreen`); right = `bodyFatPct` as `16.2%` in `text-[18px] font-semibold text-primary-light`; subline left = `PROTOCOL_LABELS[protocol]` in `text-[11px] text-foreground/65`; subline right = `${leanMassKg.toFixed(1)} kg lean`. Wrapped in `Pressable` with `accessibilityLabel` + `accessibilityRole="button"` and a `testID` containing the test `_id`.
- `MyBodyTestsScreen` (Owner): header "My Body Tests" / "Body composition history" with a "+" action button (`testID="bodytests-add-button"`) navigating to `AddBodyTest`; `useEffect(fetchMyBodyTests)`; skeleton rows while loading; empty "No body tests recorded yet."; card tap → `navigation.navigate('BodyTestDetail', { bodyTest })`. `testID="screen-MyBodyTests"`.
- `BodyTestsScreen` (Member): identical to `MyBodyTestsScreen` minus the "+" button; card tap → `BodyTestDetail`. `testID="screen-BodyTests"`. Both screens share `BodyTestCard`.
- `MeasurementsSection`: renders the dynamic skinfold fields for the selected protocol+sex (3site male = chest/abdominal/thigh, 3site female = tricep/suprailiac/thigh, 7site = 7 shared sites, 9site = 9 shared sites, other = single Body Fat % field). All numeric inputs use `keyboardType="decimal-pad"`. Each field has a stable `testID` (e.g. `measure-chest`, `measure-bodyFatPct`).
- `LivePreview`: receives computed `bodyFatPct | null` and composition; shows `—` when null; Body Fat large `text-[24px] font-semibold text-primary-light` (`testID="bodytest-preview-bodyfat"`), Fat Mass / Lean Mass smaller.
- `AddBodyTestScreen` (Owner): single scroll — Basic Info (date default today, age decimal-pad, sex M/F toggle, weight decimal-pad), Protocol 4-way selector (`testID="protocol-3site"` etc.) that swaps `MeasurementsSection`, `LivePreview` (recomputed from `lib/body-test-formulas.ts` as fields change), optional Goals (targetWeight, targetBodyFatPct). Sticky bottom "Save Test" button (`testID="bodytest-save-button"`) disabled until valid (date+age+sex+weight+protocol AND (all required skinfolds filled OR protocol=other AND bodyFatPct filled)). On save: `createBodyTest(dto)` → `addItem` → `navigation.goBack()` → success feedback "Body test saved". On error: error feedback. `testID="screen-AddBodyTest"`.
- `BodyTestDetailScreen` (shared): receives `bodyTest` param; header = formatted date + back; Owner-only Delete button top-right (`testID="bodytest-delete-button"`, destructive). Results card (Body Fat large, Fat Mass, Lean Mass, Weight), protocol label, measurements grid showing only non-null skinfold sites, Goals section only if a target is present. Delete → React Native Reusables `<Dialog>` (NOT `Alert.alert`) "Delete this test? This cannot be undone." with Cancel + Delete (`testID="bodytest-delete-confirm"`) → `deleteBodyTest(id)` → `removeItem` → `goBack` → "Test deleted". Owner-vs-Member detection via `useAuthStore((s) => s.user?.role)`. `testID="screen-BodyTestDetail"`.
- Navigation: in `navigation/index.tsx` import the four real screens; add `AddBodyTest: undefined` and `BodyTestDetail: { bodyTest: BodyTest }` to `AppStackParamList`; register both as `AppStack.Screen`; replace `MyBodyTests` / `BodyTests` entries in `SCREEN_REGISTRY` with the real screen components; remove the corresponding imports from `placeholders`. Remove `MyBodyTestsScreen` + `BodyTestsScreen` exports from `placeholders/index.ts`.
- Max 8 functional units check: this stage has 4 screens + 3 shared components = 7 units. Within limit.

**Sprint Contract**:

*Unit tests:*
- [ ] `BodyTestCard > renders date, "16.2%" body fat, protocol label, and lean-mass subline for a given test`
- [ ] `MyBodyTestsScreen > renders a card per store item and shows empty copy "No body tests recorded yet." when items is empty`
- [ ] `MyBodyTestsScreen > tapping the "+" button navigates to AddBodyTest`
- [ ] `BodyTestsScreen > does NOT render an add ("+") button (Member cannot create)`
- [ ] `AddBodyTestScreen > selecting 3-Site + male shows chest/abdominal/thigh fields; selecting female shows tricep/suprailiac/thigh`
- [ ] `AddBodyTestScreen > LivePreview shows "—" until required inputs complete, then shows a calculated percentage`
- [ ] `AddBodyTestScreen > Save button is disabled until all required fields are filled and enabled once valid`
- [ ] `BodyTestDetailScreen > shows the Delete button for an owner and hides it for a member`

*Integration / E2E:*
- [ ] (Full Owner + Member flows verified by Detox in Stage 4 — see Stage 4 contract.)

**TDD sequence**:
1. Write `BodyTestCard` + list screen render tests → Red → implement `BodyTestCard`, `MyBodyTestsScreen`, `BodyTestsScreen` → Green
2. Write `AddBodyTestScreen` interaction tests (protocol switch, preview, save-enable) → Red → implement `MeasurementsSection`, `LivePreview`, `AddBodyTestScreen` → Green
3. Write `BodyTestDetailScreen` tests (owner vs member delete) → Red → implement `BodyTestDetailScreen` → Green
4. Wire navigation + remove placeholders → app boots with real screens
5. Run `cd mobile && pnpm test && pnpm lint`; then `use the design-reviewer agent` on the new screens

**Status**: Not Started

---

## Stage 4: Mobile — Detox E2E

**Goal**: Detox specs proving the Owner create→view→delete flow and the Member read-only flow work against the real simulator + backend.

**Key implementation notes:**
- Model both specs on `mobile/e2e/owner/equipment.spec.ts` and `mobile/e2e/member/check-in.spec.ts`: seed a user via `POST /auth/dev/seed-user-role`, log in, open the drawer (`drawer-hamburger`), tap the drawer item (`drawer-item-MyBodyTests` for owner, `drawer-item-BodyTests` for member).
- **Member seeding dependency**: a Member's read list is only populated by tests an Owner created for that member, but this feature's `POST` stamps `memberId = owner.sub` (Owner self-testing) and there is no endpoint for an Owner to create a test FOR a member. Therefore the Member E2E cannot rely on the app to seed its own data. The Generator must seed the member's body tests directly via a dev/test path before asserting the read-only view. Use one of: (a) add a guarded dev seed route for body tests mirroring `auth.dev.controller.ts` (preferred — keep it `NODE_ENV !== 'production'` only), or (b) insert directly into Mongo from the spec's `beforeAll`. If neither is feasible, raise a blocker rather than weakening the assertion. The Member spec must assert a real seeded card is visible AND that no Delete button is present.
- Owner golden path needs no pre-seeding — it creates its own data through the UI.

**Sprint Contract**:

*Integration / E2E (Detox):*
- [ ] Owner golden path: tap "+" → fill age/sex/weight → select 3-Site → fill chest/abdominal/thigh → `bodytest-preview-bodyfat` shows a non-"—" percentage → tap Save → a card appears in `screen-MyBodyTests` → tap the card → `screen-BodyTestDetail` visible → tap Delete → confirm → card no longer visible in the list
- [ ] Owner error case: on `AddBodyTest` with required fields empty, `bodytest-save-button` is not enabled (no test is created)
- [ ] Member golden path: open Body Tests → a seeded body-test card is visible → tap it → `screen-BodyTestDetail` visible AND `bodytest-delete-button` is not present
- [ ] Member access: `screen-BodyTests` shows no add ("+") button

**TDD sequence**:
1. Provide the Member seed path (dev route or direct DB insert) per the note above
2. Write `mobile/e2e/owner/body-tests.spec.ts` → run against simulator + backend → passes
3. Write `mobile/e2e/member/body-tests.spec.ts` → run against simulator + backend → passes
4. Run the full Detox suite for both specs; if a dev seed route was added, add an integration test for it and re-run `cd backend && pnpm test:e2e`

**Status**: Not Started
