# Member Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the member dashboard with a Premium Dark + Indigo visual system featuring a full-bleed gradient hero, 4-cell KPI strip, two Recharts trend charts, and redesigned nutrition/sessions cards.

**Architecture:** Server Components per section, each in `<Suspense>`. Chart data fetched server-side and serialized as props to `'use client'` Recharts islands. Framer Motion entrance animations in client sub-components.

**Tech Stack:** Next.js App Router Server Components, Recharts 3, Framer Motion, Tailwind CSS design tokens, shadcn/ui Skeleton.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/(dashboard)/member/_components/member-hero.tsx` | Rewrite | Server: fetches streak + schedule + plan; renders gradient hero with workout card |
| `src/app/(dashboard)/member/_components/member-hero-client.tsx` | Create | `'use client'` animated greeting sub-component |
| `src/app/(dashboard)/member/_components/member-kpi-strip.tsx` | Create | Server: 4 KPI cells (sessions/weight/bf/pr) |
| `src/app/(dashboard)/member/_components/member-body-chart.tsx` | Create | Server fetch → `MemberBodyChartClient` Recharts island |
| `src/app/(dashboard)/member/_components/member-strength-chart.tsx` | Create | Server fetch → `MemberStrengthChartClient` Recharts island |
| `src/app/(dashboard)/member/_components/member-nutrition-today.tsx` | Create | Server: nutrition targets with macro progress bars |
| `src/app/(dashboard)/member/_components/member-upcoming-sessions.tsx` | Minor edit | Token cleanup only |
| `src/app/(dashboard)/member/page.tsx` | Rewrite (Task 5) | New Suspense layout wiring all new components |
| `src/app/(dashboard)/member/_components/member-key-numbers.tsx` | Delete (Task 5) | Replaced by kpi-strip |
| `src/app/(dashboard)/member/_components/member-body-composition.tsx` | Delete (Task 5) | Replaced by body-chart |
| `src/app/(dashboard)/member/_components/member-today-workout.tsx` | Delete (Task 5) | Absorbed into hero |
| `src/app/(dashboard)/member/_components/member-personal-bests.tsx` | Delete (Task 5) | Top PR shown in kpi-strip |

---

## Task 1: Rewrite member-hero.tsx

**Files:**
- Modify: `src/app/(dashboard)/member/_components/member-hero.tsx`
- Create: `src/app/(dashboard)/member/_components/member-hero-client.tsx`
- Test: `__tests__/app/member/member-hero.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/member/member-hero.test.tsx
import { estimatedDuration } from '@/app/(dashboard)/member/_components/member-hero';

describe('estimatedDuration', () => {
  it('rounds up to nearest 5 minutes', () => {
    expect(estimatedDuration(4)).toBe(15);  // 4*2.5=10, min=15
    expect(estimatedDuration(6)).toBe(15);  // 6*2.5=15 → 15
    expect(estimatedDuration(8)).toBe(20);  // 8*2.5=20 → 20
    expect(estimatedDuration(10)).toBe(25); // 10*2.5=25 → 25
    expect(estimatedDuration(11)).toBe(30); // 11*2.5=27.5 → rounds up to 30
  });

  it('returns minimum 15 for 0 or very few sets', () => {
    expect(estimatedDuration(0)).toBe(15);
    expect(estimatedDuration(1)).toBe(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="member-hero" --no-coverage
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create member-hero-client.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-hero-client.tsx
'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface Props {
  greeting: string;
  dateLabel: string;
}

export function MemberHeroClient({ greeting, dateLabel }: Props) {
  return (
    <motion.div initial="hidden" animate="visible" variants={variants.fadeSlideUp}>
      <h2 className="text-[20px] font-extrabold tracking-tight text-foreground">{greeting}</h2>
      <p className="text-[11px] text-foreground/40 mt-0.5">{dateLabel}</p>
    </motion.div>
  );
}
```

- [ ] **Step 4: Rewrite member-hero.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-hero.tsx
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MemberHeroClient } from './member-hero-client';

export function estimatedDuration(totalSets: number): number {
  return Math.max(15, Math.ceil((totalSets * 2.5) / 5) * 5);
}

function greetingText(firstName: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const emoji = h < 12 ? '☀️' : h < 17 ? '💪' : '🌙';
  return `${salutation}, ${firstName} ${emoji}`;
}

export async function MemberHero() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [streak, upcoming, plan] = await Promise.all([
    new MongoWorkoutSessionRepository().findConsecutiveStreakDays(memberId),
    new MongoScheduledSessionRepository().findUpcomingByMember(memberId, 5),
    new MongoMemberPlanRepository().findActive(memberId),
  ]);

  const todaySession = upcoming.find((s) => {
    const d = new Date(s.date);
    return d >= todayStart && d <= todayEnd;
  });

  const day = plan?.days[0] ?? null;
  const totalSets = day ? day.exercises.reduce((sum, e) => sum + e.sets, 0) : 0;
  const shown = day ? day.exercises.slice(0, 5) : [];
  const overflow = day ? Math.max(0, day.exercises.length - shown.length) : 0;
  const duration = day ? estimatedDuration(totalSets) : 0;

  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[.18] via-primary/[.07] to-transparent pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/[.12] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-amber-500/[.06] blur-2xl pointer-events-none" />

      <div className="relative px-4 sm:px-8 py-6 border-b border-primary/[.12]">
        <div className="flex items-start justify-between mb-5">
          <MemberHeroClient
            greeting={greetingText(session.user.firstName ?? 'there')}
            dateLabel={dateLabel}
          />
          {streak > 0 && (
            <div className="flex-shrink-0 ml-4 flex flex-col items-center bg-amber-500/[.1] ring-1 ring-amber-500/[.2] rounded-2xl px-4 py-2.5 min-w-[72px]">
              <div
                className="text-[38px] font-black leading-none"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f97316)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {streak}
              </div>
              <div className="text-[9px] text-foreground/35 uppercase tracking-[.07em] mt-0.5">
                day streak 🔥
              </div>
            </div>
          )}
        </div>

        {day ? (
          <div className="bg-primary/[.13] ring-1 ring-primary/[.28] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[.08em] text-primary-light mb-1">
                {todaySession ? `Session at ${todaySession.startTime} · ` : ''}
                {day.name}
              </div>
              <div className="text-[16px] font-bold text-foreground truncate">
                {plan?.name ?? "Today's Workout"}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {shown.map((e) => (
                  <span
                    key={e.exerciseName}
                    className="text-[9px] bg-white/[.06] text-foreground/50 ring-1 ring-white/[.08] rounded px-2 py-0.5"
                  >
                    {e.exerciseName}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-[9px] bg-white/[.06] text-foreground/40 ring-1 ring-white/[.08] rounded px-2 py-0.5">
                    +{overflow} more
                  </span>
                )}
              </div>
              <div className="text-[11px] text-foreground/35 mt-2">
                {day.exercises.length} exercises · {totalSets} sets · ~{duration} min
              </div>
            </div>
            <Link
              href="/member/plan"
              className="flex-shrink-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[13px] font-bold rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity shadow-lg shadow-primary/[.25]"
            >
              Start →
            </Link>
          </div>
        ) : (
          <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-2xl p-4 text-center">
            <p className="text-[12px] text-foreground/40">
              Your trainer hasn&apos;t assigned a plan yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern="member-hero" --no-coverage
```
Expected: PASS (2 test cases for estimatedDuration)

- [ ] **Step 6: Run lint**

```bash
pnpm lint
```
Expected: no errors or warnings

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/member/_components/member-hero.tsx src/app/\(dashboard\)/member/_components/member-hero-client.tsx __tests__/app/member/member-hero.test.tsx
git commit -m "feat(member): rewrite hero — gradient bg, streak badge, today's workout card"
```

---

## Task 2: Create member-kpi-strip.tsx

**Files:**
- Create: `src/app/(dashboard)/member/_components/member-kpi-strip.tsx`
- Test: `__tests__/app/member/member-kpi-strip.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/member/member-kpi-strip.test.tsx
import { buildKpiData } from '@/app/(dashboard)/member/_components/member-kpi-strip';

describe('buildKpiData', () => {
  const now = new Date('2026-05-16T12:00:00Z');

  it('computes deltas correctly when both tests exist', () => {
    const latest = { weight: 75.3, bodyFatPct: 18.5 };
    const previous = { weight: 75.8, bodyFatPct: 19.2 };
    const result = buildKpiData({ sessionsThisMonth: 12, latest, previous, topPb: null, now });
    expect(result.weightDelta).toBe(-0.5);
    expect(result.bfDelta).toBeCloseTo(-0.7, 1);
    expect(result.weightImproved).toBe(true);
    expect(result.bfImproved).toBe(true);
  });

  it('returns null deltas when only one test exists', () => {
    const latest = { weight: 75.3, bodyFatPct: 18.5 };
    const result = buildKpiData({ sessionsThisMonth: 5, latest, previous: null, topPb: null, now });
    expect(result.weightDelta).toBeNull();
    expect(result.bfDelta).toBeNull();
  });

  it('marks pr as new when achieved within 7 days', () => {
    const topPb = {
      exerciseName: 'Squat',
      estimatedOneRM: 140,
      achievedAt: new Date('2026-05-14T10:00:00Z'),
    };
    const result = buildKpiData({ sessionsThisMonth: 5, latest: null, previous: null, topPb, now });
    expect(result.isNewPr).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="member-kpi-strip" --no-coverage
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create member-kpi-strip.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-kpi-strip.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

interface BodySnap { weight: number; bodyFatPct: number }
interface PbSnap { exerciseName: string; estimatedOneRM: number; achievedAt: Date }

interface KpiInputs {
  sessionsThisMonth: number;
  latest: BodySnap | null;
  previous: BodySnap | null;
  topPb: PbSnap | null;
  now: Date;
}

interface KpiData {
  sessionsThisMonth: number;
  weightKg: string;
  weightDelta: number | null;
  weightImproved: boolean;
  bfPct: string;
  bfDelta: number | null;
  bfImproved: boolean;
  topPrName: string;
  topPrKg: string;
  isNewPr: boolean;
}

export function buildKpiData({ sessionsThisMonth, latest, previous, topPb, now }: KpiInputs): KpiData {
  const weightDelta =
    latest && previous ? parseFloat((latest.weight - previous.weight).toFixed(1)) : null;
  const bfDelta =
    latest && previous ? parseFloat((latest.bodyFatPct - previous.bodyFatPct).toFixed(1)) : null;

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const isNewPr = topPb ? new Date(topPb.achievedAt) > sevenDaysAgo : false;

  return {
    sessionsThisMonth,
    weightKg: latest ? latest.weight.toFixed(1) : '—',
    weightDelta,
    weightImproved: weightDelta !== null && weightDelta < 0,
    bfPct: latest ? latest.bodyFatPct.toFixed(1) : '—',
    bfDelta,
    bfImproved: bfDelta !== null && bfDelta < 0,
    topPrName: topPb ? topPb.exerciseName : 'Top PR',
    topPrKg: topPb ? topPb.estimatedOneRM.toFixed(1) : '—',
    isNewPr,
  };
}

export async function MemberKpiStrip() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [tests, pbs, sessionsThisMonth] = await Promise.all([
    new MongoBodyTestRepository().findByMember(memberId),
    new MongoPersonalBestRepository().findByMember(memberId),
    new MongoWorkoutSessionRepository().countCompletedByMemberSince(memberId, monthStart),
  ]);

  const latest = tests[0] ?? null;
  const previous = tests[1] ?? null;
  const topPb =
    pbs.length > 0 ? [...pbs].sort((a, b) => b.estimatedOneRM - a.estimatedOneRM)[0] : null;

  const kpi = buildKpiData({ sessionsThisMonth, latest, previous, topPb, now });

  return (
    <div className="grid grid-cols-4 ring-1 ring-foreground/[.06] rounded-xl overflow-hidden mx-4 sm:mx-8 mb-4">
      <KpiCell
        value={String(kpi.sessionsThisMonth)}
        label="Sessions"
        delta="this month"
        valueClass="text-primary-light"
      />
      <KpiCell
        value={kpi.weightKg}
        label="Weight kg"
        delta={
          kpi.weightDelta !== null
            ? `${kpi.weightDelta < 0 ? '↓' : '↑'} ${Math.abs(kpi.weightDelta)} vs last`
            : undefined
        }
        deltaClass={kpi.weightImproved ? 'text-emerald-400' : undefined}
      />
      <KpiCell
        value={kpi.bfPct}
        label="Body Fat %"
        delta={
          kpi.bfDelta !== null
            ? `${kpi.bfDelta < 0 ? '↓' : '↑'} ${Math.abs(kpi.bfDelta).toFixed(1)}%`
            : undefined
        }
        valueClass="text-emerald-400"
        deltaClass={kpi.bfImproved ? 'text-emerald-400' : undefined}
      />
      <KpiCell
        value={kpi.topPrKg}
        label={kpi.topPrName}
        delta={kpi.isNewPr ? '↑ New PR' : undefined}
        valueClass="text-amber-400"
        deltaClass={kpi.isNewPr ? 'text-amber-400' : undefined}
      />
    </div>
  );
}

function KpiCell({
  value,
  label,
  delta,
  valueClass,
  deltaClass,
}: {
  value: string;
  label: string;
  delta?: string;
  valueClass?: string;
  deltaClass?: string;
}) {
  return (
    <div className="bg-white/[.02] px-2 py-3 text-center border-r border-foreground/[.05] last:border-0">
      <div className={`text-[18px] font-extrabold leading-tight ${valueClass ?? 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[.06em] text-foreground/30 mt-0.5">{label}</div>
      {delta && (
        <div className={`text-[9px] mt-0.5 ${deltaClass ?? 'text-foreground/25'}`}>{delta}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern="member-kpi-strip" --no-coverage
```
Expected: PASS (3 test cases)

- [ ] **Step 5: Run lint**

```bash
pnpm lint
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/member/_components/member-kpi-strip.tsx __tests__/app/member/member-kpi-strip.test.tsx
git commit -m "feat(member): add MemberKpiStrip — 4 KPI cells with deltas"
```

---

## Task 3: Create member-body-chart.tsx

**Files:**
- Create: `src/app/(dashboard)/member/_components/member-body-chart.tsx`
- Test: `__tests__/app/member/member-body-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/member/member-body-chart.test.tsx
import { render, screen } from '@testing-library/react';
import { MemberBodyChartClient } from '@/app/(dashboard)/member/_components/member-body-chart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockPoints = [
  { date: '2026-01-15', weight: 78.0, bodyFatPct: 20.5 },
  { date: '2026-02-20', weight: 76.5, bodyFatPct: 19.8 },
  { date: '2026-03-25', weight: 75.3, bodyFatPct: 18.5 },
];

describe('MemberBodyChartClient', () => {
  it('renders the chart when data has 2+ points', () => {
    render(<MemberBodyChartClient points={mockPoints} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders empty state when fewer than 2 points', () => {
    render(<MemberBodyChartClient points={[mockPoints[0]]} />);
    expect(screen.getByText(/add body tests/i)).toBeInTheDocument();
  });

  it('renders empty state when no points', () => {
    render(<MemberBodyChartClient points={[]} />);
    expect(screen.getByText(/add body tests/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="member-body-chart" --no-coverage
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create member-body-chart.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-body-chart.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MemberBodyChartClient } from './member-body-chart-client';

export async function MemberBodyChart() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const tests = await new MongoBodyTestRepository().findByMember(session.user.id);

  // findByMember returns desc by date — reverse to chronological for chart
  const points = [...tests]
    .reverse()
    .slice(-8)
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      weight: parseFloat(t.weight.toFixed(1)),
      bodyFatPct: parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/40 mb-3">
        Body Composition
      </div>
      <MemberBodyChartClient points={points} />
    </div>
  );
}
```

- [ ] **Step 4: Create member-body-chart-client.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-body-chart-client.tsx
'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface Point {
  date: string;
  weight: number;
  bodyFatPct: number;
}

interface Props {
  points: Point[];
}

export function MemberBodyChartClient({ points }: Props) {
  if (points.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <p className="text-[11px] text-foreground/30">
          Add body tests to see your trend
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="weight"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <YAxis
          yAxisId="bf"
          orientation="right"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: 'rgba(255,255,255,.5)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
          formatter={(v) => (
            <span style={{ color: 'rgba(255,255,255,.4)' }}>{v}</span>
          )}
        />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          name="Weight (kg)"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#10b981' }}
        />
        <Line
          yAxisId="bf"
          type="monotone"
          dataKey="bodyFatPct"
          name="Body Fat %"
          stroke="#ec4899"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3, fill: '#ec4899' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- --testPathPattern="member-body-chart" --no-coverage
```
Expected: PASS (3 test cases)

- [ ] **Step 6: Run lint**

```bash
pnpm lint
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/member/_components/member-body-chart.tsx src/app/\(dashboard\)/member/_components/member-body-chart-client.tsx __tests__/app/member/member-body-chart.test.tsx
git commit -m "feat(member): add MemberBodyChart — weight and body fat trend with Recharts"
```

---

## Task 4: Create member-strength-chart.tsx

**Files:**
- Create: `src/app/(dashboard)/member/_components/member-strength-chart.tsx`
- Create: `src/app/(dashboard)/member/_components/member-strength-chart-client.tsx`
- Test: `__tests__/app/member/member-strength-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/member/member-strength-chart.test.tsx
import { render, screen } from '@testing-library/react';
import { MemberStrengthChartClient } from '@/app/(dashboard)/member/_components/member-strength-chart-client';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockExercises = [
  {
    exerciseName: 'Squat',
    points: [
      { date: 'Jan 15', oneRM: 120 },
      { date: 'Feb 20', oneRM: 130 },
      { date: 'Mar 25', oneRM: 140 },
    ],
  },
  {
    exerciseName: 'Bench Press',
    points: [
      { date: 'Jan 15', oneRM: 90 },
      { date: 'Feb 20', oneRM: 95 },
      { date: 'Mar 25', oneRM: 100 },
    ],
  },
];

describe('MemberStrengthChartClient', () => {
  it('renders the chart when exercises have points', () => {
    render(<MemberStrengthChartClient exercises={mockExercises} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders empty state when no exercises', () => {
    render(<MemberStrengthChartClient exercises={[]} />);
    expect(screen.getByText(/complete workouts/i)).toBeInTheDocument();
  });

  it('renders empty state when all exercises have fewer than 2 points', () => {
    const onePoint = [{ exerciseName: 'Squat', points: [{ date: 'Jan 1', oneRM: 100 }] }];
    render(<MemberStrengthChartClient exercises={onePoint} />);
    expect(screen.getByText(/complete workouts/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="member-strength-chart" --no-coverage
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create member-strength-chart-client.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-strength-chart-client.tsx
'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ExerciseHistory {
  exerciseName: string;
  points: { date: string; oneRM: number }[];
}

interface Props {
  exercises: ExerciseHistory[];
}

// Merge per-exercise point arrays into a flat array keyed by date
function mergePoints(exercises: ExerciseHistory[]): Record<string, number>[] {
  const byDate = new Map<string, Record<string, number>>();
  for (const ex of exercises) {
    for (const p of ex.points) {
      const row = byDate.get(p.date) ?? { date: p.date };
      row[ex.exerciseName] = p.oneRM;
      byDate.set(p.date, row);
    }
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

const LINE_COLORS = ['#6366f1', '#f59e0b', '#ec4899'] as const;

export function MemberStrengthChartClient({ exercises }: Props) {
  const hasData = exercises.some((e) => e.points.length >= 2);

  if (!hasData) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <p className="text-[11px] text-foreground/30">
          Complete workouts to track your strength
        </p>
      </div>
    );
  }

  const data = mergePoints(exercises);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: 'rgba(255,255,255,.5)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
          formatter={(v) => (
            <span style={{ color: 'rgba(255,255,255,.4)' }}>{v}</span>
          )}
        />
        {exercises.map((ex, i) => (
          <Line
            key={ex.exerciseName}
            type="monotone"
            dataKey={ex.exerciseName}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={i === 0 ? 2 : 1.5}
            strokeDasharray={i > 0 ? '4 2' : undefined}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create member-strength-chart.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-strength-chart.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MemberStrengthChartClient } from './member-strength-chart-client';

export async function MemberStrengthChart() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;

  const pbs = await new MongoPersonalBestRepository().findByMember(memberId);
  const top3 = [...pbs]
    .sort((a, b) => b.estimatedOneRM - a.estimatedOneRM)
    .slice(0, 3);

  const sessionRepo = new MongoWorkoutSessionRepository();
  const histories = await Promise.all(
    top3.map((pb) =>
      sessionRepo.findExerciseHistory(memberId, String(pb.exerciseId)),
    ),
  );

  const exercises = top3.map((pb, i) => ({
    exerciseName: pb.exerciseName,
    points: (histories[i] ?? []).map((p) => ({
      date: new Date(p.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      oneRM: parseFloat(p.estimatedOneRM.toFixed(1)),
    })),
  }));

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/40 mb-3">
        Strength (1RM est.)
      </div>
      <MemberStrengthChartClient exercises={exercises} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- --testPathPattern="member-strength-chart" --no-coverage
```
Expected: PASS (3 test cases)

- [ ] **Step 6: Run lint**

```bash
pnpm lint
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/member/_components/member-strength-chart.tsx src/app/\(dashboard\)/member/_components/member-strength-chart-client.tsx __tests__/app/member/member-strength-chart.test.tsx
git commit -m "feat(member): add MemberStrengthChart — top 3 exercise 1RM trend with Recharts"
```

---

## Task 5: Nutrition card, page assembly, cleanup

**Files:**
- Create: `src/app/(dashboard)/member/_components/member-nutrition-today.tsx`
- Modify: `src/app/(dashboard)/member/_components/member-upcoming-sessions.tsx`
- Modify: `src/app/(dashboard)/member/page.tsx`
- Delete: `member-key-numbers.tsx`, `member-body-composition.tsx`, `member-today-workout.tsx`, `member-personal-bests.tsx`
- Test: `__tests__/app/member/member-nutrition-today.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/app/member/member-nutrition-today.test.tsx
import { computeMacros } from '@/app/(dashboard)/member/_components/member-nutrition-today';

describe('computeMacros', () => {
  const items = [
    { protein: 30, carbs: 50, fat: 10, kcal: 410 },
    { protein: 20, carbs: 30, fat: 5, kcal: 245 },
  ];

  it('sums all macro items', () => {
    const result = computeMacros(items);
    expect(result.protein).toBe(50);
    expect(result.carbs).toBe(80);
    expect(result.fat).toBe(15);
    expect(result.kcal).toBe(655);
  });

  it('returns zeros for empty items', () => {
    const result = computeMacros([]);
    expect(result.protein).toBe(0);
    expect(result.kcal).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="member-nutrition-today" --no-coverage
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create member-nutrition-today.tsx**

```typescript
// src/app/(dashboard)/member/_components/member-nutrition-today.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { resolveDayType } from '@/lib/nutrition/schedule';

interface MacroItem {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

export function computeMacros(items: MacroItem[]): Macros {
  return items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      kcal: acc.kcal + item.kcal,
    }),
    { protein: 0, carbs: 0, fat: 0, kcal: 0 },
  );
}

export async function MemberNutritionToday() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberNutritionPlanRepository().findActive(session.user.id);

  if (!plan) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/40 mb-3">
          Nutrition Today
        </div>
        <p className="text-[11px] text-foreground/35 text-center py-2">
          No nutrition plan assigned
        </p>
      </div>
    );
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const startISO = new Date(plan.assignedAt).toISOString().slice(0, 10);
  const dayTypeName = resolveDayType(plan.schedule, todayISO, startISO);
  const dayType = plan.dayTypes.find((d) => d.name === dayTypeName) ?? plan.dayTypes[0];

  if (!dayType) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/40 mb-3">
          Nutrition Today
        </div>
        <p className="text-[11px] text-foreground/35 text-center py-2">No day type for today</p>
      </div>
    );
  }

  const allItems = dayType.meals.flatMap((m) => m.items);
  const macros = computeMacros(allItems);

  const bars = [
    { label: 'Protein', value: Math.round(macros.protein), unit: 'g', color: 'bg-emerald-500', trackColor: 'bg-emerald-500/15', max: Math.round(macros.protein) },
    { label: 'Carbs', value: Math.round(macros.carbs), unit: 'g', color: 'bg-amber-500', trackColor: 'bg-amber-500/15', max: Math.round(macros.carbs) },
    { label: 'Fat', value: Math.round(macros.fat), unit: 'g', color: 'bg-pink-500', trackColor: 'bg-pink-500/15', max: Math.round(macros.fat) },
    { label: 'Calories', value: Math.round(macros.kcal), unit: 'kcal', color: 'bg-foreground/30', trackColor: 'bg-white/[.04]', max: Math.round(macros.kcal) },
  ];

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/40">
          Nutrition Today
        </div>
        <span className="text-[9px] bg-primary/[.12] text-primary-light ring-1 ring-primary/[.2] rounded-full px-2 py-0.5 font-semibold">
          {dayType.name}
        </span>
      </div>
      <div className="space-y-3">
        {bars.map(({ label, value, unit, color, trackColor }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-foreground/40">{label}</span>
              <span className="text-[12px] font-bold text-foreground/80">
                {value} <span className="text-[10px] text-foreground/35 font-normal">{unit}</span>
              </span>
            </div>
            <div className={`h-1.5 rounded-full ${trackColor}`}>
              <div className={`h-full w-full rounded-full ${color}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- --testPathPattern="member-nutrition-today" --no-coverage
```
Expected: PASS (2 test cases)

- [ ] **Step 5: Token-upgrade member-upcoming-sessions.tsx**

Replace the `text-[10px] font-bold text-primary` time label with `text-[10px] font-bold text-primary-light` and verify no other hardcoded hex exist. The file at `src/app/(dashboard)/member/_components/member-upcoming-sessions.tsx` already uses good tokens for badges — only change line 54:

```tsx
// Before:
<div className="text-[10px] font-bold text-primary min-w-[60px]">{timeLabel}</div>

// After:
<div className="text-[10px] font-bold text-primary-light min-w-[60px]">{timeLabel}</div>
```

- [ ] **Step 6: Rewrite page.tsx**

```typescript
// src/app/(dashboard)/member/page.tsx
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberHero } from './_components/member-hero';
import { MemberKpiStrip } from './_components/member-kpi-strip';
import { MemberBodyChart } from './_components/member-body-chart';
import { MemberStrengthChart } from './_components/member-strength-chart';
import { MemberNutritionToday } from './_components/member-nutrition-today';
import { MemberUpcomingSessions } from './_components/member-upcoming-sessions';

export default async function MemberDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <Suspense fallback={<Skeleton className="h-52 rounded-none" />}>
        <MemberHero />
      </Suspense>

      <div className="py-4 space-y-4">
        <Suspense
          fallback={
            <div className="grid grid-cols-4 gap-px mx-4 sm:mx-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px]" />
              ))}
            </div>
          }
        >
          <MemberKpiStrip />
        </Suspense>

        <div className="px-4 sm:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/30 mb-3">
            Progress
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Suspense fallback={<Skeleton className="h-[164px] rounded-xl" />}>
              <MemberBodyChart />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[164px] rounded-xl" />}>
              <MemberStrengthChart />
            </Suspense>
          </div>
        </div>

        <div className="px-4 sm:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/30 mb-3">
            Today & Upcoming
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Suspense fallback={<Skeleton className="h-[160px] rounded-xl" />}>
              <MemberNutritionToday />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-[160px] rounded-xl" />}>
              <MemberUpcomingSessions />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Delete old component files**

```bash
rm src/app/\(dashboard\)/member/_components/member-key-numbers.tsx
rm src/app/\(dashboard\)/member/_components/member-body-composition.tsx
rm src/app/\(dashboard\)/member/_components/member-today-workout.tsx
rm src/app/\(dashboard\)/member/_components/member-personal-bests.tsx
```

- [ ] **Step 8: Run full test suite**

```bash
pnpm test --no-coverage
```
Expected: all tests pass (the deleted components had no test files)

- [ ] **Step 9: Run lint and build**

```bash
pnpm lint && pnpm build
```
Expected: no errors, build succeeds

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(member): assemble dashboard — nutrition card, new page layout, remove legacy components"
```

---

## Self-review

**Spec coverage:**
- ✅ Layout A (Today First): Hero → KPI → Charts → Bottom
- ✅ Hero B-style gradient + streak badge, C-structure workout card with exercises/duration/Start
- ✅ Body composition trend chart (A)
- ✅ 1RM strength trend chart (B) via `findExerciseHistory`
- ✅ KPI strip: sessions/weight/bf/top PR
- ✅ Nutrition progress bars with day type badge
- ✅ Upcoming sessions (preserved)
- ✅ Server Component per section + Suspense
- ✅ `'use client'` chart islands
- ✅ Framer Motion in `MemberHeroClient`
- ✅ Design tokens (no hardcoded hex except the amber gradient in the streak badge which uses `style={}` intentionally — same pattern as existing hero)
- ✅ Deleted legacy components in Task 5
- ✅ Tests for every exported pure function

**Type consistency:**
- `MemberBodyChart` passes `Point[]` to `MemberBodyChartClient` — consistent
- `MemberStrengthChart` passes `ExerciseHistory[]` to `MemberStrengthChartClient` — consistent
- `buildKpiData` input/output types match usage in `MemberKpiStrip` — consistent
- `computeMacros` input `MacroItem[]` matches `dayType.meals.flatMap(m => m.items)` shape — consistent

**No placeholders:** All steps have complete code.
