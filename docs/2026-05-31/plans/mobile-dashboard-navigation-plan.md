# Mobile Dashboard & Navigation Implementation Plan

## Goal
A logged-in mobile user lands on their role's Dashboard, opens a hamburger drawer showing role-specific navigation, taps through to any placeholder screen, and opens a fully functional Settings screen to edit their profile, change their password, and (Owner only) edit gym info — all backed by new JWT-protected `backend/` endpoints.

## Application
cross-app — `backend/` (new `users` + `gym` modules) and `mobile/` (drawer navigation, placeholder screens, Settings). No `web/` changes.

## Design Spec
`docs/superpowers/specs/2026-05-31-mobile-dashboard-navigation-design.md` — read for context; this plan is self-contained.

## Scope
**In scope:**
- Backend `users` module: `GET /users/me/profile`, `PATCH /users/me/profile`, `PATCH /users/me/password`, `POST /users/me/avatar`
- Backend `gym` module: `GET /gym/branding` (any role), `GET /gym/info` (owner), `PATCH /gym/info` (owner), `POST /gym/logo` (owner)
- Backend image upload to `public/uploads/` via multer + static file serving
- Backend dev endpoint to seed users by role (owner/trainer/member) for E2E
- Mobile drawer navigation (`@react-navigation/drawer`) with role-based nav config
- Mobile top header (hamburger + gym name) and drawer (branding + nav groups + user footer)
- All 18 placeholder screens (header + page title + empty content, role-gated registration)
- Mobile Settings screen: horizontal role-specific tabs (Profile / Security / + Gym Info for Owner), wired to backend
- Mobile profile/gym API layer + Zustand profile store
- Jest unit tests + Detox E2E specs per spec section 5

**Out of scope:**
- Email change flow (display-only email field)
- Real content / data fetching for any placeholder screen
- Push notifications, biometrics re-prompt on Settings open
- Any `web/` change (gym info continues to live in the owner's `UserProfile.gymInfo`)
- A new GymBranding Mongoose model — reuse the existing `UserProfile.gymInfo` embedded doc

## Architectural Notes (read before implementing any stage)
- **Profile + gym storage**: The existing web model `web/src/lib/db/models/user-profile.model.ts` already holds every profile field AND embeds `gymInfo` on the **owner's** profile. `backend/` shares the same MongoDB. Do NOT create a new branding collection. The backend gets its own Mongoose schema mirroring that web model (NestJS `@Schema`), registered under model name `UserProfile` so it maps to the same `userprofiles` collection. Keep field names/enums identical to the web model to avoid drift.
- **Gym branding resolution**: gym name + logos come from the single owner's `UserProfile.gymInfo`. Mirror `web/src/lib/db/queries/gym-branding.ts`: find the `owner` user, load their profile, return `{ gymName, logoUrl }`. `GET /gym/branding` is callable by any authenticated role.
- **Auth pattern**: copy the `auth` module structure — `JwtAuthGuard` (`backend/src/common/guards/jwt-auth.guard.ts`) for any-role endpoints; add `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` (`backend/src/common/decorators/roles.decorator.ts`) for owner-only endpoints. `req.user` is the `JwtUser` shape `{ sub, firstName, lastName, role, trainerId }` from `backend/src/modules/auth/strategies/jwt.strategy.ts`.
- **Name lives on `User`, profile fields on `UserProfile`**: `firstName`/`lastName`/`email`/`role` are on the `User` doc (`backend/src/common/models/user.model.ts`); everything else (mobile, address, DOB, avatar, certifications, bio, specializations, sex, fitnessGoal, fitnessLevel, gymInfo) is on `UserProfile`. `PATCH /users/me/profile` updates BOTH docs; profile doc is upserted by `userId`.
- **Validation**: global `ValidationPipe({ whitelist: true, transform: true })` is already on in `backend/src/main.ts`. Use `class-validator` DTOs (already a dependency). The test harness must also apply the same pipe (see `backend/test/auth.e2e-spec.ts`).
- **Image upload**: install `multer` + `@types/multer`. Use `@nestjs/platform-express` `FileInterceptor`. Store under `backend/public/uploads/`, filename `<uuid>.<ext>`. Validate mimetype (jpeg/png/webp) and size (max 5MB) — reject with 400 otherwise. Serve statically via `ServeStaticModule` (`@nestjs/serve-static`, needs install) mounted at `/uploads`. Endpoints return the relative URL e.g. `/uploads/<file>`.
- **Mobile API base URL**: `apiClient` (`mobile/src/lib/api/client.ts`) already injects the bearer token and handles 401 refresh. Reuse it for all new calls — never create a second axios instance.
- **Mobile drawer dep**: install `@react-navigation/drawer` + `react-native-gesture-handler`. `react-native-reanimated` and `react-native-safe-area-context` are already present. `react-native-gesture-handler` import must be the first line of `mobile/index.ts`.
- **Image picker**: install `expo-image-picker` for avatar/logo selection.
- **Role on mobile**: read `useAuthStore().user.role` to choose the drawer config and the Settings tab set.
- **Detox role seeding**: the existing dev seeder `POST /auth/dev/seed-user` hardcodes role `member`. Stage 1 adds an explicit `role` parameter path (dev-only) so E2E can seed an owner. Keep it `NODE_ENV !== 'production'` guarded exactly like `auth.dev.controller.ts`.

## Affected Files

### Stage 1 — Backend users module
- `backend/src/modules/users/users.module.ts` (new)
- `backend/src/modules/users/users.controller.ts` (new)
- `backend/src/modules/users/users.service.ts` (new)
- `backend/src/modules/users/users.service.spec.ts` (new)
- `backend/src/modules/users/users.controller.spec.ts` (new)
- `backend/src/modules/users/dto/update-profile.dto.ts` (new)
- `backend/src/modules/users/dto/update-password.dto.ts` (new)
- `backend/src/common/models/user-profile.model.ts` (new — NestJS schema mirroring the web model, collection `UserProfile`)
- `backend/src/common/upload/file-upload.options.ts` (new — multer storage + filter, shared)
- `backend/src/app.module.ts` (modify — register UsersModule + ServeStaticModule)
- `backend/src/modules/auth/auth.dev.controller.ts` (modify — add `seed-user-role` dev route)
- `backend/test/users.e2e-spec.ts` (new)
- `backend/package.json` (modify — add `multer`, `@types/multer`, `@nestjs/serve-static`)

### Stage 2 — Backend gym module
- `backend/src/modules/gym/gym.module.ts` (new)
- `backend/src/modules/gym/gym.controller.ts` (new)
- `backend/src/modules/gym/gym.service.ts` (new)
- `backend/src/modules/gym/gym.service.spec.ts` (new)
- `backend/src/modules/gym/gym.controller.spec.ts` (new)
- `backend/src/modules/gym/dto/update-gym-info.dto.ts` (new)
- `backend/src/app.module.ts` (modify — register GymModule)
- `backend/test/gym.e2e-spec.ts` (new)

### Stage 3 — Mobile drawer navigation + branding
- `mobile/package.json` (modify — add `@react-navigation/drawer`, `react-native-gesture-handler`, `expo-image-picker`)
- `mobile/index.ts` (modify — `import 'react-native-gesture-handler'` first line)
- `mobile/src/navigation/nav-config.ts` (new — role → nav groups/items + screen registry)
- `mobile/src/navigation/index.tsx` (modify — replace single Home with a Drawer.Navigator + Settings stack screen)
- `mobile/src/components/drawer/AppDrawerContent.tsx` (new — branding + nav groups + user footer)
- `mobile/src/components/drawer/DrawerHeader.tsx` (new — hamburger + gym name top header)
- `mobile/src/stores/branding.store.ts` (new — fetches `GET /gym/branding`)
- `mobile/src/lib/api/branding.api.ts` (new)
- `mobile/src/navigation/nav-config.spec.ts` (new)
- `mobile/src/components/drawer/__tests__/AppDrawerContent.spec.tsx` (new)

### Stage 4 — Mobile placeholder screens
- `mobile/src/screens/placeholders/PlaceholderScreen.tsx` (new — shared component)
- `mobile/src/screens/placeholders/index.ts` (new — one named export per screen via factory)
- `mobile/src/screens/__tests__/placeholders.spec.tsx` (new)
- `mobile/src/screens/HomeScreen.tsx` (modify or remove — Dashboard replaces it; preserve biometrics prompt by moving it into the Dashboard placeholder)

### Stage 5 — Mobile Settings screen
- `mobile/src/screens/settings/SettingsScreen.tsx` (new — tab bar + back header)
- `mobile/src/screens/settings/tabs/ProfileTab.tsx` (new)
- `mobile/src/screens/settings/tabs/SecurityTab.tsx` (new)
- `mobile/src/screens/settings/tabs/GymInfoTab.tsx` (new — owner only)
- `mobile/src/stores/profile.store.ts` (new — fetch/update profile)
- `mobile/src/lib/api/profile.api.ts` (new — profile + avatar)
- `mobile/src/lib/api/gym.api.ts` (new — gym info + logo)
- `mobile/src/lib/validation/profile.ts` (new — password + required-field rules)
- `mobile/src/lib/validation/profile.spec.ts` (new)
- `mobile/src/screens/settings/__tests__/SettingsScreen.spec.tsx` (new)
- `mobile/src/screens/settings/__tests__/ProfileTab.spec.tsx` (new)

### Stage 6 — E2E (Detox)
- `mobile/e2e/owner/dashboard-navigation.spec.ts` (new)
- `mobile/e2e/owner/settings.spec.ts` (new)
- `mobile/e2e/member/drawer.spec.ts` (new)

---

## Stage 1: Backend `users` module

**Goal**: JWT-protected endpoints to read/update the authenticated user's profile, change password, and upload an avatar — plus a dev-only role seeder and static `/uploads` serving.

**Implementation notes**:
- Create `backend/src/common/models/user-profile.model.ts` as a NestJS `@Schema` mirroring `web/src/lib/db/models/user-profile.model.ts` exactly (same fields, enums, `gymInfo` sub-schema, `userId` unique). Register under name `UserProfile`.
- `UsersService`:
  - `getProfile(userId)` → joins `User` (firstName/lastName/email) + `UserProfile` (upsert-on-read not required; return nulls when no profile doc). Returns the full `UserProfile` response shape from the spec (every field present, non-applicable → `null`; arrays default `[]` → return as-is).
  - `updateProfile(userId, dto)` → updates `firstName`/`lastName` on `User`; upserts the rest onto `UserProfile` by `userId`. Ignores any field not in the DTO (whitelist). Returns the refreshed profile.
  - `changePassword(userId, currentPassword, newPassword)` → loads user, `bcrypt.compare` current; throws `BadRequestException` ("Current password is incorrect") on mismatch; throws `NotFoundException` if user missing; hashes + saves new (10 rounds). New password must satisfy min 8 / 1 uppercase / 1 number (DTO-validated).
  - `setAvatar(userId, relativeUrl)` → sets `avatarUrl` on `UserProfile` (upsert), returns `{ avatarUrl }`.
- `UpdateProfileDto`: all optional; `@IsString`/`@IsOptional` for strings, `@IsDateString` for `dateOfBirth`, `@IsArray @IsString({each:true})` for `certifications`/`specializations`, `@IsIn` enums for `sex`/`fitnessGoal`/`fitnessLevel`. `firstName`/`lastName` `@IsString @IsNotEmpty` when present.
- `UpdatePasswordDto`: `currentPassword @IsString @IsNotEmpty`; `newPassword @MinLength(8) @Matches(/[A-Z]/) @Matches(/[0-9]/)`.
- Avatar route: `@Post('me/avatar') @UseInterceptors(FileInterceptor('file', fileUploadOptions))`; 400 when no file / bad mimetype / >5MB.
- Dev seeder: add `@Post('seed-user-role')` to `auth.dev.controller.ts`, accepting `{ email, password, role }`, calling `authService.seedTestUser(email, password, role)` (already supports a role arg), guarded `NODE_ENV !== 'production'`.

**Sprint Contract**:

*Unit tests:*
- [x] `UsersService > getProfile > returns merged User name/email and UserProfile fields with non-applicable fields as null`
- [x] `UsersService > getProfile > throws NotFoundException when user does not exist`
- [x] `UsersService > updateProfile > writes firstName/lastName to User and remaining fields to upserted UserProfile`
- [x] `UsersService > changePassword > throws BadRequestException when currentPassword does not match the stored hash`
- [x] `UsersService > changePassword > stores a new bcrypt hash that verifies against the new password`
- [x] `UsersService > setAvatar > upserts avatarUrl on the UserProfile and returns { avatarUrl }`

*Integration tests (`backend/test/users.e2e-spec.ts`, MongoMemoryServer):*
- [x] `GET /users/me/profile` with a valid member token → 200 and body contains `firstName`, `email`, and `fitnessGoal` keys
- [x] `GET /users/me/profile` with no Authorization header → 401
- [x] `PATCH /users/me/profile` with `{ firstName: "Jane", mobile: "123" }` → 200, then a follow-up GET returns `firstName: "Jane"` and `mobile: "123"`
- [x] `PATCH /users/me/password` with the wrong current password → 400
- [x] `PATCH /users/me/password` with `newPassword: "short"` → 400 (validation)
- [x] `POST /users/me/avatar` with a valid PNG buffer → 200 and body `avatarUrl` matches `/^/uploads/`

**TDD sequence**:
1. Write failing `users.service.spec.ts` unit tests → Red
2. Implement model + service → Green
3. Write `users.e2e-spec.ts` integration tests against the real Nest stack + MongoMemoryServer → passes

**Status**: Complete

---

## Stage 2: Backend `gym` module

**Goal**: Branding endpoint for all roles plus owner-only gym info read/update and logo upload, all reading/writing the single owner's `UserProfile.gymInfo`.

**Implementation notes**:
- Reuse the `UserProfile` schema registered in Stage 1 (import its `MongooseModule.forFeature` registration, or re-register in `GymModule`). Also needs the `User` model to locate the owner.
- `GymService`:
  - `getBranding()` → finds the `owner` user, loads their profile, returns `{ gymName: gymInfo?.name ?? null, logoUrl: gymInfo?.logoUrl ?? null }`. Mirrors `web/src/lib/db/queries/gym-branding.ts`. Returns nulls when no owner/profile/gymInfo.
  - `getInfo(ownerUserId)` → returns the full `gymInfo` object (all fields, nulls when unset) for the authenticated owner's own profile.
  - `updateInfo(ownerUserId, dto)` → upserts `gymInfo.{name,address,phone,email,website,hours,description}` onto the owner's `UserProfile`. Returns the refreshed gymInfo.
  - `setLogo(ownerUserId, kind, relativeUrl)` where `kind` ∈ `'sidebar' | 'login'` → sets `gymInfo.logoUrl` (sidebar) or `gymInfo.loginLogoUrl` (login). Returns `{ logoUrl }`.
- `UpdateGymInfoDto`: all optional strings; `email @IsOptional @IsEmail`, `website @IsOptional @IsString`.
- `GET /gym/branding` → `@UseGuards(JwtAuthGuard)` only (any role). The owner-only routes → `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('owner')`.
- Logo route: `@Post('logo') @UseInterceptors(FileInterceptor('file', fileUploadOptions))`, accepts a `kind` form field (`@Body('kind')`), 400 on missing/invalid file.

**Sprint Contract**:

*Unit tests:*
- [x] `GymService > getBranding > returns owner gymInfo name and logoUrl as gymName/logoUrl`
- [x] `GymService > getBranding > returns { gymName: null, logoUrl: null } when no owner exists`
- [x] `GymService > updateInfo > upserts provided gymInfo fields onto the owner UserProfile and returns them`
- [x] `GymService > setLogo > with kind "login" sets loginLogoUrl and leaves logoUrl unchanged`

*Integration tests (`backend/test/gym.e2e-spec.ts`):*
- [x] `GET /gym/branding` with a member token → 200 and body has `gymName` + `logoUrl` keys
- [x] `GET /gym/info` with a member token → 403 (role guard)
- [x] `PATCH /gym/info` with an owner token `{ name: "Iron Gym", phone: "555" }` → 200, then `GET /gym/branding` returns `gymName: "Iron Gym"`
- [x] `POST /gym/logo` with an owner token + PNG buffer + `kind=sidebar` → 200 and `logoUrl` matches `/^/uploads/`

**TDD sequence**:
1. Write failing `gym.service.spec.ts` → Red
2. Implement service + controller + module → Green
3. Write `gym.e2e-spec.ts` integration tests → passes

**Status**: Complete

---

## Stage 3: Mobile drawer navigation + branding

**Goal**: Replace the single-screen app navigator with a hamburger drawer that renders role-specific nav groups, a branded header, and a user footer that opens Settings — with gym name pulled from `GET /gym/branding`.

**Implementation notes**:
- Install deps; add `import 'react-native-gesture-handler';` as the first line of `mobile/index.ts`.
- `nav-config.ts`: export `NAV_CONFIG: Record<UserRole, NavGroup[]>` where `NavGroup = { label: string; items: { key: string; label: string; screen: string }[] }`, matching the three role tables in the spec exactly. Also export `SCREEN_REGISTRY` mapping each `screen` key → its component (placeholders come from Stage 4; in Stage 3 wire them to a temporary inline placeholder so the navigator compiles, then Stage 4 swaps in the real factory output — note this dependency).
- `index.tsx`: `AppNavigator` becomes a native-stack with two screens — `Drawer` (a `createDrawerNavigator` whose screens are built from the current role's `NAV_CONFIG`, `headerShown:false`, custom `drawerContent={AppDrawerContent}`, `drawerStyle width ~78%`) and `Settings` (pushed on top, its own back-button header). Initial drawer route = the role's `Dashboard`.
- `DrawerHeader`: sticky top bar — left hamburger button (`navigation.toggleDrawer()`, `testID="drawer-hamburger"`, `accessibilityLabel="Open menu"`), centre gym name from `useBrandingStore`. Follows the design.md mobile header pattern.
- `AppDrawerContent`: top branding (logo/initial + gym name + `"{Role} portal"`), scrollable nav groups (uppercase group labels `text-foreground/65`, items as `Pressable` rows), active item styled `bg-primary/12` + `text-primary-light`, bottom user footer (`testID="drawer-user-footer"`, initials avatar + name + role + ⚙) that `navigation.navigate('Settings')`. Each nav item `testID={`drawer-item-${screen}`}`.
- `branding.store.ts`: Zustand store with `gymName`, `logoUrl`, `fetchBranding()` calling `branding.api.ts`. Fetch once when the drawer mounts.

**Sprint Contract**:

*Unit tests:*
- [ ] `nav-config > NAV_CONFIG.owner > contains a GYM group whose items include Equipment, Services, and Billing`
- [ ] `nav-config > NAV_CONFIG.member > does not contain a Trainers or Equipment item`
- [ ] `nav-config > NAV_CONFIG.trainer > Dashboard is the first item under the OVERVIEW group`
- [ ] `AppDrawerContent > renders the Owner nav groups when auth role is owner (e.g. a "TEMPLATES" group label is visible)`
- [ ] `AppDrawerContent > renders gym name from the branding store in the branding header`
- [ ] `AppDrawerContent > tapping the user footer calls navigation.navigate with "Settings"`

*E2E (deferred full flow to Stage 6 — this stage adds one focused spec):*
- [ ] `Owner: launch app logged in → drawer-hamburger is visible in the header → tap it → drawer-user-footer becomes visible`
- [ ] `Owner: open drawer → tap drawer-item-Equipment → the Equipment screen header is visible`

**TDD sequence**:
1. Write failing `nav-config.spec.ts` + `AppDrawerContent.spec.tsx` → Red
2. Implement config + drawer components + navigator wiring → Green
3. Add the focused Detox spec (`mobile/e2e/owner/dashboard-navigation.spec.ts`, golden subset) → passes on simulator

**Status**: Not Started

---

## Stage 4: Mobile placeholder screens

**Goal**: Every screen in the spec inventory exists as a real navigable screen showing the standard header and its page title, registered only for the roles that own it.

**Implementation notes**:
- `PlaceholderScreen.tsx`: takes a `title` prop, renders `DrawerHeader` (from Stage 3) + a content area with the page title (`text-[18px] font-semibold`) and a single empty-state line (`text-[13px] text-foreground/65`, e.g. "Coming in a later sprint" is NOT allowed per CLAUDE.md zero-placeholder rule for in-scope features — instead show a neutral empty heading like the screen name; the screen itself is the deliverable, not stubbed functionality). Use a stable `testID={`screen-${name}`}` on the root and a visible title text.
- `placeholders/index.ts`: a `makePlaceholder(title, testID)` factory producing one component per screen in the inventory (Dashboard, Trainers, Members, Invites, Calendar, Equipment, Services, Billing, Training Templates, Nutrition Templates, My Training, My Nutrition, My Body Tests, My Schedule, My Health, Body Tests, Check-In, Journey). Update `SCREEN_REGISTRY` (Stage 3) to point at these.
- Dashboard placeholder must host the existing biometrics-enable prompt previously in `HomeScreen` (move the `BiometricsPrompt` logic here) so first-login biometric enrollment still works; keep `testID="home-screen"` on the Dashboard so the existing auth E2E continues to pass. Remove `HomeScreen.tsx` only after its logic is migrated.
- Role gating: the navigator (Stage 3) only registers screens listed for the current role, so e.g. a member's stack has no `Trainers` route.

**Sprint Contract**:

*Unit tests:*
- [ ] `placeholders > Dashboard screen > renders its page title and keeps testID "home-screen" for biometrics E2E compatibility`
- [ ] `placeholders > Equipment screen > renders a header and the "Equipment" title`
- [ ] `placeholders > Journey screen (member) > renders the "Journey" title`
- [ ] `placeholders > makePlaceholder > produces a component rendering the standard DrawerHeader (hamburger present)`

*E2E (covered within Stage 6 flows; this stage asserts via the Stage 3 spec extension):*
- [ ] `Owner: navigate drawer-item-Services → screen-Services title "Services" is visible`
- [ ] `Member: navigate drawer-item-Journey → screen-Journey title "Journey" is visible`

**TDD sequence**:
1. Write failing `placeholders.spec.tsx` → Red
2. Implement `PlaceholderScreen` + factory, migrate biometrics prompt into Dashboard, wire registry → Green
3. Extend Detox specs to assert two placeholder titles render → passes

**Status**: Not Started

---

## Stage 5: Mobile Settings screen

**Goal**: A fully functional Settings screen with a back-button header and role-specific horizontal tabs that load the user's profile, save profile edits, change password, and (Owner) load/save gym info — with avatar/logo upload.

**Implementation notes**:
- `validation/profile.ts`: pure functions `validateProfile(values, role)` → `{ field: message }` map (firstName/lastName required) and `validatePassword({ currentPassword, newPassword, confirmPassword })` → errors (newPassword min 8 / 1 uppercase / 1 number; confirm must match). These are the unit-test target — keep them framework-free.
- `profile.api.ts`: `getProfile()`, `updateProfile(dto)`, `uploadAvatar(fileUri)` (multipart via FormData on `apiClient`). `gym.api.ts`: `getGymInfo()`, `updateGymInfo(dto)`, `uploadLogo(fileUri, kind)`.
- `profile.store.ts`: `profile`, `isLoading`, `fetchProfile()`, `saveProfile(dto)` (on success, update `auth.store` user firstName/lastName/avatar so the drawer footer reflects changes), `changePassword(...)`.
- `SettingsScreen.tsx`: native-stack screen with a custom back header (`←` `testID="settings-back"`, title "Settings" — NOT the hamburger). Horizontal tab bar (`testID="settings-tab-profile"`, `settings-tab-security`, and for owner `settings-tab-gym`). Tab set derived from `auth role`: owner → 3 tabs, trainer/member → 2 tabs. Active tab styled per design.
- `ProfileTab.tsx`: fields per role (spec section 2). Avatar upload via `expo-image-picker`. Email is display-only. Required `*` on first/last name. Save button disabled until dirty (use the dirty-detection pattern from design.md). On save → toast success (use a lightweight toast; if none exists, a simple inline success message with `testID="settings-save-success"`). Show field errors from `validateProfile`.
- `SecurityTab.tsx`: current/new/confirm password inputs; on submit run `validatePassword`, call `changePassword`, clear fields + show success on 200, show "Current password is incorrect" on 400.
- `GymInfoTab.tsx` (owner only): loads `GET /gym/info` on mount, fields name/address/phone/email/website/hours/description + two logo uploads; save → `PATCH /gym/info`.

**Sprint Contract**:

*Unit tests:*
- [ ] `validateProfile > returns a firstName error when firstName is empty`
- [ ] `validatePassword > returns an error when newPassword has no uppercase letter`
- [ ] `validatePassword > returns an error when confirmPassword does not match newPassword`
- [ ] `validatePassword > returns no errors for "GoodPass1" matching confirm`
- [ ] `SettingsScreen > renders 3 tabs (Profile, Security, Gym Info) when role is owner`
- [ ] `SettingsScreen > renders exactly 2 tabs (Profile, Security) when role is member`
- [ ] `ProfileTab > populates first/last name inputs from the loaded profile`
- [ ] `ProfileTab > Save is disabled until a field changes`

*E2E (full flows in Stage 6; this stage adds the Settings golden spec):*
- [ ] `Owner: open Settings → Profile tab → change First Name → tap Save Profile → settings-save-success is visible`
- [ ] `Owner: Security tab → wrong current password → submit → an error message is visible`

**TDD sequence**:
1. Write failing `validation/profile.spec.ts` + `SettingsScreen.spec.tsx` + `ProfileTab.spec.tsx` → Red
2. Implement validation, API layer, store, Settings screen + tabs → Green
3. Add `mobile/e2e/owner/settings.spec.ts` golden + error specs → passes

**Status**: Not Started

---

## Stage 6: End-to-end flows (Detox)

**Goal**: The three spec-mandated golden paths pass on a real simulator against the running backend, using dev role-seeding for owner and member accounts.

**Implementation notes**:
- Seed an owner via the Stage 1 dev route (`POST /auth/dev/seed-user-role` with `role: 'owner'`) and a member via the existing `seed-user`, in `beforeAll`, mirroring `mobile/e2e/auth.spec.ts` setup (clear keychain, disable synchronization, explicit `waitFor`).
- Reuse the testIDs defined in Stages 3–5 (`drawer-hamburger`, `drawer-item-<screen>`, `drawer-user-footer`, `settings-tab-*`, `settings-save-success`, `screen-<name>`).
- These specs may consolidate the focused specs added in Stages 3–5 (keep them, just ensure the full golden path exists end to end).

**Sprint Contract**:

*E2E (Detox, real simulator + real backend):*
- [ ] `Owner golden path: login as owner → drawer-hamburger visible → open drawer → tap a placeholder nav item → its screen header visible → open Settings via user footer → edit Profile First Name → Save → settings-save-success visible → reopen drawer → footer shows the updated name`
- [ ] `Member drawer: login as member → open drawer → an OVERVIEW/Dashboard item is visible AND no drawer-item-Trainers / drawer-item-Equipment exists`
- [ ] `Security: open Settings → Security tab → enter current + valid new + matching confirm → Update Password → success message visible`

**TDD sequence**:
1. Write the three Detox specs against the agreed testIDs → Red (fail until backend running + screens wired)
2. Run against simulator + `backend pnpm start:dev` → iterate testIDs/waits until Green
3. Confirm the existing `mobile/e2e/auth.spec.ts` still passes (no regression on `home-screen`)

**Status**: Not Started

---

## Cross-cutting Definition of Done
- `cd backend && pnpm test && pnpm test:e2e && pnpm lint && pnpm build` all pass
- `cd mobile && pnpm test && pnpm lint` pass; Detox specs pass on the iOS simulator
- No `any`/`unknown` anywhere; no hardcoded hex colors in mobile (design tokens only)
- The existing `mobile/e2e/auth.spec.ts` still passes (the Dashboard keeps `testID="home-screen"`)
- `/simplify` run after each Green phase
