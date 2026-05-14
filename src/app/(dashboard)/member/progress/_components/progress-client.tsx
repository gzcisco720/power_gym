'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { SectionHeader } from '@/components/shared/section-header';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { variants } from '@/lib/animations/variants';

interface ProgressClientProps {
  heatmapData: { date: string }[];
  exercises: { exerciseId: string; exerciseName: string }[];
  memberId: string;
  title?: string;
}

interface HistoryPoint {
  date: string;
  estimatedOneRM: number;
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

export function ProgressClient({
  heatmapData,
  exercises,
  memberId,
  title,
}: ProgressClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.exerciseId ?? '');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedExerciseId) return;
    async function loadHistory() {
      setLoading(true);
      try {
        const r = await fetch(`/api/progress/${memberId}?exerciseId=${selectedExerciseId}`);
        if (!r.ok) throw new Error('Failed to fetch');
        const data = (await r.json()) as { history: HistoryPoint[] };
        setHistory(data.history ?? []);
      } catch {
        toast.error('Failed to load exercise history');
      } finally {
        setLoading(false);
      }
    }
    void loadHistory();
  }, [selectedExerciseId, memberId]);

  const activeDates = new Set(heatmapData.map((d) => d.date));
  const weeks = buildHeatmapWeeks(activeDates);

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    estimatedOneRM: h.estimatedOneRM,
  }));

  const totalSessions = activeDates.size;

  return (
    <div>
      {title && <PageHeader title={title} />}
      <div className="space-y-8 py-6">
        <section className="px-4 sm:px-8">
          <div className="flex items-baseline justify-between">
            <SectionHeader title="Training Frequency" />
            <span className="text-xs text-foreground/65 tabular-nums">
              {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'} · last 90 days
            </span>
          </div>
          <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              <div className="flex flex-col gap-1 mr-1">
                <div className="h-3" />
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                  <div
                    key={`${label}-${i}`}
                    className="h-3 w-3 flex items-center justify-center text-[9px] text-foreground/65"
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
                      className={`w-3 h-3 rounded-[2px] ${
                        day.hasSession
                          ? 'bg-emerald-500'
                          : day.inRange
                            ? 'bg-muted'
                            : 'bg-transparent'
                      }`}
                    />
                  ))}
                </motion.div>
              ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-8">
          <SectionHeader title="Strength Progress" />
          {exercises.length === 0 ? (
            <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4">
              <p className="text-sm text-foreground/65">No exercise history yet.</p>
            </div>
          ) : (
            <motion.div
              className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3"
              variants={variants.fadeSlideUp}
              initial="hidden"
              animate="visible"
            >
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                aria-label="Select exercise"
                className="rounded-md bg-muted border border-border/60 px-3 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {exercises.map((ex) => (
                  <option key={ex.exerciseId} value={ex.exerciseId}>
                    {ex.exerciseName}
                  </option>
                ))}
              </select>

              <div className={`transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {chartData.length === 0 ? (
                  <p className="text-sm text-foreground/65 text-center py-8">
                    No history yet for this exercise.
                  </p>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: 'currentColor' }}
                          className="text-foreground/65"
                          stroke="currentColor"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'currentColor' }}
                          className="text-foreground/65"
                          stroke="currentColor"
                          unit=" kg"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                          labelStyle={{ color: 'var(--muted-foreground)', fontSize: 10 }}
                          itemStyle={{ color: 'var(--foreground)', fontSize: 11 }}
                          formatter={(value) => [`${value ?? ''} kg`, 'Est. 1RM']}
                        />
                        <Line
                          type="monotone"
                          dataKey="estimatedOneRM"
                          stroke="rgb(16 185 129)"
                          strokeWidth={2}
                          dot={{ fill: 'rgb(16 185 129)', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
