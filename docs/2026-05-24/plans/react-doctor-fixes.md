# React Doctor 689-Issue Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 689 react-doctor issues across 9 categories in the power_gym Next.js codebase.

**Architecture:** Grouped into 8 sequential stages by risk and dependency. Stages 1–3 fix hard errors and security. Stages 4–6 fix React correctness and accessibility. Stages 7–8 handle mechanical/bulk fixes via scripted patterns. Each stage ends with a full test + lint run before proceeding. Skip modifications to `src/components/ui/` (shadcn primitives per CLAUDE.md).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, Auth.js v5, Mongoose, shadcn/ui, Framer Motion, pnpm.

---

## Stage 1 — Critical Errors

### Task 1: Fix Invalid ARIA `role` Prop on AppShell, InjuryClient, BillingSummaryClient

React-doctor flags `role="trainer"` etc. as invalid ARIA roles because the prop is named `role`. These are component props (type `UserRole`), not HTML aria attributes. Fix: rename the prop to `userRole` project-wide.

**Files to Modify:**
- `src/components/shared/app-shell.tsx`
- `src/components/shared/billing-summary-client.tsx` → actually `src/components/billing/billing-summary-client.tsx`
- `src/app/(dashboard)/trainer/members/[id]/health/_components/injury-client.tsx`
- All pages that pass `role=` to these components (see grep below)
- `__tests__/components/shared/app-shell.test.tsx`
- `__tests__/components/shared/app-shell-active-state.test.tsx`
- `__tests__/app/trainer/members/health/injury-client.test.tsx`

- [ ] **Step 1.1: Find all call sites**
```bash
grep -rn 'role="owner"\|role="trainer"\|role="member"' src/ --include="*.tsx" --include="*.ts"
grep -rn 'role="owner"\|role="trainer"\|role="member"' __tests__/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 1.2: Rename prop in AppShell**

In `src/components/shared/app-shell.tsx`, change the `SidebarContentProps` and `AppShellProps` interfaces and all usages inside the file:
```tsx
// Before:
interface AppShellProps {
  role: UserRole;
  ...
}
export function AppShell({ role, ... }: AppShellProps) {
  ...
  <SidebarContent role={role} ... />
}

// After:
interface AppShellProps {
  userRole: UserRole;
  ...
}
export function AppShell({ userRole, ... }: AppShellProps) {
  ...
  <SidebarContent userRole={userRole} ... />
}
```
Apply the same rename inside `SidebarContentProps` and `SidebarContent`. Also update these internal usages:
- `NAV[role]` → `NAV[userRole]`
- `{role} portal` → `{userRole} portal`
- `text-[10px] capitalize ...>{role}<` → `>{userRole}<`
- `href={\`/${role}/settings\`}` → `href={\`/${userRole}/settings\`}`

- [ ] **Step 1.3: Rename prop in InjuryClient**

In `src/app/(dashboard)/trainer/members/[id]/health/_components/injury-client.tsx`, rename `role` prop to `userRole` in the props interface and all internal uses.

- [ ] **Step 1.4: Rename prop in BillingSummaryClient**

In `src/components/billing/billing-summary-client.tsx`, rename `role` prop to `userRole`.

- [ ] **Step 1.5: Update all pages that pass the prop**

For each call site found in Step 1.1, change `role="owner"` → `userRole="owner"` (or trainer/member). Key files include:
- `src/app/(dashboard)/owner/billing/page.tsx`
- `src/app/(dashboard)/trainer/billing/page.tsx`
- The dashboard layout files that render `<AppShell>`
- All trainer member health pages

- [ ] **Step 1.6: Update test files**

In `__tests__/components/shared/app-shell.test.tsx` (6 occurrences):
```tsx
// Before: <AppShell role="member" userName="Eric Gong">
// After:  <AppShell userRole="member" userName="Eric Gong">
```

In `__tests__/components/shared/app-shell-active-state.test.tsx` (3 occurrences): same rename.

In `__tests__/app/trainer/members/health/injury-client.test.tsx` (3 occurrences):
```tsx
// Before: render(<InjuryClient memberId="m1" initialInjuries={[mockInjury]} role="trainer" />)
// After:  render(<InjuryClient memberId="m1" initialInjuries={[mockInjury]} userRole="trainer" />)
```

- [ ] **Step 1.7: Fix remaining billing page aria-role**

The billing pages also have `role="owner"` on a component. Those are covered by Step 1.5.

- [ ] **Step 1.8: Verify**
```bash
pnpm test -- --testPathPattern="app-shell|injury-client" --no-coverage
```
Expected: all tests pass. TypeScript must also compile cleanly:
```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 1.9: Commit**
```bash
git add -p
git commit -m "fix(a11y): rename role prop to userRole in AppShell, InjuryClient, BillingSummaryClient"
```

---

### Task 2: Fix role-has-required-aria-props (combobox missing aria-controls)

**Files to Modify:**
- `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx` (line 410)

- [ ] **Step 2.1: Add aria-controls to combobox**

Open the file at line 410. Find the element with `role="combobox"`. Add `aria-controls` pointing to the id of the listbox/dropdown it controls:
```tsx
// Before:
<input role="combobox" aria-expanded={open} ... />

// After:
<input
  role="combobox"
  aria-expanded={open}
  aria-controls="nutrition-search-listbox"
  ...
/>
// And add id="nutrition-search-listbox" to the dropdown element
```

- [ ] **Step 2.2: Verify**
```bash
pnpm test -- --testPathPattern="trainer-member-nutrition" --no-coverage
```

- [ ] **Step 2.3: Commit**
```bash
git add src/app/\(dashboard\)/trainer/members/\[id\]/nutrition/_components/trainer-member-nutrition-client.tsx
git commit -m "fix(a11y): add aria-controls to combobox in trainer nutrition client"
```

---

### Task 3: Fix Server Action Security (server-auth-actions)

**Files to Modify:**
- `src/app/(auth)/register/actions.ts` (line 26)
- `src/lib/actions/auth.ts` (line 5)

Note: `registerAction` is a public endpoint (no session needed), but react-doctor flags any server action without an explicit auth call. The correct guard here is to reject already-logged-in users. `signOutAction` similarly needs a guard.

- [ ] **Step 3.1: Add auth guard to registerAction**

In `src/app/(auth)/register/actions.ts`, add at the top of `registerAction`:
```ts
import { auth } from '@/lib/auth/auth';

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const session = await auth();
  if (session?.user) return { error: 'Already signed in' };

  // ... rest of existing code unchanged
```

- [ ] **Step 3.2: Add auth guard to signOutAction**

In `src/lib/actions/auth.ts`:
```ts
import { auth, signOut } from '@/lib/auth/auth';

export async function signOutAction() {
  const session = await auth();
  if (!session?.user) return;
  await signOut({ redirectTo: '/login' });
}
```

- [ ] **Step 3.3: Verify**
```bash
pnpm test -- --testPathPattern="auth|register" --no-coverage
```

- [ ] **Step 3.4: Commit**
```bash
git add src/app/\(auth\)/register/actions.ts src/lib/actions/auth.ts
git commit -m "fix(security): add session guards to registerAction and signOutAction"
```

---

### Task 4: Fix only-export-components (Fast Refresh Breakage)

Files that mix component exports with non-component exports break HMR fast refresh. Fix: move non-component exports to sibling util/types files. **Do NOT touch `src/components/ui/` files (shadcn primitives).**

**Files to Modify/Create:**
- `src/app/(dashboard)/member/_components/member-hero.tsx` → extract `estimatedDuration`
- `src/app/(dashboard)/member/_components/member-kpi-strip.tsx` → extract `buildKpiData`
- `src/app/(dashboard)/member/_components/member-nutrition-today.tsx` → extract non-component exports
- `src/app/(dashboard)/member/schedule/_components/member-schedule-hero.tsx` → extract exports
- `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx` → extract `EquipmentItem` interface and `STATUS_COLOURS`
- `src/app/(dashboard)/trainer/members/[id]/health/_components/injury-sheet.tsx` → extract non-component exports
- `src/components/nutrition/food-picker.tsx` → extract `computePickedFood`, `useMacroPreview`, interfaces

For each file, the pattern is:

- [ ] **Step 4.1: Extract from member-hero.tsx**

Create `src/app/(dashboard)/member/_components/member-hero.utils.ts`:
```ts
export function estimatedDuration(totalSets: number): number {
  // move the function body from member-hero.tsx here
}
```
In `member-hero.tsx`: remove the export of `estimatedDuration`, import it from the new utils file.
Update any other files that import `estimatedDuration` from `member-hero.tsx` to import from `member-hero.utils.ts`:
```bash
grep -rn "from.*member-hero" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 4.2: Extract from member-kpi-strip.tsx**

Create `src/app/(dashboard)/member/_components/member-kpi-strip.utils.ts`:
```ts
// Move: KpiInputs interface, KpiData interface, buildKpiData function
export interface KpiInputs { ... }
export interface KpiData { ... }
export function buildKpiData(...): KpiData { ... }
```
Update `member-kpi-strip.tsx` to import from the utils file instead of exporting them.
Update import sites:
```bash
grep -rn "from.*member-kpi-strip" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 4.3: Extract from equipment-client.tsx**

Create `src/app/(dashboard)/owner/equipment/_components/equipment.types.ts`:
```ts
export interface EquipmentItem { ... }
export type EquipmentStatus = ...;
export const STATUS_COLOURS: Record<EquipmentStatus, string> = { ... };
```
In `equipment-client.tsx`: remove those exports, import from `equipment.types.ts`.
Update import sites in add/edit equipment dialog files.

- [ ] **Step 4.4: Extract from injury-sheet.tsx (trainer)**

In `src/app/(dashboard)/trainer/members/[id]/health/_components/injury-sheet.tsx`:
Check what non-component exports exist at lines 34 and 45. Move them to `injury-sheet.types.ts` or `injury-sheet.utils.ts` in the same directory.

- [ ] **Step 4.5: Extract from food-picker.tsx**

Create `src/components/nutrition/food-picker.types.ts`:
```ts
export interface PickedFood { ... }
export interface FoodServing { ... }
export interface FoodEntry { ... }
// ... other interfaces
```
Create `src/components/nutrition/food-picker.utils.ts`:
```ts
export function computePickedFood(entry: FoodEntry, servingId: string, qty: number): PickedFood { ... }
```
`useMacroPreview` is a hook — move to `src/components/nutrition/use-macro-preview.ts`.

Update all imports across the codebase:
```bash
grep -rn "from.*food-picker" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 4.6: Handle member-nutrition-today.tsx and member-schedule-hero.tsx**

Apply the same pattern: identify non-component exports, move to sibling `.utils.ts` or `.types.ts` file, update imports.

- [ ] **Step 4.7: Verify all affected tests still pass**
```bash
pnpm test --no-coverage
```
Expected: 100% pass rate. Fix any import errors.

- [ ] **Step 4.8: Commit**
```bash
git add -p
git commit -m "fix(arch): move non-component exports to sibling util/type files for fast refresh"
```

---

## Stage 2 — Server Performance

### Task 5: Parallelize Sequential Awaits (server-sequential-independent-await + async-parallel)

29 server components/route handlers sequentially await independent DB calls. Replace with `Promise.all`.

**Files to Modify (server-sequential-independent-await × 14):**
- `src/app/(dashboard)/owner/settings/page.tsx:24`
- `src/app/(dashboard)/member/settings/page.tsx:22`
- `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx:26`
- `src/app/(dashboard)/owner/calendar/page.tsx:14`
- `src/app/(dashboard)/owner/plans/new/page.tsx:16`
- `src/app/(dashboard)/owner/trainers/page.tsx:17`
- `src/app/(dashboard)/owner/trainers/[id]/training-plans/page.tsx:25`
- `src/app/(dashboard)/owner/trainers/[id]/nutrition-plans/page.tsx:25`
- `src/app/(dashboard)/trainer/settings/page.tsx:22`
- `src/app/(dashboard)/trainer/members/[id]/log/new/page.tsx:18`
- `src/app/(dashboard)/trainer/members/[id]/nutrition/new/page.tsx:18`
- `src/app/(dashboard)/trainer/members/[id]/plan/page.tsx:21`
- `src/app/(dashboard)/trainer/plans/new/page.tsx:16`
- `src/app/api/members/[memberId]/nutrition/route.ts:59`

**Files to Modify (async-parallel × 15):**
- `src/app/(dashboard)/owner/plans/[id]/edit/page.tsx:11`
- `src/app/(dashboard)/owner/plans/new/page.tsx:14`
- `src/app/(dashboard)/trainer/members/[id]/_components/plan-card-section.tsx:18`
- `src/app/(dashboard)/trainer/members/[id]/check-ins/page.tsx:15`
- `src/app/(dashboard)/trainer/members/[id]/nutrition/page.tsx:14`
- `src/app/(dashboard)/trainer/members/[id]/photos/page.tsx:14`
- `src/app/(dashboard)/trainer/members/[id]/log/[sessionId]/page.tsx:16`
- `src/app/(dashboard)/trainer/members/[id]/health/page.tsx:122`
- `src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx:15`
- `src/app/api/auth/register/route.ts:41`
- `src/app/(dashboard)/trainer/members/[id]/_components/health-panel-section.tsx:13`
- `src/app/(dashboard)/trainer/plans/[id]/edit/page.tsx:11`
- `src/app/(dashboard)/trainer/members/[id]/plan/page.tsx:20`
- `src/app/(dashboard)/trainer/plans/new/page.tsx:14`
- `src/app/api/owner/equipment/[id]/route.ts:45`

**Pattern (same for all):**

- [ ] **Step 5.1: Apply Promise.all pattern to each file**

The canonical transformation:
```ts
// Before:
const trainers = await userRepo.findByRole('trainer');
const members = await userRepo.findAllMembers();

// After:
const [trainers, members] = await Promise.all([
  userRepo.findByRole('trainer'),
  userRepo.findAllMembers(),
]);
```
Open each file at the indicated line. Identify independent sequential awaits (those where the second call doesn't use the first call's result). Wrap them in `Promise.all` with array destructuring.

For owner/calendar/page.tsx specifically:
```ts
// Before (lines 13-14):
const trainers = await userRepo.findByRole('trainer');
const members = await userRepo.findAllMembers();

// After:
const [trainers, members] = await Promise.all([
  userRepo.findByRole('trainer'),
  userRepo.findAllMembers(),
]);
```

- [ ] **Step 5.2: Verify build compiles**
```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 5.3: Commit**
```bash
git add -p
git commit -m "perf(server): parallelize independent DB awaits with Promise.all in 29 pages/routes"
```

---

### Task 6: Fix Await Inside Loops (async-await-in-loop × 12)

`await` inside a `for...of` loop serializes what could be parallel. Replace with `Promise.all(array.map(...))`.

**Files to Modify:**
- `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx:87`
- `src/app/(dashboard)/owner/equipment/_components/add-equipment-dialog.tsx:83`
- `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx:378`
- `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx:129`
- `src/app/api/cron/check-in-reminders/route.ts:32`
- `src/app/api/cron/seal-stale-workouts/route.ts:24` and `:30`
- `src/app/api/cron/session-reminders/route.ts:31` and `:54`
- `src/app/api/cron/extend-series/route.ts:17`
- `src/app/api/schedule/route.ts:47`
- `src/app/api/schedule/[id]/route.ts:145`

**Pattern:**

- [ ] **Step 6.1: Replace each loop with Promise.all**

```ts
// Before:
for (const item of items) {
  await doSomething(item);
}

// After:
await Promise.all(items.map((item) => doSomething(item)));
```

**Important:** Only apply this when loop iterations are truly independent (no iteration depends on the result of a previous one). Check each loop before converting. If iterations have dependencies, leave as-is and add a comment.

For cron routes that send emails per user — these can safely be parallelized since each email is independent.

- [ ] **Step 6.2: Verify**
```bash
pnpm exec tsc --noEmit
pnpm test -- --testPathPattern="check-in-form|session-logger|equipment" --no-coverage
```

- [ ] **Step 6.3: Commit**
```bash
git add -p
git commit -m "perf(async): replace sequential await-in-loops with Promise.all in 12 files"
```

---

### Task 7: Fix fetch() Without Revalidate (server-fetch-without-revalidate × 2)

**Files to Modify:**
- `src/app/(dashboard)/member/plan/session/new/page.tsx:28`
- `src/app/(dashboard)/trainer/members/[id]/log/new/page.tsx:31`

- [ ] **Step 7.1: Add cache: "no-store" to each fetch call**

```ts
// Before:
const res = await fetch(url);

// After:
const res = await fetch(url, { cache: 'no-store' });
```

These are page-load fetches for forms that need fresh data, so `no-store` is appropriate. If the data is rarely updated and caching is desired, use `{ next: { revalidate: 60 } }` instead.

- [ ] **Step 7.2: Commit**
```bash
git add -p
git commit -m "fix(server): add cache: no-store to fetch calls in session new pages"
```

---

## Stage 3 — React Correctness

### Task 8: Add Missing `type` Attribute to `<button>` Elements (button-has-type × 56)

Buttons without `type` default to `type="submit"` inside forms, which can cause accidental form submission.

**Files to Modify (24 files, 56 occurrences):**
- `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` (lines 186, 275)
- `src/app/(dashboard)/member/check-in/_components/recent-photos.tsx` (lines 30, 39)
- `src/app/(dashboard)/member/check-in/_components/photo-gallery-modal.tsx` (lines 57, 59, 71, 78, 114, 120, 141)
- `src/app/(dashboard)/error.tsx:22`
- `src/app/(dashboard)/member/check-in/_components/compare-modal.tsx` (lines 40, 70)
- `src/app/(dashboard)/member/check-in/_components/compare-card.tsx` (lines 62, 84)
- `src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx:121`
- `src/app/(dashboard)/owner/members/_components/member-list-client.tsx` (lines 133, 225, 233, 245)
- `src/app/(dashboard)/member/schedule/_components/member-schedule-timeline.tsx:61`
- `src/app/(dashboard)/member/schedule/_components/member-schedule-history.tsx` (lines 25, 64)
- `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx` (lines 426, 536)
- `src/components/calendar/recurring-scope-dialog.tsx:54`
- `src/components/billing/billing-period-nav.tsx` (lines 48, 52)
- `src/components/calendar/workout-calendar.tsx` (lines 58, 62, 84)
- `src/app/global-error.tsx:22`
- `src/components/calendar/session-event-card.tsx:38`
- `src/components/self-tracking/self-week-calendar-grid.tsx:139`
- `src/components/shared/app-shell.tsx:293`
- `src/components/shared/image-lightbox.tsx` (lines 47, 57, 64, 85)
- `src/components/self-tracking/self-workout-calendar-client.tsx` (lines 97, 104, 111)
- `src/components/self-tracking/self-nutrition-calendar.tsx` (lines 63, 71, 102)
- `src/components/self-tracking/self-nutrition-day-view.tsx:256`
- `src/components/training/exercise-note-panel.tsx` (lines 101, 108, 119, 139)
- `src/components/self-tracking/self-workout-calendar.tsx` (lines 64, 68, 91)
- `src/components/training/workout-complete-modal.tsx:75`
- `src/components/self-tracking/workout-calendar-header-trigger.tsx:17`

- [ ] **Step 8.1: Add type="button" to all native button elements**

For each file listed above, open it and add `type="button"` to every `<button>` element that is not already a form submit button. Example:
```tsx
// Before:
<button onClick={handleClose} className="...">

// After:
<button type="button" onClick={handleClose} className="...">
```

If a button IS inside a form and IS meant to submit it, use `type="submit"` instead.

- [ ] **Step 8.2: Verify no tests broke**
```bash
pnpm test --no-coverage
```

- [ ] **Step 8.3: Commit**
```bash
git add -p
git commit -m "fix(a11y): add explicit type attribute to all native button elements (56 instances)"
```

---

### Task 9: Fix Array Index Used as React `key` (no-array-index-key × 32)

**Files to Modify (32 unique locations, listed here by file):**
- `src/app/(dashboard)/member/check-in/_components/recent-photos.tsx:40`
- `src/app/(dashboard)/member/journey/_components/milestone-card.tsx:47`
- `src/app/(dashboard)/member/check-in/_components/photo-gallery-modal.tsx:142`
- `src/app/(dashboard)/member/check-in/_components/compare-modal.tsx:41`
- `src/app/(dashboard)/member/check-in/_components/compare-card.tsx:63`
- `src/app/(dashboard)/trainer/_components/trainer-pending-checkins.tsx:59`
- `src/app/(dashboard)/owner/_components/member-growth-chart-client.tsx:42`
- `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-sessions-chart-client.tsx:42`
- `src/app/(dashboard)/trainer/_components/trainer-week-schedule.tsx:68`
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-top-panels.tsx:87`
- `src/app/(dashboard)/trainer/_components/trainer-needs-attention.tsx:122`
- `src/app/(dashboard)/trainer/members/[id]/_components/plan-card-section.tsx:86`
- `src/app/(dashboard)/trainer/members/[id]/nutrition/new/_components/member-nutrition-plan-form.tsx` (lines 284, 332, 359)
- `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx` (lines 304, 350, 397)
- `src/components/animations/nutrition-day-complete.tsx:50`
- `src/components/calendar/week-calendar-grid.tsx` (lines 92, 113)
- `src/components/nutrition/food-form.tsx:364`
- `src/components/calendar/workout-calendar.tsx:69`
- `src/components/animations/check-in.tsx:35`
- `src/components/self-tracking/freestyle-path-card.tsx:127`
- `src/components/self-tracking/self-week-calendar-grid.tsx` (lines 82, 120)
- `src/components/shared/image-lightbox.tsx:86`
- `src/components/shared/hub-pagination.tsx:39`
- `src/components/self-tracking/self-nutrition-calendar.tsx:82`
- `src/components/self-tracking/self-nutrition-day-view.tsx:284`
- `src/components/self-tracking/self-workout-calendar.tsx:75`

**Pattern:**

- [ ] **Step 9.1: Replace index keys with stable identifiers**

For each location, open the file and find the `.map((item, index) => <... key={index} ...>)` or `key={i}`. Replace with a stable, data-derived key.

```tsx
// Before:
{items.map((item, i) => (
  <Card key={i} ...>
))}

// After (if item has _id):
{items.map((item) => (
  <Card key={item._id} ...>
))}

// After (if item has no _id but has stable fields):
{items.map((item) => (
  <Card key={`${item.date}-${item.type}`} ...>
))}

// After (if array is truly static/never reordered — e.g. static day names):
// Only then is index acceptable. Add comment:
{DAYS.map((day, i) => (
  <span key={i} /* static array, safe to use index */>
))}
```

For chart data (recharts CustomDot, tick, etc.) where items are generated number arrays without IDs, use the value as the key: `key={entry.value}` or `key={`${entry.x}-${entry.y}`}`.

For nutrition form meals/foods, items should have `id` or `_id` fields — use those.

- [ ] **Step 9.2: Verify**
```bash
pnpm test --no-coverage
```

- [ ] **Step 9.3: Commit**
```bash
git add -p
git commit -m "fix(react): replace array index keys with stable data-derived keys (32 instances)"
```

---

### Task 10: Replace Render-Only `useState` with `useRef` (rerender-state-only-in-handlers × 21)

State values that are set inside handlers but never read in the render tree cause unnecessary re-renders. Replace with `useRef`.

**Files to Modify:**
- `src/app/(dashboard)/member/health/_components/medication-dialog.tsx:89-90` — `prevExisting`, `prevOpen`
- `src/app/(dashboard)/member/health/_components/injury-sheet.tsx:100-101` — `prevExisting`, `prevOpen`
- `src/app/(dashboard)/owner/services/_components/service-type-list.tsx:25` — `refreshKey`
- `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx:73` — `prevId`
- `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx:257` — `prevSessions`
- `src/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client.tsx:80` — `scheduleRefresh`
- `src/components/self-tracking/mini-workout-calendar.tsx:24-25` — `year`, `month`
- `src/components/nutrition/food-picker.tsx:190` — `page`
- `src/components/calendar/calendar-client.tsx:54` — `refreshTick`
- `src/components/self-tracking/mini-nutrition-calendar.tsx:57-58` — `year`, `month`
- `src/components/self-tracking/nutrition-calendar-popover.tsx:58-59` — `year`, `month`
- `src/components/billing/member-billing-detail.tsx:37` — `period`
- `src/components/billing/billing-summary-client.tsx:38` — `period`
- `src/components/self-tracking/workout-calendar-popover.tsx:57-58` — `year`, `month`
- `src/components/shared/image-lightbox.tsx:15` — `prevOpen`

**Pattern:**

- [ ] **Step 10.1: Convert each useState to useRef**

```tsx
// Before:
const [prevOpen, setPrevOpen] = useState(false);
// ... in handler:
setPrevOpen(true);

// After:
const prevOpenRef = useRef(false);
// ... in handler:
prevOpenRef.current = true;
```

For `mini-workout-calendar.tsx` (year/month used in the fetch URL):
```tsx
// Before:
const [year, setYear] = useState(now.getFullYear());
const [month, setMonth] = useState(now.getMonth() + 1);

// After:
const yearRef = useRef(now.getFullYear());
const monthRef = useRef(now.getMonth() + 1);
// Update useEffect dependency array to use refs:
useEffect(() => {
  fetch(`/api/me/workout-logs?year=${yearRef.current}&month=${monthRef.current}`)
  ...
}, []); // refs don't trigger re-renders — keep dependency on the values you DO want to react to
```

**Note:** For calendar components where `year`/`month` changes should trigger a data refetch, be careful — if the component is supposed to navigate months (via prev/next buttons), those values MUST be state, not refs. In `mini-workout-calendar.tsx`, if there are no prev/next navigation buttons in the component, refs are fine. Verify by reading the component before converting.

- [ ] **Step 10.2: Verify**
```bash
pnpm test --no-coverage
```

- [ ] **Step 10.3: Commit**
```bash
git add -p
git commit -m "fix(perf): replace render-only useState with useRef (21 instances)"
```

---

## Stage 4 — Accessibility

### Task 11: Fix Controls Without Labels (control-has-associated-label × 23)

**Files to Modify:**
- `src/app/(dashboard)/member/health/_components/injury-sheet.tsx:275`
- `src/app/(dashboard)/member/check-in/_components/check-in-stats-section.tsx:34`
- `src/app/(dashboard)/member/check-in/_components/check-in-feelings-section.tsx:36`
- `src/app/(auth)/login/page.tsx:119`
- `src/app/(dashboard)/member/check-in/_components/check-in-photos-section.tsx:57`
- … (18 more — run `grep -rn "control-has-associated-label" dist/` or check react-doctor JSON)

Full list from react-doctor JSON — run:
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='control-has-associated-label':
        print(x['filePath']+':'+str(x['line']))
"
```

- [ ] **Step 11.1: Add aria-label to unlabeled controls**

For each flagged line, open the file and add `aria-label` (or `aria-labelledby`) to the interactive element:
```tsx
// Before:
<input type="file" onChange={handleUpload} className="..." />

// After:
<input
  type="file"
  onChange={handleUpload}
  aria-label="Upload check-in photo"
  className="..."
/>
```

For icon buttons: add `aria-label` describing the action:
```tsx
// Before:
<button onClick={handleClose}><X className="..." /></button>

// After:
<button type="button" aria-label="Close" onClick={handleClose}><X className="..." /></button>
```

- [ ] **Step 11.2: Fix Labels Without Associated Controls (label-has-associated-control × 11)**

Files flagged (all in `src/app/(dashboard)/owner/equipment/_components/add-equipment-dialog.tsx`, lines 139, 162, 167, 189, 200, plus 6 more):

Run:
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='label-has-associated-control':
        print(x['filePath']+':'+str(x['line']))
"
```

For each `<Label>` without a matching `htmlFor`/`id` pair:
```tsx
// Before:
<Label>Equipment Name</Label>
<Input ... />

// After:
<Label htmlFor="equipment-name">Equipment Name</Label>
<Input id="equipment-name" ... />
```

- [ ] **Step 11.3: Commit**
```bash
git add -p
git commit -m "fix(a11y): add aria-labels to unlabeled controls and associate label/input pairs"
```

---

### Task 12: Fix Click Handlers Without Keyboard Support (click-events-have-key-events × 8)

Non-interactive elements (`<div>`, `<img>`) with `onClick` must also support keyboard interaction.

**Files:**
- `src/app/(dashboard)/owner/services/_components/service-type-list.tsx:177`
- `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx:113`
- `src/app/(dashboard)/trainer/members/[id]/photos/_components/photos-client.tsx:161`
- `src/components/nutrition/food-picker.tsx:148`
- `src/components/billing/billing-summary-client.tsx:89`
- (3 more — run same pattern query from react-doctor JSON)

- [ ] **Step 12.1: Replace div-with-onClick with button or add keyboard handlers**

Preferred fix: replace `<div onClick={...}>` with `<button type="button" onClick={...} className="...">`. This gives keyboard support for free.

If the element must stay a `<div>` (e.g., an image that opens a lightbox):
```tsx
// Before:
<div onClick={openLightbox}>
  <img src={photo.url} />
</div>

// After:
<div
  role="button"
  tabIndex={0}
  onClick={openLightbox}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openLightbox(); }}
  aria-label="View photo"
>
  <img src={photo.url} alt="Check-in photo" />
</div>
```

- [ ] **Step 12.2: Commit**
```bash
git add -p
git commit -m "fix(a11y): add keyboard support to click-only interactive elements (8 instances)"
```

---

## Stage 5 — Next.js Best Practices

### Task 13: Replace `<img>` with `next/image` (nextjs-no-img-element × 27)

**Files (27 locations across 14 files):**
- `src/app/(auth)/login/page.tsx:36`
- `src/app/(dashboard)/member/check-in/_components/recent-photos.tsx:45`
- `src/app/(dashboard)/member/check-in/[id]/page.tsx:149`
- `src/app/(dashboard)/member/check-in/_components/photo-gallery-modal.tsx` (lines 64, 147)
- `src/app/(dashboard)/member/check-in/_components/compare-modal.tsx` (lines 31, 46)
- `src/app/(dashboard)/member/check-in/_components/compare-card.tsx:68`
- `src/app/(dashboard)/member/check-in/_components/check-in-photos-section.tsx:28`
- `src/app/(dashboard)/owner/equipment/_components/add-equipment-dialog.tsx:212`
- `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx` (lines 173, 196)
- `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx:113`
- `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx:355`
- `src/app/(dashboard)/trainer/members/[id]/photos/_components/photos-client.tsx` (lines 119, 183)
- `src/app/(dashboard)/trainer/members/[id]/check-ins/[checkInId]/_components/check-in-detail.tsx` (lines 161, 172, 180)
- `src/components/nutrition/food-picker-dialog.tsx:201`
- `src/components/shared/app-shell.tsx` (lines 148, 202, 224)
- `src/components/shared/image-lightbox.tsx:75`
- `src/components/training/exercise-thumbnail.tsx` (lines 62, 71)
- `src/components/settings/avatar-upload.tsx:73`

- [ ] **Step 13.1: Replace img with next/image**

For images with known dimensions:
```tsx
// Before:
import Image from 'next/image'; // may already be imported
<img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full" />

// After:
import Image from 'next/image';
<Image
  src={user.avatarUrl}
  alt="Avatar"
  width={32}
  height={32}
  className="rounded-full"
/>
```

For dynamic images from user uploads (cloudinary/S3 URLs), also add the domain to `next.config.ts`:
```ts
// Check current remotePatterns in next.config.ts:
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.cloudinary.com' },
    // add other domains as needed
  ],
},
```

For images where size is unknown (e.g., lightbox full-size images), use `fill` layout:
```tsx
<div className="relative w-full h-full">
  <Image src={src} alt={alt} fill className="object-contain" />
</div>
```

For the login page logo image, add explicit `width` and `height` props matching the current CSS size.

- [ ] **Step 13.2: Update next.config.ts if needed**
```bash
cat next.config.ts
# Add missing remote patterns for existing image domains
```

- [ ] **Step 13.3: Verify build**
```bash
pnpm build 2>&1 | grep -i "error\|warn" | head -30
```

- [ ] **Step 13.4: Commit**
```bash
git add -p
git commit -m "fix(nextjs): replace <img> with next/image for optimization (27 instances)"
```

---

### Task 14: Delete Unused Files (unused-file × 9)

These 9 files are unreachable from any entry point. Delete them after verifying they are not dynamically imported or referenced by string.

**Files to Delete:**
- `src/app/(dashboard)/member/progress/_components/progress-content.tsx`
- `src/app/(dashboard)/member/progress/_components/progress-skeleton.tsx`
- `src/app/(dashboard)/owner/_components/trainer-breakdown-skeleton.tsx`
- `src/components/animations/new-pr.tsx`
- `src/components/calendar/session-detail-panel.tsx`
- `src/components/calendar/workout-calendar.tsx`
- `src/components/self-tracking/template-day-picker-dialog.tsx`
- `src/components/settings/account-tab.tsx`
- `src/components/ui/separator.tsx`

Note: `src/components/ui/separator.tsx` is a shadcn component — check whether it's actually unused before deleting (it may be used by a shadcn component internally). Run:
```bash
grep -rn "separator" src/ --include="*.tsx" --include="*.ts" -i
```

- [ ] **Step 14.1: Verify no dynamic imports exist**
```bash
for f in \
  "src/app/(dashboard)/member/progress/_components/progress-content.tsx" \
  "src/app/(dashboard)/member/progress/_components/progress-skeleton.tsx" \
  "src/app/(dashboard)/owner/_components/trainer-breakdown-skeleton.tsx" \
  "src/components/animations/new-pr.tsx" \
  "src/components/calendar/session-detail-panel.tsx" \
  "src/components/calendar/workout-calendar.tsx" \
  "src/components/self-tracking/template-day-picker-dialog.tsx" \
  "src/components/settings/account-tab.tsx" \
  "src/components/ui/separator.tsx"; do
    basename=$(basename "$f" .tsx)
    echo "=== $basename ==="
    grep -rn "$basename" src/ --include="*.tsx" --include="*.ts" | grep -v "^$f:"
done
```

- [ ] **Step 14.2: Delete confirmed-unused files**
```bash
git rm src/app/\(dashboard\)/member/progress/_components/progress-content.tsx
git rm src/app/\(dashboard\)/member/progress/_components/progress-skeleton.tsx
git rm src/app/\(dashboard\)/owner/_components/trainer-breakdown-skeleton.tsx
git rm src/components/animations/new-pr.tsx
git rm src/components/calendar/session-detail-panel.tsx
# Only delete these if Step 14.1 confirms no references:
# git rm src/components/calendar/workout-calendar.tsx
# git rm src/components/self-tracking/template-day-picker-dialog.tsx
# git rm src/components/settings/account-tab.tsx
# git rm src/components/ui/separator.tsx
```

- [ ] **Step 14.3: Verify**
```bash
pnpm build 2>&1 | tail -5
pnpm test --no-coverage
```

- [ ] **Step 14.4: Remove unused exports**

Also remove the 2 unused exports flagged:
- `src/components/nutrition/food-picker.tsx:508` — remove `export function useMacroPreview` (or keep if moved to `use-macro-preview.ts` in Task 4)
- `src/lib/validation/user.ts:2` — remove `export const MOBILE_RE`

- [ ] **Step 14.5: Commit**
```bash
git add -p
git commit -m "chore: delete 9 unused files and 2 unused exports"
```

---

### Task 15: Add Missing Page Metadata (nextjs-missing-metadata × 1)

**Files to Modify:**
- `src/app/page.tsx`

- [ ] **Step 15.1: Add metadata export**
```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Power Gym',
  description: 'Gym management for owners, trainers, and members',
};

export default function RootPage() {
  // ... existing code
}
```

- [ ] **Step 15.2: Commit**
```bash
git add src/app/page.tsx
git commit -m "fix(seo): add metadata export to root page"
```

---

## Stage 6 — Mechanical Refactors (Scripted)

### Task 16: Tailwind Size Shorthand `w-N h-N` → `size-N` (design-no-redundant-size-axes × 150)

Tailwind v3.4+ provides `size-N` as shorthand for `w-N h-N` when both axes match.

- [ ] **Step 16.1: Get full file list**
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys,collections
d=json.load(sys.stdin)
files=collections.Counter()
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='design-no-redundant-size-axes':
        files[x['filePath']]+=1
for f,n in sorted(files.items()):
    print(f'{n}\t{f}')
" 2>/dev/null
```

- [ ] **Step 16.2: Apply replacements in each file**

For each file, find `w-N h-N` patterns where N matches and replace with `size-N`. Common values: `w-4 h-4`, `w-5 h-5`, `w-3 h-3`, `w-3.5 h-3.5`, `w-2 h-2`, `w-6 h-6`, `w-8 h-8`, `w-10 h-10`, `w-12 h-12`.

Use sed for bulk replacement per file (verify each):
```bash
# Example for w-4 h-4 → size-4 (run for each file):
sed -i '' 's/w-4 h-4/size-4/g; s/h-4 w-4/size-4/g' <file>
```

Apply for all common sizes (2, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24).

- [ ] **Step 16.3: Verify no visual regressions**
```bash
pnpm exec tsc --noEmit
pnpm lint
```

- [ ] **Step 16.4: Commit**
```bash
git add -p
git commit -m "style: replace w-N h-N with size-N Tailwind shorthand (150 instances)"
```

---

### Task 17: Tailwind Padding Shorthand `px-N py-N` → `p-N` (design-no-redundant-padding-axes × 19)

**Files (19 instances):**
Run:
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='design-no-redundant-padding-axes':
        print(x['filePath']+':'+str(x['line'])+' '+x['message'][:60])
" 2>/dev/null
```

- [ ] **Step 17.1: Apply shorthand in each file**

```tsx
// Before: px-4 py-4 → p-4
// Before: px-5 py-5 → p-5
// Before: px-3 py-3 → p-3
```

Open each file at the indicated line and make the replacement inline (manual, since these may be in the middle of className strings).

- [ ] **Step 17.2: Commit**
```bash
git add -p
git commit -m "style: replace px-N py-N with p-N Tailwind shorthand (19 instances)"
```

---

### Task 18: Replace Em-Dash with Proper JSX Text (design-no-em-dash-in-jsx-text × 31)

The `—` character in JSX text can be misread as AI-generated output by screen readers and some parsers.

**Files (31 instances):**
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='design-no-em-dash-in-jsx-text':
        print(x['filePath']+':'+str(x['line']))
" 2>/dev/null
```

- [ ] **Step 18.1: Replace em-dashes with alternatives**

Per context, choose the right replacement:
- If used as a separator (e.g., "Name — Role"): use `: ` colon or ` · ` bullet: `Name: Role` or `Name · Role`
- If used as a range: use `–` (en-dash, `&ndash;`) in HTML or just `-` 
- If used as a parenthetical: replace with comma or parentheses

```tsx
// Before: <span>Trainer — {trainer.name}</span>
// After:  <span>Trainer: {trainer.name}</span>
```

- [ ] **Step 18.2: Commit**
```bash
git add -p
git commit -m "style: replace em-dash characters with semantically correct punctuation (31 instances)"
```

---

### Task 19: Destructure Router Methods (react-compiler-destructure-method × 84)

Destructuring `const { push } = useRouter()` makes the dependency graph explicit and helps React Compiler memoize.

**Files (84 instances across many files):**
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys,collections
d=json.load(sys.stdin)
files=collections.Counter()
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='react-compiler-destructure-method':
        files[x['filePath']]+=1
for f,n in sorted(files.items()):
    print(f'{n}\t{f}')
" 2>/dev/null
```

- [ ] **Step 19.1: Destructure in each file**

For each file, find `const router = useRouter()` followed by `router.push(...)` or `router.refresh(...)`:

```tsx
// Before:
const router = useRouter();
// ... later:
router.push('/some/path');
router.refresh();

// After:
const { push, refresh } = useRouter();
// ... later:
push('/some/path');
refresh();
```

Note: if `router` is passed to a hook or other component, keep the full object and only destructure what's used inline.

- [ ] **Step 19.2: Verify**
```bash
pnpm exec tsc --noEmit
pnpm test --no-coverage
```

- [ ] **Step 19.3: Commit**
```bash
git add -p
git commit -m "refactor: destructure useRouter methods for React Compiler compatibility (84 instances)"
```

---

## Stage 7 — Bundle Size

### Task 20: Migrate to LazyMotion (use-lazy-motion × 28)

`import { motion }` from framer-motion includes the full ~30kb animation engine. `LazyMotion` + `m` only loads what's used.

**Files (28 instances):**
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='use-lazy-motion':
        print(x['filePath']+':'+str(x['line']))
" 2>/dev/null
```

- [ ] **Step 20.1: Create a LazyMotion provider wrapper**

Check if one already exists:
```bash
grep -rn "LazyMotion" src/ --include="*.tsx" --include="*.ts"
```

If not, the LazyMotion provider is typically added at the layout level. Check the dashboard layout:

In the relevant layout file (e.g., `src/app/(dashboard)/layout.tsx`), wrap children with `LazyMotion`:
```tsx
import { LazyMotion, domAnimation } from 'framer-motion';

// In the layout component:
<LazyMotion features={domAnimation}>
  {children}
</LazyMotion>
```

- [ ] **Step 20.2: Replace `motion.X` with `m.X` in each file**

```tsx
// Before:
import { motion } from 'framer-motion';
<motion.div animate={{ opacity: 1 }}>

// After:
import { m } from 'framer-motion';
<m.div animate={{ opacity: 1 }}>
```

**Important:** Only replace `motion.` usages — `AnimatePresence`, `useAnimation`, etc. from framer-motion are still imported directly.

- [ ] **Step 20.3: Verify**
```bash
pnpm build 2>&1 | grep -i "error" | head -10
pnpm test --no-coverage
```

- [ ] **Step 20.4: Commit**
```bash
git add -p
git commit -m "perf(bundle): migrate from motion to m+LazyMotion in 28 components (~30kb/component saved)"
```

---

## Stage 8 — Complex Refactors

### Task 21: Fix Fetch-in-Effect Pattern (no-fetch-in-effect × 27)

Client components using `fetch()` inside `useEffect` without proper cleanup can cause race conditions and memory leaks. Most of these in this codebase already have `cancelled` flags (see `mini-workout-calendar.tsx`). Audit each and add `AbortController` where cleanup is missing.

**Files (27 instances):**
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='no-fetch-in-effect':
        print(x['filePath']+':'+str(x['line']))
" 2>/dev/null
```

- [ ] **Step 21.1: Add AbortController cleanup to each fetch-in-effect**

Pattern for all:
```tsx
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then((r) => r.json())
    .then((data) => {
      setItems(data);
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error(err);
    });

  return () => controller.abort();
}, [dependencies]);
```

For files that already use a `cancelled` boolean flag pattern — replace with `AbortController` which is more idiomatic:
```tsx
// Before (mini-workout-calendar.tsx pattern):
let cancelled = false;
fetch(url)
  .then((r) => r.json())
  .then((data) => { if (!cancelled) setLogs(data); });
return () => { cancelled = true; };

// After:
const controller = new AbortController();
fetch(url, { signal: controller.signal })
  .then((r) => r.json())
  .then((data) => setLogs(data))
  .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
return () => controller.abort();
```

- [ ] **Step 21.2: Verify**
```bash
pnpm test --no-coverage
```

- [ ] **Step 21.3: Commit**
```bash
git add -p
git commit -m "fix(react): add AbortController cleanup to fetch-in-effect patterns (27 instances)"
```

---

### Task 22: Fix Derived State (no-derived-useState × 14)

State initialized from a prop that should stay in sync with prop changes.

**Files (14 instances):**
- `src/app/(dashboard)/member/health/_components/medication-dialog.tsx:89-90`
- `src/app/(dashboard)/member/health/_components/injury-sheet.tsx:100-101`
- `src/app/(dashboard)/owner/settings/_components/profile-tab.tsx:24`
- `src/app/(dashboard)/member/settings/_components/profile-tab.tsx:39`
- `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx:257`
- `src/app/(dashboard)/trainer/settings/_components/profile-tab.tsx:27`
- `src/components/calendar/edit-session-modal.tsx:43-44`
- `src/components/nutrition/schedule-editor.tsx:31-32`
- `src/components/nutrition/food-picker-dialog.tsx:120`
- `src/components/shared/image-lightbox.tsx:15`

- [ ] **Step 22.1: Choose the right pattern for each case**

**Case A — Dialog/Sheet that needs to reset on open:**
```tsx
// Before (medication-dialog.tsx):
const [prevExisting, setPrevExisting] = useState(existing);
const [prevOpen, setPrevOpen] = useState(open);
if (open !== prevOpen) { setPrevOpen(open); setFormData(existing ?? {}); }

// After: use useEffect to reset when dialog opens:
useEffect(() => {
  if (open) setFormData(existing ?? {});
}, [open, existing]);
// Remove the prevExisting and prevOpen state entirely.
```

**Case B — Profile tab initialized from server props:**
```tsx
// Before:
const [profile, setProfile] = useState(props);

// After (if props never change after initial load):
// Keep useState but initialize once — this is fine for edit forms.
// The lint warning is a reminder to check, not always an error.
// If props DO update (e.g., parent refetches), use:
useEffect(() => { setProfile(props); }, [props]);
```

**Case C — edit-session-modal, schedule-editor (reset on prop change):**
Same as Case A — add `useEffect(() => { setFormState(session); }, [session])` and remove derived state pattern.

- [ ] **Step 22.2: Verify**
```bash
pnpm test --no-coverage
```

- [ ] **Step 22.3: Commit**
```bash
git add -p
git commit -m "fix(react): remove derived state patterns, use useEffect for prop-sync (14 instances)"
```

---

### Task 23: Resolve Circular Dependency (circular-dependency × 1)

**File:** `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx`

- [ ] **Step 23.1: Identify the cycle**
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='circular-dependency':
        print(x['message'])
" 2>/dev/null
```

- [ ] **Step 23.2: Break the cycle**

Typical circular dependency pattern: A imports B imports A. Solutions:
1. Extract the shared type/value into a third file that neither A nor B depends on
2. Invert the dependency (pass the shared value as a prop rather than importing it)
3. Move the circular part to the parent of both A and B

After identifying the cycle from Step 23.1, apply the appropriate fix.

- [ ] **Step 23.3: Verify**
```bash
pnpm exec tsc --noEmit
pnpm test --no-coverage
```

- [ ] **Step 23.4: Commit**
```bash
git add -p
git commit -m "fix(arch): resolve circular import in edit-equipment-dialog"
```

---

### Task 24: Consolidate Complex useState into useReducer (prefer-useReducer × 39)

Components with 5+ `useState` calls that manage related state are candidates for `useReducer`.

**Highest-priority components (most useState calls):**
1. `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx` — 12 useState
2. `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx` — largest component
3. `src/components/nutrition/food-picker.tsx` — multiple related state
4. `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx` — 452 lines

Full list:
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for x in d['projects'][0]['diagnostics']:
    if x['rule']=='prefer-useReducer':
        print(x['filePath']+':'+str(x['line'])+' - '+x['message'][:60])
" 2>/dev/null
```

- [ ] **Step 24.1: Refactor CheckInForm to useReducer**

In `src/app/(dashboard)/member/check-in/_components/check-in-form.tsx`, replace the 12 `useState` calls with a single reducer. Pattern:

```tsx
// Before:
const [mood, setMood] = useState<number | null>(null);
const [energy, setEnergy] = useState<number | null>(null);
const [sleep, setSleep] = useState<number | null>(null);
const [weight, setWeight] = useState('');
const [bodyFat, setBodyFat] = useState('');
// ... 7 more

// After:
interface CheckInState {
  mood: number | null;
  energy: number | null;
  sleep: number | null;
  weight: string;
  bodyFat: string;
  // ... all related fields
}

type CheckInAction =
  | { type: 'SET_MOOD'; value: number }
  | { type: 'SET_ENERGY'; value: number }
  // ... all actions

function reducer(state: CheckInState, action: CheckInAction): CheckInState {
  switch (action.type) {
    case 'SET_MOOD': return { ...state, mood: action.value };
    case 'SET_ENERGY': return { ...state, energy: action.value };
    // ...
    default: return state;
  }
}

const [state, dispatch] = useReducer(reducer, {
  mood: null,
  energy: null,
  // ... initial values
});
```

- [ ] **Step 24.2: Refactor remaining 38 components**

Apply the same `useReducer` pattern to each flagged component. Each component has its own state shape — define the interface and action types specifically for that component.

Prioritize by number of useState calls (highest first). Components with only 5 useState calls where the state is independent may be left as-is if conversion doesn't meaningfully reduce complexity.

- [ ] **Step 24.3: Verify all tests pass**
```bash
pnpm test --no-coverage
pnpm exec tsc --noEmit
```

- [ ] **Step 24.4: Commit per component (or group of related components)**
```bash
git add -p
git commit -m "refactor(state): consolidate multi-useState components to useReducer"
```

---

## Final Verification

- [ ] **Full test suite**
```bash
pnpm test
```
Expected: 100% pass rate

- [ ] **TypeScript**
```bash
pnpm exec tsc --noEmit
```
Expected: 0 errors

- [ ] **Lint**
```bash
pnpm lint
```
Expected: 0 errors, 0 warnings

- [ ] **Build**
```bash
pnpm build
```
Expected: clean build

- [ ] **Re-run react-doctor**
```bash
npx react-doctor@latest --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
errors=[x for x in d['projects'][0]['diagnostics'] if x['severity']=='error']
warnings=[x for x in d['projects'][0]['diagnostics'] if x['severity']=='warning']
print(f'Errors: {len(errors)}, Warnings: {len(warnings)}')
"
```
Expected: 0 errors, significantly reduced warnings.

- [ ] **Final commit**
```bash
git add -p
git commit -m "chore: complete react-doctor issue remediation"
```
