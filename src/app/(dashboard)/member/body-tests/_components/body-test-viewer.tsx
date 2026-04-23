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

interface BodyTestRecord {
  _id: string;
  date: string;
  protocol: '3site' | '7site' | '9site' | 'other';
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

interface Props {
  tests: BodyTestRecord[];
}

export function BodyTestViewer({ tests }: Props) {
  if (tests.length === 0) {
    return <p className="text-muted-foreground">暂无体测记录</p>;
  }

  const chartData = [...tests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      体重: t.weight,
      体脂率: parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">趋势图表</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="weight" orientation="left" unit="kg" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="bf" orientation="right" unit="%" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="weight" type="monotone" dataKey="体重" stroke="#2563eb" dot />
              <Line yAxisId="bf" type="monotone" dataKey="体脂率" stroke="#dc2626" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">历史记录</h2>
        <div className="space-y-3">
          {tests.map((t) => (
            <div key={t._id} className="rounded-lg border p-4">
              <p className="font-medium">{new Date(t.date).toLocaleDateString('zh-CN')}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">体重</span>
                  <span className="ml-2 font-medium">{t.weight} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground">体脂率</span>
                  <span className="ml-2 font-medium">{t.bodyFatPct.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">瘦体重</span>
                  <span className="ml-2 font-medium">{t.leanMassKg.toFixed(1)} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground">脂肪量</span>
                  <span className="ml-2 font-medium">{t.fatMassKg.toFixed(1)} kg</span>
                </div>
              </div>
              {(t.targetWeight ?? t.targetBodyFatPct) && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <p className="text-muted-foreground font-medium mb-1">目标</p>
                  <div className="grid grid-cols-2 gap-2">
                    {t.targetWeight && (
                      <div>
                        <span className="text-muted-foreground">体重</span>
                        <span className="ml-2">{t.targetWeight} kg</span>
                        <span
                          className={`ml-2 text-xs ${t.weight - t.targetWeight > 0 ? 'text-destructive' : 'text-green-600'}`}
                        >
                          ({t.weight - t.targetWeight > 0 ? '+' : ''}
                          {(t.weight - t.targetWeight).toFixed(1)} kg)
                        </span>
                      </div>
                    )}
                    {t.targetBodyFatPct && (
                      <div>
                        <span className="text-muted-foreground">体脂率</span>
                        <span className="ml-2">{t.targetBodyFatPct}%</span>
                        <span
                          className={`ml-2 text-xs ${t.bodyFatPct - t.targetBodyFatPct > 0 ? 'text-destructive' : 'text-green-600'}`}
                        >
                          ({t.bodyFatPct - t.targetBodyFatPct > 0 ? '+' : ''}
                          {(t.bodyFatPct - t.targetBodyFatPct).toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
