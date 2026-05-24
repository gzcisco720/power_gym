'use client';

// oxlint-disable-next-line react-doctor/prefer-dynamic-import
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

interface Point {
  date: string;
  weight: number;
  bodyFatPct: number;
}

interface Props {
  points: Point[];
}

export function MemberBodyChartClient({ points }: Props) {
  if (points.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <p className="text-[11px] text-foreground/65">
          Add body tests to see your trend
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="weight"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <YAxis
          yAxisId="bf"
          orientation="right"
          tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
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
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          name="Weight (kg)"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#10b981' }}
        />
        <Line
          yAxisId="bf"
          type="monotone"
          dataKey="bodyFatPct"
          name="Body Fat %"
          stroke="#ec4899"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3, fill: '#ec4899' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
