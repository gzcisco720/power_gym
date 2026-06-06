/**
 * Returns a "mm:ss" string representing elapsed time between startedAt ISO string
 * and the given now Date. Negative differences are clamped to 0.
 */
export function formatElapsed(startedAtISO: string, now: Date): string {
  const totalSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(startedAtISO).getTime()) / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
