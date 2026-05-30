import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { useMemberCheckInStore } from '@/stores/memberCheckInStore';
import type { CheckInRecord } from '@/api/check-ins';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

function formatDistanceAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

// ─── Check-in stats (port of web/src/lib/check-in-stats.ts) ──────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function avgWellnessScore(c: CheckInRecord): number {
  const sum =
    c.sleepQuality +
    c.energy +
    c.recovery +
    (10 - c.stress) +
    (10 - c.fatigue) +
    c.hunger +
    c.digestion;
  return Math.round((sum / 7) * 10) / 10;
}

interface Achievements {
  currentStreak: number;
  totalCheckIns: number;
  dietStreak: number;
  weightLost: number | null;
}

function computeAchievements(checkIns: CheckInRecord[]): Achievements {
  const totalCheckIns = checkIns.length;
  const now = new Date();
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  const currentWeekStart = getWeekStart(now).getTime();
  const weekSet = new Set(checkIns.map((c) => getWeekStart(new Date(c.submittedAt)).getTime()));
  let streak = 0;
  let cursor = currentWeekStart;
  if (!weekSet.has(cursor)) cursor -= ONE_WEEK;
  while (weekSet.has(cursor)) {
    streak++;
    cursor -= ONE_WEEK;
  }
  let dietStreak = 0;
  for (const c of checkIns) {
    if (c.stuckToDiet === 'yes') dietStreak++;
    else break;
  }
  const withWeight = checkIns.filter((c) => c.weight !== null);
  const weightLatest = withWeight[0]?.weight ?? null;
  const weightFirst = withWeight[withWeight.length - 1]?.weight ?? null;
  const weightLost =
    weightFirst !== null && weightLatest !== null && weightFirst > weightLatest
      ? Math.round((weightFirst - weightLatest) * 10) / 10
      : null;
  return { currentStreak: streak, totalCheckIns, dietStreak, weightLost };
}

interface HeatmapCell {
  weekStart: string;
  hasCheckIn: boolean;
  avgWellness: number | null;
  isCurrentWeek: boolean;
}

function computeHeatmap(checkIns: CheckInRecord[]): HeatmapCell[] {
  const now = new Date();
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
      ? Math.round(
          (weekCheckIns.reduce((s, c) => s + avgWellnessScore(c), 0) / weekCheckIns.length) * 10,
        ) / 10
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

// ─── Achievement Cards ────────────────────────────────────────────────────────

function AchievementCards({ achievements }: { achievements: Achievements }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 mb-6">
      <div className="rounded-xl bg-primary/10 ring-1 ring-primary/20 p-3 text-center">
        <div className="text-2xl font-semibold tabular-nums">{achievements.currentStreak}</div>
        <div className="mt-1 text-[11px] text-foreground/65">week streak</div>
      </div>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 text-center">
        <div className="text-2xl font-semibold tabular-nums">{achievements.totalCheckIns}</div>
        <div className="mt-1 text-[11px] text-foreground/65">total check-ins</div>
      </div>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 text-center">
        <div className="text-2xl font-semibold tabular-nums">{achievements.dietStreak}</div>
        <div className="mt-1 text-[11px] text-foreground/65">diet streak</div>
      </div>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 text-center">
        <div className="text-2xl font-semibold tabular-nums">
          {achievements.weightLost !== null ? `${achievements.weightLost}` : '—'}
        </div>
        <div className="mt-1 text-[11px] text-foreground/65">kg lost</div>
      </div>
    </div>
  );
}

// ─── This Week Card ───────────────────────────────────────────────────────────

function ThisWeekCard({
  hasThisWeek,
  heatmap,
  submittedDate,
  avgWellness,
  weight,
}: {
  hasThisWeek: boolean;
  heatmap: HeatmapCell[];
  submittedDate?: string;
  avgWellness?: number;
  weight?: number | null;
}) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">This week</h3>
        {hasThisWeek ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
            Submitted {submittedDate}
          </span>
        ) : (
          <Link
            to="/member/check-in/new"
            className="text-[11px] font-semibold text-primary-light hover:text-primary transition-colors"
          >
            Submit This Week →
          </Link>
        )}
      </div>

      {hasThisWeek && (
        <div className="flex items-center gap-4">
          {avgWellness !== undefined && (
            <div>
              <div className="text-lg font-semibold tabular-nums">{avgWellness}<span className="text-xs text-foreground/65">/10</span></div>
              <div className="text-[10px] text-foreground/50">Wellness</div>
            </div>
          )}
          {weight !== undefined && weight !== null && (
            <div>
              <div className="text-lg font-semibold tabular-nums">{weight}<span className="text-xs text-foreground/65"> kg</span></div>
              <div className="text-[10px] text-foreground/50">Weight</div>
            </div>
          )}
        </div>
      )}

      {/* Heatmap — last 12 weeks */}
      <div className="flex gap-[3px] flex-wrap">
        {heatmap.slice(-12).map((cell) => (
          <div
            key={cell.weekStart}
            title={cell.hasCheckIn ? `${cell.avgWellness}/10` : 'No check-in'}
            className={`w-5 h-5 rounded-sm ${
              cell.isCurrentWeek
                ? 'ring-1 ring-primary/50'
                : ''
            } ${
              cell.hasCheckIn
                ? 'bg-primary/60'
                : 'bg-foreground/[0.06]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Wellness Breakdown ───────────────────────────────────────────────────────

function WellnessBreakdown({ checkIn }: { checkIn: CheckInRecord | null }) {
  if (!checkIn) return null;
  const FIELDS = [
    { label: 'Sleep Quality', value: checkIn.sleepQuality },
    { label: 'Energy', value: checkIn.energy },
    { label: 'Recovery', value: checkIn.recovery },
    { label: 'Hunger', value: checkIn.hunger },
    { label: 'Digestion', value: checkIn.digestion },
    { label: 'Stress', value: 10 - checkIn.stress },
    { label: 'Fatigue', value: 10 - checkIn.fatigue },
  ];
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Wellness Breakdown
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {FIELDS.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-foreground/50 w-28 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-foreground/[0.07] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
            </div>
            <span className="text-xs font-semibold text-primary-light w-5 text-right tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────

interface BodyMetricData {
  current: number | null;
  delta: number | null;
}

interface BodyMetrics {
  weight: BodyMetricData;
  waist: BodyMetricData;
  steps: BodyMetricData;
  sleepHours: BodyMetricData;
  stuckToDiet: 'yes' | 'no' | 'partial' | null;
}

function extractMetric(
  checkIns: CheckInRecord[],
  field: 'weight' | 'waist' | 'steps' | 'sleepHours',
): BodyMetricData {
  const withData = checkIns.filter((c) => c[field] !== null);
  const current = (withData[0]?.[field] as number) ?? null;
  const prev = withData.length > 1 ? (withData[withData.length - 1][field] as number) : null;
  const delta =
    current !== null && prev !== null ? Math.round((current - prev) * 10) / 10 : null;
  return { current, delta };
}

function computeBodyMetrics(checkIns: CheckInRecord[]): BodyMetrics {
  return {
    weight: extractMetric(checkIns, 'weight'),
    waist: extractMetric(checkIns, 'waist'),
    steps: extractMetric(checkIns, 'steps'),
    sleepHours: extractMetric(checkIns, 'sleepHours'),
    stuckToDiet: checkIns[0]?.stuckToDiet ?? null,
  };
}

function BodyMetricsSection({ metrics }: { metrics: BodyMetrics }) {
  const cells = [
    { label: 'Weight', value: metrics.weight.current, unit: 'kg', delta: metrics.weight.delta },
    { label: 'Waist', value: metrics.waist.current, unit: 'cm', delta: metrics.waist.delta },
    { label: 'Steps', value: metrics.steps.current, unit: '', delta: metrics.steps.delta },
    { label: 'Sleep', value: metrics.sleepHours.current, unit: 'hrs', delta: metrics.sleepHours.delta },
  ];
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Body Metrics
      </div>
      <div className="grid grid-cols-2 gap-px bg-foreground/5 sm:grid-cols-4">
        {cells.map(({ label, value, unit, delta }) => (
          <div key={label} className="bg-card px-3 py-3">
            <div className="text-[10px] text-foreground/40 uppercase tracking-wider">{label}</div>
            <div className="text-base font-bold mt-0.5 tabular-nums">
              {value !== null ? (
                <>
                  {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value?.toLocaleString()}
                  {unit && <span className="text-xs text-foreground/40 font-normal ml-0.5">{unit}</span>}
                </>
              ) : (
                '—'
              )}
            </div>
            {delta !== null && (
              <div className={`text-[10px] mt-0.5 ${delta < 0 ? 'text-emerald-400' : 'text-foreground/40'}`}>
                {delta > 0 ? `+${delta}` : delta}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── History List ─────────────────────────────────────────────────────────────

const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
const DIET_COLOUR: Record<string, string> = {
  yes: 'bg-emerald-400/10 text-emerald-400',
  no: 'bg-red-400/10 text-red-400',
  partial: 'bg-amber-400/10 text-amber-400',
};

function HistoryList({ checkIns, totalCount }: { checkIns: CheckInRecord[]; totalCount: number }) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-foreground/5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">History</span>
        {totalCount > 5 && (
          <Link to="/member/check-in/history" className="text-[11px] text-foreground/65 hover:text-foreground">
            View all {totalCount} →
          </Link>
        )}
      </div>
      {checkIns.length === 0 ? (
        <div className="px-4 py-6 text-center text-[13px] text-foreground/65">No check-ins yet</div>
      ) : (
        checkIns.map((c) => (
          <Link
            key={c._id}
            to={`/member/check-in/${c._id}`}
            className="flex items-center gap-3 px-4 py-3 border-b border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors last:border-b-0"
          >
            <div className="min-w-[80px]">
              <div className="text-sm font-medium">{formatDate(c.submittedAt)}</div>
              <div className="text-[10px] text-foreground/30">
                {formatDistanceAgo(c.submittedAt)}
              </div>
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
            <span className="text-foreground/20 text-sm">›</span>
          </Link>
        ))
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MemberCheckInDashboardPage() {
  const { checkIns, hasThisWeek, isLoading, fetchHistory } = useMemberCheckInStore();

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const achievements = useMemo(() => computeAchievements(checkIns), [checkIns]);
  const bodyMetrics = useMemo(() => computeBodyMetrics(checkIns), [checkIns]);
  const heatmap = useMemo(() => computeHeatmap(checkIns), [checkIns]);

  const latestCheckIn = checkIns[0] ?? null;
  const thisWeekCheckIn = hasThisWeek ? latestCheckIn : null;
  const recentFive = checkIns.slice(0, 5);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Check-In Dashboard" subtitle="Weekly progress tracking" />
        <div className="px-4 sm:px-8 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Check-In Dashboard" subtitle="Weekly progress tracking" />
      <div className="px-4 sm:px-8 py-6 max-w-[1200px] mx-auto">
        <AchievementCards achievements={achievements} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3.5 items-start">
          {/* Left column */}
          <div className="flex flex-col gap-3.5 order-2 lg:order-1">
            <WellnessBreakdown checkIn={latestCheckIn} />
            <BodyMetricsSection metrics={bodyMetrics} />
            <HistoryList checkIns={recentFive} totalCount={checkIns.length} />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3.5 order-1 lg:order-2">
            <ThisWeekCard
              hasThisWeek={hasThisWeek}
              heatmap={heatmap}
              submittedDate={
                thisWeekCheckIn
                  ? formatDateShort(thisWeekCheckIn.submittedAt)
                  : undefined
              }
              avgWellness={thisWeekCheckIn ? avgWellnessScore(thisWeekCheckIn) : undefined}
              weight={thisWeekCheckIn?.weight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
