import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProgressStore } from '@/stores/progressStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function MemberJourneyPage() {
  const user = useAuthStore((s) => s.user);
  const { trend, fetchTrend, isLoading } = useProgressStore();

  const memberId = user?.id ?? '';
  const trendData = trend[memberId] ?? [];

  useEffect(() => {
    if (memberId) void fetchTrend(memberId);
  }, [memberId, fetchTrend]);

  // Group trend points by exercise name for chart
  const exerciseNames = [...new Set(trendData.map((p) => p.exerciseName))];

  // Build chart data: one entry per date with each exercise as a key
  const chartDataMap: Record<string, Record<string, number>> = {};
  for (const point of trendData) {
    const date = point.achievedAt.slice(0, 10);
    chartDataMap[date] = chartDataMap[date] ?? {};
    chartDataMap[date][point.exerciseName] = point.estimatedOneRM;
  }
  const chartData = Object.entries(chartDataMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">My Journey</h1>

      {isLoading && <p className="text-sm text-foreground/65">Loading…</p>}

      {!isLoading && trendData.length === 0 && (
        <p className="text-sm text-foreground/65">
          No 1RM data yet. Complete sessions to track your progress.
        </p>
      )}

      {!isLoading && trendData.length > 0 && (
        <div>
          <p className="mb-4 text-sm text-foreground/65">1RM Trend</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.65)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.65)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)' }}
                labelStyle={{ color: 'rgba(255,255,255,0.65)' }}
              />
              <Legend />
              {exerciseNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
