import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';

export function resolveDayType(schedule: ISchedule, dateISO: string, startDateISO: string): string | null {
  const override = schedule.calendarOverrides.find((o) => o.date === dateISO);
  if (override) return override.dayTypeName;

  if (schedule.weeklyPattern.length === 0) return null;

  const targetDate = new Date(`${dateISO}T00:00:00Z`);
  const startDate = new Date(`${startDateISO}T00:00:00Z`);
  const daysSinceStart = Math.floor((targetDate.getTime() - startDate.getTime()) / 86400000);

  if (daysSinceStart < 0) return null;
  if (!schedule.iterate && daysSinceStart >= 7) return null;

  const dayOfWeek = targetDate.getUTCDay();
  const entry = schedule.weeklyPattern.find((w) => w.dayOfWeek === dayOfWeek);
  return entry?.dayTypeName ?? null;
}
