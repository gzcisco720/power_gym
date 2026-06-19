# Mobile Select Migration Implementation Plan

## Goal
Replace every hand-rolled Pressable/Button single-select picker (trainer / member / service-type) in the mobile app with the React Native Reusables `Select` component, and fix the SessionForm member-selection bug plus a custom-fee parity gap.

## Application
`mobile/`

## Scope
**In scope:**
- Replace single-select Pressable/Button pickers with Reusables `Select` in:
  - `CreateInviteBottomSheet.tsx` — trainer picker
  - `MembersScreen.tsx` — trainer filter (remove the picker `Modal`, inline `Select`)
  - `ReassignTrainerSheet.tsx` — trainer list
  - `TrainerMembersTab.tsx` — reassign target trainer picker
  - `SessionForm.tsx` — member, trainer, and service-type pickers
- Fix SessionForm member selection from multi-select (`memberIds: string[]`, `TOGGLE_MEMBER`) to single-select (`memberId: string`, `SET_MEMBER`)
- Add `customFee` field to SessionForm (`FormState`, reducer action, numeric Input, DTO) and `customFee?: number` to `CreateSessionInput`
- Update affected Jest unit specs and Detox E2E specs to drive the new `Select` interaction model

**Out of scope:**
- Multi-option choices that are not single-select pickers (e.g. SessionForm scope selector, role picker which is already a `Select`)
- `customFee` on the update/edit path (web only sends it on create) — only `CreateSessionInput`
- Backend changes (the `customFee` field is already accepted by the API per web parity; only the mobile DTO/type is added)
- Any visual redesign beyond swapping the picker control
- Re-adding the `Select` component via CLI — `mobile/src/components/ui/select.tsx` already exists; import from it directly

## Affected Files

**Stage 1 (Phase 1 pickers):**
- `mobile/src/screens/invites/CreateInviteBottomSheet.tsx` — modify (trainer picker → Select)
- `mobile/src/screens/members/MembersScreen.tsx` — modify (remove trainer-picker Modal, inline Select)
- `mobile/src/screens/members/components/ReassignTrainerSheet.tsx` — modify (trainer list → Select)
- `mobile/src/screens/trainers/components/TrainerMembersTab.tsx` — modify (reassign target → Select)
- `mobile/e2e/owner/invites.spec.ts` — modify (new Select interaction)
- `mobile/e2e/owner/member-assign.spec.ts` — modify (reassign + trainer-filter via Select)
- New/updated Jest specs colocated with each component (see contracts)

**Stage 2 (SessionForm):**
- `mobile/src/screens/calendar/components/SessionForm.tsx` — modify (bug fix + 3 Select pickers + customFee)
- `mobile/src/types/scheduled-sessions.ts` — modify (`customFee?: number` on `CreateSessionInput`)
- `mobile/src/screens/calendar/components/SessionForm.spec.tsx` — modify (single-select, Select interaction, customFee)
- `mobile/e2e/owner/calendar.spec.ts` — modify (member/service-type via Select)
- `mobile/e2e/trainer/calendar.spec.ts` — modify (member via Select)

**Reference (read-only, do not modify):**
- `mobile/src/components/ui/select.tsx` — Select API: `Select` (props `value: Option`, `onValueChange(option: Option | undefined)`), `SelectTrigger` (accepts `testID`), `SelectValue` (prop `placeholder`), `SelectContent`, `SelectItem` (props `value: string`, `label: string`). `Option = { value: string; label: string }`.
- `mobile/src/screens/invites/CreateInviteBottomSheet.tsx` role picker — canonical example of an in-app `Select` already wired up.

## Select Usage Contract (applies to every picker below)
- Selected state is an `Option` object (`{ value, label }`) or `undefined`; map domain ids/names to `Option` and back.
- `onValueChange` receives `Option | undefined` — read `option?.value` to get the id.
- `SelectTrigger` must carry a stable `testID` (e.g. `trainer-select-trigger`).
- Each `SelectItem` must carry `value={id}` and `label={name}` — Detox locates options by their rendered label text via `by.text(name)`.
- No `any` / `unknown` types anywhere. Define an explicit `Option` mapping helper if a component maps a list more than once.
- Keep the surrounding label/`*`/`(optional)` markup and density classes exactly as they are today.

---

## Stage 1: Phase 1 Picker Migrations

**Goal**: Trainer/member single-select pickers in the four Phase-1 screens use the Reusables `Select` component, with passing Jest unit specs and updated Detox golden-path specs.

**Sprint Contract**:

*Unit tests (one per new or changed function/method):*
- [x] `CreateInviteBottomSheet > trainer picker > renders a Select with one SelectItem per trainer (label = trainer name)` — asserts trigger testID `invite-trainer-select-trigger` present and an item label exists for each `trainers` entry
- [x] `CreateInviteBottomSheet > trainer picker > selecting a trainer sets trainerId and enables Send when owner+member+valid email` — drive `onValueChange`, assert save button `accessibilityState.disabled` is `false`
- [x] `CreateInviteBottomSheet > trainer picker > Send is disabled while needsTrainer and no trainer chosen` — asserts disabled state with valid email but no trainer
- [x] `MembersScreen > trainer filter > renders a Select (no picker Modal) with an "All trainers" placeholder and one item per trainer` — asserts trigger testID `trainer-filter-select` is a Select trigger and the old `trainer-filter-chip-*` Modal nodes are absent
- [x] `MembersScreen > trainer filter > choosing a trainer calls setTrainerFilter with that id; choosing All calls setTrainerFilter(null)` — asserts store setter args
- [x] `ReassignTrainerSheet > renders a Select with one item per trainer and calls onSelect(id) on change` — asserts `onSelect` called with selected trainer id
- [x] `TrainerMembersTab > reassign sheet > renders a Select of otherTrainers and triggers reassign on change` — asserts `reassignMember` store action called with `(currentTrainerId, memberId, targetTrainerId)`

*Integration / E2E (one per user-facing flow):*
- [x] Owner opens Create Invite, selects role Member, types a valid email, opens the trainer Select and taps a trainer by name → Send Invite becomes enabled and tapping it closes the sheet and shows the new invite (`mobile/e2e/owner/invites.spec.ts`)
- [x] Owner taps Reassign on a member, opens the trainer Select, taps a trainer by name → toast "Trainer assigned" appears and the member card remains; then opens the trainer-filter Select and picks a trainer → member list filters (`mobile/e2e/owner/member-assign.spec.ts`)

**TDD sequence**:
1. Update/author Jest specs above against current testIDs → Red
2. Swap each picker to `Select`, wiring `Option` mapping and `onValueChange` → Green
3. Update the two Detox specs to the new interaction (tap trigger → `by.text(name)` item), run against the simulator → passes

**Status**: Complete

---

## Stage 2: SessionForm — single-select bug fix, Select pickers, custom fee

**Goal**: SessionForm uses single member selection, three Reusables `Select` pickers (member / trainer / service-type), and a working optional Custom Fee field, with all unit and E2E specs green.

**Sprint Contract**:

*Unit tests (one per new or changed function/method):*
- [x] `SessionForm > formReducer > SET_MEMBER replaces memberId with the given id` — asserts single id stored, not appended
- [x] `SessionForm > formReducer > SET_SERVICE_TYPE stores serviceTypeId and recomputes endTime from durationMin` — asserts endTime = startTime + durationMin
- [x] `SessionForm > formReducer > SET_CUSTOM_FEE stores the raw string value` — asserts `customFee` updated
- [x] `SessionForm > buildInitialState > seeds memberId from session.memberIds[0] (empty string when none)` — asserts edit-mode prefill and create-mode default
- [x] `SessionForm > isValid > requires memberId non-empty plus date/start/end` — asserts save disabled until a single member is chosen
- [x] `SessionForm > handleSave > create DTO sends memberIds:[memberId] and customFee:parseFloat(customFee)||undefined` — asserts payload shape including omitted fee when blank

*Integration / E2E (one per user-facing flow):*
- [x] Owner opens New Session, opens the member Select and taps a member by name, sets date/start/end, opens the service-type Select and taps a type (end time auto-fills), enters a Custom Fee, taps Save → session card appears in the agenda (`mobile/e2e/owner/calendar.spec.ts`)
- [x] Trainer opens New Session, selects a single member via the member Select, fills date/start/end, saves → session card appears; attempting save with no member selected leaves the Save button disabled (`mobile/e2e/trainer/calendar.spec.ts`)

**TDD sequence**:
1. Update `SessionForm.spec.tsx`: change `TOGGLE_MEMBER`→`SET_MEMBER`, single-select assertions, Select-driven member/trainer/service-type, `SET_CUSTOM_FEE`, and add `customFee?: number` expectation to the create DTO → Red
2. Implement: rename `memberIds`→`memberId` in `FormState`/reducer/`buildInitialState`/`isValid`/`handleSave`; add `SET_MEMBER`, `SET_CUSTOM_FEE`, `customFee` to state and the Custom Fee numeric `Input` (`keyboardType="decimal-pad"`) after the custom-name field; swap member/trainer/service-type pickers to `Select` (service-type `onValueChange` looks the full `ServiceType` up from `serviceTypes` to dispatch `SET_SERVICE_TYPE` with `serviceTypeId` + `durationMin`); add `customFee?: number` to `CreateSessionInput` → Green
3. Update both calendar Detox specs to select member/service-type through the Select (tap trigger → `by.text(name)`), add the Custom Fee step, and assert the save-disabled edge case; run against the simulator → passes

**Status**: Complete
