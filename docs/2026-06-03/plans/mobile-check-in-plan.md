# Mobile Check-In (Sprint A: Form + History) Implementation Plan

## Goal
A Member can submit one weekly wellness check-in (7 sliders, optional body metrics, diet adherence, up to 5 photos) from the mobile app and browse a history of past check-ins with a read-only detail view.

## Application
cross-app: `backend/` (new check-ins NestJS module) + `mobile/` (types, API, store, screens, navigation, Detox E2E)

## Scope
**In scope:**
- Backend `check-ins` module with 3 endpoints (GET list, POST create, GET upload-signature), all Member-only
- One-submission-per-calendar-week enforcement (Monday 00:00 boundary) returning HTTP 409
- `trainerId` stamping looked up from the member's User document
- Mobile types, API layer, Zustand store, three screens (CheckInScreen list/status, CheckInFormScreen, CheckInDetailScreen)
- Navigation registration of `CheckInForm` and `CheckInDetail` stack screens
- Photo upload via a check-ins-scoped upload-signature flow
- Detox E2E golden path + disabled-button error case

**Out of scope (Sprint B / other features):**
- Dashboard view (achievements, streak, wellness chart, heatmap)
- Check-in config / reminder schedule (trainer-set)
- Trainer's view of member check-ins
- Email notifications on submission
- Editing or deleting an existing check-in (form always creates new)

## Affected Files

### Stage 1 — Backend
Created:
- `backend/src/modules/check-ins/check-ins.module.ts`
- `backend/src/modules/check-ins/check-ins.controller.ts`
- `backend/src/modules/check-ins/check-ins.service.ts`
- `backend/src/modules/check-ins/dto/create-check-in.dto.ts`
- `backend/src/modules/check-ins/check-ins.service.spec.ts`
- `backend/src/modules/check-ins/check-ins.controller.spec.ts`
- `backend/test/check-ins.e2e-spec.ts`

Modified:
- `backend/src/app.module.ts` (register `CheckInsModule`)

Reused (do NOT recreate):
- `backend/src/common/models/check-in.model.ts` (already exists)
- `backend/src/common/models/user.model.ts` (registered via `MongooseModule.forFeature` inside the new module — same pattern as `gym.module.ts` / `dashboard.module.ts`)
- `backend/src/common/upload/upload-signature.ts` (`buildUploadSignature`)
- `backend/src/common/guards/jwt-auth.guard.ts`, `roles.guard.ts`, `decorators/roles.decorator.ts`

### Stage 2 — Mobile data layer
Created:
- `mobile/src/types/check-ins.ts`
- `mobile/src/lib/api/check-ins.api.ts`
- `mobile/src/stores/check-ins.store.ts`
- `mobile/__tests__/stores/check-ins.store.test.ts`
- `mobile/__tests__/lib/api/check-ins.api.test.ts`

### Stage 3 — Mobile screens + navigation
Created:
- `mobile/src/screens/check-in/CheckInScreen.tsx`
- `mobile/src/screens/check-in/CheckInFormScreen.tsx`
- `mobile/src/screens/check-in/CheckInDetailScreen.tsx`
- `mobile/src/screens/check-in/components/WellnessSliders.tsx`
- `mobile/src/screens/check-in/components/BodyMetricsSection.tsx`
- `mobile/src/screens/check-in/components/DietSection.tsx`
- `mobile/src/screens/check-in/components/PhotosSection.tsx`
- `mobile/src/lib/check-in-image-upload.ts` (check-ins-scoped upload; see Stage 3 note)
- `mobile/__tests__/screens/check-in/CheckInScreen.test.tsx`
- `mobile/__tests__/screens/check-in/CheckInFormScreen.test.tsx`
- `mobile/__tests__/screens/check-in/CheckInDetailScreen.test.tsx`

Modified:
- `mobile/src/navigation/index.tsx` (import real `CheckInScreen`; register `CheckInForm` + `CheckInDetail` in `AppStackParamList` and `AppNavigator`; remove `CheckIn` from the placeholders import)
- `mobile/src/screens/placeholders/index.ts` (remove the `CheckInScreen` placeholder export)
- `mobile/package.json` (add `@react-native-community/slider`)

### Stage 4 — Mobile E2E
Created:
- `mobile/e2e/member/check-in.spec.ts`

---

## Stage 1: Backend — check-ins module

**Goal**: A Member-only `check-ins` REST module exposing GET list, POST create (with week-duplicate 409 + `trainerId` lookup from the User document), and GET upload-signature, wired into `AppModule`.

**Implementation notes (binding for the Generator):**
- Import the existing `CheckIn` / `CheckInSchema` from `../../common/models/check-in.model` — do NOT define a new schema.
- Register both models in the module: `MongooseModule.forFeature([{ name: CheckIn.name, schema: CheckInSchema }, { name: User.name, schema: UserSchema }])` (User registration follows the `gym.module.ts` pattern).
- `CheckInsService` injects `@InjectModel(CheckIn.name)` and `@InjectModel(User.name)` plus `ConfigService`.
- Controller: `@Controller('check-ins')`, `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('member')`. Inject `req.user` via `@Request()` typed as `RequestWithUser { user: JwtUser }` (copy the interface pattern from `service-types.controller.ts`).
- `create(dto, memberId)`: look up the User by `memberId`; throw `NotFoundException` if missing. Derive `trainerId` from the User document's `trainerId` field — NOT from the JWT and NOT from the DTO. If the member has a `null` trainerId, fall back to using the member's own `_id` as `trainerId` (the model requires a non-null ObjectId) — document this in a code comment.
- Week boundary: compute Monday 00:00:00 of the current week (UTC). If a check-in for this member already exists with `submittedAt >= weekStart`, throw `ConflictException` (HTTP 409). Stamp `submittedAt = new Date()` server-side.
- `findByMember(memberId)`: return `find({ memberId }).sort({ submittedAt: -1 })`.
- `getUploadSignature()`: mirror `EquipmentService.getUploadSignature` exactly, but with `folder = 'check-ins'`.
- DTO validation per spec: 7 wellness ints `@IsInt @Min(1) @Max(10)`; `stuckToDiet` `@IsEnum`; numeric metrics `@IsOptional @IsNumber`; text fields `@IsOptional @IsString`; `photos` `@IsOptional @IsArray @IsString({each:true})`. `memberId`/`trainerId`/`submittedAt` are not DTO fields (whitelisted out by the global `ValidationPipe`).
- E2E `buildApp` mirrors `test/equipment.e2e-spec.ts`: seed a member user (with a `trainerId` set to an owner/trainer ObjectId) and an owner user; log in to get tokens.

**Sprint Contract**:

*Unit tests (`check-ins.service.spec.ts` + `check-ins.controller.spec.ts`):*
- [x] `CheckInsService > findByMember > returns the member's check-ins sorted by submittedAt descending` (mocked model)
- [x] `CheckInsService > create > looks up the User and stamps trainerId from the user document's trainerId field`
- [x] `CheckInsService > create > throws NotFoundException when the member User does not exist`
- [x] `CheckInsService > create > throws ConflictException when a check-in already exists with submittedAt >= current Monday 00:00`
- [x] `CheckInsService > create > falls back to memberId as trainerId when the member's trainerId is null`
- [x] `CheckInsService > getUploadSignature > returns config with folder "check-ins"`
- [x] `CheckInsController > create > passes req.user.sub as memberId to the service`

*Integration (`test/check-ins.e2e-spec.ts`):*
- [x] `POST /check-ins` with member token + valid body → 201 with `_id`, `memberId` matching the member, `submittedAt` present
- [x] `POST /check-ins` a second time in the same week with member token → 409
- [x] `POST /check-ins` with `sleepQuality: 11` (out of range) and member token → 400
- [x] `GET /check-ins` with member token → 200 array containing the created check-in
- [x] `GET /check-ins` with no token → 401
- [x] `GET /check-ins` with owner token → 403
- [x] `GET /check-ins/upload-signature` with member token → 200 with provider in ["cloudinary","local"] and `folder: "check-ins"`

**TDD sequence**:
1. Write failing service + controller unit tests → Red
2. Implement DTO, service, controller, module; register in `AppModule` → Green
3. Write `check-ins.e2e-spec.ts`; run `pnpm test:e2e` against MongoMemoryServer → passes

**Status**: Complete

---

## Stage 2: Mobile — types, API layer, Zustand store

**Goal**: Typed `CheckIn` / `CreateCheckInDto` definitions, a `check-ins.api.ts` module hitting the three endpoints, and a `check-ins.store.ts` Zustand store with `fetchCheckIns`, `addItem`, and the derived `hasCheckedInThisWeek`.

**Implementation notes (binding for the Generator):**
- Types file mirrors the spec's `CheckIn`, `CreateCheckInDto`, and `StuckToDiet` exactly. Reuse `UploadConfig` from `../types/equipment` (or re-export) rather than redefining — confirm its shape matches.
- API uses `apiClient` (same as `equipment.api.ts`): `fetchCheckIns()` → GET `/check-ins`; `createCheckIn(dto)` → POST `/check-ins`; `getCheckInUploadSignature()` → POST `/check-ins/upload-signature` (the backend route is POST upload-signature per the equipment pattern — confirm the controller method maps GET vs POST and match it; default to POST to mirror equipment).
- Store shape per spec: `items`, `loading`, `error`, `fetchCheckIns`, `addItem` (prepend), `hasCheckedInThisWeek()`.
- `hasCheckedInThisWeek()` computes Monday 00:00 of the current week in **local** time and returns `true` when `items[0]?.submittedAt` parses to a date `>= weekStart`. Returns `false` when `items` is empty.
- API tests mock `apiClient`; store tests mock the api module.

**Sprint Contract**:

*Unit tests:*
- [x] `checkInsApi > fetchCheckIns > calls GET /check-ins and returns response.data`
- [x] `checkInsApi > createCheckIn > calls POST /check-ins with the dto and returns response.data`
- [x] `checkInsApi > getCheckInUploadSignature > calls the upload-signature endpoint and returns response.data`
- [x] `useCheckInsStore > fetchCheckIns > populates items and clears loading on success`
- [x] `useCheckInsStore > fetchCheckIns > sets error and clears loading on failure`
- [x] `useCheckInsStore > addItem > prepends the new check-in to items`
- [x] `useCheckInsStore > hasCheckedInThisWeek > returns true when items[0].submittedAt is within the current week`
- [x] `useCheckInsStore > hasCheckedInThisWeek > returns false when items is empty`
- [x] `useCheckInsStore > hasCheckedInThisWeek > returns false when items[0].submittedAt is before this week's Monday`

*Integration (mobile has no E2E at this layer — store integration via Jest):*
- [x] `useCheckInsStore > fetchCheckIns → addItem` sequence: fetch populates list, then addItem makes `hasCheckedInThisWeek()` return true for a current-week item
- [x] `useCheckInsStore` after `fetchCheckIns` resolving an empty array → `items` is `[]` and `hasCheckedInThisWeek()` is false

**TDD sequence**:
1. Write failing api + store Jest tests → Red
2. Implement types, api, store → Green
3. Run `pnpm test --testPathPattern=check-ins` → passes

**Status**: Complete

---

## Stage 3: Mobile — CheckInScreen + CheckInFormScreen + CheckInDetailScreen + navigation

**Goal**: Three real screens replacing the placeholder, wired into navigation, implementing the full submission and history-detail flows per the design spec.

**Functional units (4 — within the 8-unit limit):** CheckInScreen, CheckInFormScreen, CheckInDetailScreen, navigation wiring.

**Implementation notes (binding for the Generator):**
- Add dependency `@react-native-community/slider` to `mobile/package.json` and install. Use it for the 7 wellness sliders (min=1, max=10, step=1, default 5). The mobile reanimated/`Animated` rule does not apply to a third-party slider control.
- `CheckInScreen` (Drawer screen, keep `testID="screen-CheckIn"`): header "Check-In" / subtitle "Weekly wellness tracking"; on mount calls `fetchCheckIns()`. Status card shows "Start This Week's Check-In" button (`testID="checkin-start-button"`) when `!hasCheckedInThisWeek()`, else a disabled/absent button plus "Submitted ✓" + timestamp. History section "PAST CHECK-INS": each row date left + wellness score right (average of 7 ratings to 1 decimal); tap → `navigation.navigate('CheckInDetail', { checkIn })`. Skeleton rows while loading; "No check-ins yet." when empty.
- `CheckInFormScreen` (new `AppStack` screen, `testID="screen-CheckInForm"`): header "Weekly Check-In" + back. 4 sections per spec (Wellness sliders, Body Metrics 2-col `decimal-pad` inputs, Diet with required three-way `stuckToDiet` group + 3 optional text inputs, Photos max 5). Sticky bottom "Submit Check-In" button (`testID="checkin-submit-button"`) disabled until all 7 sliders set (always true once opened) AND `stuckToDiet` selected. On success: `addItem(result)`, navigate back, success feedback. On 409: error feedback "You've already submitted this week". On other error: error feedback. Empty numeric fields submit as omitted (undefined), not 0.
- `CheckInDetailScreen` (new `AppStack` screen, `testID="screen-CheckInDetail"`): reads `route.params.checkIn`; header = date "Mon, 2 Jun 2026" + back. Read-only: static wellness rows, body-metrics grid hiding null fields, `stuckToDiet` badge (yes=emerald, partial=amber, no=destructive), text fields/notes if present, photos horizontal scroll with tap-to-fullscreen `Modal`.
- Photo upload: create `mobile/src/lib/check-in-image-upload.ts` that mirrors `lib/image-upload.ts` but calls `getCheckInUploadSignature()`. Do NOT reuse the equipment-hardcoded `pickAndUploadImage` (it is bound to the equipment signature). Max 5 enforced with feedback "Maximum 5 photos allowed".
- Navigation: in `mobile/src/navigation/index.tsx` import the real `CheckInScreen` from `../screens/check-in/CheckInScreen`, remove `CheckIn` from the placeholders import, update `SCREEN_REGISTRY.CheckIn`, add `CheckInForm: undefined` and `CheckInDetail: { checkIn: CheckIn }` to `AppStackParamList`, and register both as `AppStack.Screen`s. Remove the `CheckInScreen` placeholder export from `placeholders/index.ts`.
- Adhere to `.claude/instructions/design.md` mobile rules: token colors only, `accessibilityLabel` on every touchable, `keyboardType="decimal-pad"`, `useSafeAreaInsets()` for the sticky bar, skeleton (not "Loading…") loading state.

**Sprint Contract**:

*Unit tests (React Native Testing Library):*
- [ ] `CheckInScreen > renders the "Start This Week's Check-In" button when hasCheckedInThisWeek is false`
- [ ] `CheckInScreen > renders "Submitted" status and no enabled start button when hasCheckedInThisWeek is true`
- [ ] `CheckInScreen > renders a history row per item with the wellness score averaged to 1 decimal`
- [ ] `CheckInScreen > renders "No check-ins yet." when items is empty and not loading`
- [ ] `CheckInFormScreen > Submit button is disabled until stuckToDiet is selected`
- [ ] `CheckInFormScreen > selecting stuckToDiet enables the Submit button (sliders default to 5)`
- [ ] `CheckInFormScreen > submitting calls createCheckIn with the 7 wellness values and selected stuckToDiet`
- [ ] `CheckInFormScreen > a 409 response shows the "already submitted this week" message`
- [ ] `CheckInDetailScreen > renders only body-metric fields that have non-null values`
- [ ] `CheckInDetailScreen > renders the stuckToDiet badge matching the check-in value`

*Integration / E2E (Jest interaction-level; Detox golden path lives in Stage 4):*
- [ ] `CheckInFormScreen` full interaction: select `stuckToDiet=yes` → press Submit → `createCheckIn` resolves → `addItem` called with the result and navigation `goBack` invoked
- [ ] `CheckInScreen` pressing a history row → `navigation.navigate` called with `'CheckInDetail'` and the tapped check-in as param

**TDD sequence**:
1. Write failing screen + component Jest tests → Red
2. Add slider dep; implement components, three screens, image-upload helper, navigation wiring → Green
3. Run `pnpm test --testPathPattern=check-in` and `pnpm lint` → pass; then `/simplify`

**Status**: Complete

### Stage 3 Checkpoint
- [x] CheckInScreen
- [x] CheckInFormScreen
- [x] CheckInDetailScreen
- [x] Navigation wiring

---

## Stage 4: Mobile — Detox E2E

**Goal**: A Detox spec proving the member check-in golden path against the real backend, plus the already-submitted disabled-button case.

**Implementation notes (binding for the Generator):**
- Mirror `mobile/e2e/owner/equipment.spec.ts` structure: `beforeAll` seeds a member via `POST /auth/dev/seed-user-role` with `role: 'member'`; `beforeEach` clears keychain, launches app, logs in, opens the drawer, taps `drawer-item-CheckIn`.
- Because one-per-week is enforced server-side, the golden path must seed a **fresh member email per run** (e.g. `member-checkin-${Date.now()}@powergym.com`) so the week slot is empty.
- Golden path: tap `checkin-start-button` → form visible → (sliders default 5, no interaction strictly required) → tap `stuckToDiet` "Yes" option → tap `checkin-submit-button` → returns to CheckInScreen → "Submitted ✓" visible and a new history row appears.
- Error case: after submitting (same session, same week) the `checkin-start-button` is disabled / not enabled — assert it is not tappable to start a second check-in.
- All interactive elements referenced must carry the `testID`s defined in Stage 3 (`checkin-start-button`, `checkin-submit-button`, `stuckToDiet`-option testIDs, history-row testIDs).

**Sprint Contract**:

*Integration / E2E (Detox, real backend):*
- [ ] Golden path: member taps "Start This Week's Check-In" → selects `stuckToDiet` Yes → taps "Submit Check-In" → CheckInScreen shows "Submitted ✓" and a new history row is visible
- [ ] Error case: after a successful submission this week, the "Start This Week's Check-In" button is disabled (cannot start a second check-in)

**TDD sequence**:
1. Write the Detox spec referencing Stage 3 testIDs → Red (run against booted simulator + running backend)
2. Adjust testIDs in screens only if a selector mismatch is found (no behavior changes) → Green
3. `pnpm detox test` golden path + error case pass

**Status**: Complete

### Stage 4 Checkpoint
- [x] mobile/e2e/member/check-in.spec.ts

---

## Architectural Risks / Notes
- **trainerId source conflict**: the JWT already carries `trainerId`, but the spec mandates a User-document lookup. The plan follows the spec (lookup) for correctness if the JWT is stale. Generator must inject `UserModel`, not read `req.user.trainerId`.
- **Member with null trainerId**: the CheckIn model requires a non-null `trainerId` ObjectId. Plan falls back to `memberId` as `trainerId`; if product wants a hard 400 instead, revisit before Stage 1 implementation.
- **Slider dependency**: `@react-native-community/slider` is not currently installed — Stage 3 adds it. Detox build (Stage 4) requires a fresh native build after the native module is added.
- **upload-signature HTTP verb**: equipment uses `POST /equipment/upload-signature`. The spec text says `GET /check-ins/upload-signature`. Generator must keep the backend route verb and the mobile API call in agreement; default to POST to match the established equipment pattern and the `getUploadSignature()` mobile helper.
