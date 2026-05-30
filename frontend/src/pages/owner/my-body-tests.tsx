import { useEffect, useReducer, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { m } from 'framer-motion';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { fetchBodyTests, createBodyTest, deleteBodyTest } from '@/api/body-tests';
import { calculateBodyFat, calculateComposition } from '@/lib/body-test/formulas';
import type { BodyFatInput } from '@/lib/body-test/formulas';
import type { BodyTestRecord } from '@/api/body-tests';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { variants } from '@/lib/animations/variants';
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

type Protocol = '3site' | '7site' | '9site' | 'other';

const PROTOCOL_LABELS: Record<Protocol, string> = {
  '3site': '3-Site · Jackson-Pollock',
  '7site': '7-Site · Jackson-Pollock',
  '9site': '9-Site · Parrillo',
  other: 'Other',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTestDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sortByDateDesc(tests: BodyTestRecord[]): BodyTestRecord[] {
  return [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── BodyChartClient ─────────────────────────────────────────────────────────

interface ChartPoint { date: string; weight: number; bodyFatPct: number }

function BodyChartClient({ points }: { points: ChartPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <p className="text-[11px] text-foreground/65">Add body tests to see your trend</p>
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
        <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: 'rgba(255,255,255,.5)' }} />
        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} formatter={(v) => <span style={{ color: 'rgba(255,255,255,.4)' }}>{v}</span>} />
        <Line yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#10b981' }} />
        <Line yAxisId="bf" type="monotone" dataKey="bodyFatPct" name="Body Fat %" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3, fill: '#ec4899' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── NewBodyTestDialog ────────────────────────────────────────────────────────

const REQUIRED_SITES: Record<string, string[]> = {
  '3site-male':   ['chest', 'abdominal', 'thigh'],
  '3site-female': ['tricep', 'suprailiac', 'thigh'],
  '7site':        ['chest', 'midaxillary', 'tricep', 'subscapular', 'abdominal', 'suprailiac', 'thigh'],
  '9site':        ['tricep', 'chest', 'subscapular', 'abdominal', 'suprailiac', 'thigh', 'midaxillary', 'bicep', 'lumbar'],
};
const SITE_LABELS: Record<string, string> = {
  chest: 'Chest', abdominal: 'Abdominal', thigh: 'Thigh',
  tricep: 'Tricep', suprailiac: 'Suprailiac', subscapular: 'Subscapular',
  midaxillary: 'Midaxillary', bicep: 'Bicep', lumbar: 'Lumbar',
};
const PROTO_TITLES: Record<string, string> = {
  '3site': '3-Site (Jackson-Pollock) — mm',
  '7site': '7-Site (Jackson-Pollock) — mm',
  '9site': '9-Site (Parrillo) — mm',
};
const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: '3site', label: '3-Site · Jackson-Pollock' },
  { value: '7site', label: '7-Site · Jackson-Pollock' },
  { value: '9site', label: '9-Site · Parrillo' },
  { value: 'other', label: 'Other (manual %)' },
];

function getRequiredSites(protocol: Protocol, sex: 'male' | 'female'): string[] {
  if (protocol === 'other') return [];
  const key = protocol === '3site' ? `3site-${sex}` : protocol;
  return REQUIRED_SITES[key] ?? [];
}

function buildBFInput(
  protocol: Protocol,
  sex: 'male' | 'female',
  age: number,
  sites: Record<string, string>,
  bfStr: string,
): BodyFatInput | null {
  if (protocol === 'other') {
    const v = parseFloat(bfStr);
    return isNaN(v) ? null : { protocol: 'other', bodyFatPct: v };
  }
  const reqSites = getRequiredSites(protocol, sex);
  const parsed: Record<string, number> = {};
  for (const s of reqSites) {
    const n = parseFloat(sites[s] ?? '');
    if (isNaN(n)) return null;
    parsed[s] = n;
  }
  if (protocol === '3site' && sex === 'male') {
    return { protocol: '3site', sex: 'male', age, chest: parsed.chest, abdominal: parsed.abdominal, thigh: parsed.thigh };
  }
  if (protocol === '3site' && sex === 'female') {
    return { protocol: '3site', sex: 'female', age, tricep: parsed.tricep, suprailiac: parsed.suprailiac, thigh: parsed.thigh };
  }
  if (protocol === '7site') {
    return { protocol: '7site', sex, age, chest: parsed.chest, midaxillary: parsed.midaxillary, tricep: parsed.tricep, subscapular: parsed.subscapular, abdominal: parsed.abdominal, suprailiac: parsed.suprailiac, thigh: parsed.thigh };
  }
  if (protocol === '9site') {
    return { protocol: '9site', sex, age, tricep: parsed.tricep, chest: parsed.chest, subscapular: parsed.subscapular, abdominal: parsed.abdominal, suprailiac: parsed.suprailiac, thigh: parsed.thigh, midaxillary: parsed.midaxillary, bicep: parsed.bicep, lumbar: parsed.lumbar };
  }
  return null;
}

interface NewBodyTestDialogProps {
  memberId: string;
  defaultSex: 'male' | 'female' | null;
  defaultAge: number | null;
  previousTest: BodyTestRecord | null;
  onSaved: (test: BodyTestRecord) => void;
}

interface NewBodyTestState {
  open: boolean;
  date: string;
  protocol: Protocol;
  weight: string;
  sites: Record<string, string>;
  bfPctInput: string;
  saving: boolean;
}

type NewBodyTestAction =
  | { type: 'OPEN_RESET' }
  | { type: 'CLOSE' }
  | { type: 'SET_DATE'; value: string }
  | { type: 'SET_PROTOCOL'; value: Protocol }
  | { type: 'SET_WEIGHT'; value: string }
  | { type: 'SET_SITE'; key: string; value: string }
  | { type: 'SET_BF'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function newBodyTestReducer(s: NewBodyTestState, a: NewBodyTestAction): NewBodyTestState {
  switch (a.type) {
    case 'OPEN_RESET': return { open: true, date: new Date().toISOString().split('T')[0], protocol: '3site', weight: '', sites: {}, bfPctInput: '', saving: false };
    case 'CLOSE': return { ...s, open: false };
    case 'SET_DATE': return { ...s, date: a.value };
    case 'SET_PROTOCOL': return { ...s, protocol: a.value, sites: {} };
    case 'SET_WEIGHT': return { ...s, weight: a.value };
    case 'SET_SITE': return { ...s, sites: { ...s.sites, [a.key]: a.value } };
    case 'SET_BF': return { ...s, bfPctInput: a.value };
    case 'SET_SAVING': return { ...s, saving: a.value };
    default: return s;
  }
}

function NewBodyTestDialog({ memberId, defaultSex, defaultAge, previousTest: _prev, onSaved }: NewBodyTestDialogProps) {
  void _prev;
  const [st, ds] = useReducer(newBodyTestReducer, { open: false, date: '', protocol: '3site', weight: '', sites: {}, bfPctInput: '', saving: false });

  const sex: 'male' | 'female' = defaultSex ?? 'male';
  const age = defaultAge ?? 0;
  const reqSites = getRequiredSites(st.protocol, sex);
  const bfInput = buildBFInput(st.protocol, sex, age, st.sites, st.bfPctInput);
  const weightNum = parseFloat(st.weight);
  const weightValid = st.weight.trim() !== '' && !isNaN(weightNum);
  const preview = bfInput !== null && weightValid ? (() => {
    const bf = calculateBodyFat(bfInput);
    const { fatMassKg, leanMassKg } = calculateComposition(weightNum, bf);
    return { bf, fatMassKg, leanMassKg };
  })() : null;
  const canSave = bfInput !== null && weightValid;

  async function handleSave() {
    if (!canSave) return;
    ds({ type: 'SET_SAVING', value: true });
    try {
      const payload: Record<string, number | string | null | undefined> = {
        protocol: st.protocol, sex, age,
        weight: weightNum,
        date: new Date(st.date).toISOString(),
        targetWeight: null, targetBodyFatPct: null,
      };
      if (st.protocol === 'other') {
        payload.bodyFatPct = parseFloat(st.bfPctInput);
      } else {
        reqSites.forEach((s) => { payload[s] = parseFloat(st.sites[s] ?? '0'); });
      }
      // Cast via unknown to satisfy strict type checking while building dynamic payload
      const res = await createBodyTest(memberId, payload as unknown as Parameters<typeof createBodyTest>[1]);
      toast.success('Body test saved');
      onSaved(res);
      ds({ type: 'CLOSE' });
    } catch {
      toast.error('Failed to save');
    } finally {
      ds({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <>
      <Button
        onClick={() => ds({ type: 'OPEN_RESET' })}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
      >
        <Plus className="size-4" />
        New Test
      </Button>

      <Dialog open={st.open} onOpenChange={(v) => { if (!v) ds({ type: 'CLOSE' }); }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-foreground/[.06] shrink-0">
            <DialogTitle className="text-base font-bold">New Body Test</DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="nbt-date" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Test Date</label>
                <Input id="nbt-date" type="date" value={st.date} onChange={(e) => ds({ type: 'SET_DATE', value: e.target.value })} className="bg-card border-foreground/10" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="nbt-protocol" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Protocol</label>
                <select
                  id="nbt-protocol"
                  value={st.protocol}
                  onChange={(e) => ds({ type: 'SET_PROTOCOL', value: e.target.value as Protocol })}
                  className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                >
                  {PROTOCOL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="nbt-weight" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Weight (kg)</label>
                <Input id="nbt-weight" type="text" inputMode="decimal" value={st.weight} onChange={(e) => ds({ type: 'SET_WEIGHT', value: e.target.value })} placeholder="kg" className="bg-card border-foreground/10" />
              </div>
            </div>

            {st.protocol === 'other' ? (
              <div className="space-y-1.5 border-t border-foreground/[.06] pt-4">
                <label htmlFor="nbt-bf" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Body Fat (%)</label>
                <Input id="nbt-bf" type="text" inputMode="decimal" value={st.bfPctInput} onChange={(e) => ds({ type: 'SET_BF', value: e.target.value })} placeholder="e.g. 14.5" className="bg-card border-foreground/10" aria-label="Body Fat" />
              </div>
            ) : (
              <div className="border-t border-foreground/[.06] pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3">{PROTO_TITLES[st.protocol]}</p>
                <div className="rounded-lg bg-muted/30 border border-foreground/[.06] p-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    {reqSites.map((s) => (
                      <div key={s} className="space-y-1">
                        <label htmlFor={`nbt-${s}`} className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/40">{SITE_LABELS[s]}</label>
                        <Input id={`nbt-${s}`} type="text" inputMode="decimal" value={st.sites[s] ?? ''} onChange={(e) => ds({ type: 'SET_SITE', key: s, value: e.target.value })} placeholder="mm" className="bg-card border-foreground/10 text-sm" aria-label={SITE_LABELS[s]} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-muted/30 border border-foreground/[.06] p-3 min-h-[76px] flex flex-col justify-center">
              <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/30 mb-2">Calculated Result</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Body Fat', value: preview ? `${preview.bf.toFixed(1)}%` : null, color: 'text-rose-400' },
                  { label: 'Lean Mass', value: preview ? `${preview.leanMassKg.toFixed(1)} kg` : null, color: 'text-sky-400' },
                  { label: 'Fat Mass', value: preview ? `${preview.fatMassKg.toFixed(1)} kg` : null, color: 'text-amber-400' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className={`text-lg font-bold leading-none ${value ? color : 'text-foreground/20'}`}>{value ?? '—'}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/30">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-foreground/[.06] flex justify-end gap-2 shrink-0">
            <Button variant="ghost" onClick={() => ds({ type: 'CLOSE' })} className="text-foreground/65">Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={!canSave || st.saving} className="bg-white text-black hover:bg-white/90 disabled:opacity-40">
              {st.saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function OwnerMyBodyTestsPage() {
  const user = useAuthStore((s) => s.user);
  const shouldReduce = useReducedMotion();
  const [tests, setTests] = useState<BodyTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<BodyTestRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchBodyTests(user.id)
      .then((data) => setTests(sortByDateDesc(data)))
      .catch(() => toast.error('Failed to load body tests'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

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
  const sharedProtocolLabel = allSameProtocol
    ? (PROTOCOL_LABELS[tests[0]!.protocol] ?? tests[0]!.protocol)
    : null;

  function handleSaved(test: BodyTestRecord) {
    setTests((current) => sortByDateDesc([test, ...current]));
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    try {
      await deleteBodyTest(user.id, deleteTarget._id);
      setTests((current) => current.filter((t) => t._id !== deleteTarget._id));
      toast.success('Body test deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const defaultSex = null;
  const defaultAge = null;

  const dialogTrigger = (
    <NewBodyTestDialog
      memberId={user.id}
      defaultSex={defaultSex}
      defaultAge={defaultAge}
      previousTest={tests[0] ?? null}
      onSaved={handleSaved}
    />
  );

  return (
    <div>
      <PageHeader
        title="Body Tests"
        subtitle={`${tests.length} record${tests.length !== 1 ? 's' : ''}${sharedProtocolLabel ? ` · ${sharedProtocolLabel}` : ''}`}
        actions={<div className="flex items-center gap-2">{dialogTrigger}</div>}
      />

      <div className="px-4 sm:px-8 py-7 space-y-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            heading="No body tests yet"
            description="Record the first body composition test."
            action={dialogTrigger}
          />
        ) : (
          <>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">Body Composition Trend</div>
              <BodyChartClient points={chartPoints} />
            </div>

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
                  className="relative"
                >
                  <div className="rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow p-4 pr-11">
                    <div className="text-sm font-semibold text-foreground">{formatTestDate(test.date)}</div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(test)}
                    className="absolute right-2 top-2 size-8 text-foreground/30 hover:bg-muted hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </m.div>
              ))}
            </m.div>
          </>
        )}
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Body Test</DialogTitle>
            <DialogDescription className="text-foreground/65">
              {deleteTarget ? formatTestDate(deleteTarget.date) : ''}: are you sure? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={() => void handleDeleteConfirm()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
