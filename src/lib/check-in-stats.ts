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

type NumericField = 'weight' | 'waist' | 'steps' | 'sleepHours' | 'exerciseMinutes';

function extractMetric(checkIns: CheckInRecord[], field: NumericField): BodyMetricData {
  const withData = checkIns.filter(c => c[field] !== null);
  const current = (withData[0]?.[field] as number) ?? null;
  const prev = withData.length > 1 ? (withData[withData.length - 1][field] as number) : null;
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
