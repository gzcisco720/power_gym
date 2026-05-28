# Trainer Dashboard Redesign

**Status**: Approved  
**Date**: 2026-05-22

## Goal

Replace the sparse, data-thin trainer dashboard with a Command Center layout that surfaces actionable information: today's schedule (with member names), pending check-ins, this-week schedule overview, and a proper alert sidebar.

## Problems Fixed

| Problem | Fix |
|---|---|
| Today's Sessions shows "1 member" with no name | Enrich with member name, plan day, completion status |
| KPI Strip includes 30d Compliance (month-level, redundant) | Replace with Pending Check-ins (immediate/actionable) |
| Check-in system completely absent from dashboard | Add Pending Check-ins KPI + right-sidebar card |
| Needs Attention has no "view all" exit | Add link to `/trainer/members` |
| No this-week schedule overview | Add This Week Schedule bar chart in bottom row |
| Bottom row is 3 cols with sparse My Training card | Expand to 4 cols; keep My Training, add week schedule |

## Layout

### Row 1 — KPI Strip (4 cards)

| Card | Data | Note |
|---|---|---|
| Members | `userRepo.findAllMembers(trainerId).length` | unchanged |
| Sessions Today | completed today / total scheduled today | was "sessions today + this month delta" |
| Pending Check-ins | `checkInRepo.findRecentByTrainer(trainerId, 7d).length` | new — replaces 30d Compliance |
| Needs Attention | existing alert count logic | unchanged |

### Row 2 — Main Content (left 60% / right 40%)

**Left — Today's Sessions (compact list)**

Each row: status dot · member name · plan day name · time range · inline badges

- Status dot: green = completed today, indigo pulse = in progress now, grey = upcoming
- Inline badges: `⚠ No plan` (red), `Body test due` (indigo)
- Each row links to `/trainer/members/[id]`
- Footer: `View all → /trainer/calendar`
- Empty state: "No sessions scheduled today"

Data enrichment over current:
- Member name: `userRepo.findById(memberIds[0])`
- Plan day name: `memberPlanRepo.findActive(memberId)` → `planTemplate.days[currentDayIndex].name`
- Completed today: `workoutSessionRepo.countCompletedByMemberSince(id, todayStart) > 0`

**Right — Two stacked cards**

*Needs Attention* (top):
- Existing alert logic, cap reduced from 6 → 5
- Add `View all →` link to `/trainer/members`

*Pending Check-ins* (bottom, new):
- Show up to 4 most recent check-ins by trainer's members in last 7 days
- Each row: member name · relative time ("2h ago", "Yesterday") · `Review →` link to `/trainer/members/[id]/check-ins`
- Empty state: "All caught up ✓" (emerald)

### Row 3 — Bottom 4 Columns

| Col | Component | Change |
|---|---|---|
| 1 | Member Compliance 30d | unchanged |
| 2 | Recent PRs — This Week | unchanged |
| 3 | My Training | unchanged |
| 4 | This Week Schedule | **new** — 7-day bar chart |

**This Week Schedule:**
- Data: `scheduledSessionRepo.findByDateRange(weekStart, weekEnd, { trainerId })`, group by weekday
- 7 vertical bars (Mon–Sun), height proportional to session count, today highlighted in indigo
- Footer: total sessions this week
- Entire card links to `/trainer/calendar`

## New Repository Method

`ICheckInRepository.findRecentByTrainer(trainerId: string, since: Date): Promise<{ memberId: string; memberName?: string; submittedAt: Date }[]>`

Implementation: `CheckInModel.find({ trainerId, submittedAt: { $gte: since } }).sort({ submittedAt: -1 }).lean()`

Member names resolved in the component via `userRepo.findAllMembers(trainerId)` map.

## Files Changed

| File | Change |
|---|---|
| `src/lib/repositories/check-in.repository.ts` | Add `findRecentByTrainer` to interface + impl |
| `src/app/(dashboard)/trainer/_components/trainer-kpi-strip.tsx` | New KPI: Pending Check-ins; fix Sessions Today ratio |
| `src/app/(dashboard)/trainer/_components/trainer-today-sessions.tsx` | Add member name, plan day, completion status |
| `src/app/(dashboard)/trainer/_components/trainer-needs-attention.tsx` | Add View all link, cap 5 |
| `src/app/(dashboard)/trainer/_components/trainer-pending-checkins.tsx` | New component |
| `src/app/(dashboard)/trainer/_components/trainer-week-schedule.tsx` | New component |
| `src/app/(dashboard)/trainer/page.tsx` | New layout (2-col main + 4-col bottom) |

## Implementation Stages

### Stage 1: Repository
**Goal**: `findRecentByTrainer` method available  
**Tests**: Add to `__tests__/lib/repositories/check-in.repository.test.ts`

### Stage 2: Today's Sessions enrichment
**Goal**: Sessions show member name, plan day, completion dot  
**Tests**: `__tests__/app/trainer/_components/trainer-today-sessions.test.ts`

### Stage 3: KPI Strip update
**Goal**: 4 KPIs reflect new design  
**Tests**: `__tests__/app/trainer/_components/trainer-kpi-strip.test.ts`

### Stage 4: Needs Attention minor fix
**Goal**: View all link present  
**Tests**: `__tests__/app/trainer/_components/trainer-needs-attention.test.ts`

### Stage 5: New components
**Goal**: TrainerPendingCheckIns + TrainerWeekSchedule render correctly  
**Tests**: One test file each

### Stage 6: Layout
**Goal**: page.tsx wired up with new layout  
**Tests**: Smoke test page renders

### Stage 7: E2E
**Goal**: Playwright spec covers dashboard golden path
