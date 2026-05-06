import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';

export function resolveDayType(schedule: ISchedule, dateISO: string): string | null {
  const override = schedule.calendarOverrides.find((o) => o.date === dateISO);
  if (override) return override.dayTypeName;

  const dayOfWeek = new Date(`${dateISO}T00:00:00Z`).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const weekly = schedule.weeklyPattern.find((w) => w.dayOfWeek === dayOfWeek);
  return weekly?.dayTypeName ?? null;
}
