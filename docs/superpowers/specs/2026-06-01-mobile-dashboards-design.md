# Mobile Dashboards Design Spec

**Date:** 2026-06-01
**Scope:** `mobile/` + `backend/`
**Roles covered:** Owner, Trainer, Member

---

## 1. Overview

Replace the three placeholder Dashboard screens with fully functional dashboards. Data and business logic mirror the existing web dashboards (`web/src/app/(dashboard)/*/page.tsx`). Design and layout are adapted for mobile.

**Shared decisions:**
- **Layout pattern:** Single scrollable column, 2-column grids where content allows (consistent with Owner A / Trainer A choices)
- **Chart library:** `react-native-gifted-charts` (bar charts + line charts with touch interaction)
- **API strategy:** One aggregated backend endpoint per role — `GET /dashboard/owner`, `GET /dashboard/trainer`, `GET /dashboard/member`
- **Loading:** Full-page skeleton screen → data arrives → animated entry (no per-widget suspense)
- **State:** One Zustand store per role dashboard, fetched once on mount, refreshed on focus

---

## 2. Owner Dashboard

### Screen structure
`DashboardScreen` (owner) renders a `ScrollView` with `DrawerHeader` (already implemented) plus the following sections in order.

### Section 1 — Page title
```
Dashboard
Gym overview          ← text-foreground/65
```

### Section 2 — KPI Grid (2×3)
Six stat cards in a 2-column grid. Each card: uppercase section label (8px, tracking 1.5px, foreground/65) + large value (22px bold) + optional trend line (9px, color-coded).

| Card | Value | Trend |
|---|---|---|
| TRAINERS | count | — |
| MEMBERS | count | `+N joined this month` (green) |
| SESSIONS / MONTH | count | `+N% vs last month` (green) / `↓N% vs last month` (red) |
| ACTIVE TODAY | count | `sessions started today` (foreground/40) |
| CHECK-IN RATE | `N%` | `↑/↓ N% vs last week` (green/red) |
| PENDING INVITES | count | `N expiring soon` (amber) if > 0 |

### Section 3 — Member Growth Chart
- `react-native-gifted-charts` `BarChart`
- 6 months of member signup data (same query as web: `findMembersJoinedByMonth(6)`)
- Current month bar: `primary-light` (`#818cf8`), previous months: `primary` (`#4f46e5`)
- X-axis labels: abbreviated month names (Jan–Jun)
- Card container: `bg-card`, label `MEMBER GROWTH · LAST 6 MONTHS`

### Section 4 — Trainer Performance + Equipment Status (2-column)

**Trainer Performance (left):**
- Label: `TOP TRAINERS · THIS MONTH`
- List of up to 5 trainers: name + session count (right-aligned, `text-primary-light`) + relative progress bar (`bg-primary`, width proportional to max sessions)
- `View all →` link (`text-primary`, navigates to Trainers screen)

**Equipment Status (right):**
- Label: `EQUIPMENT`
- 2×2 counter grid: Active (emerald), Maintenance (amber), Retired (red), Overdue (red or foreground/40 if 0)
- Below counters: up to 2 non-active equipment items as compact rows — name + status badge (`Retired` red, `Maintenance` amber)

### Backend endpoint: `GET /dashboard/owner`
JWT-protected (`JwtAuthGuard` + `RolesGuard` + `@Roles('owner')`).

Response shape:
```typescript
{
  stats: {
    trainerCount: number;
    memberCount: number;
    membersJoinedThisMonth: number;
    sessionsThisMonth: number;
    sessionsLastMonth: number;
    activeToday: number;
    checkinRateThisWeek: number;       // percentage 0-100
    checkinRateLastWeek: number;
    pendingInviteCount: number;
    expiringInviteCount: number;
  };
  memberGrowth: { month: string; count: number }[];   // 6 entries, oldest first
  trainerPerformance: {
    trainerId: string;
    name: string;
    sessionCount: number;
    memberCount: number;
  }[];                                                 // up to 5, sorted desc
  equipment: {
    activeCount: number;
    maintenanceCount: number;
    retiredCount: number;
    overdueCount: number;
    nonActiveItems: { name: string; status: 'maintenance' | 'retired' | 'overdue'; notes: string | null }[];  // up to 5
  };
}
```

Mirrors the data fetched in `web/src/app/(dashboard)/owner/page.tsx`.

---

## 3. Trainer Dashboard

### Screen structure
`DashboardScreen` (trainer) renders a `ScrollView` with `DrawerHeader` plus sections below.

### Section 1 — Page title
```
Dashboard
Your members at a glance
```

### Section 2 — KPI Grid (2×2)
Four stat cards.

| Card | Value | Trend |
|---|---|---|
| MEMBERS | count | — |
| SESSIONS TODAY | count | — |
| CHECK-INS | count | `last 7 days` (foreground/40) |
| NEEDS ATTENTION | count | `7+ days no session` (foreground/40); value in red if > 0 |

### Section 3 — Today's Sessions (full width)
- Label: `TODAY'S SESSIONS · N total`
- List of sessions (up to 6, `View in calendar →` overflow link):
  - Status dot: green (completed), pulsing indigo (active/in progress), gray (upcoming)
  - Member name (bold) + plan name (foreground/50)
  - Time range (foreground/40, 8px)
  - Status badge right-aligned: `Done` (emerald), `Now` (indigo), `Later` (foreground/30)
- Empty state: `No sessions scheduled today` (foreground/65)

### Section 4 — Needs Attention + Pending Check-ins (2-column)

**Needs Attention (left):**
- Up to 3 alerts with colored dots: red (7d+ idle), amber (no plan), pink (no nutrition plan), indigo (body test overdue)
- Member name + issue description (8px)
- `View all →` link

**Pending Check-ins (right):**
- Up to 3 most recent check-ins: member name + relative time (2h ago / 1d ago)
- `Review →` link per item
- Empty state: `All caught up ✓` (emerald)

### Section 5 — Member Compliance + Recent PRs (2-column)

**Member Compliance (left):**
- Label: `COMPLIANCE · 30D`
- Up to 5 members: name + percentage (colored) + relative progress bar
  - ≥80%: emerald, 50–79%: amber, <50%: red

**Recent PRs (right):**
- Label: `RECENT PRs`
- Up to 5 PRs this week: member name + exercise name + estimated 1RM (kg, `text-primary-light`) + `↑ PR` badge (indigo pill)
- Empty state: `No PRs this week`

### Section 6 — My Training + This Week Schedule (2-column)

**My Training (left):**
- Label: `MY TRAINING`
- Streak number (large bold) + `day streak 🔥` (11px)
- Last session label: `Last: {type} · {relative time}` (8px, foreground/40)
- 14-day heatmap: 2 rows × 7 columns grid of small squares — emerald if session logged, `bg-muted` if not
- Footer: `N sessions this month` (8px, foreground/40)

**This Week (right):**
- Label: `THIS WEEK`
- 7-bar chart (Mon–Sun) using flex `View`s — no chart library needed for this simple case
  - Current day bar: `primary-light`, other days: `primary` at reduced opacity
  - Day labels below each bar (6px)
- Footer: `N sessions this week` + `View calendar →` link

### Backend endpoint: `GET /dashboard/trainer`
JWT-protected (`JwtAuthGuard`). Returns data scoped to `req.user.sub` (the trainer's own members).

Response shape:
```typescript
{
  stats: {
    memberCount: number;
    sessionsTodayCount: number;
    checkinsLast7Days: number;
    needsAttentionCount: number;       // members with 7+ days no session
  };
  todaysSessions: {
    memberId: string;
    memberName: string;
    planName: string | null;
    startTime: string;                 // ISO
    endTime: string;
    status: 'completed' | 'active' | 'upcoming';
  }[];
  needsAttention: {
    memberId: string;
    memberName: string;
    alertType: 'idle' | 'no_plan' | 'no_nutrition' | 'body_test_overdue';
    detail: string;
  }[];
  pendingCheckins: {
    memberId: string;
    memberName: string;
    checkinId: string;
    createdAt: string;
  }[];
  compliance: {
    memberId: string;
    memberName: string;
    percentage: number;
  }[];
  recentPRs: {
    memberId: string;
    memberName: string;
    exercise: string;
    estimatedOneRM: number;
  }[];
  myTraining: {
    streakDays: number;
    lastSessionType: string | null;
    lastSessionDate: string | null;
    last14Days: boolean[];             // index 0 = 14 days ago, index 13 = today
    sessionsThisMonth: number;
  };
  thisWeek: {
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    count: number;
    isToday: boolean;
  }[];
}
```

---

## 4. Member Dashboard

### Screen structure
`DashboardScreen` (member) renders a `ScrollView` with `DrawerHeader` plus sections below.

### Section 1 — Greeting Hero
```
Good {morning|afternoon|evening}, {firstName} {emoji}
{Weekday}, {Month} {Day}
```
Below greeting: streak display — large bold number with orange-yellow gradient + `day streak 🔥` (11px).

Time-of-day emoji: ☀️ (morning 5–12), 🌤 (afternoon 12–18), 🌙 (evening 18–5).

### Section 2 — Today's Workout Card
Full-width card with deep blue gradient (`#1e1b4b → #312e81`).
- Day type badge: `PUSH` / `PULL` / `LEGS` / `REST` etc. (8px, `text-primary-light`, uppercase tracked)
- Plan name (14px bold)
- Exercise tags (up to 5 pills, `bg-white/10`, `+N more` overflow)
- Metadata: `N exercises · N sets · ~N min` (foreground/50)
- `Start →` button (`bg-primary`, navigates to My Training)

Empty state (no plan assigned): neutral card with `No training plan assigned yet`.

### Section 3 — KPI Grid (2×2)

| Card | Value | Trend |
|---|---|---|
| SESSIONS | count | `this month` (foreground/40) |
| WEIGHT KG | latest reading | `↑/↓ N vs last` (green/red) |
| BODY FAT % | latest reading | `↑/↓ N% vs last` (green if lower = better) |
| TOP PR | best estimated 1RM across all exercises | exercise name below (foreground/40); amber if new PR this month |

### Section 4 — Training Frequency Heatmap (full width)
- 90-day heatmap rendered as a full-width grid: **13 columns × 7 rows**
- Columns = weeks (oldest left, newest right); rows = Mon–Sun
- Filled cell: `bg-emerald-500/80` (session logged); empty: `bg-muted`
- Today's cell: outlined with `ring-1 ring-emerald-500`
- Month labels above at approximate column positions (Mar / Apr / May / Jun)
- Footer: `N sessions · last 90 days`
- Implementation: pure `View` grid (no chart library needed)

### Section 5 — Body Composition Chart (full width)
- `react-native-gifted-charts` `LineChart`
- Two lines: Weight (kg) in emerald, Body Fat % in pink (dashed)
- Last 8 body test readings, x-axis: short date labels
- Legend below chart
- Card label: `BODY COMPOSITION`

### Section 6 — Strength Progress Chart (full width)
- `react-native-gifted-charts` `LineChart`
- Single line: estimated 1RM over time for selected exercise (indigo)
- Exercise selector: tappable pill showing current exercise + `▾`, opens a bottom sheet or inline picker with the member's tracked exercises
- Card label: `STRENGTH PROGRESS`

### Section 7 — Nutrition Today + Upcoming Sessions (2-column)

**Nutrition Today (left):**
- Header: `NUTRITION` label + day type badge (e.g. `Training Day`, indigo pill)
- Four rows: Protein (emerald), Carbs (amber), Fat (pink), Calories (foreground)
- Each row: macro name (foreground/65) + value + unit right-aligned (bold, colored)
- Divider above Calories row
- Empty state: `No nutrition plan assigned`

**Upcoming Sessions (right):**
- Label: `UPCOMING`
- Up to 3 sessions: time + day of week (bold, colored by proximity) + type (foreground/50) + badge
  - Today: `Today` badge (indigo)
  - Tomorrow: amber badge
  - 2+ days: `N days` (foreground/40)
- Empty state: `No upcoming sessions`

### Backend endpoint: `GET /dashboard/member`
JWT-protected (`JwtAuthGuard`). Data scoped to `req.user.sub`.

Response shape:
```typescript
{
  greeting: {
    firstName: string;
    streakDays: number;
  };
  todaysPlan: {
    planName: string;
    dayType: string;
    exercises: { name: string }[];
    exerciseCount: number;
    setCount: number;
    estimatedMinutes: number;
    scheduledTime: string | null;
  } | null;
  stats: {
    sessionsThisMonth: number;
    latestWeight: number | null;
    previousWeight: number | null;
    latestBodyFat: number | null;
    previousBodyFat: number | null;
    topPR: { exercise: string; estimatedOneRM: number } | null;
    newPRThisMonth: boolean;
  };
  trainingHeatmap: boolean[];           // 90 entries, index 0 = 90 days ago, index 89 = today
  bodyComposition: {
    date: string;
    weight: number;
    bodyFat: number;
  }[];                                  // last 8 body tests, oldest first
  strengthProgress: {
    exercises: string[];
    data: { date: string; estimatedOneRM: number }[];   // for the default (first) exercise
  };
  nutritionToday: {
    dayType: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  } | null;
  upcomingSessions: {
    datetime: string;
    type: 'individual' | 'group';
    groupSize: number | null;
    daysFromNow: number;
  }[];                                  // up to 3
}
```

---

## 5. Shared Implementation Notes

### New files (mobile)
```
mobile/src/screens/DashboardScreen.tsx          ← role-switches to correct dashboard
mobile/src/screens/dashboard/OwnerDashboard.tsx
mobile/src/screens/dashboard/TrainerDashboard.tsx
mobile/src/screens/dashboard/MemberDashboard.tsx
mobile/src/stores/owner-dashboard.store.ts
mobile/src/stores/trainer-dashboard.store.ts
mobile/src/stores/member-dashboard.store.ts
mobile/src/lib/api/owner-dashboard.api.ts
mobile/src/lib/api/trainer-dashboard.api.ts
mobile/src/lib/api/member-dashboard.api.ts
mobile/src/components/dashboard/StatCard.tsx    ← shared KPI card component
mobile/src/components/dashboard/TrainingHeatmap.tsx   ← pure View grid, reused by Trainer + Member
```

### New files (backend)
```
backend/src/modules/dashboard/dashboard.module.ts
backend/src/modules/dashboard/dashboard.controller.ts
backend/src/modules/dashboard/dashboard.service.ts
backend/src/modules/dashboard/dashboard.service.spec.ts
backend/src/modules/dashboard/dashboard.controller.spec.ts
backend/test/dashboard.e2e-spec.ts
```

### Dependencies to install
- `react-native-gifted-charts` (mobile) — bar + line charts; requires `react-native-svg` (already installed)
- `expo-linear-gradient` (mobile) — workout hero card gradient (Member dashboard)

### Role routing
`DashboardScreen` reads `useAuthStore().user.role` and renders the correct sub-dashboard. The drawer already navigates to `Dashboard` screen; no navigation change needed.

### Strength progress exercise selector
Default exercise = first item in `strengthProgress.exercises`. Selecting a different exercise triggers a new `GET /dashboard/member?exercise={name}` call (query param) and updates only the strength progress section of the store.

### Error & empty states
Every section that can have zero data must show a neutral empty state — no "Coming soon" or placeholder text. Sections with data dependencies (e.g. no body tests → no heatmap data) show the section card with an empty state message.

---

## 6. Testing

### Backend unit tests (`dashboard.service.spec.ts`)
- `OwnerDashboardService > returns correct trainerCount and memberCount`
- `OwnerDashboardService > memberGrowth has 6 entries ordered oldest first`
- `TrainerDashboardService > todaysSessions scoped to trainer's members only`
- `TrainerDashboardService > needsAttention excludes members active within 7 days`
- `MemberDashboardService > trainingHeatmap has exactly 90 entries`
- `MemberDashboardService > strengthProgress defaults to first exercise in list`

### Backend integration tests (`dashboard.e2e-spec.ts`)
- `GET /dashboard/owner` with owner token → 200, body has all required keys
- `GET /dashboard/owner` with trainer token → 403
- `GET /dashboard/trainer` with trainer token → 200, todaysSessions contains only this trainer's members
- `GET /dashboard/trainer` with member token → 403
- `GET /dashboard/member` with member token → 200, trainingHeatmap.length === 90
- `GET /dashboard/member` with no token → 401

### Mobile unit tests
- `StatCard > renders label, value, and trend text`
- `TrainingHeatmap > renders exactly 90 cells`
- `TrainingHeatmap > today cell has ring highlight`
- `OwnerDashboard > shows skeleton while loading`
- `TrainerDashboard > shows "No sessions scheduled today" when todaysSessions is empty`
- `MemberDashboard > renders workout hero card when todaysPlan is not null`
- `MemberDashboard > renders empty state when todaysPlan is null`
