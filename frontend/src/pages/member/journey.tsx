import { useEffect } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { useProgressStore } from '@/stores/progressStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { variants } from '@/lib/animations/variants';
import { type OneRepMaxTrendPoint } from '@/api/progress';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function buildChartData(trendData: OneRepMaxTrendPoint[]): { date: string; [exercise: string]: string | number }[] {
  const map: Record<string, Record<string, number>> = {};
  for (const point of trendData) {
    const date = point.achievedAt.slice(0, 10);
    map[date] = map[date] ?? {};
    map[date][point.exerciseName] = point.estimatedOneRM;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));
}

function SkeletonChart() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-32 animate-pulse rounded bg-card ring-1 ring-foreground/10" />
      <div className="h-[260px] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
    </div>
  );
}

export function MemberJourneyPage() {
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const { trend, isLoading, fetchTrend } = useProgressStore();

  const memberId = user?.id ?? '';
  const trendData = trend[memberId] ?? [];

  useEffect(() => {
    if (memberId) void fetchTrend(memberId);
  }, [memberId, fetchTrend]);

  const exerciseNames = [...new Set(trendData.map((p) => p.exerciseName))];
  const chartData = buildChartData(trendData);

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="My Journey" subtitle="1RM progress over time" />
      <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto">
        {isLoading && <SkeletonChart />}

        {!isLoading && trendData.length === 0 && (
          <EmptyState
            heading="No 1RM data yet"
            description="Complete training sessions to start tracking your 1RM progress over time."
          />
        )}

        {!isLoading && trendData.length > 0 && (
          <m.div
            className="space-y-4"
            variants={shouldReduceMotion ? undefined : variants.fadeSlideUp}
            initial="hidden"
            animate="visible"
          >
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                1RM Trend
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
                    tickLine={false}
                    axisLine={false}
                    unit=" kg"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.07 0 0)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.65)' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}
                  />
                  {exerciseNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={COLORS[i % COLORS.length]}
                      dot={false}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Exercise selector / legend detail */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-2">
                Exercises tracked
              </p>
              <div className="flex flex-wrap gap-2">
                {exerciseNames.map((name, i) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-foreground/[0.06] text-xs text-foreground/80"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </m.div>
        )}
      </div>
    </LazyMotion>
  );
}
