import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
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
import { PageHeader } from '@/components/shared/page-header';
import { useAuthStore } from '@/stores/authStore';
import { fetchBodyTests } from '@/api/body-tests';
import type { BodyTestRecord } from '@/api/body-tests';
import { variants } from '@/lib/animations/variants';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTestDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sortByDateDesc(tests: BodyTestRecord[]): BodyTestRecord[] {
  return [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Chart ────────────────────────────────────────────────────────────────────

interface ChartPoint { date: string; weight: number; bodyFatPct: number }

function BodyCompositionChart({ points }: { points: ChartPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <p className="text-[11px] text-foreground/65">Add more tests to see your trend</p>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="weight" tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
        <YAxis yAxisId="bf" orientation="right" tick={{ fill: 'rgba(255,255,255,.3)', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'rgba(255,255,255,.5)' }}
        />
        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} formatter={(v) => <span style={{ color: 'rgba(255,255,255,.4)' }}>{v}</span>} />
        <Line yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#10b981' }} />
        <Line yAxisId="bf" type="monotone" dataKey="bodyFatPct" name="Body Fat %" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3, fill: '#ec4899' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Stat cells ───────────────────────────────────────────────────────────────

function SummaryCell({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold leading-none ${color}`}>
        {value}<span className="text-xs opacity-50 ml-0.5">{unit}</span>
      </div>
      <div className="mt-1.5 text-[9px] uppercase tracking-wider text-foreground/40">{label}</div>
    </div>
  );
}

function StatCell({ value, unit, label, color }: { value: string; unit: string; label: string; color: string }) {
  return (
    <div>
      <div className={`text-[13px] font-semibold leading-none ${color}`}>
        {value}<span className="text-[9px] opacity-50">{unit}</span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/40">{label}</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MemberBodyTestsPage() {
  const user = useAuthStore((s) => s.user);
  const shouldReduce = useReducedMotion();
  const [tests, setTests] = useState<BodyTestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchBodyTests(user.id)
      .then((data) => setTests(sortByDateDesc(data)))
      .catch(() => toast.error('Failed to load body tests'))
      .finally(() => setLoading(false));
  }, [user]);

  const latest = tests[0] ?? null;
  const prev = tests[1] ?? null;
  const bfChange = latest && prev ? latest.bodyFatPct - prev.bodyFatPct : null;

  const chartPoints = [...tests]
    .reverse()
    .map((t) => ({
      date: `${MONTHS[new Date(t.date).getMonth()]} ${new Date(t.date).getDate()}`,
      weight: parseFloat(t.weight.toFixed(1)),
      bodyFatPct: parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  const uniqueProtocols = new Set(tests.map((t) => t.protocol));
  const allSameProtocol = uniqueProtocols.size === 1;
  const PROTOCOL_LABELS: Record<string, string> = {
    '3site': '3-Site · Jackson-Pollock',
    '7site': '7-Site · Jackson-Pollock',
    '9site': '9-Site · Parrillo',
    other: 'Other',
  };
  const sharedProtocolLabel = allSameProtocol
    ? (PROTOCOL_LABELS[tests[0]!.protocol] ?? tests[0]!.protocol)
    : null;

  return (
    <div>
      <PageHeader
        title="Body Tests"
        subtitle={
          loading
            ? 'Loading...'
            : `${tests.length} record${tests.length !== 1 ? 's' : ''}${sharedProtocolLabel ? ` · ${sharedProtocolLabel}` : ''}`
        }
      />

      <div className="px-4 sm:px-8 py-7 space-y-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : tests.length === 0 ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-[15px] font-semibold">No body tests yet</p>
            <p className="text-[13px] text-foreground/65 mt-1">Your trainer hasn&apos;t recorded a body test yet.</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
                Body Composition Trend
              </div>
              <BodyCompositionChart points={chartPoints} />
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-4 gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
              <SummaryCell label="Latest Weight" value={String(latest!.weight)} unit="kg" color="text-foreground" />
              <SummaryCell label="Body Fat" value={latest!.bodyFatPct.toFixed(1)} unit="%" color="text-rose-400" />
              <SummaryCell label="Lean Mass" value={latest!.leanMassKg.toFixed(1)} unit="kg" color="text-sky-400" />
              <SummaryCell
                label="BF Change"
                value={bfChange !== null ? (bfChange > 0 ? `+${bfChange.toFixed(1)}` : bfChange.toFixed(1)) : '—'}
                unit={bfChange !== null ? '%' : ''}
                color={bfChange === null ? 'text-foreground/30' : bfChange > 0 ? 'text-rose-400' : 'text-emerald-400'}
              />
            </div>

            {/* History section */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
                History
              </div>
              <m.div
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                variants={variants.staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {tests.map((test) => (
                  <m.div
                    key={test._id}
                    variants={shouldReduce ? undefined : variants.staggerItem}
                    initial={shouldReduce ? { opacity: 1 } : undefined}
                  >
                    <div className="rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow p-4">
                      <div className="text-sm font-semibold text-foreground">
                        {formatTestDate(test.date)}
                      </div>
                      {!allSameProtocol && (
                        <div className="mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[10px] ring-1 bg-primary/10 text-primary-light ring-primary/20">
                          {PROTOCOL_LABELS[test.protocol] ?? test.protocol}
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-foreground/[.06] pt-3 text-center">
                        <StatCell value={String(test.weight)} unit="kg" label="Weight" color="text-foreground" />
                        <StatCell value={test.bodyFatPct.toFixed(1)} unit="%" label="BF" color="text-rose-400" />
                        <StatCell value={test.leanMassKg.toFixed(1)} unit="kg" label="Lean" color="text-sky-400" />
                        <StatCell value={test.fatMassKg.toFixed(1)} unit="kg" label="Fat" color="text-amber-400" />
                      </div>
                    </div>
                  </m.div>
                ))}
              </m.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
