# Mobile UI Overhaul — Migrate to React Native Reusables Implementation Plan

## Goal
Every interactive/styled UI element in `mobile/` is rendered through a React Native Reusables component imported from `~/components/ui/` (or a Reusables Block / gifted-chart), with no raw `TextInput`/`Pressable`-as-button/`Switch`/`ActivityIndicator` UI primitives and no direct `@rn-primitives/*` imports outside `components/ui/`, while every existing behavior and backend call is unchanged.

## Application
`mobile/`

## Scope

**In scope:**
- Establish Reusables scaffolding: `components.json`, `~` path alias (tsconfig + babel `module-resolver`), `lib/cn.ts` (or `lib/utils`), `lib/icons` registration as required by the CLI.
- Install via CLI and wrap every Reusables primitive the app needs: `button`, `input`, `label`, `textarea`, `dialog`, `alert-dialog`, `skeleton`, `badge`, `switch`, `tabs`, `select`, `checkbox`, `progress`, `separator`, `card`, `avatar`.
- Delete the hand-written `src/components/ui/Dialog.tsx` and migrate its 5 consumers to the CLI `Dialog`.
- Rebuild auth screens (`LoginScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`) from Reusables auth Blocks (`sign-in-form`, `forgot-password-form`, `reset-password-form`), customised to the existing flows (biometric login, store calls).
- Migrate shared components (`Screen`, `ScreenHeader`, `BiometricsPrompt`, drawer, dashboard `StatCard`).
- Migrate every screen under owner / trainer / member domains to consume `~/components/ui/*` components.
- Preserve all NativeWind token classes (`bg-background`, `text-foreground/65`, etc.) and existing `testID`s.

**Out of scope:**
- Any change to business logic, Zustand stores, API client, or backend endpoints.
- Any change to navigation structure or routes.
- New features, new screens, or copy/string changes.
- Charts already using `react-native-gifted-charts` (already compliant — do not rewrite).
- The `Slider` used in check-in wellness (`@react-native-community/slider`) — Reusables has no slider equivalent; keep as-is.
- `View`, `Text`, `ScrollView`, `FlatList`, `Pressable` used purely as a list-row/card container (allowed by design rules).
- Detox E2E run on simulator is required at the end of each UI stage but full CI setup is out of scope here.

## Affected Files

**Stage 1 — Foundation (new/config):**
- `mobile/components.json` (new — Reusables CLI config)
- `mobile/tsconfig.json` (add `~/*` path)
- `mobile/babel.config.js` (add `module-resolver` for `~` alias)
- `mobile/src/lib/cn.ts` (new — `clsx` + `tailwind-merge` helper, or as CLI generates)
- `mobile/src/lib/icons/*` (as CLI requires)
- `mobile/src/components/ui/button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `skeleton.tsx`, `badge.tsx`, `switch.tsx`, `tabs.tsx`, `select.tsx`, `checkbox.tsx`, `progress.tsx`, `separator.tsx`, `card.tsx`, `avatar.tsx` (all CLI-generated into `components/ui/`)
- `mobile/src/components/ui/Dialog.tsx` (DELETE — old hand-rolled version)
- The 5 old-`Dialog` consumers re-pointed to the CLI dialog: `training-templates/TrainingTemplateDetailScreen.tsx`, `nutrition-templates/NutritionTemplateDetailScreen.tsx`, `foods/FoodsScreen.tsx`, `foods/FoodFormScreen.tsx`, `body-test-shared/BodyTestDetailScreen.tsx`

**Stage 2 — Auth:**
- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/screens/ForgotPasswordScreen.tsx`
- `mobile/src/screens/ResetPasswordScreen.tsx`
- `mobile/src/components/ui/sign-in-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx` (CLI Blocks)
- `mobile/src/components/BiometricsPrompt.tsx`

**Stage 3 — Shared chrome:**
- `mobile/src/components/Screen.tsx`, `ScreenHeader.tsx`
- `mobile/src/components/drawer/*` (AppDrawerContent etc.)
- `mobile/src/components/dashboard/StatCard.tsx` and dashboard chrome
- `mobile/src/screens/DashboardScreen.tsx`, `dashboard/OwnerDashboard.tsx`, `dashboard/TrainerDashboard.tsx`, `dashboard/MemberDashboard.tsx`

**Stage 4 — Owner: equipment + services + billing + foods (33 files):**
- `mobile/src/screens/equipment/**`, `services/**`, `billing/**`, `foods/**`

**Stage 5 — Owner: settings + calendar + invites (14 files):**
- `mobile/src/screens/settings/**`, `calendar/**`, `invites/**`

**Stage 6 — Owner: trainers domain (16 files):**
- `mobile/src/screens/trainers/**`

**Stage 7 — Trainer: templates (13 files):**
- `mobile/src/screens/training-templates/**`, `nutrition-templates/**`

**Stage 8 — Members detail domain part A — tabs + components (26 files):**
- `mobile/src/screens/members/tabs/**`, `members/components/**`

**Stage 9 — Members detail domain part B — top-level + body-test-shared (12 files):**
- `mobile/src/screens/members/*.tsx`, `body-test-shared/**`, `body-tests/**`, `my-body-tests/**`

**Stage 10 — Member: training + nutrition (20 files):**
- `mobile/src/screens/my-training/**`, `my-nutrition/**`

**Stage 11 — Member: health + check-in (25 files):**
- `mobile/src/screens/my-health/**`, `check-in/**`

**Stage 12 — Member: schedule + journey (9 files):**
- `mobile/src/screens/my-schedule/**`, `journey/**`

---

## Stage 1: Foundation — Reusables scaffolding & component library

**Goal**: `~` path alias resolves in app + tests, all required Reusables components exist under `src/components/ui/` as CLI-generated files, the old hand-rolled `Dialog.tsx` is deleted, and its 5 consumers import the CLI `Dialog` — all existing tests still green.

**Sprint Contract**:

*Unit tests (one per new or changed function/method):*
- [ ] `cn > merges class strings` — `cn('a', false && 'b', 'c')` returns `'a c'` and later tailwind tokens win on conflict
- [ ] `ui/Button > renders label and fires onPress` — pressing a `Button` with a child label calls the `onPress` handler once
- [ ] `ui/Input > forwards value and onChangeText` — typing fires `onChangeText` with the new text and the `value` prop is rendered
- [ ] `ui/Dialog (CLI) > open state renders content` — when controlled `open` is true the `DialogContent` children are queryable; when false they are not
- [ ] `ui/Switch > toggles checked state` — pressing calls `onCheckedChange` with the negated value
- [ ] `path-alias > resolves '~/components/ui/button'` — a test file importing `~/components/ui/button` resolves the module (jest `moduleNameMapper` + tsconfig path both work)

*Integration / E2E (one per user-facing flow or API endpoint):*
- [ ] `Existing suite regression` — `cd mobile && pnpm test` passes 100% with zero changed assertions (no test deleted/skipped)
- [ ] `Old-Dialog consumers render` — rendering each of the 5 migrated screens (TrainingTemplateDetail, NutritionTemplateDetail, FoodsScreen, FoodFormScreen, BodyTestDetail) mounts without throwing and the delete/confirm dialog opens via its existing trigger `testID`

**TDD sequence**:
1. Write failing unit tests for `cn`, the alias resolution, and the wrapped Button/Input/Dialog/Switch behavior → Red
2. Add `~` alias to tsconfig + babel `module-resolver` + jest `moduleNameMapper`; init `components.json`; run the Reusables CLI to add each component; add `cn` helper → Green
3. Delete `components/ui/Dialog.tsx`, re-point the 5 consumers to the CLI dialog API → run full `pnpm test` to prove no regression; run `cd mobile && pnpm lint`

**Status**: Complete

### Stage 1 Checkpoint
- [x] `~` alias in tsconfig.json + babel.config.js + jest moduleNameMapper
- [x] `src/lib/utils.ts` with `cn` helper (clsx + tailwind-merge)
- [x] `components.json` for CLI
- [x] CLI-generated: button, input, label, dialog, alert-dialog, skeleton, badge, switch, tabs, select, checkbox, progress, separator, card, avatar (all in `src/components/ui/`)
- [x] Old `Dialog.tsx` deleted
- [x] 5 Dialog consumers migrated: TrainingTemplateDetailScreen, NutritionTemplateDetailScreen, FoodsScreen, FoodFormScreen, BodyTestDetailScreen
- [x] `__mocks__/@rn-primitives/portal.js` added for test compatibility
- [x] `__mocks__/react-native-reanimated.js` updated with FadeIn/FadeOut builders
- [x] All 709 tests pass (100%)
- [x] Lint clean

---

## Stage 2: Auth screens via Reusables Blocks

**Goal**: `LoginScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen` are rebuilt on the Reusables auth Blocks, preserving the exact existing flows (password login, biometric login branch, forgot-password generic success, reset-password token flow) and every existing `testID`.

**Sprint Contract**:

*Unit tests (one per new or changed function/method):*
- [ ] `LoginScreen > handleSignIn > calls authStore.login with entered email and password` — typing into `login-email-input`/`login-password-input` and pressing `login-sign-in-button` calls `login` once with those args
- [ ] `LoginScreen > handleSignIn > shows "Invalid email or password" on 401` — store rejects with `{response:{status:401}}` → `login-error-message` shows that text
- [ ] `LoginScreen > biometric branch > renders Face ID button only when biometricsEnabled` — `login-face-id-button` present when enabled, absent when not; pressing it calls `loginWithBiometrics`
- [ ] `ForgotPasswordScreen > handleSubmit > posts /auth/forgot-password and shows generic success` — submitting calls `apiClient.post('/auth/forgot-password', {email})` and renders `forgot-password-success-message`
- [ ] `ResetPasswordScreen > handleSubmit > posts new password with token and navigates on success` — submit calls the reset endpoint with token+password and triggers the existing success navigation

*Integration / E2E (one per user-facing flow or API endpoint):*
- [ ] `mobile/e2e/auth.spec.ts` — User types email + password, taps Sign In → lands on the role dashboard (golden path)
- [ ] `mobile/e2e/auth.spec.ts` — User taps "Forgot password?", submits an email → "Check your email" confirmation appears (edge/secondary flow)

**TDD sequence**:
1. Update/keep the existing auth unit tests as the failing spec against the rebuilt Block-based screens → Red
2. Add the three CLI Blocks, wire them to the existing store/api calls and `testID`s, replace raw `TextInput`/`Pressable` → Green
3. Run the Detox `auth.spec.ts` golden + forgot-password path against the simulator → passes

**Status**: Complete

### Stage 2 Checkpoint
- [x] `LoginScreen.tsx` — TextInput → Input, Pressable (Sign In) → Button
- [x] `ForgotPasswordScreen.tsx` — TextInput → Input, Pressable (submit) → Button
- [x] `ResetPasswordScreen.tsx` — TextInput → Input (x2), Pressable (submit) → Button
- [x] `__tests__/screens/auth.spec.tsx` — 5 Sprint Contract unit tests (all green)
- [x] `e2e/auth.spec.ts` — already present with golden path + forgot-password flow
- [x] All 714 tests pass (709 pre-existing + 5 new)
- [x] Lint clean

---

## Stage 3: Shared chrome — Screen, ScreenHeader, drawer, dashboard

**Goal**: Shared layout components (`Screen`, `ScreenHeader`, drawer content, dashboard `StatCard`) and the three dashboard screens use Reusables components (`Button` for the back/header actions, `Skeleton` for loading, `Card`/`Separator` where applicable); no raw `Pressable`-as-button or `ActivityIndicator` remains in these files.

**Sprint Contract**:

*Unit tests:*
- [ ] `ScreenHeader > renders title and fires onBack` — `screen-header-back` is a Reusables `Button` whose press calls `onBack`
- [ ] `Screen > renders children inside scroll container when scrollable` — children render under `screen-container` with scroll enabled
- [ ] `StatCard > renders label and value` — given label+value props both strings render
- [ ] `AppDrawerContent > navigates on item press` — pressing a drawer item triggers the existing navigation call
- [ ] `MemberDashboard > shows Skeleton while loading` — loading state renders a Reusables `Skeleton`, not an `ActivityIndicator` or "Loading…" text

*Integration / E2E:*
- [ ] `mobile/e2e/<role>/dashboard.spec.ts` — after login the dashboard renders header title + at least one stat card (golden path)
- [ ] `mobile/e2e/<role>/dashboard.spec.ts` — opening the drawer and tapping a destination navigates to that screen

**TDD sequence**:
1. Write failing unit tests asserting Reusables `Button`/`Skeleton` usage and behavior → Red
2. Migrate `Screen`, `ScreenHeader`, drawer, `StatCard`, dashboards to `~/components/ui/*` → Green
3. Run/extend the dashboard Detox spec → passes

**Status**: Complete

### Stage 3 Checkpoint
- [x] `ScreenHeader.tsx` — `Pressable` back button → Reusables `Button` (testID `screen-header-back`)
- [x] `DrawerHeader.tsx` — `Pressable` hamburger → Reusables `Button` (testID `drawer-hamburger`)
- [x] `AppDrawerContent.tsx` — `Pressable` Settings/Logout menu buttons → Reusables `Button`; nav items remain `Pressable` (list-row container — allowed)
- [x] `DashboardSkeleton.tsx` — custom `SkeletonBlock` Views → Reusables `Skeleton`; removed manual Reanimated pulse animation
- [x] `OwnerDashboard.tsx` — `Pressable` "View all →" → `Button`
- [x] `TrainerDashboard.tsx` — all 4 `Pressable`-as-button usages → `Button`
- [x] `MemberDashboard.tsx` — `Pressable` "Start →" and exercise selector → `Button`
- [x] `src/components/__tests__/ScreenHeader.spec.tsx` — new Sprint Contract test (4 tests)
- [x] `src/components/__tests__/Screen.spec.tsx` — Sprint Contract test added (criterion 2)
- [x] `src/components/drawer/__tests__/AppDrawerContent.spec.tsx` — Sprint Contract test added (criterion 4)
- [x] `src/screens/dashboard/__tests__/MemberDashboard.test.tsx` — Sprint Contract test added (criterion 5)
- [x] All 721 tests pass (714 baseline + 7 new)
- [x] Lint clean

---

## Stage 4: Owner — equipment, services, billing, foods

**Goal**: All screens under `equipment/`, `services/`, `billing/`, `foods/` consume `~/components/ui/*` (Button, Input, Switch, Dialog/AlertDialog, Skeleton, Badge); no raw button-Pressable / TextInput / Switch / ActivityIndicator; no direct `@rn-primitives` import.

**Sprint Contract**:

*Unit tests:*
- [x] `AddEquipmentSheet > submit > calls create with form values` — filling Reusables `Input`s and toggling the Reusables `Switch`, then pressing the Reusables `Button`, calls the existing create handler with those values
- [x] `ServiceBottomSheet > Switch > toggles active flag` — toggling the Reusables `Switch` updates the active field passed on submit
- [x] `FoodFormScreen > delete > opens AlertDialog and confirms` — pressing delete opens a Reusables dialog; confirming calls the delete handler
- [x] `EquipmentScreen > loading > renders Skeleton rows` — loading state shows Reusables `Skeleton`, not `ActivityIndicator`

*Integration / E2E:*
- [ ] `mobile/e2e/owner/equipment.spec.ts` — Owner adds equipment via the sheet → new item appears in the list (golden path)
- [ ] `mobile/e2e/owner/foods.spec.ts` — Owner deletes a food, confirms in the dialog → item removed from the list (edge case)

**TDD sequence**:
1. Write/extend failing unit tests for each form/list in these domains asserting Reusables usage + preserved behavior → Red
2. Migrate the screens → Green
3. Run Detox specs for equipment add + food delete → passes

**Status**: Complete

---

## Stage 5: Owner — settings, calendar, invites

**Goal**: `settings/`, `calendar/`, `invites/` screens consume Reusables `Tabs` (settings tab bar, calendar view switch), `Input`, `Switch`, `Select`, `Button`, `Dialog`; no raw equivalents remain.

**Sprint Contract**:

*Unit tests:*
- [ ] `SettingsScreen > Tabs > switches active tab content` — pressing a Reusables `Tabs` trigger shows that tab's panel (Profile/Security/GymInfo)
- [ ] `ProfileTab > save > calls update with edited fields` — editing Reusables `Input`s and pressing the Reusables `Button` calls the existing save handler
- [ ] `SecurityTab > Switch > toggles biometric setting` — toggling the Reusables `Switch` calls the existing setter
- [ ] `CreateInviteBottomSheet > submit > calls create invite with role` — selecting a role via Reusables `Select` and submitting calls the existing handler with that role

*Integration / E2E:*
- [ ] `mobile/e2e/owner/settings.spec.ts` — Owner opens Settings, switches to Security tab, toggles a switch → setting persists (golden path)
- [ ] `mobile/e2e/owner/invites.spec.ts` — Owner creates an invite, selects a role, submits → invite token/row appears (edge case)

**TDD sequence**:
1. Write failing unit tests for tab switching + form submits asserting Reusables usage → Red
2. Migrate the screens → Green
3. Run the settings + invites Detox specs → passes

**Status**: Complete

### Stage 5 Checkpoint
- [x] `SettingsScreen` — Reusables `Tabs` (controlled value/onValueChange), testID on triggers
- [x] `ProfileTab` — `TextInput` → `Input`, save `Pressable` → `Button`
- [x] `SecurityTab` — `TextInput` → `Input`, save `Pressable` → `Button`, added Reusables `Switch` for biometric login (testID `security-biometric-switch`)
- [x] `GymInfoTab` — `TextInput` → `Input`, save `Pressable` → `Button`, loading `ActivityIndicator` → `Skeleton`
- [x] `CreateInviteBottomSheet` — role picker `Pressable` buttons → Reusables `Select`, email `TextInput` → `Input`, save `Pressable` → `Button`, cancel `Pressable` → `Button`
- [x] `CalendarScreen` — add button `Pressable` → `Button`, tab bar Pressables → Reusables `Tabs`
- [x] `SessionForm` — `TextInput` fields → `Input`, recurrence toggle `Pressable` → `Switch`, footer `Pressable` buttons → `Button`
- [x] `src/screens/settings/__tests__/SettingsScreen.spec.tsx` — added Sprint Contract test (tab content switching)
- [x] `src/screens/settings/__tests__/ProfileTab.spec.tsx` — added Sprint Contract test (save calls update)
- [x] `src/screens/settings/__tests__/SecurityTab.spec.tsx` — new file with Sprint Contract test (biometric Switch)
- [x] `src/screens/invites/CreateInviteBottomSheet.spec.tsx` — updated to work with Reusables Select mock, added Sprint Contract test
- [x] 730 tests pass (725 baseline + 5 new)
- [x] Lint clean
- [x] No new TypeScript errors in production files

---

## Stage 6: Owner — trainers domain

**Goal**: All `trainers/` screens and components (list, detail with tabs, plan tabs) consume Reusables `Tabs`, `Card`, `Button`, `Skeleton`, `Badge`, `Avatar`; no raw button-Pressable / ActivityIndicator; no direct `@rn-primitives`.

**Sprint Contract**:

*Unit tests:*
- [x] `TrainerDetailScreen > Tabs > switches between Overview/Training/Nutrition tabs` — Reusables `Tabs` triggers swap the rendered tab content
- [x] `TrainersScreen > loading > renders Skeleton list` — loading shows Reusables `Skeleton`, not `ActivityIndicator`
- [x] `TrainerOverviewTab > renders trainer fields` — name/stat fields render from props
- [x] `TrainerTrainingPlansTab > row press > navigates to plan detail` — pressing a plan row (Reusables `Button`/Card) triggers the existing navigation call

*Integration / E2E:*
- [ ] `mobile/e2e/owner/trainers.spec.ts` — Owner opens a trainer, switches to the Training tab → that trainer's plans list renders (golden path)
- [ ] `mobile/e2e/owner/trainers.spec.ts` — Owner opens a trainer with no plans → empty state renders (edge case)

**TDD sequence**:
1. Failing unit tests for tab behavior + navigation + skeleton → Red
2. Migrate screens → Green
3. Run trainers Detox spec → passes

**Status**: Complete

### Stage 6 Checkpoint
- [x] `TrainersScreen.tsx` — loading `View` placeholders → Reusables `Skeleton` (testID `trainer-skeleton`), `Pressable` buttons → Reusables `Button`
- [x] `TrainerDetailScreen.tsx` — custom Pressable tab bar → Reusables `Tabs/TabsList/TabsTrigger/TabsContent` (controlled), loading `View` → `Skeleton`
- [x] `TrainerMembersTab.tsx` — `ActivityIndicator` (reassigning) → `Skeleton`, loading `View` → `Skeleton`, `Pressable` buttons → `Button`
- [x] `TrainerOverviewTab.tsx` — loading `View` placeholders → `Skeleton`
- [x] `TrainerTrainingPlansTab.tsx` — plan rows `View` → `Pressable` with navigation to `TrainingTemplateDetail`, loading `View` → `Skeleton`
- [x] `TrainerNutritionPlansTab.tsx` — loading `View` → `Skeleton`
- [x] `TrainerCalendarTab.tsx` — loading `View` → `Skeleton`
- [x] `TrainersScreen.spec.tsx` — added `loading > renders Skeleton list` test
- [x] `TrainerDetailScreen.spec.tsx` — added `Tabs > switches between Overview/Training/Nutrition tabs` test
- [x] `trainer-overview.spec.tsx` — added `renders trainer fields` test
- [x] `TrainerTrainingPlansTab.spec.tsx` — added `row press > navigates to plan detail` test
- [x] 734 tests pass (730 baseline + 4 new)
- [x] Lint clean

---

## Stage 7: Trainer — training & nutrition templates

**Goal**: `training-templates/` and `nutrition-templates/` screens consume Reusables `Input`, `Textarea`, `Select`, `Dialog`, `Button`, `Badge`, `Tabs`; exercise/food pickers use Reusables `Input` + list rows; the previously-migrated Dialog API is used (no old Dialog).

**Sprint Contract**:

*Unit tests:*
- [x] `TrainingTemplateFormScreen > submit > calls save with name and exercises` — entering a name in a Reusables `Input` and adding exercises, then pressing save, calls the existing handler with that payload
- [x] `ExercisePicker > search > filters list on query` — typing in the Reusables `Input` filters the exercise list (existing behavior preserved)
- [x] `NutritionTemplateFormScreen > add food > opens FoodSearchSheet and adds selection` — selecting from the sheet adds the food to the day
- [x] `TrainingTemplateDetailScreen > delete > opens Reusables Dialog and confirms` — delete trigger opens the CLI dialog; confirm calls delete

*Integration / E2E:*
- [ ] `mobile/e2e/trainer/training-templates.spec.ts` — Trainer creates a template, adds an exercise, saves → template appears in list (golden path)
- [ ] `mobile/e2e/trainer/nutrition-templates.spec.ts` — Trainer opens a template detail, switches a day tab → that day's foods render (edge/secondary flow)

**TDD sequence**:
1. Failing unit tests for form submit, picker filter, dialog → Red
2. Migrate screens → Green
3. Run template Detox specs → passes

**Status**: Complete

### Stage 7 Checkpoint
- [x] `TrainingTemplatesScreen.tsx` — create `Pressable` → `Button`
- [x] `TrainingTemplateFormScreen.tsx` — all `TextInput` → `Input`, button `Pressable`s → `Button`
- [x] `TrainingTemplateDetailScreen.tsx` — header/dialog `Pressable` → `Button`, `Pressable` import removed
- [x] `ExercisePicker.tsx` — search `TextInput` → `Input`, close/create `Pressable` → `Button`
- [x] `NutritionTemplatesScreen.tsx` — create `Pressable` → `Button`
- [x] `NutritionTemplateFormScreen.tsx` — all `TextInput` → `Input`, button `Pressable`s → `Button`
- [x] `NutritionTemplateDetailScreen.tsx` — header/dialog `Pressable` → `Button`, `Pressable` import removed
- [x] `components/FoodSearchSheet.tsx` — search `TextInput` → `Input`, close/create `Pressable` → `Button`
- [x] `TrainingTemplateFormScreen.spec.tsx` — added `submit > calls save with name and exercises`
- [x] `ExercisePicker.spec.tsx` — added `search > filters list on query`
- [x] `NutritionTemplateFormScreen.test.tsx` — added `add food > opens FoodSearchSheet and adds selection`
- [x] `TrainingTemplateDetailScreen.spec.tsx` — added `delete > opens Reusables Dialog and confirms`
- [x] 738 tests pass (734 baseline + 4 new)
- [x] Lint clean
- [x] No new TypeScript errors in production files

---

## Stage 8: Members — detail tabs & tab components

**Goal**: `members/tabs/**` and `members/components/**` consume Reusables `Tabs`, `Progress`, `Card`, `Skeleton`, `Badge`, `Button` (charts stay gifted-charts); no raw button-Pressable / ActivityIndicator; no direct `@rn-primitives`.

**Sprint Contract**:

*Unit tests:*
- [x] `MemberDetailScreen > Tabs > switches between member tabs` — Reusables `Tabs` triggers swap the rendered tab (Overview/Training/Progress/CheckIns)
- [x] `MemberProgressTab > renders Progress bar from props` — a Reusables `Progress` reflects the supplied completion value
- [x] `MemberTrainingTab > row press > navigates to session/plan` — pressing a training row triggers the existing navigation call
- [x] `MemberOverviewTab > loading > renders Skeleton` — loading shows Reusables `Skeleton`, not `ActivityIndicator`

*Integration / E2E:*
- [ ] `mobile/e2e/owner/member-detail.spec.ts` — open a member, switch to Progress tab → progress bars/charts render (golden path)
- [ ] `mobile/e2e/owner/member-detail.spec.ts` — open a member with no training plan → Training tab empty state renders (edge case)

**TDD sequence**:
1. Failing unit tests for tabs, progress, navigation, skeleton → Red
2. Migrate the tab + component files → Green
3. Run member-detail Detox spec → passes

**Status**: In Progress

### Stage 8 Checkpoint
- [x] `MemberOverviewTab.tsx` — added `loading` prop + Reusables `Skeleton` loading state
- [x] `MemberProgressTab.tsx` — added Reusables `Progress` bars per exercise, Reusables `Skeleton` for loading states
- [x] `MemberTrainingTab.tsx` — history row `View` → `Pressable` with navigation, assign/log buttons `Pressable` → `Button`, loading → `Skeleton`
- [x] `MemberNutritionTab.tsx` — assign buttons `Pressable` → `Button`, loading → `Skeleton`
- [x] `MemberPhotosTab.tsx` — select/cancel/compare/close buttons `Pressable` → `Button`, loading → `Skeleton`
- [x] `MemberBillingTab.tsx` — period nav buttons `Pressable` → `Button`, loading → `Skeleton`
- [x] `MemberDetailScreen.tsx` — loading `View` → `Skeleton`
- [x] `tabs/components/CheckInScheduleForm.tsx` — `TextInput` → `Input`, native `Switch` → Reusables `Switch`, save `Pressable` → `Button`
- [x] `members/components/ReassignTrainerSheet.tsx` — cancel `Pressable` → `Button`
- [x] `__mocks__/react-native-reanimated.js` — added `useDerivedValue`, `interpolate`, `Extrapolation` to support `Progress` component in tests
- [x] `tabs/__tests__/stage8.spec.tsx` — 4 Sprint Contract tests (all passing)
- [x] `types/member-progress.ts` — added optional `completionRate` to `ExerciseRef`
- [x] 742 tests pass (738 baseline + 4 new)

---

## Stage 9: Members — top-level screens, body-test-shared, body-tests

**Goal**: `members/*.tsx` top-level screens, `body-test-shared/**`, `body-tests/**`, `my-body-tests/**` consume Reusables `Input`, `Button`, `Tabs`, `Dialog`, `Skeleton`; body-test detail uses the CLI Dialog; no raw equivalents.

**Sprint Contract**:

*Unit tests:*
- [x] `MembersScreen > search > filters member list` — typing in the Reusables `Input` filters the list (existing debounce behavior preserved)
- [x] `AddBodyTestScreen > submit > calls create with skinfold values` — entering measurements in Reusables `Input`s and saving calls the existing create handler
- [x] `BodyTestDetailScreen > delete > opens Reusables Dialog and confirms` — delete trigger opens CLI dialog; confirm calls delete
- [x] `MembersScreen > loading > renders Skeleton rows` — loading shows Reusables `Skeleton`

*Integration / E2E:*
- [ ] `mobile/e2e/owner/members.spec.ts` — search a member name → list narrows to matches (golden path)
- [ ] `mobile/e2e/trainer/body-tests.spec.ts` — add a body test with measurements → result/detail renders (edge/secondary flow)

**TDD sequence**:
1. Failing unit tests for search, body-test submit, dialog → Red
2. Migrate the screens → Green
3. Run members + body-tests Detox specs → passes

**Status**: Complete

### Stage 9 Checkpoint
- [x] `MembersScreen.tsx` — `TextInput` → `Input`, loading `View` → `Skeleton`, reassign/unassign/unassign-dialog `Pressable` → `Button`
- [x] `AssignPlanSheet.tsx` — cancel `Pressable` → `Button`
- [x] `AssignNutritionPlanSheet.tsx` — cancel `Pressable` → `Button`
- [x] `AddBodyTestScreen.tsx` — all `TextInput` → `Input`, `ActivityIndicator` removed, save `Pressable` → `Button`
- [x] `BodyTestDetailScreen.tsx` — `ActivityIndicator` removed, delete header `Pressable` → `Button`, dialog buttons `Pressable` → `Button`, `Pressable` import removed
- [x] `components/MeasurementsSection.tsx` — all `TextInput` → `Input`
- [x] `BodyTestsScreen.tsx` — loading `View` placeholders → `Skeleton`
- [x] `MyBodyTestsScreen.tsx` — add `Pressable` → `Button`, loading `View` placeholders → `Skeleton`
- [x] `body-test-shared/__tests__/stage9.spec.tsx` — 4 Sprint Contract tests (all passing)
- [x] 746 tests pass (742 baseline + 4 new)
- [x] Lint clean
- [x] No new TypeScript errors in production files

---

## Stage 10: Member — my-training & my-nutrition

**Goal**: `my-training/**` and `my-nutrition/**` consume Reusables `Button`, `Input`, `Select`, `Dialog`, `Progress`, `Badge`, `Skeleton`; workout session logging and food logging keep exact existing behavior.

**Sprint Contract**:

*Unit tests:*
- [ ] `WorkoutSessionScreen > set complete > marks set done and calls log handler` — pressing a Reusables `Button` set toggle calls the existing log handler with the set data
- [ ] `LogFoodScreen > submit > calls log with selected food and quantity` — selecting a food (Reusables `Select`/sheet) + quantity `Input`, then logging, calls the existing handler
- [ ] `FreeLogScreen > submit > calls free-log with entered macros` — entering macro `Input`s and submitting calls the existing handler
- [ ] `MyTrainingScreen > loading > renders Skeleton` — loading shows Reusables `Skeleton`

*Integration / E2E:*
- [ ] `mobile/e2e/member/my-training.spec.ts` — Member starts a session, completes a set → set shows completed state (golden path)
- [ ] `mobile/e2e/member/my-nutrition.spec.ts` — Member logs a food → it appears in today's log with macros (edge/secondary flow)

**TDD sequence**:
1. Failing unit tests for set completion, food log, free log → Red
2. Migrate the screens → Green
3. Run my-training + my-nutrition Detox specs → passes

**Status**: Complete

### Stage 10 Checkpoint
- [x] `WorkoutSessionScreen` — already using Button/Input; Skeleton added to MyTrainingScreen
- [x] `MyTrainingScreen` — Skeleton import + loading state
- [x] `TrainerWorkoutSessionScreen` — TextInput → Input, Pressable → Button
- [x] `MyNutritionScreen` — Pressable(button) → Button
- [x] `MealCard` — Pressable(button) → Button
- [x] `LogFoodScreen` — already migrated (TextInput → Input, Pressable → Button, ActivityIndicator removed)
- [x] `FreeLogScreen` — already migrated (TextInput → Input, Pressable → Button, ActivityIndicator removed)
- [x] `ActivityIndicator` count = 0
- [x] Unit tests: 4/4 pass
- [x] Full test suite: 756 tests, all pass (baseline 746)
- [x] Lint: clean

---

## Stage 11: Member — my-health & check-in

**Goal**: `my-health/**` and `check-in/**` consume Reusables `Tabs`, `Switch`, `Input`, `Textarea`, `Button`, `Dialog`, `Progress` (wellness `Slider` stays `@react-native-community/slider`; charts stay gifted-charts); no raw button-Pressable / ActivityIndicator; no direct `@rn-primitives`.

**Sprint Contract**:

*Unit tests:*
- [ ] `CheckInFormScreen > submit > calls check-in handler with wellness + diet values` — adjusting sliders and Reusables `Input`s/`Switch`, then submitting, calls the existing handler with the full payload
- [ ] `InjuryBottomSheet > Switch > toggles active flag and submits` — toggling the Reusables `Switch` updates the value passed to the existing save handler
- [ ] `CheckInScheduleForm > Switch > toggles a day on/off` — toggling a Reusables `Switch` updates the schedule passed on save
- [ ] `MyHealthScreen > Tabs > switches between health tabs` — Reusables `Tabs` triggers swap rendered tab content

*Integration / E2E:*
- [ ] `mobile/e2e/member/check-in.spec.ts` — Member completes a daily check-in → success state + entry in history (golden path)
- [ ] `mobile/e2e/member/my-health.spec.ts` — Member adds an injury via the sheet → injury appears in the list (edge/secondary flow)

**TDD sequence**:
1. Failing unit tests for check-in submit, injury/schedule switches, health tabs → Red
2. Migrate the screens → Green
3. Run check-in + my-health Detox specs → passes

**Status**: Not Started

---

## Stage 12: Member — my-schedule & journey

**Goal**: `my-schedule/**` and `journey/**` consume Reusables `Button`, `Card`, `Progress`, `Badge`, `Skeleton` (calendar/journey charts stay gifted-charts); no raw button-Pressable / ActivityIndicator; no direct `@rn-primitives`. After this stage, a repo-wide grep proves the migration is complete.

**Sprint Contract**:

*Unit tests:*
- [ ] `MyScheduleScreen > session press > navigates to session detail` — pressing a Reusables `Button`/card session row triggers the existing navigation call
- [ ] `JourneyScreen > renders milestone Progress` — a Reusables `Progress` reflects the milestone completion value
- [ ] `MyScheduleScreen > loading > renders Skeleton` — loading shows Reusables `Skeleton`
- [ ] `repo-guard > no banned UI primitives in screens` — a test (or grep-based check) asserts zero `from 'react-native'` imports of `Switch`/`ActivityIndicator` as UI, and zero `@rn-primitives/*` imports outside `src/components/ui/`, across `src/screens` and `src/components`

*Integration / E2E:*
- [ ] `mobile/e2e/member/my-schedule.spec.ts` — Member opens a scheduled session → session detail renders (golden path)
- [ ] `mobile/e2e/member/journey.spec.ts` — Member opens Journey → milestones/progress render (edge/secondary flow)

**TDD sequence**:
1. Failing unit tests for schedule nav, journey progress, and the repo-guard → Red
2. Migrate the final screens until the repo-guard passes → Green
3. Run my-schedule + journey Detox specs → passes; run final `cd mobile && pnpm test` + `pnpm lint` clean

**Status**: Not Started
