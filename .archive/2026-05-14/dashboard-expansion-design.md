# Dashboard Expansion — Design Spec

**Date**: 2026-05-14
**Status**: Approved
**Scope**: All three roles — Owner, Trainer, Member dashboard pages

---

## Overview

Enrich the landing dashboard for all three roles. Currently Owner has a minimal 4-card page; Trainer and Member both redirect immediately to sub-pages with no dashboard at all. This spec defines what each role sees on arrival, using the Indigo Premium design language and Rich Motion animations established in the UI/UX upgrade.

**Design language reference**: `docs/2026-05-14/plans/ui-ux-upgrade-design.md` — all tokens, surface hierarchy, and animation variants apply here unchanged.

---

## 1. Owner Dashboard (`/owner`)

### Current state
4 StatCards (Trainers, Members, Sessions/mo, Pending Invites) + TrainerBreakdownSection table.

### New layout (top to bottom)

#### Section A — Overview KPIs (6 cards, 3×2 grid)

| Card | Value | Delta |
|---|---|---|
| Trainers | count | ↑/↓ new this month |
| Members | count | ↑/↓ joined this month |
| Sessions / Month | count | ↑/↓ % vs last month |
| Check-in Rate | % | ↑/↓ vs last week |
| Active Today | count | sessions in progress |
| Pending Invites | count | N expiring soon |

- Each card uses `StatCard` with appropriate `accentColor` (indigo=Trainers, success=Sessions, achievement=Check-in rate)
- Delta line uses emerald for positive, amber for warning, muted for neutral

#### Section B — Member Growth Chart

- 6-month stacked bar chart (Recharts `BarChart`)
- Two data series: new members this month (solid indigo) + cumulative (translucent indigo)
- X-axis: month labels; Y-axis: count
- Data: query `UserRepository.findMembersJoinedByMonth(6)`

#### Section C — Two-column grid

**Left: Trainer Performance (this month)**
- Sorted by session count descending
- Each row: avatar initials, name, progress bar (normalised to top trainer), session count, member count
- Data: `WorkoutSessionRepository.countByTrainerThisMonth()` grouped by trainer

**Right: Equipment Status**
- Summary strip (3 mini cards): Active count / Service Due count / Out of Order count
- Item list (max 5): shows non-Active equipment only, sorted by severity (Out of Order → Service Due → Maintenance)
- Each row: equipment name, last condition note, status pill
- Clicking a row navigates to `/owner/equipment`
- Data: `EquipmentRepository.findAll()` + latest condition report per item

### Data requirements (new queries needed)

| Query | Repository | Method to add |
|---|---|---|
| Members joined per month (last 6) | `MongoUserRepository` | `findMembersJoinedByMonth(months: number)` |
| Sessions per trainer this month | `MongoWorkoutSessionRepository` | `countCompletedByTrainerSince(date)` |
| Check-in rate (30-day) | `MongoCheckInRepository` | `findWeeklyRateForAll(since: Date)` |
| Sessions active today | `MongoWorkoutSessionRepository` | already exists (`countByMemberIdsSince`) |

---

## 2. Trainer Dashboard (`/trainer`)

### Current state
Redirects to `/trainer/members`. Replace redirect with a real page.

### New layout (top to bottom)

#### Section A — KPIs (4 cards, single row)

| Card | Value | Sub-line |
|---|---|---|
| Members | total count | N without plan yet |
| Sessions Today | count from calendar | ↑ N this month |
| 30-day Compliance | % | sessions logged / assigned |
| Needs Attention | count | N+ days no session |

- `accentColor`: indigo / success / achievement / none(red tint via custom class)

#### Section B — Two-column grid (Today + Needs Attention)

**Left: Today's Sessions**
- Pulled from `ScheduledSessionRepository.findByTrainerAndDate(trainerId, today)`
- Each session block: member name, time range, plan day name, contextual note
  - Contextual notes (derived, not stored): "Body test overdue" if last test > 30 days ago; "No plan assigned" if member has no active plan; "Check-in streak: N days 🔥" if streak > 7
- Sorted by start time ascending

**Right: Needs Attention**
- Priority-sorted list of members requiring action, max 6 rows
- Four alert types, each with action pill:

| Condition | Label | Action pill |
|---|---|---|
| No training plan assigned | No plan | "Assign Plan" → `/trainer/plans` |
| No nutrition plan assigned | No nutrition plan | "Assign Nutrition" → `/trainer/nutrition` |
| Last body test > 30 days ago | Body test due | "Log Test" → member body tests page |
| Last completed session > 7 days ago | Nd idle | shows day count, no action |

- A member can appear multiple times if they have multiple issues

#### Section C — Three-column grid (Compliance + PRs + My Training)

**Left: Member Compliance — 30 days**
- Each member: name + horizontal progress bar + % figure
- % = completed sessions / scheduled sessions in last 30 days
- Colour: ≥80% emerald, 50–79% amber, <50% red
- Data: `WorkoutSessionRepository.countCompletedByMemberSince()` vs plan schedule

**Centre: Recent PRs — This Week**
- Latest personal best records set by trainer's members in the past 7 days
- Each row: member name, exercise name, new 1RM estimate (kg), delta vs previous PR
- Data: `PersonalBestRepository.findByMemberIdsSince(memberIds, 7 days ago)`
- Footer: "N PRs this week across your members"
- Empty state: "No new PRs this week"

**Right: My Training**
- Trainer's own self-tracking summary
- Streak number (gradient amber→red, large font)
- Sub-line: last session name + "yesterday" / "N days ago"
- 14-day activity heatmap (dots)
- Two stat rows: "This month · N sessions" and "Best lift · Exercise · Weight"
- Links to `/trainer/my-training`

### Data requirements

| Query | Repository | Method to add |
|---|---|---|
| Sessions per member (30-day count) | `MongoWorkoutSessionRepository` | `countCompletedByMemberIdSince(memberId, date)` (may already exist) |
| Last completed session per member | `MongoWorkoutSessionRepository` | `findLastCompletedByMemberId(memberId)` |
| Last body test date per member | `MongoBodyTestRepository` | `findLatestByMemberId(memberId)` (may exist) |
| PRs set by member list since date | `MongoPersonalBestRepository` | `findByMemberIdsSince(memberIds, since)` |
| Trainer's own streak + recent | `MongoSelfWorkoutLogRepository` | `findRecentByUserId(userId, days)` |

---

## 3. Member Dashboard (`/member`)

### Current state
Redirects to `/member/plan`. Replace redirect with a real page.

### New layout (top to bottom)

#### Section A — Hero (greeting + streak)

- Left: personalised greeting ("Good morning/afternoon/evening, [firstName] [emoji]") + sub-line ("Push day · Session at HH:mm with Coach [name]" or "No session scheduled today")
- Right: training streak number in large gradient text (amber→red) + "day streak 🔥" label
- Streak = consecutive calendar days with at least one completed workout session or check-in
- Greeting time-of-day: before 12:00 = morning, 12–17 = afternoon, after 17 = evening

#### Section B — Today's Workout Card

- Full-width indigo-tinted card
- Plan day name (large bold), exercise count + set count + estimated duration
- Exercise name chips (first 5 + "+N more" overflow)
- "Start →" button navigates to `/member/plan` (existing session logger)
- If no plan assigned: empty state card with "No training plan yet — ask your trainer"
- Data: `MemberPlanRepository.findCurrentByMemberId()` + next plan day logic

#### Section C — Key Numbers (3 cards, single row)

| Card | Value | Delta | accentColor |
|---|---|---|---|
| Weight kg | latest body test weight | ↓/↑ vs previous test | success if improved |
| Body Fat % | latest BF% | ↓/↑ vs previous | success if improved |
| [Top PR exercise] kg | highest 1RM estimate | ↑ "New PR" if set this week | achievement |

- If no body test yet: shows `—` with "No test yet"
- Top PR: the exercise with the single highest estimated 1RM across all personal bests

#### Section D — Two-column grid (Nutrition + Upcoming Sessions)

**Left: Today's Nutrition Targets**
- Section title: "Today's Nutrition Targets"
- Four macro rows: Protein (emerald) / Carbs (amber) / Fat (pink) / Calories (white)
- Each row: macro label + target value (e.g. "180 g" or "2,400 kcal") — no progress bar fill, no "consumed" value
- Display as plain stat rows (label left, value right), not as progress bars
- "Target" = from assigned nutrition plan for today's day type (training day / rest day / etc.)
- Note: actual consumption tracking is roadmap item E; this section is read-only targets only
- If no nutrition plan assigned: empty state card "No nutrition plan assigned"

**Right: Upcoming Sessions**
- Next 3 scheduled sessions from calendar
- Each row: day + time, session name + coach name, "Today" / "N days" pill
- If no sessions: "No sessions scheduled — check with your trainer"
- Data: `ScheduledSessionRepository.findUpcomingByMemberId(memberId, 3)`

#### Section E — Two-column grid (Body Composition + Personal Bests)

**Left: Body Composition**
- Before → after comparison for 4 metrics: Weight / Body Fat % / Lean Mass / Fat Mass
- Uses last two body test records
- Each row: metric label, previous value → current value, delta pill (green if improved)
- Footer: "Last test: [previous date] → [current date]"
- If fewer than 2 tests: show single latest values without comparison; if zero tests: empty state

**Right: Personal Bests**
- All-time PRs, sorted by most recently set descending, max 6 rows
- Each row: exercise name, date set, 1RM estimate (kg), "↑ PR" badge if set within last 7 days, else "stable" muted pill
- Data: `PersonalBestRepository.findByMemberId(memberId)`

### Data requirements

| Query | Repository | Notes |
|---|---|---|
| Current plan + next day | `MongoMemberPlanRepository` | existing |
| Latest 2 body tests | `MongoBodyTestRepository` | existing, limit 2 |
| All personal bests | `MongoPersonalBestRepository` | existing |
| Next 3 scheduled sessions | `MongoScheduledSessionRepository` | existing, filter by memberId + future |
| Today's nutrition plan day type | `MongoMemberNutritionPlanRepository` | existing — read current day type targets |
| Training streak | `MongoWorkoutSessionRepository` | `findConsecutiveStreakDays(memberId)` — new |

---

## 4. Architecture Notes

### Server Components (fetch on render)
All three dashboard pages are Next.js Server Components — data is fetched at request time with `Promise.all()` for parallelism. No client-side data fetching on initial load.

### Suspense boundaries
Each dashboard section is wrapped in its own `<Suspense fallback={<Skeleton />}>` so sections load independently and don't block each other.

### Animation
- KPI cards: `staggerContainer` + `staggerItem` (enter on mount)
- Section cards: `fadeSlideUp` on mount
- Page entry: handled automatically by existing `PageTransition`

### Streak calculation
Streak = longest consecutive run of days ending today where the member has at least one `completedAt` workout session. Implemented in `WorkoutSessionRepository.findConsecutiveStreakDays(memberId)`: query all completed sessions, sort by date descending, walk backwards counting consecutive calendar days.

### Compliance rate (Trainer view)
`completedSessions / max(scheduledSessions, 1) × 100` over the last 30 days. "Scheduled" = plan days in the member's active plan × 30 / plan cycle length. Capped at 100%.

---

## 5. File Map

```
src/app/(dashboard)/owner/page.tsx              ← MODIFY: add new sections
src/app/(dashboard)/owner/_components/
  dashboard-stats.tsx                           ← MODIFY: expand to 6 KPIs
  member-growth-chart.tsx                       ← NEW: Recharts bar chart
  trainer-performance-section.tsx               ← NEW: replaces breakdown table
  equipment-status-section.tsx                  ← NEW

src/app/(dashboard)/trainer/page.tsx            ← REPLACE redirect with real page
src/app/(dashboard)/trainer/_components/
  trainer-kpi-strip.tsx                         ← NEW
  trainer-today-sessions.tsx                    ← NEW
  trainer-needs-attention.tsx                   ← NEW
  trainer-compliance.tsx                        ← NEW
  trainer-recent-prs.tsx                        ← NEW
  trainer-my-training-card.tsx                  ← NEW

src/app/(dashboard)/member/page.tsx             ← REPLACE redirect with real page
src/app/(dashboard)/member/_components/
  member-hero.tsx                               ← NEW: greeting + streak
  member-today-workout.tsx                      ← NEW
  member-key-numbers.tsx                        ← NEW: 3 KPI cards
  member-nutrition-summary.tsx                  ← NEW
  member-upcoming-sessions.tsx                  ← NEW
  member-body-composition.tsx                   ← NEW
  member-personal-bests.tsx                     ← NEW

src/lib/repositories/workout-session.repository.ts  ← MODIFY: add streak + compliance queries
src/lib/repositories/personal-best.repository.ts    ← MODIFY: add findByMemberIdsSince
src/lib/repositories/user.repository.ts             ← MODIFY: add findMembersJoinedByMonth
```

---

## 6. Out of Scope

- Real-time updates / WebSocket (all data is request-time snapshot)
- Push notifications for dashboard events
- Customisable dashboard layout (drag-and-drop widgets)
- Owner financial/revenue metrics
- Member nutrition logging (member logs own meals — separate roadmap item E)
