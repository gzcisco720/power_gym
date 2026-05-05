# Per-Trainer Hub Design

**Date:** 2026-04-28  
**Status:** Approved

---

## Goal

Owner can click into any trainer from `/owner/trainers` and land on a dedicated hub page showing that trainer's stats, member list (with reassign), and weekly calendar — read-only throughout.

---

## User Decisions

| Question | Choice |
|----------|--------|
| Tab structure | C — Overview + Members + Calendar (3 tabs) |
| Members tab actions | B — View → link + Reassign button |
| Calendar tab format | C — Full grid week view, read-only (reuses CalendarClient) |

---

## Routes

```
/owner/trainers/[id]            ← Overview tab (stat cards)
/owner/trainers/[id]/members    ← Members tab (list + View + Reassign)
/owner/trainers/[id]/calendar   ← Calendar tab (read-only week grid)
```

All three routes share a layout at `/owner/trainers/[id]/layout.tsx`.

**Entry point:** "View →" link added to each trainer card in `trainer-list-client.tsx` (next to existing Members / Remove buttons).

---

## Layout (`/owner/trainers/[id]/layout.tsx`)

Server component. Responsibilities:
- Auth guard (redirect non-owner to `/`)
- Fetch trainer by `params.id` from `MongoUserRepository.findById()` — redirect to `/owner/trainers` if not found or not a trainer
- Render profile header: initials avatar, name, email, days since joined (same pattern as member hub layout)
- Render `← All Trainers` back link pointing to `/owner/trainers`
- Render `TrainerTabNav` component
- Render `{children}`

---

## TrainerTabNav (`src/components/shared/trainer-tab-nav.tsx`)

Client component. Same pattern as `MemberTabNav`:
- `usePathname()` for active tab detection
- Overview: active when `pathname === /owner/trainers/${id}`
- Members: active when `pathname.startsWith(/owner/trainers/${id}/members)`
- Calendar: active when `pathname.startsWith(/owner/trainers/${id}/calendar)`

Tabs:
```typescript
const TABS = [
  { label: 'Overview',  segment: '' },
  { label: 'Members',   segment: '/members' },
  { label: 'Calendar',  segment: '/calendar' },
] as const;
```

---

## Overview Tab (`page.tsx`)

Server component. Fetches in parallel:

| Stat | Source |
|------|--------|
| Member count | `UserRepository.findMembersByTrainer(trainerId).length` |
| Sessions this month | `WorkoutSessionRepository.countByMemberIdsSince(memberIds, startOfMonth)` |
| Plan template count | `PlanTemplateRepository.countByCreator(trainerId)` — **new method** |

**New repo method needed:** `IPlanTemplateRepository.countByCreator(createdBy: string): Promise<number>`  
Implementation: `PlanTemplateModel.countDocuments({ createdBy: new ObjectId(createdBy) })`

Renders 3 StatCards:
- 会员数 (member count)
- 本月训练 (sessions this month)
- 训练模板 (plan template count)

---

## Members Tab (`members/page.tsx`)

Server component. Fetches:
- Members belonging to this trainer via a new `UserRepository.findMembersByTrainer(trainerId)` method.

**New repo method needed:** `IUserRepository.findMembersByTrainer(trainerId: string): Promise<IUser[]>`  
Implementation: `UserModel.find({ role: 'member', trainerId: new ObjectId(trainerId) })`

(The existing `owner/trainers/page.tsx` fetches all members and groups them in memory. The hub needs a targeted per-trainer query.)

Also fetches all trainers (for reassign dropdown): `UserRepository.findByRole('trainer')`

Renders `TrainerHubMembersClient` (client component):
- Member rows: initials, name, email, "View →" link to `/trainer/members/${member._id}`, "Reassign" button
- Reassign button opens `ReassignModal` (import from `owner/members/_components/reassign-modal.tsx` or move to `shared/`)
- Empty state: "No members assigned."

---

## Calendar Tab (`calendar/page.tsx`)

Server component. Fetches:
- Trainer's members (for member name display in sessions): `UserRepository.findMembersByTrainer(trainerId)`

Renders `CalendarClient` with a new `readOnly` prop.

### CalendarClient changes

Add `readOnly?: boolean` prop to `CalendarClientProps`. When `true`:
- Do not set `createSlot` on slot clicks (pass `onSlotClick` as a no-op)
- Do not render `CreateSessionModal` or `EditSessionModal`
- Session cards remain visible but clicking them does nothing

The API call in `CalendarClient` fetches `/api/schedule?start=...&end=...`. Currently the owner GET returns ALL trainer sessions. We need the owner view to filter to this specific trainer.

### Schedule API change

Extend GET `/api/schedule` to accept an optional `?trainerId=<id>` query param. When the caller is an owner and `trainerId` is provided, call `repo.findByDateRange(start, end, { trainerId })` instead of `repo.findByDateRange(start, end, {})`.

`CalendarClient` accepts a new optional `filterTrainerId?: string` prop. When set, it appends `&trainerId=${filterTrainerId}` to the schedule API URL.

---

## File Mapping

| Status | Path | Purpose |
|--------|------|---------|
| Create | `src/app/(dashboard)/owner/trainers/[id]/layout.tsx` | Auth, trainer fetch, profile header, tab nav |
| Create | `src/app/(dashboard)/owner/trainers/[id]/page.tsx` | Overview — 3 stat cards |
| Create | `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx` | Members tab server component |
| Create | `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx` | Members list client (View + Reassign) |
| Create | `src/app/(dashboard)/owner/trainers/[id]/calendar/page.tsx` | Calendar tab server component |
| Create | `src/components/shared/trainer-tab-nav.tsx` | Tab nav client component |
| Modify | `src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx` | Add "View →" link per trainer |
| Modify | `src/components/calendar/calendar-client.tsx` | Add `readOnly` and `filterTrainerId` props |
| Modify | `src/app/api/schedule/route.ts` | Owner GET: support `?trainerId=` param |
| Modify | `src/lib/repositories/plan-template.repository.ts` | Add `countByCreator()` |
| Modify | `src/lib/repositories/user.repository.ts` | Add `findMembersByTrainer()` |

---

## Testing

### Unit tests (Jest)

- `PlanTemplateRepository.countByCreator` — found and not found cases
- `UserRepository.findMembersByTrainer` — returns only members of that trainer
- `TrainerTabNav` — active tab detection for each of the 3 segments

### E2E tests (Playwright) — `e2e/owner/trainers.spec.ts`

```
- "View →" link navigates to /owner/trainers/[id]
- Overview shows trainer profile header and 3 stat cards
- Members tab shows member list with View and Reassign buttons
- Reassign via Members tab updates trainer assignment
- Calendar tab renders week grid with navigation controls
- Calendar tab is read-only (no create modal on slot click)
- "← All Trainers" back link returns to /owner/trainers
```

---

## Constraints

- Owner-only: middleware already blocks non-owners from `/owner/*`
- No new auth changes needed
- `ReassignModal` lives at `owner/members/_components/reassign-modal.tsx` — the new Members client imports it directly (no move needed; relative import is fine since it's a shared UI pattern, not a shared component)
- `CalendarClient` is currently shared by trainer and owner calendar pages; the `readOnly` and `filterTrainerId` additions are additive and backwards-compatible (both optional, default to existing behavior)
