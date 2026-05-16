# Member Dashboard Redesign — Design Spec

**Goal:** Redesign the member dashboard with the Premium Dark + Indigo design system, adding rich visualizations (body composition trend, 1RM strength trend) and Framer Motion animations.

**Visual decisions (brainstorming session 2026-05-16):**
- Layout: Today First (Hero → KPI → Charts → Bottom)
- Hero: B style (full-bleed indigo gradient + large amber streak number) + C structure (standalone today's workout card with exercise count / duration / Start button)
- Charts: Body Composition trend (weight + BF% dual line) + Strength 1RM trend (top 3 exercises)
- Architecture: Server Components per section, each in Suspense; chart data serialized as props to `'use client'` Recharts islands

---

## Architecture

Each dashboard section is an independent async Server Component wrapped in `<Suspense>`. Chart sub-components are `'use client'` islands that receive serialized data props from the server and render Recharts. Framer Motion entrance animations run in client islands.

```
member/page.tsx
├── <Suspense> <MemberHero />           — gradient hero + streak + today card
├── <Suspense> <MemberKpiStrip />       — 4 KPIs
├── <Suspense> <MemberChartsRow />      — body comp chart | strength chart
└── <Suspense> <MemberBottomRow />      — nutrition progress | upcoming sessions
```

`MemberChartsRow` and `MemberBottomRow` are thin server wrapper components that render two children side-by-side; each child is its own async server component.

---

## Components

### `member-hero.tsx` (rewrite)

**Server data:**
- `WorkoutSessionRepository.findConsecutiveStreakDays(memberId)` → `streak: number`
- `ScheduledSessionRepository.findUpcomingByMember(memberId, 1)` → today's session time
- `MemberPlanRepository.findActive(memberId)` → today's plan day name, exercise count, set count

**UI:**
- Outer: `bg` with indigo gradient overlay + two radial glow spots (indigo top-right, amber bottom-left)
- Top row: greeting text (time-based) + date/day-type subtitle | amber streak badge (large number, amber→orange gradient, fire emoji)
- Today's workout card: indigo-tinted border card inside hero with day tag (indigo), workout name, `{N} exercises · {M} sets · ~{T} min` meta, indigo gradient "Start →" button linking to `/member/plan`
- No-plan state: show "Your trainer hasn't assigned a plan yet" inside the card area
- Client animation: `variants.fadeSlideUp` entrance for greeting; streak number counts up from 0 via `useMotionValue` + `useSpring`

### `member-kpi-strip.tsx` (new)

**Server data:**
- `WorkoutSessionRepository.findByMember(memberId)` → filter to current month → `sessionsThisMonth: number`
- `BodyTestRepository.findByMember(memberId)` → latest two tests → weight + bodyFatPct + deltas
- `PersonalBestRepository.findByMember(memberId)` → max `estimatedOneRM` record → `topPrName`, `topPrKg`

**UI:**
- `grid grid-cols-4` separated by `ring-1 ring-foreground/[.06]`
- Cells: Sessions This Month (indigo value) | Weight kg (+ delta ↓ emerald if improved) | Body Fat % (emerald value + delta) | Top PR kg (amber value + exercise name)
- Client animation: `variants.staggerContainer` + `variants.staggerItem` per cell

### `member-body-chart.tsx` (new)

**Server data:**
- `BodyTestRepository.findByMember(memberId)` → up to last 8 tests, reversed to chronological order
- Serialized as `{ date: string; weight: number; bodyFatPct: number }[]`

**UI (client island `MemberBodyChartClient`):**
- Recharts `ResponsiveContainer` + `LineChart`
- Left Y-axis: weight (kg); right Y-axis: body fat %
- Weight line: `stroke="#10b981"` (emerald), area fill with opacity gradient
- BF% line: `stroke="#ec4899"` (pink), dashed
- X-axis: short date labels
- Custom tooltip showing both values
- Entrance: `variants.scaleIn`
- Empty state (< 2 tests): "Add body tests to see your trend"

### `member-strength-chart.tsx` (new)

**Server data:**
- `PersonalBestRepository.findByMember(memberId)` → get top 3 exercises by `estimatedOneRM`
- For each top exercise: `WorkoutSessionRepository.findExerciseHistory(memberId, exerciseId)` → `{ date, estimatedOneRM }[]`
- Serialized as `{ exercise: string; points: { date: string; oneRM: number }[] }[]`

**UI (client island `MemberStrengthChartClient`):**
- Recharts `ResponsiveContainer` + `LineChart`
- Three lines: indigo (rank 1), amber (rank 2), pink (rank 3)
- Legend showing exercise names
- Custom tooltip
- Entrance: `variants.scaleIn`
- Empty state (no sessions with exercise history): "Complete workouts to track your strength"

### `member-nutrition-today.tsx` (rewrite)

**Server data:**
- `MemberNutritionPlanRepository.findActive(memberId)` → today's macro targets via `resolveDayType()`

**UI:**
- Card with day-type badge (indigo pill)
- Four progress bars: Protein (emerald), Carbs (amber), Fat (pink), kcal (foreground/50)
- Each row: label | `{current}/{target}g` right-aligned | progress bar
- No-plan state: "Your trainer hasn't assigned a nutrition plan yet"

### `member-upcoming-sessions.tsx` (token upgrade)

Minor rewrite of existing component. Replace any hardcoded hex with design tokens. Keep existing logic and badge color rules.

---

## Deleted Components

After implementation, delete these files (functionality absorbed into new components):
- `member-key-numbers.tsx` → replaced by `member-kpi-strip.tsx`
- `member-body-composition.tsx` → replaced by `member-body-chart.tsx`
- `member-today-workout.tsx` → absorbed into `member-hero.tsx`
- `member-personal-bests.tsx` → top PR shown in KPI strip; full list not on dashboard

---

## Design Tokens

All components must use:
- Cards: `bg-white/[.02] ring-1 ring-foreground/[.06]`
- Secondary text: `text-foreground/65` (never `text-muted-foreground`)
- Indigo accent: `bg-primary/15 text-primary-light` for badges; `bg-primary text-primary-foreground` for buttons
- Macro colors: protein=`#10b981`, carbs=`#f59e0b`, fat=`#ec4899`, kcal=neutral
- No hardcoded hex anywhere

## Estimated Duration Chart

For the "~N min" estimate in the hero workout card, use: `sets × 2.5 min` rounded to nearest 5, minimum 15 min.
