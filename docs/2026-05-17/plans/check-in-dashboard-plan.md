# Check-In Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/member/check-in` from a single form page into a full dashboard with achievement cards, wellness breakdown, body metrics, heatmap, compare modal, and photo gallery.

**Architecture:** Server component at `page.tsx` fetches all check-ins once and serializes them; a client component `check-in-dashboard.tsx` handles modal open/close state and renders all sections. Pure-display sections receive serialized props; interactive sections (modals) manage their own local state.

**Tech Stack:** Next.js App Router, TypeScript (strict), Tailwind CSS, shadcn/ui, Mongoose, Framer Motion (existing variants)

---

## File Map

```
# Created
src/lib/check-in-stats.ts
src/app/(dashboard)/member/check-in/new/page.tsx
src/app/(dashboard)/member/check-in/history/page.tsx
src/app/(dashboard)/member/check-in/[id]/page.tsx
src/app/(dashboard)/member/check-in/_components/check-in-dashboard.tsx
src/app/(dashboard)/member/check-in/_components/achievement-cards.tsx
src/app/(dashboard)/member/check-in/_components/wellness-breakdown.tsx
src/app/(dashboard)/member/check-in/_components/body-metrics.tsx
src/app/(dashboard)/member/check-in/_components/this-week-card.tsx
src/app/(dashboard)/member/check-in/_components/consistency-heatmap.tsx
src/app/(dashboard)/member/check-in/_components/history-list.tsx
src/app/(dashboard)/member/check-in/_components/compare-card.tsx
src/app/(dashboard)/member/check-in/_components/compare-modal.tsx
src/app/(dashboard)/member/check-in/_components/recent-photos.tsx
src/app/(dashboard)/member/check-in/_components/photo-gallery-modal.tsx
__tests__/lib/check-in-stats.test.ts
__tests__/app/member/check-in/achievement-cards.test.tsx
__tests__/app/member/check-in/wellness-breakdown.test.tsx
__tests__/app/member/check-in/body-metrics.test.tsx
__tests__/app/member/check-in/this-week-card.test.tsx
__tests__/app/member/check-in/history-list.test.tsx
e2e/member/check-in-dashboard.spec.ts

# Modified
src/app/(dashboard)/member/check-in/page.tsx
```

---

## Task 1: Move form to /new route

**Files:**
- Create: `src/app/(dashboard)/member/check-in/new/page.tsx`
- Modify: `src/app/(dashboard)/member/check-in/page.tsx`

- [ ] **Step 1: Create /new/page.tsx with the existing form content**

```typescript
// src/app/(dashboard)/member/check-in/new/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CheckInForm } from '../_components/check-in-form';

export default async function MemberCheckInNewPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const alreadySubmitted = await repo.hasCheckInThisWeek(session.user.id, weekStart);

  return (
    <div>
      <PageHeader title="Weekly Check-In" subtitle="Log your progress for this week" />
      <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
        <CheckInForm alreadySubmitted={alreadySubmitted} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace page.tsx with a temporary redirect (dashboard comes in Task 10)**

```typescript
// src/app/(dashboard)/member/check-in/page.tsx
import { redirect } from 'next/navigation';

export default function MemberCheckInPage() {
  redirect('/member/check-in/new');
}
```

- [ ] **Step 3: Verify form still works**

```bash
pnpm dev
# navigate to /member/check-in → should redirect to /member/check-in/new
# submit form → should succeed and redirect back to /member/check-in
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/member/check-in/new/page.tsx \
        src/app/(dashboard)/member/check-in/page.tsx
git commit -m "feat(check-in): move form to /new route, stub dashboard redirect"
```

---

## Task 2: Stats computation layer

**Files:**
- Create: `src/lib/check-in-stats.ts`
- Create: `__tests__/lib/check-in-stats.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/check-in-stats.test.ts
import {
  avgWellnessScore,
  computeAchievements,
  computeBodyMetrics,
  computeHeatmap,
  getWeekStart,
} from '@/lib/check-in-stats';
import type { CheckInRecord } from '@/lib/check-in-stats';

const base: CheckInRecord = {
  _id: '1',
  memberId: 'm1',
  trainerId: 't1',
  submittedAt: new Date('2026-05-10T10:00:00Z').toISOString(),
  sleepQuality: 8, energy: 9, recovery: 9,
  stress: 3, fatigue: 3, hunger: 7, digestion: 8,
  weight: 78.0, waist: 83, steps: 11000,
  exerciseMinutes: 65, walkRunDistance: null, sleepHours: 8.0,
  dietDetails: '', stuckToDiet: 'yes', wellbeing: '', notes: '', photos: [],
};

const older: CheckInRecord = {
  ...base, _id: '2',
  submittedAt: new Date('2026-05-03T10:00:00Z').toISOString(),
  weight: 79.5, waist: null, steps: null, stuckToDiet: 'no',
};

const oldest: CheckInRecord = {
  ...base, _id: '3',
  submittedAt: new Date('2026-04-05T10:00:00Z').toISOString(),
  weight: 87.0, waist: 87, stuckToDiet: 'yes',
};

// sorted newest first (as findByMember returns)
const checkIns = [base, older, oldest];

describe('avgWellnessScore', () => {
  it('averages all 7 fields', () => {
    // (8+9+9+3+3+7+8)/7 = 47/7 ≈ 6.7
    expect(avgWellnessScore(base)).toBe(6.7);
  });
});

describe('computeAchievements', () => {
  const now = new Date('2026-05-17T10:00:00Z');

  it('computes weight lost from oldest to newest non-null', () => {
    const r = computeAchievements(checkIns, now);
    expect(r.weightLost).toBe(9.0); // 87 - 78
    expect(r.weightFirst).toBe(87.0);
    expect(r.weightLatest).toBe(78.0);
  });

  it('returns null weightLost when no weight data', () => {
    const r = computeAchievements([{ ...base, weight: null }], now);
    expect(r.weightLost).toBeNull();
  });

  it('returns null weightLost when weight increased', () => {
    const gained = [base, { ...oldest, weight: 70.0 }]; // gained weight
    const r = computeAchievements(gained, now);
    expect(r.weightLost).toBeNull();
  });

  it('counts diet streak from most recent consecutive yes', () => {
    // base=yes, older=no → streak=1
    const r = computeAchievements(checkIns, now);
    expect(r.dietStreak).toBe(1);
  });

  it('diet streak = 0 when most recent is not yes', () => {
    const r = computeAchievements([older, oldest], now);
    expect(r.dietStreak).toBe(0);
  });

  it('counts consecutive week streak', () => {
    // base=May10(W19), older=May3(W18), oldest=Apr5(W14 — gap)
    // current week from now(May17) = May17, no check-in so look back to May10
    // May10 ✓, May3 ✓, Apr26 ✗ → streak=2
    const r = computeAchievements(checkIns, now);
    expect(r.currentStreak).toBe(2);
  });
});

describe('computeBodyMetrics', () => {
  it('returns current value and delta for weight', () => {
    const r = computeBodyMetrics(checkIns);
    expect(r.weight.current).toBe(78.0);
    expect(r.weight.delta).toBe(-9.0); // 78 - 87
  });

  it('skips nulls when computing delta', () => {
    // waist: base=83, older=null, oldest=87 → delta = 83-87 = -4
    const r = computeBodyMetrics(checkIns);
    expect(r.waist.current).toBe(83);
    expect(r.waist.delta).toBe(-4);
  });

  it('returns null delta when only one non-null entry', () => {
    const r = computeBodyMetrics([base]);
    expect(r.weight.delta).toBeNull();
  });

  it('returns last 6 diet entries newest-first', () => {
    const r = computeBodyMetrics(checkIns);
    expect(r.dietHistory).toEqual(['yes', 'no', 'yes']);
  });
});

describe('computeHeatmap', () => {
  const now = new Date('2026-05-17T10:00:00Z');

  it('returns 30 cells', () => {
    const cells = computeHeatmap(checkIns, now);
    expect(cells).toHaveLength(30);
  });

  it('marks cells with check-ins', () => {
    const cells = computeHeatmap(checkIns, now);
    const last = cells[cells.length - 1]; // current week (May 17)
    expect(last.isCurrentWeek).toBe(true);
    expect(last.hasCheckIn).toBe(false); // not submitted yet this week
    const prevWeek = cells[cells.length - 2]; // May 10
    expect(prevWeek.hasCheckIn).toBe(true);
    expect(prevWeek.avgWellness).toBe(6.7);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test -- --testPathPattern=check-in-stats -t "" 2>&1 | head -20
# Expected: FAIL — check-in-stats module not found
```

- [ ] **Step 3: Implement check-in-stats.ts**

```typescript
// src/lib/check-in-stats.ts

export interface CheckInRecord {
  _id: string;
  memberId: string;
  trainerId: string;
  submittedAt: string; // ISO string
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
}

export interface Achievements {
  weightLost: number | null;
  weightFirst: number | null;
  weightLatest: number | null;
  currentStreak: number;
  totalCheckIns: number;
  dietStreak: number;
}

export interface BodyMetricData {
  current: number | null;
  delta: number | null;
  history: number[]; // up to 6 values, oldest first, nulls excluded
}

export interface BodyMetricsResult {
  weight: BodyMetricData;
  waist: BodyMetricData;
  steps: BodyMetricData;
  sleepHours: BodyMetricData;
  exerciseMinutes: BodyMetricData;
  stuckToDiet: 'yes' | 'no' | 'partial' | null;
  dietHistory: ('yes' | 'no' | 'partial')[]; // newest first, up to 6
}

export interface HeatmapCell {
  weekStart: string; // ISO string
  hasCheckIn: boolean;
  avgWellness: number | null;
  isCurrentWeek: boolean;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

export function avgWellnessScore(c: CheckInRecord): number {
  const sum = c.sleepQuality + c.energy + c.recovery + c.stress + c.fatigue + c.hunger + c.digestion;
  return Math.round((sum / 7) * 10) / 10;
}

export function computeAchievements(checkIns: CheckInRecord[], now = new Date()): Achievements {
  const totalCheckIns = checkIns.length;

  const withWeight = checkIns.filter(c => c.weight !== null);
  const weightLatest = withWeight[0]?.weight ?? null;
  const weightFirst = withWeight[withWeight.length - 1]?.weight ?? null;
  const weightLost =
    weightFirst !== null && weightLatest !== null && weightFirst > weightLatest
      ? Math.round((weightFirst - weightLatest) * 10) / 10
      : null;

  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  const currentWeekStart = getWeekStart(now).getTime();
  const weekSet = new Set(checkIns.map(c => getWeekStart(new Date(c.submittedAt)).getTime()));
  let streak = 0;
  let cursor = currentWeekStart;
  if (!weekSet.has(cursor)) cursor -= ONE_WEEK;
  while (weekSet.has(cursor)) { streak++; cursor -= ONE_WEEK; }

  let dietStreak = 0;
  for (const c of checkIns) {
    if (c.stuckToDiet === 'yes') dietStreak++;
    else break;
  }

  return { weightLost, weightFirst, weightLatest, currentStreak: streak, totalCheckIns, dietStreak };
}

function extractMetric(
  checkIns: CheckInRecord[],
  field: 'weight' | 'waist' | 'steps' | 'sleepHours' | 'exerciseMinutes',
): BodyMetricData {
  const withData = checkIns.filter(c => c[field] !== null) as (CheckInRecord & { [k: string]: number })[];
  const current = (withData[0]?.[field] as number) ?? null;
  const prev = (withData[1]?.[field] as number) ?? null;
  const delta =
    current !== null && prev !== null ? Math.round((current - prev) * 10) / 10 : null;
  const history = withData
    .slice(0, 6)
    .map(c => c[field] as number)
    .reverse();
  return { current, delta, history };
}

export function computeBodyMetrics(checkIns: CheckInRecord[]): BodyMetricsResult {
  return {
    weight: extractMetric(checkIns, 'weight'),
    waist: extractMetric(checkIns, 'waist'),
    steps: extractMetric(checkIns, 'steps'),
    sleepHours: extractMetric(checkIns, 'sleepHours'),
    exerciseMinutes: extractMetric(checkIns, 'exerciseMinutes'),
    stuckToDiet: checkIns[0]?.stuckToDiet ?? null,
    dietHistory: checkIns.slice(0, 6).map(c => c.stuckToDiet),
  };
}

export function computeHeatmap(checkIns: CheckInRecord[], now = new Date()): HeatmapCell[] {
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  const currentWeekStart = getWeekStart(now).getTime();

  const byWeek = new Map<number, CheckInRecord[]>();
  for (const c of checkIns) {
    const ws = getWeekStart(new Date(c.submittedAt)).getTime();
    const arr = byWeek.get(ws) ?? [];
    arr.push(c);
    byWeek.set(ws, arr);
  }

  const cells: HeatmapCell[] = [];
  for (let i = 29; i >= 0; i--) {
    const ws = currentWeekStart - i * ONE_WEEK;
    const weekCheckIns = byWeek.get(ws) ?? [];
    const hasCheckIn = weekCheckIns.length > 0;
    const avg = hasCheckIn
      ? Math.round((weekCheckIns.reduce((s, c) => s + avgWellnessScore(c), 0) / weekCheckIns.length) * 10) / 10
      : null;
    cells.push({
      weekStart: new Date(ws).toISOString(),
      hasCheckIn,
      avgWellness: avg,
      isCurrentWeek: i === 0,
    });
  }
  return cells;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=check-in-stats
# Expected: all PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/check-in-stats.ts __tests__/lib/check-in-stats.test.ts
git commit -m "feat(check-in): add stats computation helpers with tests"
```

---

## Task 3: Achievement Cards

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/achievement-cards.tsx`
- Create: `__tests__/app/member/check-in/achievement-cards.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/app/member/check-in/achievement-cards.test.tsx
import { render, screen } from '@testing-library/react';
import { AchievementCards } from '@/app/(dashboard)/member/check-in/_components/achievement-cards';
import type { Achievements } from '@/lib/check-in-stats';

const full: Achievements = {
  weightLost: 9.0, weightFirst: 87.0, weightLatest: 78.0,
  currentStreak: 26, totalCheckIns: 26, dietStreak: 4,
};

describe('AchievementCards', () => {
  it('renders all three cards when data present', () => {
    render(<AchievementCards achievements={full} />);
    expect(screen.getByText('Lost 9.0 kg')).toBeInTheDocument();
    expect(screen.getByText('26-week streak')).toBeInTheDocument();
    expect(screen.getByText('4 on-track in a row')).toBeInTheDocument();
  });

  it('hides weight card when no weight loss', () => {
    render(<AchievementCards achievements={{ ...full, weightLost: null }} />);
    expect(screen.queryByText(/Lost .* kg/)).not.toBeInTheDocument();
  });

  it('hides diet card when dietStreak < 2', () => {
    render(<AchievementCards achievements={{ ...full, dietStreak: 1 }} />);
    expect(screen.queryByText(/on-track in a row/)).not.toBeInTheDocument();
  });

  it('hides streak card when streak < 2', () => {
    render(<AchievementCards achievements={{ ...full, currentStreak: 1 }} />);
    expect(screen.queryByText(/week streak/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=achievement-cards
# Expected: FAIL — module not found
```

- [ ] **Step 3: Implement**

```typescript
// src/app/(dashboard)/member/check-in/_components/achievement-cards.tsx
import type { Achievements } from '@/lib/check-in-stats';

interface Props { achievements: Achievements }

export function AchievementCards({ achievements }: Props) {
  const { weightLost, weightFirst, weightLatest, currentStreak, totalCheckIns, dietStreak } = achievements;

  const cards = [
    weightLost !== null && weightLost > 0 && {
      icon: '🏆',
      title: `Lost ${weightLost} kg`,
      subtitle: `${weightFirst} → ${weightLatest} kg in ${totalCheckIns} weeks`,
      style: 'bg-[rgba(99,102,241,0.08)] border-[rgba(99,102,241,0.2)]',
    },
    currentStreak >= 2 && {
      icon: '🔥',
      title: `${currentStreak}-week streak`,
      subtitle: `${totalCheckIns} check-ins, never missed a week`,
      style: 'bg-[rgba(52,211,153,0.07)] border-[rgba(52,211,153,0.18)]',
    },
    dietStreak >= 2 && {
      icon: '🥗',
      title: `${dietStreak} on-track in a row`,
      subtitle: 'Best diet consistency streak',
      style: 'bg-[rgba(251,191,36,0.07)] border-[rgba(251,191,36,0.18)]',
    },
  ].filter(Boolean) as { icon: string; title: string; subtitle: string; style: string }[];

  if (cards.length === 0) return null;

  return (
    <div className={`grid gap-3 mb-5 grid-cols-1 sm:grid-cols-${Math.min(cards.length, 3)}`}>
      {cards.map((card) => (
        <div key={card.title} className={`rounded-xl border px-4 py-3.5 flex items-center gap-3.5 ${card.style}`}>
          <span className="text-2xl flex-shrink-0">{card.icon}</span>
          <div>
            <div className="text-sm font-bold">{card.title}</div>
            <div className="text-[11px] text-foreground/45 mt-0.5">{card.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=achievement-cards
# Expected: all PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/member/check-in/_components/achievement-cards.tsx \
        __tests__/app/member/check-in/achievement-cards.test.tsx
git commit -m "feat(check-in): add AchievementCards component"
```

---

## Task 4: Wellness Breakdown

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/wellness-breakdown.tsx`
- Create: `__tests__/app/member/check-in/wellness-breakdown.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/app/member/check-in/wellness-breakdown.test.tsx
import { render, screen } from '@testing-library/react';
import { WellnessBreakdown } from '@/app/(dashboard)/member/check-in/_components/wellness-breakdown';
import type { CheckInRecord } from '@/lib/check-in-stats';

const checkIn: CheckInRecord = {
  _id: '1', memberId: 'm1', trainerId: 't1',
  submittedAt: '2026-05-10T10:00:00.000Z',
  sleepQuality: 8, energy: 9, recovery: 9,
  stress: 3, fatigue: 3, hunger: 7, digestion: 8,
  weight: 78, waist: 83, steps: 11000, exerciseMinutes: 65,
  walkRunDistance: null, sleepHours: 8, dietDetails: '',
  stuckToDiet: 'yes', wellbeing: '', notes: '', photos: [],
};

describe('WellnessBreakdown', () => {
  it('renders all 7 field labels', () => {
    render(<WellnessBreakdown checkIn={checkIn} />);
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText('Stress ↓')).toBeInTheDocument();
    expect(screen.getByText('Fatigue ↓')).toBeInTheDocument();
  });

  it('renders numeric values', () => {
    render(<WellnessBreakdown checkIn={checkIn} />);
    // sleep=8 appears
    const eights = screen.getAllByText('8');
    expect(eights.length).toBeGreaterThan(0);
  });

  it('renders nothing when checkIn is null', () => {
    const { container } = render(<WellnessBreakdown checkIn={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=wellness-breakdown
# Expected: FAIL
```

- [ ] **Step 3: Implement**

```typescript
// src/app/(dashboard)/member/check-in/_components/wellness-breakdown.tsx
import type { CheckInRecord } from '@/lib/check-in-stats';
import { avgWellnessScore } from '@/lib/check-in-stats';
import { format } from 'date-fns';

interface Props { checkIn: CheckInRecord | null }

type WellnessField = {
  label: string;
  value: number;
  inverted: boolean; // lower is better (stress, fatigue)
};

function fieldColour(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value; // flip scale for inverted fields
  if (effective >= 7) return 'bg-primary';
  if (effective >= 5) return 'bg-amber-400';
  return 'bg-red-400';
}

function valueColour(value: number, inverted: boolean): string {
  const effective = inverted ? 11 - value : value;
  if (effective >= 7) return 'text-primary-light';
  if (effective >= 5) return 'text-amber-400';
  return 'text-red-400';
}

export function WellnessBreakdown({ checkIn }: Props) {
  if (!checkIn) return null;

  const fields: WellnessField[] = [
    { label: 'Sleep',     value: checkIn.sleepQuality, inverted: false },
    { label: 'Energy',    value: checkIn.energy,       inverted: false },
    { label: 'Recovery',  value: checkIn.recovery,     inverted: false },
    { label: 'Digestion', value: checkIn.digestion,    inverted: false },
    { label: 'Hunger',    value: checkIn.hunger,       inverted: false },
    { label: 'Stress ↓',  value: checkIn.stress,       inverted: true  },
    { label: 'Fatigue ↓', value: checkIn.fatigue,      inverted: true  },
  ];

  const avg = avgWellnessScore(checkIn);
  const date = format(new Date(checkIn.submittedAt), 'd MMM');

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
          Wellness Breakdown
        </span>
        <span className="text-[11px] text-primary-light">Last check-in · {date}</span>
      </div>

      <div className="flex">
        {/* Radar — hidden on mobile */}
        <div className="hidden md:flex flex-col items-center justify-center gap-1.5 px-4 py-4 w-40 flex-shrink-0">
          <svg width="100" height="100" viewBox="-50 -50 100 100" aria-hidden="true">
            {[40, 27, 14].map((r, i) => (
              <polygon key={i}
                points={hexPoints(r)}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}
            {hexAxes().map((line, i) => (
              <line key={i} {...line} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            ))}
            <polygon
              points={radarPoints(fields)}
              fill="rgba(99,102,241,0.18)"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-[22px] font-bold text-primary-light leading-none">{avg}</div>
          <div className="text-[10px] text-foreground/35">Overall · {date}</div>
        </div>

        {/* Bars */}
        <div className="flex-1 flex flex-col gap-[7px] px-[18px] py-3.5">
          {fields.map(({ label, value, inverted }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[11px] text-foreground/45 w-[72px]">{label}</span>
              <div className="flex-1 h-1.5 bg-foreground/7 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${fieldColour(value, inverted)}`}
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              <span className={`text-[11px] font-semibold w-5 text-right ${valueColour(value, inverted)}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Radar helpers ──────────────────────────────────────────────────────────
function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(' ');
}

function hexAxes(): { x1: number; y1: number; x2: number; y2: number }[] {
  return Array.from({ length: 3 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const r = 40;
    return { x1: r * Math.cos(a), y1: r * Math.sin(a), x2: -r * Math.cos(a), y2: -r * Math.sin(a) };
  });
}

function radarPoints(fields: WellnessField[]): string {
  // use first 6 fields (skip one for hexagon)
  return fields.slice(0, 6).map(({ value, inverted }, i) => {
    const effective = inverted ? 11 - value : value;
    const r = (effective / 10) * 40;
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(' ');
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=wellness-breakdown
# Expected: all PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/member/check-in/_components/wellness-breakdown.tsx \
        __tests__/app/member/check-in/wellness-breakdown.test.tsx
git commit -m "feat(check-in): add WellnessBreakdown component with radar + bars"
```

---

## Task 5: Body Metrics

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/body-metrics.tsx`
- Create: `__tests__/app/member/check-in/body-metrics.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/app/member/check-in/body-metrics.test.tsx
import { render, screen } from '@testing-library/react';
import { BodyMetrics } from '@/app/(dashboard)/member/check-in/_components/body-metrics';
import type { BodyMetricsResult } from '@/lib/check-in-stats';

const metrics: BodyMetricsResult = {
  weight: { current: 78.0, delta: -1.5, history: [82, 81.5, 80.5, 80, 79.5, 78] },
  waist:  { current: 83,   delta: -1,   history: [87, 86, 85, 84, 83] },
  steps:  { current: 11000, delta: 1500, history: [7200, 9500, 8800, 11000] },
  sleepHours: { current: 8.0, delta: 2.0, history: [6.5, 7.0, 7.5, 7.0, 6.0, 8.0] },
  exerciseMinutes: { current: 65, delta: 5, history: [45, 60, 55, 65] },
  stuckToDiet: 'yes',
  dietHistory: ['yes', 'no', 'yes', 'yes', 'yes', 'partial'],
};

describe('BodyMetrics', () => {
  it('renders weight with delta', () => {
    render(<BodyMetrics metrics={metrics} />);
    expect(screen.getByText('78.0')).toBeInTheDocument();
    expect(screen.getByText(/▼ 1.5 kg/)).toBeInTheDocument();
  });

  it('renders positive step delta with up arrow', () => {
    render(<BodyMetrics metrics={metrics} />);
    expect(screen.getByText(/▲ 1,500/)).toBeInTheDocument();
  });

  it('shows em-dash when no current value', () => {
    render(<BodyMetrics metrics={{ ...metrics, steps: { current: null, delta: null, history: [] } }} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders On track for yes diet', () => {
    render(<BodyMetrics metrics={metrics} />);
    expect(screen.getByText('On track')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=body-metrics
# Expected: FAIL
```

- [ ] **Step 3: Implement**

```typescript
// src/app/(dashboard)/member/check-in/_components/body-metrics.tsx
import type { BodyMetricsResult } from '@/lib/check-in-stats';

interface Props { metrics: BodyMetricsResult }

function Delta({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) return null;
  const abs = Math.abs(value);
  const formatted = Number.isInteger(abs) ? abs.toLocaleString() : abs.toFixed(1);
  if (value < 0) return <div className="text-[11px] mt-0.5 text-red-400">▼ {formatted} {unit}</div>;
  if (value > 0) return <div className="text-[11px] mt-0.5 text-emerald-400">▲ {formatted} {unit}</div>;
  return <div className="text-[11px] mt-0.5 text-foreground/30">— same</div>;
}

function Sparkline({ history }: { history: number[] }) {
  if (history.length < 2) return <div className="h-5 mt-1.5" />;
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-0.5 h-5 mt-1.5">
      {history.map((v, i) => {
        const h = Math.max(2, ((v - min) / range) * 20);
        const isLatest = i === history.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${isLatest ? 'bg-primary' : 'bg-primary/40'}`}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

const DIET_LABELS: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
const DIET_COLOURS: Record<string, string> = {
  yes: 'text-emerald-400',
  no: 'text-red-400',
  partial: 'text-amber-400',
};
const DIET_DOT: Record<string, string> = {
  yes: 'bg-emerald-400',
  no: 'bg-red-400',
  partial: 'bg-amber-400/60',
};

export function BodyMetrics({ metrics }: Props) {
  const cells = [
    { label: 'Weight', value: metrics.weight.current, delta: metrics.weight.delta, unit: 'kg', history: metrics.weight.history },
    { label: 'Waist',  value: metrics.waist.current,  delta: metrics.waist.delta,  unit: 'cm', history: metrics.waist.history },
    { label: 'Steps',  value: metrics.steps.current,  delta: metrics.steps.delta,  unit: '',   history: metrics.steps.history },
    { label: 'Sleep',  value: metrics.sleepHours.current, delta: metrics.sleepHours.delta, unit: 'hrs', history: metrics.sleepHours.history },
    { label: 'Exercise', value: metrics.exerciseMinutes.current, delta: metrics.exerciseMinutes.delta, unit: 'min', history: metrics.exerciseMinutes.history },
  ];

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">Body Metrics</span>
        <span className="text-[11px] text-foreground/45">vs. last week</span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-foreground/5">
        {cells.map(({ label, value, delta, unit, history }) => (
          <div key={label} className="bg-card px-[15px] py-[13px]">
            <div className="text-[10px] uppercase tracking-[0.06em] text-foreground/35 mb-0.5">{label}</div>
            {value !== null ? (
              <>
                <div className="text-[18px] font-bold leading-none">
                  {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}
                  {unit && <span className="text-xs text-foreground/35 font-normal ml-0.5">{unit}</span>}
                </div>
                <Delta value={delta} unit={unit} />
                <Sparkline history={history} />
              </>
            ) : (
              <div className="text-[18px] font-bold text-foreground/25">—</div>
            )}
          </div>
        ))}

        {/* Diet cell */}
        <div className="bg-card px-[15px] py-[13px]">
          <div className="text-[10px] uppercase tracking-[0.06em] text-foreground/35 mb-0.5">Diet</div>
          {metrics.stuckToDiet ? (
            <>
              <div className={`text-sm font-bold mt-0.5 ${DIET_COLOURS[metrics.stuckToDiet]}`}>
                {DIET_LABELS[metrics.stuckToDiet]}
              </div>
              <div className="flex gap-1 mt-1.5">
                {[...metrics.dietHistory].reverse().map((d, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${DIET_DOT[d]}`} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-[18px] font-bold text-foreground/25">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=body-metrics
# Expected: all PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/member/check-in/_components/body-metrics.tsx \
        __tests__/app/member/check-in/body-metrics.test.tsx
git commit -m "feat(check-in): add BodyMetrics component with sparklines"
```

---

## Task 6: This Week Card + Consistency Heatmap

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/consistency-heatmap.tsx`
- Create: `src/app/(dashboard)/member/check-in/_components/this-week-card.tsx`
- Create: `__tests__/app/member/check-in/this-week-card.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/app/member/check-in/this-week-card.test.tsx
import { render, screen } from '@testing-library/react';
import { ThisWeekCard } from '@/app/(dashboard)/member/check-in/_components/this-week-card';
import type { HeatmapCell } from '@/lib/check-in-stats';

const cells: HeatmapCell[] = Array.from({ length: 30 }, (_, i) => ({
  weekStart: new Date(Date.now() - (29 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
  hasCheckIn: i < 26,
  avgWellness: i < 26 ? 6.5 : null,
  isCurrentWeek: i === 29,
}));

describe('ThisWeekCard', () => {
  it('shows submit button when not submitted', () => {
    render(<ThisWeekCard hasThisWeek={false} heatmap={cells} />);
    expect(screen.getByRole('link', { name: /Submit This Week/i })).toBeInTheDocument();
  });

  it('shows submitted state when already done', () => {
    render(<ThisWeekCard hasThisWeek={true} heatmap={cells} submittedDate="10 May" avgWellness={6.7} />);
    expect(screen.getByText(/Submitted this week/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Submit/i })).not.toBeInTheDocument();
  });

  it('renders 30 heatmap cells', () => {
    const { container } = render(<ThisWeekCard hasThisWeek={false} heatmap={cells} />);
    // each cell is a div with title attribute
    const heatCells = container.querySelectorAll('[data-heatmap-cell]');
    expect(heatCells).toHaveLength(30);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=this-week-card
# Expected: FAIL
```

- [ ] **Step 3: Implement ConsistencyHeatmap**

```typescript
// src/app/(dashboard)/member/check-in/_components/consistency-heatmap.tsx
import type { HeatmapCell } from '@/lib/check-in-stats';

interface Props { cells: HeatmapCell[] }

function cellBg(cell: HeatmapCell): string {
  if (cell.isCurrentWeek && !cell.hasCheckIn) return 'bg-amber-400/35 border border-dashed border-amber-400/55';
  if (!cell.hasCheckIn) return 'bg-foreground/8';
  const v = cell.avgWellness ?? 5;
  if (v >= 8) return 'bg-primary';
  if (v >= 6.5) return 'bg-primary/70';
  return 'bg-primary/40';
}

export function ConsistencyHeatmap({ cells }: Props) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-[0.06em] text-foreground/28 mb-1.5">
        Consistency
      </div>
      <div className="flex gap-[3px] flex-nowrap overflow-hidden">
        {cells.map((cell, i) => (
          <div
            key={i}
            data-heatmap-cell
            className={`w-[9px] h-[9px] rounded-sm flex-shrink-0 ${cellBg(cell)}`}
            title={cell.avgWellness ? `Wellness: ${cell.avgWellness}` : cell.isCurrentWeek ? 'Pending' : 'Missed'}
          />
        ))}
      </div>
      <div className="flex gap-2.5 mt-1.5">
        {[
          { dot: 'bg-primary/40', label: 'Submitted' },
          { dot: 'bg-foreground/8', label: 'Missed' },
          { dot: 'bg-amber-400/35 border border-dashed border-amber-400/55', label: 'Pending' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-[7px] h-[7px] rounded-sm ${dot}`} />
            <span className="text-[9px] text-foreground/28">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement ThisWeekCard**

```typescript
// src/app/(dashboard)/member/check-in/_components/this-week-card.tsx
import Link from 'next/link';
import type { HeatmapCell } from '@/lib/check-in-stats';
import { ConsistencyHeatmap } from './consistency-heatmap';

interface Props {
  hasThisWeek: boolean;
  heatmap: HeatmapCell[];
  submittedDate?: string;
  avgWellness?: number | null;
  weight?: number | null;
}

export function ThisWeekCard({ hasThisWeek, heatmap, submittedDate, avgWellness, weight }: Props) {
  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] p-[18px]">
      {hasThisWeek ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
            <span className="text-xs text-foreground/45">
              Submitted this week{submittedDate ? ` · ${submittedDate}` : ''}
            </span>
          </div>
          <div className="flex gap-3">
            {avgWellness !== null && avgWellness !== undefined && (
              <div className="bg-foreground/5 rounded-lg px-3 py-2 text-center flex-1">
                <div className="text-base font-bold text-primary-light">{avgWellness}</div>
                <div className="text-[10px] text-foreground/35">Wellness</div>
              </div>
            )}
            {weight !== null && weight !== undefined && (
              <div className="bg-foreground/5 rounded-lg px-3 py-2 text-center flex-1">
                <div className="text-base font-bold">{weight}</div>
                <div className="text-[10px] text-foreground/35">kg</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
            <span className="text-xs text-foreground/45">This week not submitted yet</span>
          </div>
          <Link
            href="/member/check-in/new"
            className="block w-full text-center bg-gradient-to-br from-primary to-indigo-400 text-white rounded-[10px] py-3 text-sm font-semibold"
          >
            Submit This Week&apos;s Check-In →
          </Link>
        </>
      )}
      <ConsistencyHeatmap cells={heatmap} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- --testPathPattern=this-week-card
# Expected: all PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/member/check-in/_components/consistency-heatmap.tsx \
        src/app/(dashboard)/member/check-in/_components/this-week-card.tsx \
        __tests__/app/member/check-in/this-week-card.test.tsx
git commit -m "feat(check-in): add ThisWeekCard and ConsistencyHeatmap"
```

---

## Task 7: History List

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/history-list.tsx`
- Create: `__tests__/app/member/check-in/history-list.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/app/member/check-in/history-list.test.tsx
import { render, screen } from '@testing-library/react';
import { HistoryList } from '@/app/(dashboard)/member/check-in/_components/history-list';
import type { CheckInRecord } from '@/lib/check-in-stats';

const checkIns: CheckInRecord[] = [
  {
    _id: '1', memberId: 'm', trainerId: 't',
    submittedAt: '2026-05-10T10:00:00.000Z',
    sleepQuality: 8, energy: 9, recovery: 9, stress: 3, fatigue: 3, hunger: 7, digestion: 8,
    weight: 78, waist: 83, steps: 11000, exerciseMinutes: 65,
    walkRunDistance: null, sleepHours: 8,
    dietDetails: '', stuckToDiet: 'yes', wellbeing: '', notes: '',
    photos: ['a.jpg', 'b.jpg'],
  },
  {
    _id: '2', memberId: 'm', trainerId: 't',
    submittedAt: '2026-05-03T10:00:00.000Z',
    sleepQuality: 6, energy: 6, recovery: 6, stress: 7, fatigue: 7, hunger: 5, digestion: 6,
    weight: 79.5, waist: null, steps: null, exerciseMinutes: null,
    walkRunDistance: null, sleepHours: 6,
    dietDetails: '', stuckToDiet: 'no', wellbeing: '', notes: '',
    photos: ['c.jpg'],
  },
];

describe('HistoryList', () => {
  it('renders dates for each check-in', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('10 May')).toBeInTheDocument();
    expect(screen.getByText('3 May')).toBeInTheDocument();
  });

  it('shows On track pill for yes diet', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('On track')).toBeInTheDocument();
  });

  it('shows Off track pill for no diet', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('Off track')).toBeInTheDocument();
  });

  it('shows photo count when photos present', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByText('2 📷')).toBeInTheDocument();
  });

  it('shows View all link with total count', () => {
    render(<HistoryList checkIns={checkIns} totalCount={26} />);
    expect(screen.getByRole('link', { name: /View all 26/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
pnpm test -- --testPathPattern=history-list
# Expected: FAIL
```

- [ ] **Step 3: Implement**

```typescript
// src/app/(dashboard)/member/check-in/_components/history-list.tsx
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import type { CheckInRecord } from '@/lib/check-in-stats';
import { avgWellnessScore } from '@/lib/check-in-stats';

interface Props {
  checkIns: CheckInRecord[];
  totalCount: number;
}

const WELLNESS_DOT = (value: number) =>
  value >= 7 ? 'bg-emerald-400' : value >= 5 ? 'bg-amber-400' : 'bg-red-400';

const DIET_PILL: Record<string, string> = {
  yes: 'bg-emerald-400/10 text-emerald-400',
  no: 'bg-red-400/10 text-red-400',
  partial: 'bg-amber-400/10 text-amber-400',
};
const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };

function wellnessDots(c: CheckInRecord) {
  return [c.sleepQuality, c.energy, c.recovery, c.stress, c.fatigue, c.hunger, c.digestion];
}

export function HistoryList({ checkIns, totalCount }: Props) {
  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">History</span>
        <Link href="/member/check-in/history" className="text-[11px] text-primary-light">
          View all {totalCount} →
        </Link>
      </div>

      {checkIns.map((c, idx) => (
        <Link
          key={c._id}
          href={`/member/check-in/${c._id}`}
          className={`flex items-center gap-2.5 px-[18px] py-2.5 border-b border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors ${idx === checkIns.length - 1 ? 'opacity-60 border-b-0' : ''}`}
        >
          {/* Date */}
          <div className="min-w-[68px]">
            <div className="text-xs font-medium">{format(new Date(c.submittedAt), 'd MMM')}</div>
            <div className="text-[10px] text-foreground/30">
              {formatDistanceToNow(new Date(c.submittedAt), { addSuffix: true })}
            </div>
          </div>

          {/* Wellness dots */}
          <div className="flex items-center gap-[3px]">
            {wellnessDots(c).map((v, i) => (
              <div key={i} className={`w-[5px] h-[5px] rounded-full ${WELLNESS_DOT(v)}`} />
            ))}
            <span className="text-[11px] text-foreground/38 ml-1">{avgWellnessScore(c)}</span>
          </div>

          {/* Pills */}
          <div className="flex items-center gap-1 ml-auto flex-wrap justify-end">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIET_PILL[c.stuckToDiet]}`}>
              {DIET_LABEL[c.stuckToDiet]}
            </span>
            {c.weight !== null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/45">
                {c.weight} kg
              </span>
            )}
            {c.photos.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/45">
                {c.photos.length} 📷
              </span>
            )}
          </div>

          <span className="text-foreground/18 text-sm flex-shrink-0">›</span>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern=history-list
# Expected: all PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/member/check-in/_components/history-list.tsx \
        __tests__/app/member/check-in/history-list.test.tsx
git commit -m "feat(check-in): add HistoryList component"
```

---

## Task 8: Compare Card + Modal

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/compare-modal.tsx`
- Create: `src/app/(dashboard)/member/check-in/_components/compare-card.tsx`

These are client components with interactive state — unit tests cover rendering, not interactions.

- [ ] **Step 1: Implement CompareModal**

```typescript
// src/app/(dashboard)/member/check-in/_components/compare-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import type { CheckInRecord } from '@/lib/check-in-stats';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onClose: () => void;
  beforeCheckIn: CheckInRecord | null;
  afterCheckIn: CheckInRecord | null;
}

function PhotoColumn({ checkIn, side }: { checkIn: CheckInRecord; side: 'before' | 'after' }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const photos = checkIn.photos;
  const colour = side === 'before' ? 'text-primary-light' : 'text-emerald-400';

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-foreground/[0.06] bg-foreground/[0.02] flex-shrink-0">
        <span className={`text-[10px] font-semibold ${colour}`}>
          {side === 'before' ? 'Before' : 'After'} · {format(new Date(checkIn.submittedAt), 'd MMM yyyy')}
        </span>
        {checkIn.weight && (
          <span className="text-[10px] text-foreground/35 ml-2">{checkIn.weight} kg</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <img
          src={photos[selectedIdx]}
          alt={`${side} photo`}
          className="w-full h-full object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 p-2 border-t border-foreground/[0.06] flex-shrink-0">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-10 h-12 rounded overflow-hidden border-2 flex-shrink-0 ${i === selectedIdx ? 'border-primary' : 'border-foreground/10'}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompareModal({ open, onClose, beforeCheckIn, afterCheckIn }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !beforeCheckIn || !afterCheckIn) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-foreground/[0.07] bg-foreground/[0.03]">
        <span className="text-sm font-semibold">Before / After Comparison</span>
        <button
          onClick={onClose}
          aria-label="Close comparison"
          className="w-8 h-8 rounded-lg bg-foreground/[0.07] border border-foreground/10 text-foreground/60 flex items-center justify-center hover:bg-foreground/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Two columns */}
      <div className="flex flex-col md:flex-row flex-1 gap-px bg-foreground/[0.06] min-h-0">
        <div className="flex-1 bg-background min-h-0">
          <PhotoColumn checkIn={beforeCheckIn} side="before" />
        </div>
        <div className="flex-1 bg-background min-h-0">
          <PhotoColumn checkIn={afterCheckIn} side="after" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement CompareCard**

```typescript
// src/app/(dashboard)/member/check-in/_components/compare-card.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { CheckInRecord } from '@/lib/check-in-stats';
import { CompareModal } from './compare-modal';

interface Props {
  checkInsWithPhotos: CheckInRecord[];
}

export function CompareCard({ checkInsWithPhotos }: Props) {
  const [beforeId, setBeforeId] = useState<string>(checkInsWithPhotos[1]?._id ?? '');
  const [afterId, setAfterId] = useState<string>(checkInsWithPhotos[0]?._id ?? '');
  const [beforePhotoIdx, setBeforePhotoIdx] = useState(0);
  const [afterPhotoIdx, setAfterPhotoIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const beforeCheckIn = checkInsWithPhotos.find(c => c._id === beforeId) ?? null;
  const afterCheckIn  = checkInsWithPhotos.find(c => c._id === afterId)  ?? null;

  if (checkInsWithPhotos.length < 2) return null;

  return (
    <>
      <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45 mb-3">
          Before / After Compare
        </div>

        {/* Selectors */}
        <div className="flex flex-col gap-1.5 mb-3">
          {[
            { label: 'Before', id: beforeId, setId: setBeforeId, colour: 'text-primary-light' },
            { label: 'After',  id: afterId,  setId: setAfterId,  colour: 'text-emerald-400' },
          ].map(({ label, id, setId, colour }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold min-w-[36px] ${colour}`}>{label}</span>
              <select
                value={id}
                onChange={e => setId(e.target.value)}
                className="flex-1 bg-foreground/[0.06] border border-foreground/10 text-foreground/65 rounded-lg px-2.5 py-1.5 text-xs outline-none appearance-none"
              >
                {checkInsWithPhotos.map(c => (
                  <option key={c._id} value={c._id}>
                    {format(new Date(c.submittedAt), 'd MMM yyyy')}
                    {c.weight ? ` · ${c.weight} kg` : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Preview thumbnails */}
        {beforeCheckIn && afterCheckIn && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              { checkIn: beforeCheckIn, idx: beforePhotoIdx, setIdx: setBeforePhotoIdx },
              { checkIn: afterCheckIn,  idx: afterPhotoIdx,  setIdx: setAfterPhotoIdx  },
            ].map(({ checkIn, idx, setIdx }, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-lg overflow-hidden border border-foreground/[0.07] relative cursor-pointer"
                onClick={() => setIdx((idx + 1) % checkIn.photos.length)}
              >
                <img
                  src={checkIn.photos[idx]}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 py-1 px-1.5 bg-black/60 text-[9px] text-foreground/55 text-center">
                  {format(new Date(checkIn.submittedAt), 'd MMM')}
                  {checkIn.weight ? ` · ${checkIn.weight} kg` : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-foreground/25 text-center mb-2.5">Tap a photo to switch angle</p>

        <button
          onClick={() => setModalOpen(true)}
          disabled={!beforeCheckIn || !afterCheckIn}
          className="w-full bg-primary/10 border border-primary/28 text-primary-light rounded-lg py-2 text-xs font-semibold hover:bg-primary/15 transition-colors disabled:opacity-40"
        >
          Open Full Comparison →
        </button>
      </div>

      <CompareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        beforeCheckIn={beforeCheckIn}
        afterCheckIn={afterCheckIn}
      />
    </>
  );
}
```

- [ ] **Step 3: Run all existing tests to check for regressions**

```bash
pnpm test
# Expected: all PASS
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/member/check-in/_components/compare-card.tsx \
        src/app/(dashboard)/member/check-in/_components/compare-modal.tsx
git commit -m "feat(check-in): add CompareCard and CompareModal"
```

---

## Task 9: Recent Photos + Gallery Modal

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/photo-gallery-modal.tsx`
- Create: `src/app/(dashboard)/member/check-in/_components/recent-photos.tsx`

- [ ] **Step 1: Implement PhotoGalleryModal**

```typescript
// src/app/(dashboard)/member/check-in/_components/photo-gallery-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface PhotoEntry {
  url: string;
  submittedAt: string;
}

interface MonthGroup {
  label: string;
  photos: PhotoEntry[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  photos: PhotoEntry[];
  totalCount: number;
}

function groupByMonth(photos: PhotoEntry[]): MonthGroup[] {
  const map = new Map<string, PhotoEntry[]>();
  for (const p of photos) {
    const key = format(new Date(p.submittedAt), 'MMMM yyyy');
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([label, ps]) => ({ label, photos: ps }));
}

interface LightboxProps {
  photos: PhotoEntry[];
  initialIdx: number;
  onClose: () => void;
}

function Lightbox({ photos, initialIdx, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIdx);
  const photo = photos[idx];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(photos.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photos.length, onClose]);

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 z-10" role="dialog" aria-modal="true">
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-foreground/45">← All photos</button>
        <span className="text-xs text-foreground/35">{idx + 1} / {photos.length}</span>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg bg-foreground/[0.07] border border-foreground/10 flex items-center justify-center text-foreground/60">✕</button>
      </div>

      <div className="max-h-[60vh] max-w-[300px] rounded-xl overflow-hidden border border-foreground/10 shadow-2xl">
        <img src={photo.url} alt="" className="w-full h-full object-cover block" />
      </div>

      <div className="text-center">
        <div className="text-sm font-semibold">{format(new Date(photo.submittedAt), 'd MMMM yyyy')}</div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="bg-foreground/[0.08] border border-foreground/12 text-foreground/70 rounded-lg px-5 py-2 text-xs disabled:opacity-30"
        >
          ← Prev
        </button>
        <button
          onClick={() => setIdx(i => Math.min(photos.length - 1, i + 1))}
          disabled={idx === photos.length - 1}
          className="bg-foreground/[0.08] border border-foreground/12 text-foreground/70 rounded-lg px-5 py-2 text-xs disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function PhotoGalleryModal({ open, onClose, photos, totalCount }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && lightboxIdx === null) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, lightboxIdx, onClose]);

  if (!open) return null;

  const groups = groupByMonth([...photos].sort((a, b) =>
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  ));

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-foreground/[0.07] bg-foreground/[0.03]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors">
            ← Dashboard
          </button>
          <span className="text-sm font-semibold">Progress Photos</span>
          <span className="text-xs text-foreground/35">{totalCount} total</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-lg bg-foreground/[0.07] border border-foreground/10 text-foreground/60 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-8 relative">
        {groups.map(group => (
          <div key={group.label} className="mb-6">
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="text-sm font-semibold">{group.label}</span>
              <span className="text-xs text-foreground/30">{group.photos.length} photos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {group.photos.map((photo, i) => {
                const globalIdx = photos.indexOf(photo);
                return (
                  <button
                    key={i}
                    onClick={() => setLightboxIdx(globalIdx >= 0 ? globalIdx : 0)}
                    className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-foreground/[0.06] hover:border-foreground/18 transition-colors relative"
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover block" />
                    <div className="absolute bottom-0 inset-x-0 py-1 px-1.5 bg-gradient-to-t from-black/75 to-transparent text-[9px] text-foreground/55">
                      {format(new Date(photo.submittedAt), 'd MMM')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {lightboxIdx !== null && (
          <Lightbox
            photos={photos}
            initialIdx={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement RecentPhotos**

```typescript
// src/app/(dashboard)/member/check-in/_components/recent-photos.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { PhotoGalleryModal } from './photo-gallery-modal';

interface PhotoEntry {
  url: string;
  submittedAt: string;
}

interface Props {
  recentPhotos: PhotoEntry[];  // 6 most recent
  allPhotos: PhotoEntry[];     // all photos for gallery
  totalCount: number;
}

export function RecentPhotos({ recentPhotos, allPhotos, totalCount }: Props) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  if (totalCount === 0) return null;

  return (
    <>
      <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
        <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-foreground/5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
            Recent Photos
          </span>
          <button
            onClick={() => setGalleryOpen(true)}
            className="text-[11px] text-primary-light"
          >
            All {totalCount} →
          </button>
        </div>
        <div className="grid grid-cols-3 gap-[3px] p-[3px]">
          {recentPhotos.slice(0, 6).map((photo, i) => (
            <button
              key={i}
              onClick={() => setGalleryOpen(true)}
              className="aspect-square rounded-[6px] overflow-hidden relative"
            >
              <img src={photo.url} alt="" className="w-full h-full object-cover block" />
              <div className="absolute bottom-0 inset-x-0 py-[3px] bg-gradient-to-t from-black/70 to-transparent text-[8px] text-foreground/55 text-center">
                {format(new Date(photo.submittedAt), 'd MMM')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <PhotoGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={allPhotos}
        totalCount={totalCount}
      />
    </>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test
# Expected: all PASS
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/member/check-in/_components/photo-gallery-modal.tsx \
        src/app/(dashboard)/member/check-in/_components/recent-photos.tsx
git commit -m "feat(check-in): add RecentPhotos, PhotoGalleryModal, and Lightbox"
```

---

## Task 10: Dashboard assembly

**Files:**
- Create: `src/app/(dashboard)/member/check-in/_components/check-in-dashboard.tsx`
- Modify: `src/app/(dashboard)/member/check-in/page.tsx`

- [ ] **Step 1: Create dashboard client component**

```typescript
// src/app/(dashboard)/member/check-in/_components/check-in-dashboard.tsx
'use client';

import type { CheckInRecord, Achievements, BodyMetricsResult, HeatmapCell } from '@/lib/check-in-stats';
import { avgWellnessScore } from '@/lib/check-in-stats';
import { format } from 'date-fns';
import { AchievementCards } from './achievement-cards';
import { WellnessBreakdown } from './wellness-breakdown';
import { BodyMetrics } from './body-metrics';
import { HistoryList } from './history-list';
import { ThisWeekCard } from './this-week-card';
import { CompareCard } from './compare-card';
import { RecentPhotos } from './recent-photos';

interface PhotoEntry { url: string; submittedAt: string }

interface Props {
  checkIns: CheckInRecord[];
  hasThisWeek: boolean;
  achievements: Achievements;
  bodyMetrics: BodyMetricsResult;
  heatmap: HeatmapCell[];
  checkInsWithPhotos: CheckInRecord[];
  allPhotos: PhotoEntry[];
}

export function CheckInDashboard({
  checkIns,
  hasThisWeek,
  achievements,
  bodyMetrics,
  heatmap,
  checkInsWithPhotos,
  allPhotos,
}: Props) {
  const latestCheckIn = checkIns[0] ?? null;
  const thisWeekCheckIn = hasThisWeek ? latestCheckIn : null;
  const recentFive = checkIns.slice(0, 5);
  const recentSixPhotos = allPhotos.slice(-6).reverse();

  return (
    <div className="px-4 sm:px-8 py-6 max-w-[1200px] mx-auto">
      <AchievementCards achievements={achievements} />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3.5 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-3.5 order-2 lg:order-1">
          <WellnessBreakdown checkIn={latestCheckIn} />
          <BodyMetrics metrics={bodyMetrics} />
          <HistoryList checkIns={recentFive} totalCount={checkIns.length} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5 order-1 lg:order-2">
          <ThisWeekCard
            hasThisWeek={hasThisWeek}
            heatmap={heatmap}
            submittedDate={thisWeekCheckIn ? format(new Date(thisWeekCheckIn.submittedAt), 'd MMM') : undefined}
            avgWellness={thisWeekCheckIn ? avgWellnessScore(thisWeekCheckIn) : undefined}
            weight={thisWeekCheckIn?.weight}
          />
          <CompareCard checkInsWithPhotos={checkInsWithPhotos} />
          <RecentPhotos
            recentPhotos={recentSixPhotos}
            allPhotos={allPhotos}
            totalCount={allPhotos.length}
          />
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace page.tsx with the full dashboard**

```typescript
// src/app/(dashboard)/member/check-in/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import {
  computeAchievements,
  computeBodyMetrics,
  computeHeatmap,
  getWeekStart,
  type CheckInRecord,
} from '@/lib/check-in-stats';
import { CheckInDashboard } from './_components/check-in-dashboard';

export default async function MemberCheckInPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const memberId = session.user.id;

  const [rawCheckIns, rawPhotos] = await Promise.all([
    repo.findByMember(memberId),
    repo.findPhotosForMember(memberId),
  ]);

  // Serialize Mongoose documents to plain objects
  const checkIns: CheckInRecord[] = rawCheckIns.map(c => ({
    _id: c._id.toString(),
    memberId: c.memberId.toString(),
    trainerId: c.trainerId.toString(),
    submittedAt: c.submittedAt.toISOString(),
    sleepQuality: c.sleepQuality,
    energy: c.energy,
    recovery: c.recovery,
    stress: c.stress,
    fatigue: c.fatigue,
    hunger: c.hunger,
    digestion: c.digestion,
    weight: c.weight,
    waist: c.waist,
    steps: c.steps,
    exerciseMinutes: c.exerciseMinutes,
    walkRunDistance: c.walkRunDistance,
    sleepHours: c.sleepHours,
    dietDetails: c.dietDetails,
    stuckToDiet: c.stuckToDiet,
    wellbeing: c.wellbeing,
    notes: c.notes,
    photos: c.photos,
  }));

  const now = new Date();
  const weekStart = getWeekStart(now);
  const hasThisWeek = checkIns.some(c => new Date(c.submittedAt) >= weekStart);

  const allPhotos = rawPhotos
    .flatMap(p => p.photos.map(url => ({ url, submittedAt: p.submittedAt.toISOString() })));

  const checkInsWithPhotos = checkIns.filter(c => c.photos.length > 0);

  return (
    <div>
      <PageHeader title="Check-In Dashboard" subtitle="Weekly progress tracking" />
      <CheckInDashboard
        checkIns={checkIns}
        hasThisWeek={hasThisWeek}
        achievements={computeAchievements(checkIns, now)}
        bodyMetrics={computeBodyMetrics(checkIns)}
        heatmap={computeHeatmap(checkIns, now)}
        checkInsWithPhotos={checkInsWithPhotos}
        allPhotos={allPhotos}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run lint and build check**

```bash
pnpm lint
pnpm build 2>&1 | tail -20
# Expected: no errors
```

- [ ] **Step 4: Manual smoke test — open dashboard in browser**

```bash
pnpm dev
# Visit http://localhost:3000/member/check-in
# ✓ Achievement cards visible
# ✓ Wellness breakdown shows latest check-in ratings
# ✓ Body metrics shows weight/waist/steps with sparklines
# ✓ This week card shows submit button
# ✓ Heatmap shows 30 cells
# ✓ Compare card shows date selectors + photo previews
# ✓ Recent photos shows 6-photo grid
# ✓ History list shows 5 rows with date/dots/pills
# ✓ "Open Full Comparison" opens full-screen modal
# ✓ "All N →" on photos opens gallery modal
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/member/check-in/page.tsx \
        src/app/(dashboard)/member/check-in/_components/check-in-dashboard.tsx
git commit -m "feat(check-in): assemble full dashboard — replaces single form page"
```

---

## Task 11: Supporting routes

**Files:**
- Create: `src/app/(dashboard)/member/check-in/history/page.tsx`
- Create: `src/app/(dashboard)/member/check-in/[id]/page.tsx`

- [ ] **Step 1: Create history page**

```typescript
// src/app/(dashboard)/member/check-in/history/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { avgWellnessScore, getWeekStart, type CheckInRecord } from '@/lib/check-in-stats';

export default async function CheckInHistoryPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const raw = await repo.findByMember(session.user.id);

  const checkIns: CheckInRecord[] = raw.map(c => ({
    _id: c._id.toString(),
    memberId: c.memberId.toString(),
    trainerId: c.trainerId.toString(),
    submittedAt: c.submittedAt.toISOString(),
    sleepQuality: c.sleepQuality, energy: c.energy, recovery: c.recovery,
    stress: c.stress, fatigue: c.fatigue, hunger: c.hunger, digestion: c.digestion,
    weight: c.weight, waist: c.waist, steps: c.steps,
    exerciseMinutes: c.exerciseMinutes, walkRunDistance: c.walkRunDistance,
    sleepHours: c.sleepHours, dietDetails: c.dietDetails, stuckToDiet: c.stuckToDiet,
    wellbeing: c.wellbeing, notes: c.notes, photos: c.photos,
  }));

  const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
  const DIET_COLOUR: Record<string, string> = {
    yes: 'bg-emerald-400/10 text-emerald-400',
    no: 'bg-red-400/10 text-red-400',
    partial: 'bg-amber-400/10 text-amber-400',
  };

  return (
    <div>
      <PageHeader title="Check-In History" subtitle={`${checkIns.length} total check-ins`} />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto">
        <Link href="/member/check-in" className="text-sm text-foreground/65 hover:text-foreground mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
          {checkIns.map((c, i) => (
            <Link
              key={c._id}
              href={`/member/check-in/${c._id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors last:border-b-0"
            >
              <div className="min-w-[80px]">
                <div className="text-sm font-medium">{format(new Date(c.submittedAt), 'd MMM yyyy')}</div>
                <div className="text-[10px] text-foreground/30">{formatDistanceToNow(new Date(c.submittedAt), { addSuffix: true })}</div>
              </div>
              <div className="text-xs text-foreground/45">{avgWellnessScore(c)}/10</div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIET_COLOUR[c.stuckToDiet]}`}>
                  {DIET_LABEL[c.stuckToDiet]}
                </span>
                {c.weight !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/45">
                    {c.weight} kg
                  </span>
                )}
              </div>
              <span className="text-foreground/18 text-sm">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create member check-in detail page**

```typescript
// src/app/(dashboard)/member/check-in/[id]/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { avgWellnessScore, type CheckInRecord } from '@/lib/check-in-stats';

export default async function MemberCheckInDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const raw = await repo.findById(params.id, session.user.id);
  if (!raw) notFound();

  const c: CheckInRecord = {
    _id: raw._id.toString(),
    memberId: raw.memberId.toString(),
    trainerId: raw.trainerId.toString(),
    submittedAt: raw.submittedAt.toISOString(),
    sleepQuality: raw.sleepQuality, energy: raw.energy, recovery: raw.recovery,
    stress: raw.stress, fatigue: raw.fatigue, hunger: raw.hunger, digestion: raw.digestion,
    weight: raw.weight, waist: raw.waist, steps: raw.steps,
    exerciseMinutes: raw.exerciseMinutes, walkRunDistance: raw.walkRunDistance,
    sleepHours: raw.sleepHours, dietDetails: raw.dietDetails, stuckToDiet: raw.stuckToDiet,
    wellbeing: raw.wellbeing, notes: raw.notes, photos: raw.photos,
  };

  const RATINGS = [
    { label: 'Sleep Quality', value: c.sleepQuality },
    { label: 'Energy',        value: c.energy },
    { label: 'Recovery',      value: c.recovery },
    { label: 'Digestion',     value: c.digestion },
    { label: 'Hunger',        value: c.hunger },
    { label: 'Stress',        value: c.stress },
    { label: 'Fatigue',       value: c.fatigue },
  ];
  const STATS = [
    { label: 'Weight',   value: c.weight,           unit: 'kg'  },
    { label: 'Waist',    value: c.waist,             unit: 'cm'  },
    { label: 'Steps',    value: c.steps,             unit: ''    },
    { label: 'Exercise', value: c.exerciseMinutes,   unit: 'min' },
    { label: 'Sleep',    value: c.sleepHours,        unit: 'hrs' },
    { label: 'Walk/Run', value: c.walkRunDistance,   unit: 'km'  },
  ];

  return (
    <div>
      <PageHeader
        title={format(new Date(c.submittedAt), 'd MMMM yyyy')}
        subtitle={`Wellness score: ${avgWellnessScore(c)}/10`}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto space-y-4">
        <Link href="/member/check-in/history" className="text-sm text-foreground/65 hover:text-foreground inline-block">
          ← History
        </Link>

        {/* Ratings */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
          <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">How I felt</div>
          <div className="px-4 py-3 space-y-2.5">
            {RATINGS.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-foreground/45 w-28">{label}</span>
                <div className="flex-1 h-1.5 bg-foreground/7 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
                </div>
                <span className="text-xs font-semibold text-primary-light w-5 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
          <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">Body & Activity</div>
          <div className="grid grid-cols-3 gap-px bg-foreground/5">
            {STATS.map(({ label, value, unit }) => (
              <div key={label} className="bg-card px-3 py-2.5">
                <div className="text-[10px] text-foreground/35 uppercase tracking-wider">{label}</div>
                <div className="text-base font-bold mt-0.5">
                  {value !== null ? (
                    <>{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value?.toLocaleString()}<span className="text-xs text-foreground/35 font-normal ml-0.5">{unit}</span></>
                  ) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diet */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] px-4 py-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">Diet</div>
          <div className="text-sm font-medium capitalize">{c.stuckToDiet === 'yes' ? 'On track' : c.stuckToDiet === 'no' ? 'Off track' : 'Partial'}</div>
          {c.dietDetails && <p className="text-xs text-foreground/65">{c.dietDetails}</p>}
        </div>

        {/* Wellbeing / Notes */}
        {(c.wellbeing || c.notes) && (
          <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] px-4 py-3 space-y-2">
            {c.wellbeing && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45 mb-0.5">Wellbeing</div>
                <p className="text-xs text-foreground/65">{c.wellbeing}</p>
              </div>
            )}
            {c.notes && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45 mb-0.5">Notes</div>
                <p className="text-xs text-foreground/65">{c.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {c.photos.length > 0 && (
          <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
            <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">Photos · {c.photos.length}</div>
            <div className="grid grid-cols-3 gap-[3px] p-[3px]">
              {c.photos.map((url, i) => (
                <div key={i} className="aspect-square rounded-[5px] overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover block" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run lint**

```bash
pnpm lint
# Expected: no errors
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/member/check-in/history/page.tsx \
        src/app/(dashboard)/member/check-in/[id]/page.tsx
git commit -m "feat(check-in): add /history and /[id] routes for member check-in"
```

---

## Task 12: E2E test

**Files:**
- Create: `e2e/member/check-in-dashboard.spec.ts`

- [ ] **Step 1: Write E2E test**

```typescript
// e2e/member/check-in-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/member.json' });

test.describe('Check-In Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/member/check-in');
  });

  test('dashboard loads with key sections', async ({ page }) => {
    // Achievement cards
    await expect(page.locator('text=week streak').first()).toBeVisible();
    // Wellness breakdown
    await expect(page.locator('text=Wellness Breakdown')).toBeVisible();
    // Body metrics
    await expect(page.locator('text=Body Metrics')).toBeVisible();
    // History
    await expect(page.locator('text=History')).toBeVisible();
  });

  test('submit button navigates to /new', async ({ page }) => {
    const link = page.getByRole('link', { name: /Submit This Week/i });
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL('/member/check-in/new');
    }
  });

  test('All N → opens photo gallery modal', async ({ page }) => {
    const allBtn = page.locator('button', { hasText: /All \d+ →/ });
    if (await allBtn.isVisible()) {
      await allBtn.click();
      await expect(page.locator('text=Progress Photos')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('text=Progress Photos')).not.toBeVisible();
    }
  });

  test('Open Full Comparison opens compare modal', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Open Full Comparison/i });
    if (await btn.isVisible()) {
      await btn.click();
      await expect(page.locator('text=Before / After Comparison')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('text=Before / After Comparison')).not.toBeVisible();
    }
  });

  test('history row navigates to detail view', async ({ page }) => {
    const row = page.locator('a[href^="/member/check-in/"]').first();
    if (await row.isVisible()) {
      await row.click();
      await expect(page).toHaveURL(/\/member\/check-in\/.+/);
      await expect(page.locator('text=How I felt')).toBeVisible();
    }
  });

  test('responsive: single column on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/member/check-in');
    // This week card appears above wellness breakdown on mobile
    const thisWeek = page.locator('text=This week').first();
    const wellness = page.locator('text=Wellness Breakdown');
    const thisWeekY  = (await thisWeek.boundingBox())?.y  ?? 0;
    const wellnessY  = (await wellness.boundingBox())?.y ?? 0;
    expect(thisWeekY).toBeLessThan(wellnessY);
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
pnpm test:e2e -- --grep "Check-In Dashboard"
# Expected: all PASS
```

- [ ] **Step 3: Run full test suite + lint**

```bash
pnpm test && pnpm lint
# Expected: all PASS, no lint errors
```

- [ ] **Step 4: Final commit**

```bash
git add e2e/member/check-in-dashboard.spec.ts
git commit -m "test(check-in): add E2E tests for dashboard"
```

---

## Post-Implementation Checklist

- [ ] `pnpm test` — 100% pass
- [ ] `pnpm lint` — no warnings or errors
- [ ] `pnpm build` — clean build
- [ ] `pnpm test:e2e` — all E2E pass
- [ ] Update `docs/INDEX.md` — mark plan complete, then delete file
