import type { WorkoutSession } from '@/api/training';

/**
 * Count completed sessions whose completedAt falls within the last `days` days.
 * `referenceNow` defaults to the current time and is injectable for testing.
 */
export function countInWindow(
  sessions: WorkoutSession[],
  days: number,
  referenceNow: Date = new Date(),
): number {
  const cutoff = new Date(referenceNow);
  cutoff.setDate(cutoff.getDate() - days);

  return sessions.filter((s) => {
    if (!s.completedAt) return false;
    const completedDate = new Date(s.completedAt);
    return completedDate >= cutoff && completedDate <= referenceNow;
  }).length;
}

interface FrequencyBucket {
  weekStart: Date;
  count: number;
}

/**
 * Return an array of 14 weekly buckets covering the trailing 14 weeks (oldest first).
 * Each bucket has the Monday of the week and a count of completed sessions in that week.
 * `referenceNow` defaults to the current time and is injectable for testing.
 */
export function frequencyBuckets(
  sessions: WorkoutSession[],
  referenceNow: Date = new Date(),
): FrequencyBucket[] {
  // Find the Monday of the week containing referenceNow
  const ref = new Date(referenceNow);
  ref.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = ref.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekMonday = new Date(ref);
  currentWeekMonday.setUTCDate(ref.getUTCDate() - daysToMonday);

  // Build 14 buckets: index 0 = oldest (13 weeks ago), index 13 = current week
  const buckets: FrequencyBucket[] = Array.from({ length: 14 }, (_, i) => {
    const weekStart = new Date(currentWeekMonday);
    weekStart.setUTCDate(currentWeekMonday.getUTCDate() - (13 - i) * 7);
    return { weekStart, count: 0 };
  });

  const completed = sessions.filter((s) => s.completedAt !== null);

  for (const session of completed) {
    const sessionDate = new Date(session.completedAt!);
    sessionDate.setUTCHours(0, 0, 0, 0);
    // Find Monday of this session's week
    const dow = sessionDate.getUTCDay();
    const daysBack = dow === 0 ? 6 : dow - 1;
    const sessionMonday = new Date(sessionDate);
    sessionMonday.setUTCDate(sessionDate.getUTCDate() - daysBack);

    // Find which bucket this falls into
    const bucketIndex = buckets.findIndex(
      (b) => b.weekStart.getTime() === sessionMonday.getTime(),
    );
    if (bucketIndex !== -1) {
      buckets[bucketIndex].count++;
    }
  }

  return buckets;
}

/**
 * Return the most recently completed session, or null if none exist.
 */
export function lastSession(sessions: WorkoutSession[]): WorkoutSession | null {
  const completed = sessions.filter((s) => s.completedAt !== null);
  if (completed.length === 0) return null;

  return completed.reduce((latest, s) => {
    const latestTime = new Date(latest.completedAt!).getTime();
    const currentTime = new Date(s.completedAt!).getTime();
    return currentTime > latestTime ? s : latest;
  });
}
