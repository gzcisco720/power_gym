'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: { label: string; count: number }[];
}

export function TrainerSessionsChartClient({ data }: Props) {
  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-24 text-foreground/40 text-sm">
        No session data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={20}>
        <XAxis
          dataKey="label"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          itemStyle={{ color: '#a5b4fc' }}
          formatter={(v) => [`${v} sessions`, '']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === data.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.35)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
