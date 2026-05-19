'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeader } from '@/components/shared/section-header';
import { BodyTestImprovementAnimation } from '@/components/animations/body-test-improvement';
import { BodyTestHistoryChart } from './body-test-history-chart-client';

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
  const [showImprovement, setShowImprovement] = useState(() => {
    if (tests.length < 2) return false;
    const byDate = [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return byDate[0].bodyFatPct < byDate[1].bodyFatPct;
  });

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
  const previous = sorted.length > 1 ? sorted[1] : null;

  const chartData = [...tests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Weight: t.weight,
      'Body Fat': parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  return (
    <div>
      {showImprovement && previous && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs mx-4">
            <BodyTestImprovementAnimation
              metricLabel="Body Fat %"
              previousValue={`${previous.bodyFatPct.toFixed(1)}%`}
              currentValue={`${latest.bodyFatPct.toFixed(1)}%`}
              diffLabel={`↓ ${(previous.bodyFatPct - latest.bodyFatPct).toFixed(1)}% reduced`}
              onComplete={() => setShowImprovement(false)}
            />
          </div>
        </div>
      )}
      <PageHeader title="Body Composition" />

      <div className="px-4 sm:px-8 py-7 space-y-7">
        <div>
          <SectionHeader title="Latest Results" />
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard label="Body Weight" value={String(latest.weight)} unit="kg" />
            <StatCard label="Body Fat" value={latest.bodyFatPct.toFixed(1)} unit="%" />
            <StatCard label="Lean Mass" value={latest.leanMassKg.toFixed(1)} unit="kg" />
            <StatCard label="Fat Mass" value={latest.fatMassKg.toFixed(1)} unit="kg" />
          </div>
        </div>

        {tests.length > 1 && (
          <div>
            <SectionHeader title="History" />
            <div className="mt-3 bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
              <div className="h-52">
                <BodyTestHistoryChart chartData={chartData} />
              </div>
            </div>
          </div>
        )}

        <div>
          <SectionHeader title="All Records" />
          <div className="mt-3 space-y-2">
            {sorted.map((t, i) => (
              <motion.div
                key={t._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: shouldReduce ? 0 : i * 0.04 }}
                className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] font-semibold text-foreground">
                    {new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-foreground/40">
                    {t.protocol}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {[
                    { label: 'Weight', value: `${t.weight} kg` },
                    { label: 'Body Fat', value: `${t.bodyFatPct.toFixed(1)}%` },
                    { label: 'Lean Mass', value: `${t.leanMassKg.toFixed(1)} kg` },
                    { label: 'Fat Mass', value: `${t.fatMassKg.toFixed(1)} kg` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-foreground/40">{label}</span>
                      <span className="text-foreground/65">{value}</span>
                    </div>
                  ))}
                </div>
                {(t.targetWeight ?? t.targetBodyFatPct) && (
                  <div className="mt-3 pt-3 border-t border-foreground/[.06] text-[11px]">
                    <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-foreground/40 mb-1.5">
                      Goal
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {t.targetWeight && (
                        <div className="flex justify-between">
                          <span className="text-foreground/40">Weight</span>
                          <span className={t.weight <= t.targetWeight ? 'text-emerald-400' : 'text-foreground/65'}>
                            {t.targetWeight} kg
                          </span>
                        </div>
                      )}
                      {t.targetBodyFatPct && (
                        <div className="flex justify-between">
                          <span className="text-foreground/40">Body Fat</span>
                          <span className={t.bodyFatPct <= t.targetBodyFatPct ? 'text-emerald-400' : 'text-foreground/65'}>
                            {t.targetBodyFatPct}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
