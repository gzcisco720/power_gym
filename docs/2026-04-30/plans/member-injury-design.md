# Member Injury & Medical Conditions — Design

## Goal

Allow trainers and owners to record a member's injury history and ongoing medical conditions. Records are displayed in the Member Hub as a safety reference during training plan assignment and session preparation.

## Data Model

**Collection:** `MemberInjury`

| Field | Type | Notes |
|-------|------|-------|
| `memberId` | `ObjectId` (ref User) | Required |
| `title` | `string` | Required, short description (e.g. "Left knee ligament strain") |
| `status` | `'active' \| 'resolved'` | Default `active` |
| `recordedAt` | `Date` | When the trainer/owner added the record |
| `trainerNotes` | `string \| null` | Detail notes from trainer or owner |
| `memberNotes` | `string \| null` | Notes added by the member themselves |
| `affectedMovements` | `string \| null` | Free text (e.g. "Avoid squats, jumping") |
| `createdAt` | `Date` | Mongoose timestamps |

Injuries and ongoing medical conditions are unified in one list, distinguished by `status`. A resolved record can be reactivated.

## Access Control

| Role | Permissions |
|------|-------------|
| Trainer | Full CRUD for their own members' injuries |
| Owner | Full CRUD for all members' injuries |
| Member | Read own injuries; edit own `memberNotes` only |

A trainer may not access another trainer's member's injuries.

## API

All routes under `/api/members/[memberId]/injuries`:

| Method | Path | Who | Notes |
|--------|------|-----|-------|
| `GET` | `/api/members/[memberId]/injuries` | trainer(own members) / owner / member(self) | Returns all records sorted by `recordedAt` desc |
| `POST` | `/api/members/[memberId]/injuries` | trainer(own) / owner | Creates new record |
| `PATCH` | `/api/members/[memberId]/injuries/[id]` | trainer(own)/owner: all fields; member(self): `memberNotes` only | Partial update |
| `DELETE` | `/api/members/[memberId]/injuries/[id]` | trainer(own) / owner | Hard delete |

## UI

### Member Hub — Overview Tab

A new **Health** card below existing summary cards:
- Lists only `status: 'active'` injuries
- Each row: title + `affectedMovements` (if present)
- Empty state: "No active injuries"
- Trainer/Owner view: includes a "+ Add" button that opens an inline form

### Member Hub — Health Tab (new tab)

Full injury history, split into two sections:

**Active** (trainer/owner view):
- Inline add form at the top
- Each record: title, affectedMovements, trainerNotes, memberNotes, recordedAt
- Actions: Edit (all fields), Mark as Resolved, Delete (with confirm)

**Resolved** (trainer/owner view):
- Read-only list
- Action: Reactivate (sets status back to `active`)

**Member view** (both sections):
- All fields visible
- Only `memberNotes` field is editable (inline text input, save button)

## File Map

### New files
| File | Purpose |
|------|---------|
| `src/lib/db/models/member-injury.model.ts` | `IMemberInjury` interface + Mongoose schema |
| `src/lib/repositories/member-injury.repository.ts` | `IMemberInjuryRepository` + `MongoMemberInjuryRepository` |
| `src/app/api/members/[memberId]/injuries/route.ts` | `GET` / `POST` |
| `src/app/api/members/[memberId]/injuries/[id]/route.ts` | `PATCH` / `DELETE` |
| `src/app/(dashboard)/trainer/members/[id]/health/page.tsx` | Health tab server page |
| `src/app/(dashboard)/trainer/members/[id]/health/_components/injury-client.tsx` | Health tab client component (add/edit/delete UI) |

### Modified files
| File | Change |
|------|--------|
| `src/components/shared/member-tab-nav.tsx` | Add `{ label: 'Health', segment: '/health' }` to TABS |
| `src/app/(dashboard)/trainer/members/[id]/page.tsx` | Add Health card showing active injuries |
