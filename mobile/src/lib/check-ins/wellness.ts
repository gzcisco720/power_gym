import { CheckIn } from '../../types/check-ins';

const WELLNESS_FIELDS: { key: keyof CheckIn; label: string; inverted: boolean }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality', inverted: false },
  { key: 'energy', label: 'Energy', inverted: false },
  { key: 'recovery', label: 'Recovery', inverted: false },
  { key: 'stress', label: 'Stress ↓', inverted: true },
  { key: 'fatigue', label: 'Fatigue ↓', inverted: true },
  { key: 'hunger', label: 'Hunger', inverted: false },
  { key: 'digestion', label: 'Digestion', inverted: false },
];

/** ISO week number (Monday-based) for a given date. */
function isoWeekKey(iso: string): string {
  const d = new Date(iso);
  // Shift to Monday-based week: getDay() is 0=Sun..6=Sat
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD of Monday
}

/**
 * Returns the number of consecutive check-in weeks counting back from the
 * most-recent check-in's week. A gap of even one week breaks the streak.
 *
 * Assumes `items` is sorted newest-first (as stored in check-ins.store).
 */
export function computeCheckInStreakWeeks(items: CheckIn[]): number {
  if (items.length === 0) return 0;

  // Collect unique week keys in submission order (newest first)
  const weeks = [...new Set(items.map((c) => isoWeekKey(c.submittedAt)))];

  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    const prev = new Date(weeks[i - 1]);
    const curr = new Date(weeks[i]);
    // Each consecutive week should be exactly 7 days earlier
    const diff = Math.round((prev.getTime() - curr.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Returns 7 labeled wellness values from a single check-in.
 * `inverted: true` means a lower value is healthier (stress, fatigue).
 */
export function wellnessBreakdown(checkIn: CheckIn): { label: string; value: number; inverted: boolean }[] {
  return WELLNESS_FIELDS.map(({ key, label, inverted }) => ({
    label,
    value: checkIn[key] as number,
    inverted,
  }));
}

/**
 * Returns the most recent check-in that has at least one non-null body metric,
 * or null if none exist.
 *
 * Body metrics: weight, waist, steps, exerciseMinutes, walkRunDistance, sleepHours.
 */
export function latestWithBodyMetrics(items: CheckIn[]): CheckIn | null {
  return (
    items.find(
      (c) =>
        c.weight !== null ||
        c.waist !== null ||
        c.steps !== null ||
        c.exerciseMinutes !== null ||
        c.walkRunDistance !== null ||
        c.sleepHours !== null,
    ) ?? null
  );
}

/**
 * Returns up to `max` photos from the most recent check-ins, flattened in
 * newest-first order (check-ins are assumed to be sorted newest-first).
 */
export function latestPhotos(items: CheckIn[], max: number): string[] {
  const all = items.flatMap((c) => c.photos);
  return all.slice(0, max);
}

/** Returns the average wellness score (0–10) for a check-in, rounded to 1dp.
 * stress and fatigue are inverted (10-x) so higher stress/fatigue lowers the score. */
export function wellnessAvg(checkIn: CheckIn): string {
  const sum =
    checkIn.sleepQuality +
    checkIn.energy +
    checkIn.recovery +
    (10 - checkIn.stress) +
    (10 - checkIn.fatigue) +
    checkIn.hunger +
    checkIn.digestion;
  return (sum / 7).toFixed(1);
}

export interface Achievements {
  weightLost: number | null;
  weightFirst: number | null;
  weightLatest: number | null;
  currentStreak: number;
  totalCheckIns: number;
  dietStreak: number;
}

/** Computes achievement stats from a newest-first list of check-ins. */
export function computeAchievements(items: CheckIn[]): Achievements {
  const totalCheckIns = items.length;

  const withWeight = items.filter((c) => c.weight !== null);
  const weightLatest = withWeight[0]?.weight ?? null;
  const weightFirst = withWeight[withWeight.length - 1]?.weight ?? null;
  const weightLost =
    weightFirst !== null && weightLatest !== null && weightFirst > weightLatest
      ? Math.round((weightFirst - weightLatest) * 10) / 10
      : null;

  const currentStreak = computeCheckInStreakWeeks(items);

  let dietStreak = 0;
  for (const c of items) {
    if (c.stuckToDiet === 'yes') dietStreak++;
    else break;
  }

  return { weightLost, weightFirst, weightLatest, currentStreak, totalCheckIns, dietStreak };
}

export interface ConsistencyCell {
  weekStart: string;
  hasCheckIn: boolean;
  isCurrentWeek: boolean;
}

/** Returns the last `weeks` weeks of check-in consistency cells, oldest-first.
 * Uses Monday-based weeks. */
export function computeConsistencyHeatmap(items: CheckIn[], weeks = 16): ConsistencyCell[] {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(now);
  currentMonday.setUTCDate(now.getUTCDate() + diffToMonday);
  currentMonday.setUTCHours(0, 0, 0, 0);

  const checkedInWeeks = new Set(items.map((c) => isoWeekKey(c.submittedAt)));

  const cells: ConsistencyCell[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setUTCDate(currentMonday.getUTCDate() - i * 7);
    const weekKey = monday.toISOString().slice(0, 10);
    cells.push({
      weekStart: weekKey,
      hasCheckIn: checkedInWeeks.has(weekKey),
      isCurrentWeek: i === 0,
    });
  }
  return cells;
}
