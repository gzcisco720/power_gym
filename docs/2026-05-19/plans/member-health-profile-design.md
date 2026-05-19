# Member Health Profile — Design Spec

## Overview

Redesign the Health system to give members full ownership of their own health data, while giving trainers a richer, read-contextualized view of everything in one place.

**Problem being solved:**
1. Members currently have no way to self-report injuries, medications, or medical history
2. The existing injury model is too thin (4 fields only)
3. No medication or chronic condition tracking exists
4. Trainer Health Tab has no aggregated view — just a bare injury list

---

## Architecture Decision

**Unified Health Profile (Option A):** Three independent data types under a shared Health umbrella:
- **Injuries** — dynamic, bidirectional (trainer adds clinical record; member adds self-report)
- **Medications** — dynamic, member-managed; trainer reads only
- **Medical History** — semi-static, member-managed; trainer reads only

---

## Member Side

### Navigation
New top-level nav item **"My Health"** under the PERSONAL section of the member sidebar, alongside My Training, My Nutrition, My Body Tests, Check-ins.

### Page Structure
Single scrolling page (no nested tabs) with three vertical sections:

1. **Injuries** — active on top, collapsible History section below
2. **Medications** — active/short-term on top, expired/ended items in collapsible History
3. **Medical History** — always-visible info grid, inline edit mode

### Permissions on Member Side
- Member can **Add / Edit / Resolve / Reopen / Delete** their own injury reports
- Member can **Add / Edit / Delete** medications and medical history
- Member can **view** injuries added by their trainer, and add their own notes to them
- Member **cannot** delete or resolve injuries added by their trainer (trainer-owned records)

---

## Trainer Side (Health Tab)

Single scrolling page showing all three sections. Trainer can see everything; edit rights follow the source.

### Section 1 — Injuries (Trainer can edit)
Full CRUD: Add, Edit, Resolve, Reopen, Delete any injury record.

### Section 2 — Medications (Read-only, "Member-managed" badge)
Trainer sees the list. No Add/Edit/Delete controls shown.
**Auto-alert:** System matches medication name against a known-drug lookup table and displays a training implication chip inline:
- Beta blockers → "⚠ HR-based intensity targets may be inaccurate — use RPE"
- NSAIDs → "⚠ May mask pain signals — monitor effort carefully"
- Statins → "⚠ Monitor for unusual muscle soreness"
- Diuretics → "⚠ Dehydration risk — monitor hydration"
- Insulin/diabetes meds → "⚠ Monitor for hypoglycemia during exercise"

### Section 3 — Medical History (Read-only, "Member-managed" badge)
Trainer sees the full grid. No edit controls shown.

---

## Data Models

### Expanded Injury Model (`MemberInjury`)

**Existing fields (keep):**
- `memberId`, `title`, `status`, `recordedAt`, `trainerNotes`, `memberNotes`, `affectedMovements`

**New fields:**

| Field | Type | Filled by |
|---|---|---|
| `injuryType` | `'acute' \| 'chronic' \| 'post-surgery'` | Either |
| `bodyPart` | string (enum: Knee, Shoulder, Lower Back, Hip, Ankle, Wrist, Neck, Other) | Either |
| `bodySide` | `'left' \| 'right' \| 'bilateral' \| null` | Either |
| `painAtRest` | number 0–10 \| null | Member |
| `painDuringExercise` | number 0–10 \| null | Member |
| `mechanism` | string \| null | Member |
| `aggravatingFactors` | string \| null | Member |
| `relievingFactors` | string \| null | Member |
| `seenDoctor` | boolean | Member |
| `doctorRestrictions` | string \| null | Trainer |
| `rehabilitationStatus` | `'not_started' \| 'in_progress' \| 'cleared' \| null` | Trainer |
| `resolvedAt` | Date \| null | System (auto on resolve) |
| `createdByRole` | `'trainer' \| 'member'` | System (set on create) |

### New Medication Model (`MemberMedication`)

| Field | Type | Notes |
|---|---|---|
| `memberId` | ObjectId | — |
| `name` | string | e.g. "Metoprolol 50mg" |
| `purpose` | string | e.g. "High blood pressure" |
| `duration` | `'long_term' \| 'short_term'` | — |
| `startDate` | Date | — |
| `endDate` | Date \| null | Short-term only |
| `notes` | string \| null | — |
| `status` | `'active' \| 'ended'` | default: active |
| `createdAt` | Date | — |

### New Medical History Model (`MemberMedicalHistory`)

One document per member (upsert pattern).

| Field | Type | Notes |
|---|---|---|
| `memberId` | ObjectId | Unique index |
| `chronicConditions` | string[] | e.g. ["Hypertension", "Type 2 Diabetes"] |
| `surgeries` | string \| null | Free text |
| `allergies` | string \| null | — |
| `familyHistory` | string \| null | Optional |
| `currentDoctor` | string \| null | Name + contact |
| `emergencyContact` | string \| null | Name + phone |
| `pregnancyStatus` | `'n/a' \| 'not_pregnant' \| 'pregnant' \| 'postpartum' \| null` | — |
| `updatedAt` | Date | — |

---

## UI Patterns

### Add/Edit Containers
- **Injury form** → **Sheet** (slides in from right, full height) — fields are many
- **Medication form** → **Dialog** (centered modal, ~480px wide) — fields are few
- **Medical History** → **Inline edit** (Edit button unlocks the grid in place)

### Lifecycle Management (Injuries & Medications)

**Active section** — shown at top, full opacity, with action buttons:
- Edit (pencil icon or "Edit" text button)
- Resolve / End (`✓` — green confirm dialog)
- Delete (`✕` — red destructive confirm dialog)

**History section** — collapsed by default ("HISTORY · N resolved"), click to expand:
- Each item dimmed (opacity 0.6–0.7), date of resolution shown
- Reopen button (`↩` — indigo confirm dialog)
- Delete button (`✕`)

### Three Confirm Dialogs

**Resolve / End:**
> **Mark as resolved?**
> This will move the record to History. You can reopen it anytime.
> [Cancel] [Mark Resolved ✓]

**Delete (permanent):**
> **Delete this record?**
> This cannot be undone. The record will be permanently removed.
> [Cancel] [Delete]

**Reopen:**
> **Reopen this injury?**
> This will move it back to Active. Use this if the issue has returned or was marked resolved too early.
> [Cancel] [Reopen]

---

## API Routes Needed

| Method | Path | Description |
|---|---|---|
| GET | `/api/members/[memberId]/health` | Fetch injuries + medications + medical history in one call |
| POST | `/api/members/[memberId]/injuries` | Add injury (existing, extend fields) |
| PATCH | `/api/members/[memberId]/injuries/[id]` | Edit / change status (existing, extend) |
| DELETE | `/api/members/[memberId]/injuries/[id]` | Delete (existing) |
| GET | `/api/members/[memberId]/medications` | List medications |
| POST | `/api/members/[memberId]/medications` | Add medication |
| PATCH | `/api/members/[memberId]/medications/[id]` | Edit / end medication |
| DELETE | `/api/members/[memberId]/medications/[id]` | Delete medication |
| GET | `/api/members/[memberId]/medical-history` | Get medical history |
| PUT | `/api/members/[memberId]/medical-history` | Upsert medical history |

Member-side routes use the session's own `memberId` (no param needed on member pages).

---

## Member "My Health" Page Route
`/member/health` — new page, requires `role === 'member'`

---

## Spec Self-Review
- No TBD or placeholders remain
- `createdByRole` field resolves the permission question of who can delete what
- Auto-alert drug lookup is a read-only feature — no extra model needed, just a static map in code
- Medical History upsert pattern avoids needing a separate POST/GET distinction
- Trainer Health Tab keeps existing URL (`/trainer/members/[id]/health`) — no routing change needed
