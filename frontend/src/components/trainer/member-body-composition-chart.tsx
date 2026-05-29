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
import type { BodyTest } from '@/api/body-tests';

interface ChartPoint {
  date: string;
  weight: number;
  bodyFatPct: number;
}

function buildChartPoints(bodyTests: BodyTest[]): ChartPoint[] {
  return [...bodyTests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-8)
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      weight: parseFloat(t.weight.toFixed(1)),
      bodyFatPct: parseFloat(t.bodyFatPct.toFixed(1)),
    }));
}

interface MemberBodyCompositionChartProps {
  bodyTests: BodyTest[];
}

export function MemberBodyCompositionChart({ bodyTests }: MemberBodyCompositionChartProps) {
  const points = buildChartPoints(bodyTests);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Body Composition
      </p>
      {points.length < 2 ? (
        <div className="flex h-[100px] items-center justify-center">
          <p className="text-[11px] text-foreground/65">
            Add body tests to see the trend
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="weight"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="bf"
              orientation="right"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'oklch(0.07 0 0)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
              formatter={(v: string) => (
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{v}</span>
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
      )}
    </div>
  );
}
