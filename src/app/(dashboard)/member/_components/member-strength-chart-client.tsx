'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ExerciseHistory {
  exerciseName: string;
  points: { date: string; ts: number; oneRM: number }[];
}

interface Props {
  exercises: ExerciseHistory[];
}

type ChartRow = { date: string; ts: number } & Record<string, number>;

// Merge per-exercise point arrays into a flat array keyed by date, sorted chronologically
function mergePoints(exercises: ExerciseHistory[]): Omit<ChartRow, 'ts'>[] {
  const byDate = new Map<string, ChartRow>();
  for (const ex of exercises) {
    for (const p of ex.points) {
      const row = byDate.get(p.date) ?? { date: p.date, ts: p.ts };
      row[ex.exerciseName] = p.oneRM;
      byDate.set(p.date, row);
    }
  }
  return Array.from(byDate.values())
    .sort((a, b) => a.ts - b.ts)
    .map((row) => {
      const { ts, ...rest } = row;
      void ts;
      return rest;
    });
}

const LINE_COLORS = ['#6366f1', '#f59e0b', '#ec4899'] as const;

export function MemberStrengthChartClient({ exercises }: Props) {
  const hasData = exercises.some((e) => e.points.length >= 2);

  if (!hasData) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <p className="text-[11px] text-foreground/65">
          Complete workouts to track your strength
        </p>
      </div>
    );
  }

  const data = mergePoints(exercises);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: 'rgba(255,255,255,.5)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
          formatter={(v) => (
            <span style={{ color: 'rgba(255,255,255,.4)' }}>{v}</span>
          )}
        />
        {exercises.map((ex, i) => (
          <Line
            key={ex.exerciseName}
            type="monotone"
            dataKey={ex.exerciseName}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={i === 0 ? 2 : 1.5}
            strokeDasharray={i > 0 ? '4 2' : undefined}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
