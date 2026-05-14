# Per-Trainer Hub Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the owner's per-trainer hub from a sparse 3-tab shell into a high-density information centre using the Indigo Premium design system — giving the owner full visibility into a trainer's performance, members, schedule, and created content.

**Architecture:** Server components with Suspense boundaries for all data-fetching sections. Pagination via URL search params (`?page=N`). New shared `HubPagination` client component. Two new page routes and five new tab data-fetching components.

**Tech Stack:** Next.js App Router, Recharts (bar chart), shadcn Pagination component (to be added via CLI), Tailwind v4 CSS tokens, Framer Motion variants from `src/lib/animations/variants.ts`.

---

## Current State

Route: `/owner/trainers/[id]`

| Tab | Current content |
|---|---|
| Overview | 3 stat cards (Members, Sessions/Mo, Templates) |
| Members | Plain list: name + email + Reassign button |
| Calendar | Read-only CalendarClient |

Header uses hardcoded hex colors (`#050505`, `#0f0f0f`, `#222`, `#666`).

---

## Target State

### Header Upgrade

File: `src/app/(dashboard)/owner/trainers/[id]/layout.tsx`

Replace all hardcoded hex with design tokens:
- Avatar: `bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_14px_rgba(99,102,241,0.4)]`
- Background: `bg-background border-b border-foreground/[.06]`
- Name: `text-foreground font-bold`
- Sub-text (email, joined): `text-foreground/35`
- Back link: `text-foreground/25 hover:text-foreground/50`

### Tab Structure (5 tabs)

File: `src/components/shared/trainer-tab-nav.tsx`

```ts
const TABS = [
  { label: 'Overview',        segment: ''                  },
  { label: 'Members',         segment: '/members'          },
  { label: 'Calendar',        segment: '/calendar'         },
  { label: 'Training Plans',  segment: '/training-plans'   },
  { label: 'Nutrition Plans', segment: '/nutrition-plans'  },
] as const;
```

---

## Tab Designs

### Tab 1 — Overview

**Route:** `/owner/trainers/[id]` (existing page)

**Layout:** 2 rows × 3 stat cards → sessions trend chart

**KPI Row 1:**
| Card | Source |
|---|---|
| Members | `userRepo.findAllMembers(trainerId).length` |
| Sessions / Mo | `sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)` |
| Templates | `planTemplateRepo.countByCreator(trainerId)` |

**KPI Row 2:**
| Card | Source | Label sub-text |
|---|---|---|
| Active / Mo | count of memberIds with ≥1 completed session this month | "of N members" |
| New PRs / Mo | `pbRepo.findByMemberIdsSince(memberIds, startOfMonth).length` | — |
| Avg Streak | average of `sessionRepo.findConsecutiveStreakDays(memberId)` across all members | — |

**Sessions Trend Chart:**
- Recharts `BarChart` inside `ResponsiveContainer`, height 110
- Data: last 6 calendar months, count of completed sessions per month
- New repo method needed: `sessionRepo.countByMemberIdsByMonth(memberIds, months: 6)` → `{ label: string; count: number }[]`
- Each bar + month label in a flex column (bars + labels aligned per column, not `space-between`)
- Current month bar: `#6366f1`; past months: `rgba(99,102,241,0.35)`
- Tooltip: `cursor={{ fill: 'rgba(255,255,255,0.04)' }}`, dark style matching existing `MemberGrowthChartClient`

**New components:**
- `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx` — replace existing (add KPI row 2 + chart)
- `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-sessions-chart-client.tsx` — Recharts client component

---

### Tab 2 — Members

**Route:** `/owner/trainers/[id]/members` (existing page, full replacement)

**Layout:** Two panels side by side (top) → full member health list (bottom)

#### Top panels

**Top Members panel** — top 3 members by streak, ranked 1/2/3:
- Source: call `sessionRepo.findConsecutiveStreakDays(memberId)` for all members, sort descending
- Rank 1 badge: amber (`text-amber-400 bg-amber-400/10`)
- Rank 2–3 badge: indigo (`text-primary-light bg-primary/10`)

**Recent Activity panel** — last 5 events across trainer's members:
- Events: completed workout sessions + new personal bests
- New repo method: `sessionRepo.findRecentCompletedByMemberIds(memberIds, limit: 5)` → `{ memberName, completedAt, dayLabel }[]`
- New repo method: `pbRepo.findRecentByMemberIds(memberIds, limit: 5)` → `{ memberName, exerciseName, weight, achievedAt }[]`
- Merge and sort by timestamp, show most recent 5

#### Member health list

Displayed fields per row:
- Avatar (initials, `bg-primary/20 text-primary-light`)
- Name (`text-sm font-semibold text-foreground/85`)
- Sub-text: `{streak}d streak · {sessionsThisMonth} sessions this month`
- Status badge (rightmost before actions):
  - **Active** (emerald): has active plan AND streak > 0
  - **Needs Attn** (amber): has active plan BUT streak = 0
  - **No Plan** (red): `memberPlanRepo.findActive(memberId)` returns null
- `View →` link: `/trainer/members/[id]`
- `Reassign` button: opens existing `ReassignModal`

**Pagination:** Server-side via `?page=N`, page size **10**.

**New repo method needed:** `userRepo.findAllMembersPaginated(trainerId, page, limit)` → `{ members: IUser[]; total: number }`

**Data per member row** (called in parallel per member):
- `sessionRepo.findConsecutiveStreakDays(memberId)`
- `sessionRepo.countCompletedByMemberSince(memberId, startOfMonth)`
- `memberPlanRepo.findActive(memberId)`

**New components:**
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-top-panels.tsx` — server component, fetches top members + recent activity
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-list.tsx` — server component, fetches paginated member list with health data
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx` — replace existing (add status badge, streak, sessions sub-text; keep Reassign modal logic)

---

### Tab 3 — Calendar

**Route:** `/owner/trainers/[id]/calendar` (existing, visual only)

No functional changes. Remove any hardcoded hex if present. Already uses `CalendarClient` correctly.

---

### Tab 4 — Training Plans (new)

**Route:** `/owner/trainers/[id]/training-plans` (new page)

**Layout:** Paginated list of plan templates created by this trainer.

**Per row:**
- Icon container: `bg-primary/15 rounded-lg` with 🏋️ emoji
- Template name (`text-sm font-semibold text-foreground/85`)
- Meta: `{daysPerWeek} days/week · {totalSessions} sessions · Created {month year}`
- `→` arrow right-aligned (`text-foreground/25`)
- Full row is a `<Link href="/owner/plans/[id]">` (read-only view via existing page)

**Data source:** `planTemplateRepo.findByCreatorPaginated(trainerId, page, limit: 15)` → `{ templates: IPlanTemplate[]; total: number }`

**New repo method:** `planTemplateRepo.findByCreatorPaginated(trainerId, page, limit)` (currently only `countByCreator` exists — need to add a paginated `find` variant)

**Empty state:** `"This trainer hasn't created any training plans yet."` with icon

**New files:**
- `src/app/(dashboard)/owner/trainers/[id]/training-plans/page.tsx`

---

### Tab 5 — Nutrition Plans (new)

**Route:** `/owner/trainers/[id]/nutrition-plans` (new page)

**Layout:** Paginated list of nutrition templates created by this trainer.

**Per row:**
- Icon container: `bg-emerald-500/12 rounded-lg` with 🥗 emoji
- Template name (`text-sm font-semibold text-foreground/85`)
- Sub-text: `{n} day type{s}` (e.g. "2 day types") — macros live on each day type, not at template level, so we show the count instead of a single macro number
- `→` arrow right-aligned
- Full row is a `<Link href="/owner/nutrition-templates/[id]/edit">` (navigates to existing edit page)

**Data source:** `nutritionTemplateRepo.findByCreatorPaginated(trainerId, page, limit: 15)` → `{ templates: INutritionTemplate[]; total: number }`

**New repo method:** `nutritionTemplateRepo.findByCreatorPaginated(trainerId, page, limit)` — check if `findByCreator` already exists; if not, add from scratch.

**Empty state:** `"This trainer hasn't created any nutrition plans yet."` with icon

**New files:**
- `src/app/(dashboard)/owner/trainers/[id]/nutrition-plans/page.tsx`

---

## Shared Pagination Component

**File:** `src/components/shared/hub-pagination.tsx`

```tsx
'use client';
interface HubPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string; // e.g. "/owner/trainers/abc123/members"
}
```

Uses shadcn `Pagination` component. Install first:
```bash
pnpm dlx shadcn@latest add pagination
```

Clicking a page number does `router.push(`${basePath}?page=${n}`)`. Renders nothing if `totalPages <= 1`.

---

## New Repository Methods Summary

| Repository | Method | Signature |
|---|---|---|
| `MongoWorkoutSessionRepository` | `countByMemberIdsByMonth` | `(memberIds: string[], months: number) => Promise<{ label: string; count: number }[]>` |
| `MongoWorkoutSessionRepository` | `findRecentCompletedByMemberIds` | `(memberIds: string[], limit: number) => Promise<{ memberId: string; memberName: string; completedAt: Date; dayLabel: string }[]>` |
| `MongoPersonalBestRepository` | `findRecentByMemberIds` | `(memberIds: string[], limit: number) => Promise<IPersonalBest[]>` — already exists as `findByMemberIdsSince`; add a `findRecentByMemberIds(memberIds, limit)` variant sorted by `updatedAt desc` |
| `MongoUserRepository` | `findAllMembersPaginated` | `(trainerId: string, page: number, limit: number) => Promise<{ members: IUser[]; total: number }>` |
| `MongoPlanTemplateRepository` | `findByCreatorPaginated` | `(trainerId: string, page: number, limit: number) => Promise<{ templates: IPlanTemplate[]; total: number }>` |
| `MongoNutritionTemplateRepository` | `findByCreatorPaginated` | `(trainerId: string, page: number, limit: number) => Promise<{ templates: INutritionTemplate[]; total: number }>` |

---

## Design Tokens (all new/modified UI)

Follow existing Indigo Premium rules from `CLAUDE.md`:

| Element | Class |
|---|---|
| Page/card background | `bg-white/[.03] ring-1 ring-white/[.07] rounded-xl` |
| Section labels | `text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold` |
| Primary text | `text-foreground` |
| Secondary text | `text-foreground/65` |
| Active tab | `text-primary-light border-b-2 border-primary` |
| Status badge Active | `bg-emerald-500/15 text-emerald-400` |
| Status badge Needs Attn | `bg-amber-400/15 text-amber-400` |
| Status badge No Plan | `bg-destructive/15 text-destructive` |
| KPI accent value | `text-primary-light` (members count) |
| Streak/active value | `text-emerald-400` |

No hardcoded hex anywhere. Migrate any `text-[#xxx]` / `bg-[#xxx]` encountered in existing files.

---

## Files Changed / Created

### Modified
- `src/app/(dashboard)/owner/trainers/[id]/layout.tsx` — header visual upgrade
- `src/components/shared/trainer-tab-nav.tsx` — add 2 new tabs
- `src/app/(dashboard)/owner/trainers/[id]/page.tsx` — Suspense wrappers for new sections
- `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-stats-section.tsx` — expand to 6 KPIs + chart
- `src/app/(dashboard)/owner/trainers/[id]/members/page.tsx` — add pagination, restructure
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-client.tsx` — add health data display
- `src/lib/repositories/workout-session.repository.ts` — add 2 new methods
- `src/lib/repositories/personal-best.repository.ts` — add `findRecentByMemberIds`
- `src/lib/repositories/user.repository.ts` — add `findAllMembersPaginated`
- `src/lib/repositories/plan-template.repository.ts` — add `findByCreatorPaginated`
- `src/lib/repositories/nutrition-template.repository.ts` — add `findByCreatorPaginated`

### Created
- `src/app/(dashboard)/owner/trainers/[id]/_components/trainer-sessions-chart-client.tsx`
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-top-panels.tsx`
- `src/app/(dashboard)/owner/trainers/[id]/members/_components/trainer-hub-members-list.tsx`
- `src/app/(dashboard)/owner/trainers/[id]/training-plans/page.tsx`
- `src/app/(dashboard)/owner/trainers/[id]/nutrition-plans/page.tsx`
- `src/components/shared/hub-pagination.tsx`
