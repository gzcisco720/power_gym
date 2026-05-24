export function daysUntil(isoDate: string): number {
  const d = new Date(isoDate);
  const sessionMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((sessionMidnight.getTime() - todayMidnight.getTime()) / 86400000);
}
