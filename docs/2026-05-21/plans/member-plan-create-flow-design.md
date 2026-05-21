# Member Nutrition Plan Create Flow — Design

**Date:** 2026-05-21  
**Status:** Approved

---

## Problem

The existing "Change Plan / Assign Plan" dialog only lets trainers select a pre-existing template and assign it directly. Trainers cannot create a custom plan from scratch, nor can they fine-tune a template before assigning it. There is also no way to set the schedule at assignment time — trainers must manually open the Schedule sheet after assignment.

---

## Solution Overview

Replace the simple `AssignDialog` with a full multi-step create flow:

1. **Popup** — searchable combobox: pick a template (optional) or leave blank for scratch
2. **Editor page** — full plan editor, pre-filled if template selected, empty if scratch
3. **Schedule sheet** — slides in after "Continue", using the existing `ScheduleEditor`
4. **Atomic save** — plan + schedule saved together on final "Save Plan & Schedule"
5. **Redirect** — back to the member's nutrition tab with fresh data

---

## User Flow

```
Click "Change Plan" / "Assign Plan"
  ↓
Dialog: searchable combobox (optional template) + "Open Editor →"
  ↓
/trainer/members/[id]/nutrition/new  (+ ?templateId=xxx if template selected)
  ↓
MemberNutritionPlanForm:
  - name (required)
  - day types + meals + food items  (pre-filled or empty)
  - footer: [✓ Save as template  templateName___]  Cancel  "Continue → Set Schedule"
  ↓
Schedule sheet opens (existing ScheduleEditor)
  ↓
"Save Plan & Schedule" clicked:
  1. If saveAsTemplate → POST /api/nutrition-templates  → get templateId
  2. POST /api/members/[id]/nutrition  { name, dayTypes, schedule, templateId? }
  ↓
Redirect to /trainer/members/[id]/nutrition  (page re-fetches fresh data)
```

---

## Pages & Components

### New page: `src/app/(dashboard)/trainer/members/[id]/nutrition/new/page.tsx`

Server component. If `?templateId` is present, fetches the template and validates ownership. Passes `initialData` to the client form component. If `?templateId` is absent, passes `null`.

```typescript
interface PageProps {
  params: { id: string };
  searchParams: { templateId?: string };
}
```

### New client component: `.../new/_components/member-nutrition-plan-form.tsx`

Handles all editing state. Structure mirrors `NutritionTemplateForm` for day types / meals / food items but with a different footer and no description field.

**State:**
- `name: string`
- `dayTypes: IDayType[]`
- `saveAsTemplate: boolean`
- `templateName: string`
- `scheduleOpen: boolean` — controls whether the Schedule sheet is visible
- `pendingSchedule: ISchedule | null` — schedule state while sheet is open

**Footer (sticky):**
```
[ ✓ Save as template   [template name input] ]          Cancel   Continue → Set Schedule
```
- "Continue" is disabled until `name` is non-empty and `dayTypes.length > 0`
- Clicking "Continue" opens the schedule sheet (does NOT save anything to DB yet)

**Schedule sheet:**
- Uses existing `ScheduleEditor` component
- Save button label: "Save Plan & Schedule →"
- On save:
  1. If `saveAsTemplate`: `POST /api/nutrition-templates` `{ name: templateName, dayTypes }`
  2. `POST /api/members/[id]/nutrition` `{ name, dayTypes, schedule, templateId? }`
  3. `router.push(`/trainer/members/${id}/nutrition`)`

### Updated: `trainer-member-nutrition-client.tsx`

Replace `AssignDialog` with `ChangePlanDialog`:

- Shadcn `Dialog` + `Command`/`Popover` combobox for searchable template list
- Selecting a template or leaving blank, then clicking "Open Editor →" navigates to the new page
- Navigation: `router.push(`/trainer/members/${memberId}/nutrition/new${templateId ? `?templateId=${templateId}` : ''}`)`

---

## API Changes

### `POST /api/members/[memberId]/nutrition`

**Old bodies (replaced):**
```typescript
{ templateId: string }
{ name: string; dayTypes: IDayType[] }
```

**New body (single unified format):**
```typescript
{
  name: string;
  dayTypes: IDayType[];
  schedule: ISchedule;      // required — no orphan plans without schedule
  templateId?: string;      // optional — records origin template
}
```

Backend no longer fetches templates itself. The caller always sends complete `dayTypes`. Schedule is applied atomically at creation.

**Repository change:** `MemberNutritionPlanRepository.create()` accepts `schedule` in `CreateMemberNutritionPlanData`.

---

## "Save as Template" Behaviour

- Checkbox in editor footer, unchecked by default
- When checked: a text input appears for the template name (defaults to plan name)
- On final save: client first `POST /api/nutrition-templates` with `{ name: templateName, dayTypes }`, then uses the returned `_id` as `templateId` in the member plan POST
- The newly created template appears in the trainer's template list immediately
- If the save-as-template POST fails: show error toast, abort — do not create the member plan

---

## Validation

| Rule | Where enforced |
|------|---------------|
| Plan name required | "Continue" button disabled |
| At least 1 day type required | "Continue" button disabled |
| At least 1 day mapped in weekly pattern OR at least 1 calendar override | "Save Plan & Schedule" disabled |
| Template name required if "Save as template" is checked | "Continue" button disabled |

---

## Error Handling

- Save-as-template POST fails → toast error, do not proceed with plan creation
- Plan POST fails → toast error, schedule sheet stays open (user can retry)
- Network error → toast error

## Email Notification

The existing member notification email (sent when a plan is assigned) is triggered in the POST `/api/members/[memberId]/nutrition` handler. No change needed — it fires as before on every successful plan creation.

---

## E2E Test Coverage

File: `e2e/trainer/nutrition.spec.ts` (extend existing)

### New tests required:

1. **Assign plan from scratch**
   - Click "Assign Plan" → dialog opens
   - Leave combobox empty → "Open Editor →"
   - Fill name + add day type + add meal + add food item
   - Click "Continue → Set Schedule"
   - Set Mon = day type in schedule sheet
   - Click "Save Plan & Schedule"
   - Redirects to member nutrition tab; new plan name is visible

2. **Assign plan from template (with micro-edit)**
   - Click "Assign Plan" → search & select a template in combobox
   - "Open Editor →" — editor pre-filled with template data
   - Edit plan name to something custom
   - Click "Continue → Set Schedule" → schedule sheet opens
   - Save → redirects to tab; custom plan name is visible

3. **Save as template checkbox**
   - Create a plan from scratch with "Save as template" checked
   - After save, navigate to `/trainer/nutrition`
   - Newly saved template name appears in the list

4. **Validation gate**
   - "Continue" button is disabled when name is empty
   - "Continue" button is disabled when no day types exist

5. **Change Plan flow (existing plan)**
   - When a plan is already active, clicking "Change Plan" → same dialog and flow
   - After save, old plan is deactivated and new plan is shown

---

## Files Summary

| Path | Change |
|------|--------|
| `src/app/(dashboard)/trainer/members/[id]/nutrition/new/page.tsx` | **New** — server component |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/new/_components/member-nutrition-plan-form.tsx` | **New** — client form |
| `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx` | **Edit** — replace AssignDialog with ChangePlanDialog |
| `src/app/api/members/[memberId]/nutrition/route.ts` | **Edit** — new POST body schema |
| `src/lib/repositories/member-nutrition-plan.repository.ts` | **Edit** — add schedule to create() |
| `e2e/trainer/nutrition.spec.ts` | **Edit** — add 5 new test scenarios |
| `__tests__/app/api/members-nutrition.test.ts` | **Edit** — update for new POST schema |
| `__tests__/app/trainer/members/trainer-member-nutrition-client.test.tsx` | **Edit** — update for ChangePlanDialog |
