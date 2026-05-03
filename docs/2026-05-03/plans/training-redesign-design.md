# Training Module Redesign — Design Spec

**Date:** 2026-05-03
**Scope:** Complete UI/UX redesign of the Training section (plan overview, session logging, template builder). Data models are largely reused.

---

## Background

The existing Training UI does not match the desired product experience. The data models (PlanTemplate, MemberPlan, WorkoutSession) are already correct and do not need structural changes. The entire redesign is in the UI layer.

---

## Exercise Library Policy

Trainers and owners can add exercises manually (name + optional imageUrl + muscle group + isBodyweight flag). This capability must be preserved. External API integration (e.g. ExerciseDB) is a future enhancement; the system must be designed so that it can be added without restructuring the exercise data model or the plan builder UI.

---

## Plan A — Core Redesign (this implementation plan)

### A1. Member — My Plan Overview

**Routes:** `/member/plan` · `/owner/my-plan` (already exists) · `/trainer/my-plan` (to be created in this plan)

**Layout:**
- Page header: active plan name (e.g. "Eric Shred Season")
- Horizontally scrollable day tab strip: "Day 1 PT Leg day", "Day 2 Push day", etc. Active tab underlined. Tapping a tab switches the exercise list below.
- Exercise list for the selected day:
  - Each standalone exercise renders as a card: `[thumbnail] | name | A` with `Sets: N` and `Reps: min–max` chips below the name
  - Superset groups render as a single bordered card with a centred "Superset" chip at the top, containing each exercise row separated by a thin divider. Exercises in the same superset share a groupId; they get labels D1/D2, C1/C2, etc.
  - Letter labelling: standalone exercises use the next available single letter (A, B, C…); superset groups use the next letter as a prefix with a numeric suffix (D1, D2).
  - Thumbnail: shows `imageUrl` if present; falls back to a dark placeholder with a dumbbell icon.
- Sticky bottom bar: **"Log This Workout"** button. Tapping creates a new WorkoutSession for the selected day and navigates to the session logger.

**No plan assigned state:** EmptyState component — "No plan assigned. Your trainer hasn't set up a plan yet."

---

### A2. Session Logger

**Route:** `/member/plan/session/[id]` (and owner/trainer equivalents)

**Header:**
- Back chevron → returns to plan overview (uses `backPath` prop already wired)
- Day name (e.g. "Day 3 Pull day")
- Live elapsed timer top-right (MM:SS, counting up from session `startedAt`)

**Exercise cards (one per exercise, in plan order):**
- Exercise name + letter badge (top row)
- Prescribed chips: `Sets: N` `Reps: min–max`
- BW (bodyweight) toggle checkbox — when checked, the weight column across all set rows turns grey and is non-editable (weight saved as null)
- Set rows, one per prescribed set plus any extra sets added:
  - Row label: `01`, `02`, `03`…
  - Weight input (kg) — numeric, decimal allowed
  - Reps input — numeric integer
  - Check button (✓) — tapping marks the set complete (`completedAt` is set); completed rows show a visual filled check and muted text
- **"+ Add Set"** button below the set rows — appends a new set row (`isExtraSet: true`)

**Bottom section (below all exercise cards):**
- **"+ Add Exercise"** button — opens a search sheet to pick an exercise from the exercise library; selected exercise is appended to the session as a new card with 1 empty set row
- Date and Time display (static, from session `startedAt`)
- **"Complete Workout"** sticky button — marks session `completedAt`, navigates back to plan overview

**Persistence:** Each set row saves to the API on blur or on ✓ tap. The session is never lost if the user navigates away (it remains in-progress until Complete Workout is tapped).

---

### A3. Plan Template Builder (Trainer / Owner)

**Routes:** `/trainer/plans/[id]/edit` · `/owner/plans/[id]/edit`
**New page:** `/trainer/plans/new` · `/owner/plans/new`

The existing PlanTemplateForm is fully replaced.

**Structure:**
- Plan name field + optional description textarea (unchanged from current)
- Day list (vertical), each day collapsible:
  - Day name (editable inline)
  - Remove day button
  - Exercise list within the day (in order)
  - **"+ Add Exercise"** button per day — opens a search/select sheet:
    - Text search filtering exercises by name
    - Each result row: thumbnail (if imageUrl) + name + muscle group
    - Selecting an exercise adds it to the day with default values (sets: 3, repsMin: 8, repsMax: 12)
  - Each exercise row:
    - Thumbnail + name
    - Inline number inputs: Sets / Reps Min / Reps Max / Rest (s)
    - Bodyweight toggle
    - Remove button
    - Selection checkbox (for superset grouping)
  - When ≥2 exercises are selected: **"Group as Superset"** button appears — assigns them a shared groupId and `isSuperset: true`, renders them as a grouped superset block
  - Within a superset block: **"Ungroup"** button to dissolve it back to standalone exercises
  - ↑ / ↓ buttons to reorder exercises within a day (drag-and-drop is out of scope)
- **"+ Add Day"** button at the bottom of the day list
- **Save** button (top-right or sticky bottom bar)

**Exercise creation** (from within the builder or from `/trainer/exercises`):
- Trainers/owners can create exercises: name (required), imageUrl (optional), muscleGroup (optional), isBodyweight (boolean), isGlobal (boolean — global exercises are visible to all trainers)
- This capability is preserved independently of future API integration
- Future external API integration will add a second path to populate exercises (search → import) without removing manual creation

---

### A4. Assign Template to Member

Existing flow in trainer/owner member hub. The hub already has plan assignment. Verify the template dropdown correctly lists templates owned by the current trainer/owner. No structural change needed — this is a verification + minor fix if broken.

---

## Plan B — Enhancements (separate implementation plan, to follow)

### B1. Previous Session Ghost Data
When opening the session logger, each set row pre-populates with the weight and reps from the matching set in the most recent completed session for the same exercise (same memberId + same exerciseId). These appear as placeholder text (greyed), not committed values. The user can accept by tapping ✓ or overwrite by typing.

### B2. Rest Timer
After tapping ✓ on a completed set, a bottom sheet or pill appears with a countdown timer (default 90 seconds, configurable per-exercise via `restSeconds`). The timer shows remaining time and can be dismissed early. Browser/PWA notification on timeout if the app is backgrounded.

### B3. Session Summary
After tapping "Complete Workout," display a summary screen before navigating away:
- Total duration
- Total volume (sum of weight × reps for all completed sets)
- Number of sets completed vs. prescribed
- Any PRs set this session (heaviest weight for each exercise vs. personal best)
- "Done" button returns to plan overview

### B4. (Future) ExerciseDB API Integration
Search the ExerciseDB (or equivalent) API from within the plan builder. Selecting an external exercise creates a local Exercise document (preserving the existing data model), so the rest of the system is unaffected. Manual exercise creation remains available at all times.

---

## Data Model — No Changes Required

The existing models handle all Plan A requirements:

| Model | Key fields used |
|-------|----------------|
| `PlanTemplate` | `days[].exercises[].groupId`, `isSuperset`, `imageUrl`, `isBodyweight`, `sets`, `repsMin`, `repsMax`, `restSeconds` |
| `MemberPlan` | Same structure, copied from template on assignment |
| `WorkoutSession` | `sets[].actualWeight`, `actualReps`, `completedAt`, `isExtraSet`, `isBodyweight` |
| `Exercise` | `name`, `imageUrl`, `muscleGroup`, `isBodyweight`, `isGlobal`, `createdBy` |

The `WorkoutSession.sets` array has no `exerciseName` or `imageUrl` for exercises added via "+ Add Exercise" — these need to be stored in `ISessionSet` (already has `exerciseName`; `imageUrl` does not need to be stored, it can be looked up from the exercise library at render time via exerciseId).

---

## Out of Scope (Plan A)

- Rest timer (Plan B)
- Previous session ghost data (Plan B)
- Session summary screen (Plan B)
- ExerciseDB API integration (future)
- Drag-and-drop reordering (use ↑/↓ buttons instead — simpler, works on mobile)
