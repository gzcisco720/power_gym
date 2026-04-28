'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeader } from '@/components/shared/section-header';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
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
  const shouldReduce = useReducedMotion();

  if (tests.length === 0) {
    return (
      <div>
        <PageHeader title="Body Composition" />
        <div className="px-4 sm:px-8 py-28">
          <EmptyState
            heading="No body tests yet"
            description="Your trainer hasn't recorded a body composition test yet."
          />
        </div>
      </div>
    );
  }

  const sorted = [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0];

  const chartData = [...tests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Weight: t.weight,
      'Body Fat': parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  return (
    <div>
      <PageHeader title="Body Composition" />

      <div className="px-4 sm:px-8 py-7 space-y-7">
        {/* Latest stats */}
        <div>
          <SectionHeader title="Latest Results" />
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard label="Body Weight" value={String(latest.weight)} unit="kg" />
            <StatCard label="Body Fat" value={latest.bodyFatPct.toFixed(1)} unit="%" />
            <StatCard label="Lean Mass" value={latest.leanMassKg.toFixed(1)} unit="kg" />
            <StatCard label="Fat Mass" value={latest.fatMassKg.toFixed(1)} unit="kg" />
          </div>
        </div>

        {/* History chart — only when multiple tests */}
        {tests.length > 1 && (
          <div>
            <SectionHeader title="History" />
            <Card className="mt-3 bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#333' }} />
                    <YAxis yAxisId="weight" orientation="left" unit="kg" tick={{ fontSize: 10, fill: '#333' }} />
                    <YAxis yAxisId="bf" orientation="right" unit="%" tick={{ fontSize: 10, fill: '#333' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid #141414', borderRadius: 8 }}
                      labelStyle={{ color: '#666', fontSize: 10 }}
                      itemStyle={{ color: '#ccc', fontSize: 11 }}
                    />
                    <Line yAxisId="weight" type="monotone" dataKey="Weight" stroke="#fff" dot={{ fill: '#fff', r: 3 }} />
                    <Line yAxisId="bf" type="monotone" dataKey="Body Fat" stroke="#666" dot={{ fill: '#666', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* All tests list */}
        <div>
          <SectionHeader title="All Records" />
          <div className="mt-3 space-y-2">
            {sorted.map((t, i) => (
              <motion.div
                key={t._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: shouldReduce ? 0 : i * 0.04 }}
              >
                <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[12px] font-semibold text-white">
                      {new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-[2px] text-[#555]">
                      {t.protocol}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#777]">Weight</span>
                      <span className="text-[#888]">{t.weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#777]">Body Fat</span>
                      <span className="text-[#888]">{t.bodyFatPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#777]">Lean Mass</span>
                      <span className="text-[#888]">{t.leanMassKg.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#777]">Fat Mass</span>
                      <span className="text-[#888]">{t.fatMassKg.toFixed(1)} kg</span>
                    </div>
                  </div>
                  {(t.targetWeight ?? t.targetBodyFatPct) && (
                    <div className="mt-3 pt-3 border-t border-[#0f0f0f] text-[11px]">
                      <div className="text-[9px] font-semibold uppercase tracking-[2px] text-[#555] mb-1.5">
                        Goal
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {t.targetWeight && (
                          <div className="flex justify-between">
                            <span className="text-[#777]">Weight</span>
                            <span className={t.weight - t.targetWeight > 0 ? 'text-[#888]' : 'text-[#888]'}>
                              {t.targetWeight} kg
                            </span>
                          </div>
                        )}
                        {t.targetBodyFatPct && (
                          <div className="flex justify-between">
                            <span className="text-[#777]">Body Fat</span>
                            <span className={t.bodyFatPct - t.targetBodyFatPct > 0 ? 'text-[#888]' : 'text-[#888]'}>
                              {t.targetBodyFatPct}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
