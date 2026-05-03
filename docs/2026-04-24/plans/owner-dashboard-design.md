# Owner Admin Dashboard — Design Spec

**Date**: 2026-04-24  
**Status**: Partially Superseded

> ⚠️ **Route prefix and sidebar section are outdated.**
>
> - **Route prefix**: All owner routes were implemented as `/owner/...` (not `/dashboard/owner/...`). Update any references accordingly.
> - **Sidebar section**: The note "The existing TRAINER and MEMBER nav groups remain (owner can also use trainer workflows)" is outdated. The owner now has fully independent `TRAINING` and `HEALTH` nav groups under `/owner/*` routes — owner does not share routes with trainer or member.
> - **Admin page structure** (stats, trainers, members, invites) and **API routes** remain accurate.

---

## Overview

A dedicated management console for the gym owner. Accessed at `/dashboard/owner/`, it surfaces gym-wide statistics and gives the owner full control over trainers, members, and invite links — without touching the trainer-facing workflows.

---

## Pages & Routes

| Route | Purpose |
|---|---|
| `/dashboard/owner` | Global overview + per-trainer breakdown |
| `/dashboard/owner/trainers` | Trainer list + per-trainer member roster |
| `/dashboard/owner/members` | All members, filterable by trainer, with reassignment |
| `/dashboard/owner/invites` | Pending/expired invites, revoke, resend, create new |

All routes are server-rendered (Next.js Server Components) with client islands only where interactivity is needed (reassign modal, invite form).

---

## Architecture

### Route Guard

`src/middleware.ts` already allows owner access to `/dashboard/owner/*`. No middleware changes needed.

### API Routes

All under `/api/owner/` — owner session required (verified server-side in each handler).

| Method | Path | Action |
|---|---|---|
| GET | `/api/owner/stats` | Global counts: trainers, members, pending invites |
| GET | `/api/owner/trainers` | List all trainers with member count |
| DELETE | `/api/owner/trainers/[id]` | Remove trainer (reassign their members to owner first) |
| GET | `/api/owner/members` | List all members, optional `?trainerId=` filter |
| PATCH | `/api/owner/members/[id]/trainer` | Reassign member to different trainer |
| GET | `/api/owner/invites` | List all invites (pending + expired) |
| POST | `/api/owner/invites` | Create new invite (trainer or member role) |
| DELETE | `/api/owner/invites/[id]` | Revoke invite |
| POST | `/api/owner/invites/[id]/resend` | Regenerate token + resend email |

### Repository Extensions

`IUserRepository` gains three new methods:

```ts
findByRole(role: 'trainer' | 'member'): Promise<UserDoc[]>
findAllMembers(trainerId?: string): Promise<UserDoc[]>
updateTrainerId(memberId: string, trainerId: string | null): Promise<void>
```

`IInviteRepository` gains:

```ts
findAll(): Promise<InviteDoc[]>
revoke(inviteId: string): Promise<void>
regenerate(inviteId: string): Promise<InviteDoc>
```

---

## Pages — Detail

### 1. Dashboard (`/dashboard/owner`)

**Server Component** — fetches stats + trainer list in parallel on the server.

Sections:
- **Stat cards (4)**: Trainer count, Member count, Sessions this month, Pending invites
- **Trainer breakdown table**: Name, email, member count, sessions/month, status, "Manage" link
- **Quick actions**: Invite Trainer shortcut, Reassign Member shortcut, View Invites shortcut

Sessions/month is read from the existing `TrainingSession` collection (count by trainer's members).

### 2. Trainers (`/dashboard/owner/trainers`)

**Server Component** — full trainer list.

- Table: avatar, name, email, member count, sessions/month, joined date
- "Members" button → expands inline list of that trainer's members (client toggle)
- "Remove" button → confirms then calls DELETE `/api/owner/trainers/[id]`
  - Before deletion: owner must confirm where members are reassigned
  - All member history is preserved; only `trainerId` field changes

### 3. Members (`/dashboard/owner/members`)

**Server Component** with a **Client island** for the reassign flow.

- Tab filter: All / by Trainer (renders the same list with `?trainerId=` query param → server re-fetch)
- Table: avatar, name, email, assigned trainer, joined date, "Reassign" button
- **Reassign modal**: select new trainer from dropdown → PATCH `/api/owner/members/[id]/trainer`
  - Preserves all data (training logs, body tests, nutrition logs untouched)
  - Only `user.trainerId` changes

### 4. Invites (`/dashboard/owner/invites`)

**Server Component** + **Client island** for create form.

- Tabs: Pending / Expired / All
- Pending row actions: Copy Link, Resend, Revoke
- Expired row action: Resend (regenerates a new token)
- Create form: Role selector (Member/Trainer), Trainer assignment (if Member), optional email field
  - On submit: POST `/api/owner/invites` → returns new invite URL → copy to clipboard

---

## Data Layer

### Existing models used

- `User` — `role`, `trainerId`, `createdAt`
- `Invite` — `role`, `inviterId`, `trainerId`, `token`, `expiresAt`, `usedAt`
- `TrainingSession` — for session counts (aggregate by member's trainerId)

### No new Mongoose models needed.

---

## Sidebar Update

Add an **ADMIN** nav group to `AppShell` visible only when `session.user.role === 'owner'`:

```
ADMIN
  ◈  Dashboard        /dashboard/owner
  ◇  Trainers         /dashboard/owner/trainers
  ◇  Members          /dashboard/owner/members
  ◇  Invites          /dashboard/owner/invites  [badge: pending count]
```

The existing TRAINER and MEMBER nav groups remain (owner can also use trainer workflows).

---

## Component Breakdown

| Component | Type | Location |
|---|---|---|
| `OwnerStatCards` | Server | `owner/_components/stat-cards.tsx` |
| `TrainerBreakdownTable` | Server | `owner/_components/trainer-breakdown-table.tsx` |
| `TrainerListClient` | Client | `owner/trainers/_components/trainer-list-client.tsx` |
| `MemberListClient` | Client | `owner/members/_components/member-list-client.tsx` |
| `ReassignModal` | Client | `owner/members/_components/reassign-modal.tsx` |
| `InviteListClient` | Client | `owner/invites/_components/invite-list-client.tsx` |
| `InviteCreateForm` | Client | `owner/invites/_components/invite-create-form.tsx` |

---

## Error Handling

- Owner-only API routes return `403` if session role ≠ `owner`
- Trainer removal blocked if trainer has members and no reassignment target is provided
- Invite revoke/resend no-ops gracefully if invite already used

---

## Out of Scope

- Analytics charts / time-series graphs (future phase)
- Bulk member import
- Owner editing another trainer's plan templates directly
