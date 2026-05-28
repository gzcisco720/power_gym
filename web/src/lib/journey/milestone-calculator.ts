import type { MilestoneTag } from '@/lib/types/journey';

export interface BodyTestSnapshot {
  date: Date;
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  targetBodyFatPct: number | null;
  targetWeight: number | null;
}

export interface MilestoneTrigger {
  type: 'goal_reached' | 'significant_change' | 'personal_best' | 'time_milestone' | 'checkin_streak';
  label: string;
  color: MilestoneTag['color'];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * MS_PER_DAY;
const TIME_ANNIVERSARIES_MONTHS = [3, 6, 12];
const STREAK_THRESHOLDS = [30, 60, 100];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function evaluateMilestone(
  index: number,
  tests: BodyTestSnapshot[],
  checkInDates: Date[],         // all check-in dates, sorted ascending
): MilestoneTrigger[] {
  const triggers: MilestoneTrigger[] = [];
  const test = tests[index];
  const prev = index > 0 ? tests[index - 1] : null;
  const earlier = tests.slice(0, index);

  // ── Time milestone ──────────────────────────────────────────
  if (index === 0) {
    triggers.push({ type: 'time_milestone', label: 'Journey begins', color: 'indigo' });
  } else {
    const firstDate = tests[0].date;
    for (const months of TIME_ANNIVERSARIES_MONTHS) {
      const anniversary = addMonths(firstDate, months);
      if (Math.abs(test.date.getTime() - anniversary.getTime()) <= SEVEN_DAYS_MS) {
        triggers.push({ type: 'time_milestone', label: `${months === 12 ? '1-year' : `${months}-month`} milestone`, color: 'indigo' });
        break;
      }
    }
  }

  // ── Goal reached ────────────────────────────────────────────
  if (test.targetBodyFatPct !== null && test.bodyFatPct <= test.targetBodyFatPct) {
    const alreadyReached = earlier.some(
      t => t.targetBodyFatPct !== null && t.bodyFatPct <= t.targetBodyFatPct,
    );
    if (!alreadyReached) {
      triggers.push({ type: 'goal_reached', label: '🎯 Body fat goal reached', color: 'gold' });
    }
  }
  if (test.targetWeight !== null && test.weight <= test.targetWeight) {
    const alreadyReached = earlier.some(
      t => t.targetWeight !== null && t.weight <= t.targetWeight,
    );
    if (!alreadyReached) {
      triggers.push({ type: 'goal_reached', label: '🎯 Weight goal reached', color: 'gold' });
    }
  }

  // ── Significant change ──────────────────────────────────────
  if (prev) {
    if (prev.bodyFatPct - test.bodyFatPct >= 1.0) {
      triggers.push({ type: 'significant_change', label: `⬇ Body fat −${(prev.bodyFatPct - test.bodyFatPct).toFixed(1)}%`, color: 'green' });
    }
    if (Math.abs(test.weight - prev.weight) >= 2.0) {
      triggers.push({ type: 'significant_change', label: `Weight change ${Math.abs(test.weight - prev.weight).toFixed(1)} kg`, color: 'green' });
    }
  }

  // ── Personal best ───────────────────────────────────────────
  const lowestBf = earlier.length > 0 ? Math.min(...earlier.map(t => t.bodyFatPct)) : Infinity;
  if (test.bodyFatPct < lowestBf) {
    triggers.push({ type: 'personal_best', label: '🥇 All-time low body fat', color: 'indigo' });
  }
  const highestLean = earlier.length > 0 ? Math.max(...earlier.map(t => t.leanMassKg)) : -Infinity;
  if (test.leanMassKg > highestLean) {
    triggers.push({ type: 'personal_best', label: '🏅 All-time high lean mass', color: 'indigo' });
  }

  // ── Check-in streak ─────────────────────────────────────────
  // Fire when the Nth check-in (index N-1) falls within ±7 days of the test.
  const streakDates = STREAK_THRESHOLDS.flatMap((n) =>
    checkInDates.length >= n ? [{ count: n, date: checkInDates[n - 1] }] : [],
  );
  const nearbyStreaks = streakDates.filter(
    ({ date }) => Math.abs(date.getTime() - test.date.getTime()) <= SEVEN_DAYS_MS,
  );
  const matchingStreak = nearbyStreaks.length > 0
    ? nearbyStreaks.reduce((best, s) => s.count > best.count ? s : best)
    : undefined;
  if (matchingStreak) {
    triggers.push({ type: 'checkin_streak', label: `✅ ${matchingStreak.count} check-in streak`, color: 'green' });
  }

  return triggers;
}

const EMOJI_PRIORITY: MilestoneTrigger['type'][] = [
  'goal_reached', 'time_milestone', 'personal_best', 'significant_change', 'checkin_streak',
];

export function selectEmoji(triggers: MilestoneTrigger[]): string {
  const map: Record<MilestoneTrigger['type'], string> = {
    goal_reached: '🏆',
    time_milestone: '🌟',
    personal_best: '🥇',
    significant_change: '⬇️',
    checkin_streak: '✅',
  };
  const top = EMOJI_PRIORITY.find(p => triggers.some(t => t.type === p));
  return top ? map[top] : '⭐';
}

export function buildMilestoneTitle(triggers: MilestoneTrigger[]): string {
  const top = EMOJI_PRIORITY.find(p => triggers.some(t => t.type === p));
  switch (top) {
    case 'goal_reached': return 'Goal achieved';
    case 'time_milestone': return triggers.find(t => t.type === 'time_milestone')!.label;
    case 'personal_best': return 'New personal record';
    case 'significant_change': return 'Significant progress';
    case 'checkin_streak': return triggers.find(t => t.type === 'checkin_streak')!.label;
    default: return 'Milestone';
  }
}
