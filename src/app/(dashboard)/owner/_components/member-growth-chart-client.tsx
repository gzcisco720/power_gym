'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: { label: string; newCount: number }[];
}

export function MemberGrowthChartClient({ data }: Props) {
  if (data.every((d) => d.newCount === 0)) {
    return (
      <div className="flex items-center justify-center h-24 text-foreground/40 text-sm">
        No member data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} barSize={20}>
        <XAxis
          dataKey="label"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          itemStyle={{ color: '#a5b4fc' }}
          formatter={(v) => [`${v} new`, 'Members']}
        />
        <Bar dataKey="newCount" radius={[4, 4, 0, 0]} cursor={{ fill: 'rgba(255,255,255,0.04)' }}>
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
