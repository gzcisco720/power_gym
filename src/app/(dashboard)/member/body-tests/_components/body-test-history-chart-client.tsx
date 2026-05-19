'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface ChartPoint {
  date: string;
  Weight: number;
  'Body Fat': number;
}

interface Props {
  chartData: ChartPoint[];
}

export function BodyTestHistoryChart({ chartData }: Props) {
  return (
    <ResponsiveContainer width="100%" height={208}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'rgba(255,255,255,.3)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="weight"
          orientation="left"
          unit="kg"
          tick={{ fontSize: 10, fill: 'rgba(255,255,255,.3)' }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <YAxis
          yAxisId="bf"
          orientation="right"
          unit="%"
          tick={{ fontSize: 10, fill: 'rgba(255,255,255,.3)' }}
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
          labelStyle={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}
          itemStyle={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}
        />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="Weight"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#10b981' }}
        />
        <Line
          yAxisId="bf"
          type="monotone"
          dataKey="Body Fat"
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
