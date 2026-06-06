import { CheckIn } from '../../types/check-ins';

const WELLNESS_FIELDS: { key: keyof CheckIn; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'energy', label: 'Energy' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'digestion', label: 'Digestion' },
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
 */
export function wellnessBreakdown(checkIn: CheckIn): { label: string; value: number }[] {
  return WELLNESS_FIELDS.map(({ key, label }) => ({
    label,
    value: checkIn[key] as number,
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

/** Returns the average wellness score (0–10) for a check-in, rounded to 1dp. */
export function wellnessAvg(checkIn: CheckIn): string {
  const sum =
    checkIn.sleepQuality +
    checkIn.energy +
    checkIn.recovery +
    checkIn.stress +
    checkIn.fatigue +
    checkIn.hunger +
    checkIn.digestion;
  return (sum / 7).toFixed(1);
}
