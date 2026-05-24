'use client';

import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';

interface MemberHeatmapClientProps {
  heatmapData: { date: string }[];
}

function buildHeatmapWeeks(activeDates: Set<string>): {
  monthLabel: string | null;
  weekKey: string;
  days: { inRange: boolean; hasSession: boolean }[];
}[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysSinceMonday);

  const startMonday = new Date(thisMonday);
  startMonday.setDate(thisMonday.getDate() - 12 * 7);

  const since = new Date(today);
  since.setDate(today.getDate() - 90);

  const weeks: { monthLabel: string | null; weekKey: string; days: { inRange: boolean; hasSession: boolean }[] }[] = [];
  let prevMonth = -1;

  for (let w = 0; w < 13; w++) {
    const weekMonday = new Date(startMonday);
    weekMonday.setDate(startMonday.getDate() + w * 7);

    const month = weekMonday.getMonth();
    const monthLabel =
      month !== prevMonth
        ? weekMonday.toLocaleDateString('en-US', { month: 'short' })
        : null;
    prevMonth = month;

    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekMonday);
      date.setDate(weekMonday.getDate() + d);
      const inRange = date >= since && date <= today;
      const y = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const d2 = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mo}-${d2}`;
      days.push({ inRange, hasSession: inRange && activeDates.has(dateStr) });
    }
    weeks.push({ monthLabel, weekKey: weekMonday.toISOString(), days });
  }

  return weeks;
}

export function MemberHeatmapClient({ heatmapData }: MemberHeatmapClientProps) {
  const activeDates = new Set(heatmapData.map((d) => d.date));
  const weeks = buildHeatmapWeeks(activeDates);
  const totalSessions = activeDates.size;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65">
          Training Frequency
        </div>
        <span className="text-xs text-foreground/65 tabular-nums">
          {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'} · last 90 days
        </span>
      </div>
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <div className="flex flex-col gap-1 mr-1">
            <div className="h-3" />
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
              <div
                key={`${label}-${i}`}
                className="size-3 flex items-center justify-center text-[9px] text-foreground/65"
              >
                {label}
              </div>
            ))}
          </div>
          <motion.div
            className="contents"
            variants={variants.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {weeks.map((week) => (
              <motion.div key={week.weekKey} variants={variants.staggerItem} className="flex flex-col gap-1">
                <div className="h-3 text-[9px] text-foreground/65 whitespace-nowrap">
                  {week.monthLabel ?? ''}
                </div>
                {week.days.map((day, di) => (
                  <div
                    key={`${week.weekKey}-${di}`}
                    className={`size-3 rounded-[2px] ${
                      day.hasSession
                        ? 'bg-emerald-500'
                        : day.inRange
                          ? 'bg-muted/30'
                          : 'bg-transparent'
                    }`}
                  />
                ))}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
