# Training Template Redesign — Design Spec

**Status**: Approved
**Date**: 2026-05-09
**Owners**: Eric

---

## 1. Background

The current Training Template builder (`src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx`) and the logging surfaces (`session-logger.tsx`, `self-workout-session.tsx`) work end-to-end but feel sparse: large empty rows of number inputs, no exercise thumbnails in the editor, hard-to-discover superset grouping, all-days-stacked vertically. The visual is also non-compliant with `CLAUDE.md` design guidelines (heavy use of `bg-[#0c0c0c]`, `text-[#666]` hex hardcodes instead of theme tokens).

The data layer for supersets already exists (`PlanDayExerciseSchema` has `groupId` + `isSuperset`; `lib/training/label-exercises.ts` already produces A / B1 / B2 labels), but the **UX is not discoverable**: the only way to create a superset today is to check ≥2 checkboxes and then click a small "Group as Superset" button that only appears after selection.

This spec redesigns the template editor and the two logging surfaces to match the density and clarity of the reference app screenshots in `context/images/sample_app/exercise-app-example/`, surfaces supersets via an explicit "+ Add Superset" entry point, and migrates all hardcoded hex colors to theme tokens.

The data model is **not changing**.

---

## 2. Scope (3 phases)

| Phase | Surface | Files (primary) |
| --- | --- | --- |
| **P1** | Trainer/Owner Template editor (create + edit) | `plan-template-form.tsx`, new `<DayTabs>`, `<ExerciseRow>`, `<SupersetBlock>` |
| **P2** | Member logging session + Self-tracking logging session | `session-logger.tsx`, `self-workout-session.tsx`; reuse P1 primitives |
| **P3** | Template read-only preview (trainer/owner) | new `/trainer/plans/[id]/page.tsx` if missing; reuse P1 primitives in `mode="view"` |

Each phase ships as its own PR with its own tests and is independently usable.

Out of scope:
- Backend / API changes (beyond what is needed to surface validation errors)
- Mongoose model changes
- Data migration (existing plans already conform)
- Member's "view current plan" page (`member/plan/page.tsx`) — addressed in P3 if visually equivalent, otherwise tracked as follow-up

---

## 3. Data Model — No Change

`src/lib/db/models/plan-template.model.ts` already defines:

```ts
interface IPlanDayExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: ObjectId;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}
```

Conventions kept:
- A standalone exercise has `isSuperset = false` and `groupId = exerciseId.toString()`.
- A superset has `isSuperset = true` for every member exercise; all members share the same `groupId` (a fresh `crypto.randomUUID()`).
- Order within a day is the array order; supersets occupy contiguous indices in the array.

`label-exercises.ts` already produces "A", "B", "C1", "C2" labels from this shape and is reused unchanged.

---

## 4. Phase 1 — Template Editor

### 4.1 Layout

```
┌──────────────────────────────────────────────────┐
│ [Plan name input]                                │
│ [Description textarea]                           │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ Day 1 PT Leg │ Day 2 Push │ Day 3 Pull │ + Day  │ ← sticky day tab bar
│ ──────────────                                   │   active tab gets foreground underline
└──────────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ [Day name input]              [Remove Day] │ ← only the active day is rendered below
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ A [📷] Squat   Sets[3] Reps[8]–[12] Rest[120s] BW [↑][↓][×] │
└────────────────────────────────────────────┘
┌─ Superset ────────────────── [Ungroup] [Delete superset] ─┐
│  B1 [📷] Lat Pulldown   Sets[3] Reps[8]–[12] Rest[60s]   ⋮ │
│  B2 [📷] Cable Row      Sets[3] Reps[8]–[12] Rest[60s]   ⋮ │
│  + Add to Superset                                          │
└─────────────────────────────────────────────────────────────┘

[+ Add Exercise]   [+ Add Superset]
```

### 4.2 New Components

All new components live under `src/components/training/`.

#### `<DayTabs>`

Props: `days: DayState[]`, `activeIndex: number`, `onChange(idx)`, `onAddDay()`.

- Horizontal `flex` with `overflow-x-auto`. Pinned to the top of the page viewport via `sticky top-0 z-10 bg-background/95 backdrop-blur-sm` (page is the scroll container; the meta card above scrolls under the tab bar).
- Active tab: `text-foreground` + 2px `border-b-foreground`.
- Inactive: `text-foreground/65` + transparent border.
- "+ Add Day" trailing button matches inactive tab style.

#### `<ExerciseRow>`

Three modes via prop `mode: 'edit' | 'logging' | 'view'`. Phase 1 only ships `'edit'`; the other two modes are stubbed (return null or throw) and implemented in P2/P3.

Props (edit mode):
- `exercise: ExerciseRow` (current type from `plan-template-form.tsx`)
- `label: string` (e.g. "A", "B1")
- `position: 'first' | 'middle' | 'last' | 'only'` — drives chevron disabled state
- `onChange(field, value)`, `onMoveUp()`, `onMoveDown()`, `onDelete()`
- `inSuperset: boolean` — when true, the row drops its outer ring (visual joining)

Layout — one row at `≥sm`:

```
[label] [thumb 36×36] {name truncate}   [Sets] [RepsMin]–[RepsMax] [Rest s] [BW] [↑][↓][×]
```

`<sm` (mobile) variant — two rows via `flex-wrap` on the input cluster:

```
Row 1: [label] [thumb] {name} ......................... [↑][↓][×]
Row 2:                  [Sets] [RepsMin]–[RepsMax] [Rest s] [BW]
```

Tokens (no hex):

| Element | Class |
| --- | --- |
| Outer (standalone) | `rounded-lg bg-card ring-1 ring-foreground/10 px-3 py-2.5 hover:ring-foreground/25 transition` |
| Outer (in superset) | no ring; `border-t border-foreground/10` between siblings (handled by `<SupersetBlock>`) |
| Name | `text-sm font-medium text-foreground truncate` |
| Number input | `h-7 w-12 text-xs bg-card ring-1 ring-foreground/10 px-2 type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*"` |
| Input label (above) | `text-[10px] uppercase tracking-wider text-foreground/65` |
| Reps separator "–" | `text-foreground/65 px-1` |
| Rest input | suffix "s" rendered inside the input via a flex wrapper: `<div class="relative">[input]<span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-foreground/65">s</span></div>` (input gets `pr-5`) |
| BW chip | `<label>` with checkbox + 12px text + `text-foreground/65` |
| Move/Delete icon button | `size-7 inline-flex items-center justify-center text-foreground/65 hover:text-foreground rounded-md`; required `aria-label`; disabled state `opacity-30 pointer-events-none` |
| Validation error ring | `ring-destructive/40` on the row container |

#### `<SupersetBlock>`

Props: `groupId: string`, `members: { row, label, exIdx }[]`, `dayIdx`, plus the mutation callbacks.

Structure:

```jsx
<div class="rounded-lg bg-card ring-1 ring-foreground/25 overflow-hidden">
  <div class="px-3 py-1.5 bg-muted/40 flex items-center justify-between">
    <span class="text-[10px] font-bold uppercase tracking-[1.5px] text-foreground">Superset</span>
    <div class="flex gap-3">
      <button onClick={onUngroup} class="text-xs text-foreground/65 hover:text-foreground">Ungroup</button>
      <button onClick={onDelete} class="text-xs text-foreground/65 hover:text-destructive">Delete superset</button>
    </div>
  </div>
  {members.map((m, i) => (
    <Fragment key={m.row.exerciseId}>
      {i > 0 && <div class="h-px bg-foreground/10" />}
      <ExerciseRow inSuperset {...m} />
    </Fragment>
  ))}
  <button onClick={onAddToSuperset} class="block w-full px-3 py-2 border-t border-foreground/10 text-xs text-foreground/65 hover:text-foreground">+ Add to Superset</button>
</div>
```

`onAddToSuperset` opens the existing `<ExerciseSearchSheet>`; on selection, the new exercise is appended to the day's `exercises[]` immediately after the last member of this group (so contiguity is preserved) with `isSuperset = true` and `groupId = <this group's id>`.

### 4.3 Mutation Behaviour

| Action | Result |
| --- | --- |
| **+ Add Exercise** | Open `<ExerciseSearchSheet>`. On select, append a row at end of day with `isSuperset=false`, `groupId=exerciseId`. |
| **+ Add Superset** | Create an **empty** superset block immediately: insert a "marker" group with a fresh `groupId` but no rows yet. `<SupersetBlock>` renders the header + empty body + "+ Add to Superset". (Implementation note: store `groupId` in a `pendingSupersetGroups: Set<string>` parallel to `days` so an empty group survives renders without polluting the model.) |
| **+ Add to Superset** | Same sheet; on select, push a row with `isSuperset=true`, `groupId=<this group's id>`, inserted contiguous to existing members of the group. |
| **Chevron up/down** | Standalone row: moves past entire superset blocks — i.e. swaps positions with the nearest *standalone* row in the chosen direction, treating any superset block in between as a single hop. Disabled if no standalone neighbour exists in that direction. Superset member row: swaps only within the same `groupId`; disabled at the group's first/last position. Contiguity of every superset block is preserved at all times. |
| **Row × (delete)** | Standalone: remove from array. Superset member: remove from array; the group is allowed to drop to 1 member (handled at submit time per §4.4). |
| **Ungroup** | Strip `isSuperset=false` and reset `groupId=exerciseId` on each member of the group, in original order; resulting rows take the slots previously occupied by the group, becoming standalone rows. |
| **Delete superset** | Remove all members of the group from the array. Confirm via shadcn `<Dialog>` with title "Delete this superset?" and Cancel / Delete buttons. |

### 4.4 Submit Flow

On `Save Plan`:

1. **Client-side validation**:
   | Field | Rule |
   | --- | --- |
   | `name` | required, length 1–80 |
   | `description` | optional, length ≤ 500 |
   | `days` | length ≥ 1 |
   | `day.name` | required, length 1–40 |
   | `day.exercises` | length ≥ 1 (strict — empty days are not allowed) |
   | `exercise.exerciseId` | required, valid ObjectId string |
   | `exercise.sets` | integer ≥ 1 |
   | `exercise.repsMin` | integer ≥ 1 |
   | `exercise.repsMax` | integer ≥ `repsMin` |
   | `exercise.restSeconds` | null OR integer ≥ 0 |
   | `exercise.exerciseName` | required (echoed from search sheet) |

   On any failure: `toast.error(<first-error-message>)`, scroll to the first offending row, and apply `ring-destructive/40` to it. Submission is aborted.

2. **Empty-superset detection** (UI-only state):
   - Any group in `pendingSupersetGroups` with **0 members** → silently dropped from payload.
   - Any group with **exactly 1 member**: open a `<Dialog>` with text:
     > "有 N 个 superset 只剩 1 个动作，保存时会被转成普通动作。是否继续？"
     >
     > [Cancel] [Continue & Save]
   - On Continue: in payload construction, set `isSuperset=false` and `groupId=exerciseId` on those rows.
   - On Cancel: abort submit; user remains in form.

3. **Payload build** — same shape as today (`{ name, description, days: [{ dayNumber, name, exercises: [...] }] }`). `dayNumber` is recomputed from order.

4. **POST/PUT** to existing `/api/plan-templates` endpoints — no API changes required.

### 4.5 Dirty Detection / Cancel Guard

Same pattern as `food-form.tsx`:

```ts
const initialSnapshot = useMemo(() => JSON.stringify({ name, description, days }), [initialData]);
const isDirty = JSON.stringify({ name, description, days }) !== initialSnapshot;
```

- Save button: `disabled={saving || (mode === 'edit' && !isDirty)}`. New mode allows save once validation passes (no draft state).
- Cancel button: when `isDirty`, intercept and open `<Dialog>` "Discard changes?" → Cancel / Discard.
- `useEffect` registers `beforeunload` only while `isDirty`.

### 4.6 Sticky Footer

Unchanged from current; only token clean-up:

```jsx
<div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-foreground/10 flex flex-col gap-2 z-10">
  <Button type="submit" disabled={...}>{saving ? 'Saving…' : 'Save Plan'}</Button>
  <Button type="button" variant="outline" onClick={...}>Cancel</Button>
</div>
```

### 4.7 Hex Token Migration

Mandatory replacements within the editor file and the new components:

| Old | New |
| --- | --- |
| `bg-[#0c0c0c]`, `bg-[#0a0a0a]` | `bg-card` |
| `bg-[#111]`, `bg-[#141414]` (as fill) | `bg-muted/40` |
| `border-[#141414]`, `border-[#1a1a1a]`, `border-[#1e1e1e]` | `ring-1 ring-foreground/10` (using `ring`, not `border`) |
| `border-[#2a2a2a]`, `border-[#333]` | `ring-1 ring-foreground/25` |
| `text-[#888]`, `text-[#777]`, `text-[#666]` | `text-foreground/65` |
| `text-[#555]`, `text-[#444]` | `text-foreground/50` (only for tertiary chrome — placeholders) |
| `text-[#333]` (placeholder-only) | `placeholder:text-foreground/30` |
| `accent-white` | `accent-foreground` |

Verification: `grep -E "(bg|text|border|ring)-\[#" src/components/training src/app/.../plans` must return zero matches in the touched files post-P1.

### 4.8 Tests (P1)

| File | Coverage |
| --- | --- |
| `__tests__/components/training/exercise-row.test.tsx` | Renders all fields; `inputMode="decimal"`; chevron disabled when `position='first'\|'last'\|'only'`; BW toggle calls onChange; delete invokes onDelete; validation ring applied when prop set |
| `__tests__/components/training/superset-block.test.tsx` | Header renders Ungroup + Delete superset; "+ Add to Superset" triggers onAddToSuperset; Delete superset opens confirm dialog; internal chevron does not move row out of group |
| `__tests__/components/training/day-tabs.test.tsx` | Tab click invokes onChange; "+ Add Day" appends; active tab styling; Remove Day reorders dayNumber |
| `__tests__/app/dashboard/trainer/plans/plan-template-form.test.tsx` | Empty-day submit → toast.error + ring; single-superset submit opens degrade dialog; Continue degrades the row in payload; Cancel aborts; dirty cancel dialog; new-mode save with valid input succeeds |
| `__tests__/lib/training/label-exercises.test.ts` (extend) | Empty array; one pure superset group; mixed; supersets at start/middle/end |

All existing tests for plan-template flows must continue to pass. If any existing test asserts on the removed `<input type=number>` behaviour or hardcoded hex classes, update the assertion to the new contract.

### 4.9 Files Touched (P1)

```
src/components/training/day-tabs.tsx                                NEW
src/components/training/exercise-row.tsx                            NEW
src/components/training/superset-block.tsx                          NEW
src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx REWRITE
src/lib/training/label-exercises.ts                                 unchanged (already exists)
__tests__/components/training/*                                     NEW
__tests__/app/dashboard/trainer/plans/plan-template-form.test.tsx   NEW or extend
```

The page-level files (`new/page.tsx`, `[id]/edit/page.tsx`, `[id]/edit/_client.tsx`) are not touched — `<PlanTemplateForm>` keeps its props interface.

### 4.10 Acceptance Criteria (P1)

- [ ] All visual differences described in §4.1 are present in both create and edit pages.
- [ ] Creating a superset is possible without ever clicking a checkbox.
- [ ] An empty day cannot be saved.
- [ ] A 1-member superset triggers the warning dialog and degrades correctly on Continue.
- [ ] No `[#xxx]` hex literal remains in any P1 file (`grep` clean).
- [ ] `pnpm test` passes; `pnpm lint` zero warnings; `pnpm build` clean.
- [ ] `/simplify` reports nothing actionable.

---

## 5. Phase 2 — Logging Surfaces

### 5.1 Component Reuse

`<ExerciseRow>` gains a `mode="logging"` rendering:

- Header line — same as edit but inputs replaced by **read-only summary pills** (`Sets: N`, `Reps: 8–12`).
- Body — list of per-set rows:

  ```
  01  [kg input]  [reps input]  [✓]
  02  [kg input]  [reps input]  [✓]
  + Add Set
  ```

- A done set: greyed text `${weight} kg × ${reps} reps` + filled check.
- BW chip in the header right (toggling sets the per-exercise `bwOverride` like today).
- An additional "..." menu button on the right of the header is **out of scope** for this phase (today's reference shows it; we keep current minimal trainer-note flow).

`<SupersetBlock>` in `mode="logging"` reuses the same outer chrome; children are `<ExerciseRow mode="logging">`.

### 5.2 Member Logging Page (`session-logger.tsx`)

- Replace inline `border-[#2a2a2a]` superset wrapper with `<SupersetBlock mode="logging">`.
- Replace inline exercise card with `<ExerciseRow mode="logging">`.
- Top header: keep `<` Back, day name, mode badge (trainer-on-behalf), elapsed timer; restyle timer into a `bg-muted text-foreground/65 rounded-md px-2 py-0.5 text-xs font-mono` pill on the right.
- Bottom Complete bar: token-only restyle.
- Hex migration applies same as §4.7.

### 5.3 Self-Tracking Logging (`self-workout-session.tsx`)

- Same component swap. The inline `SetGroups` helper becomes a wrapper that maps `ISelfWorkoutLog.sets` into the shape `<ExerciseRow mode="logging">` expects.
- **Data layer is not unified**: `self-workout-log.model.ts` and `workout-session.model.ts` remain separate (per existing `feedback_self_tracking_isolation.md` memory).
- Hex migration applies.

### 5.4 Tests (P2)

| File | Coverage |
| --- | --- |
| Extend `exercise-row.test.tsx` | logging mode renders pills, per-set rows, +Add Set, done-state styling |
| Extend `superset-block.test.tsx` | logging mode renders members and per-set behavior |
| `__tests__/app/dashboard/member/plan/session-logger.test.tsx` | full flow: log set → optimistic update → complete; superset rendering; trainer-mode note panel still shows |
| Existing self-workout-session integration test | update assertions to new DOM |

### 5.5 Acceptance Criteria (P2)

- [ ] Member and self-tracking logging share the same `<ExerciseRow>` and `<SupersetBlock>` components.
- [ ] Visual matches reference `IMG_6376.PNG` (per-set rows, pills, BW toggle, Add Set).
- [ ] All existing logging functionality preserved (set logging API, complete dialog, trainer note panel, add exercise mid-session).
- [ ] No hex literal in touched files; tests + lint + build clean.

---

## 6. Phase 3 — Read-Only Template Preview

### 6.1 Routing

- Add `src/app/(dashboard)/trainer/plans/[id]/page.tsx` if it does not yet exist (current code has only `[id]/edit/page.tsx` — verify during implementation; if a view page already exists, replace its body).
- Owner mirror: `src/app/(dashboard)/owner/plans/[id]/page.tsx` (verify existence likewise).

### 6.2 UI

- Header: plan name (large), description (small `text-foreground/65`).
- `<DayTabs>` (re-used; tabs are non-editable — the "+ Add Day" button is hidden via prop `readOnly`).
- Active day shows `<ExerciseRow mode="view">` rendering: `[label] [thumb] {name}` + summary pills `Sets: N` / `Reps: a–b` / `Rest: ts` (no inputs, no chevrons, no delete).
- Supersets shown as `<SupersetBlock mode="view">` — same outer chrome, no Ungroup / Delete / Add.
- Bottom: a single `Edit Plan` button linking to `/trainer/plans/[id]/edit`.

### 6.3 Tests (P3)

| File | Coverage |
| --- | --- |
| `__tests__/components/training/exercise-row.test.tsx` (extend) | view mode renders pills only, no inputs |
| `__tests__/app/dashboard/trainer/plans/template-view.test.tsx` | renders day tabs, exercises, edit link |

### 6.4 Acceptance Criteria (P3)

- [ ] Trainer/Owner can view a template without entering edit mode.
- [ ] Edit Plan button navigates to existing edit route.
- [ ] No layout regressions vs P1 visuals.
- [ ] Tests + lint + build clean.

---

## 7. Implementation Order & PR Plan

| PR | Title | Depends on |
| --- | --- | --- |
| 1 | `feat(training): redesign template editor` (Phase 1) | — |
| 2 | `feat(training): align logging surfaces with new template UI` (Phase 2) | PR 1 |
| 3 | `feat(training): read-only template preview` (Phase 3) | PR 1 |

PR 2 and PR 3 can be parallelized after PR 1 lands.

---

## 8. Risks & Open Questions

| Risk | Mitigation |
| --- | --- |
| Empty `pendingSupersetGroups` state lost on reload during edit | Persist via `useState` only — these are transient editing artifacts; if user reloads mid-edit they re-create. Acceptable. |
| Existing data has malformed `groupId` / `isSuperset` mismatches | Add a defensive normalization in `toDayState` that re-derives `groupId = exerciseId` for any standalone with `isSuperset=false` and unique groupId. |
| Tests dependent on current DOM may break | Audit + update affected tests in the same PR, no skip allowed (per CLAUDE.md). |
| `<ExerciseSearchSheet>` visual polish drift | Out of scope; same component reused. Note as follow-up if needed. |

No blocking open questions remain. Phasing, validation rules, and superset UX are all settled in §4.

---

## 9. Reference Screenshots

- Current state: `.tmp/trainingdays.png`
- Target template view: `context/images/sample_app/exercise-app-example/Image_20251005113357_30_17.jpg`
- Target logging view: `IMG_6376.PNG`, `IMG_6377.PNG`, `IMG_6378.PNG`
- Target completion modal: `IMG_6382.PNG` (existing modal already covers RPE + note; visual polish only)
