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
