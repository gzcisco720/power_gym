import { useState, useReducer } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { m, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { variants } from '@/lib/animations/variants';
import { calculateBodyFat, calculateComposition } from '@/lib/body-test/formulas';
import type { BodyFatInput } from '@/lib/body-test/formulas';
import { useMemberHubStore } from '@/stores/memberHubStore';
import type { BodyTestRecord } from '@/api/member-hub';
import { deleteBodyTest } from '@/api/member-hub';

export type { BodyTestRecord };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PROTOCOL_LABELS: Record<string, string> = {
  '3site': '3-Site · Jackson-Pollock',
  '7site': '7-Site · Jackson-Pollock',
  '9site': '9-Site · Parrillo',
  other: 'Other',
};

function formatTestDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sortByDateDesc(tests: BodyTestRecord[]): BodyTestRecord[] {
  return [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Body chart ───────────────────────────────────────────────────────────────

interface Point {
  date: string;
  weight: number;
  bodyFatPct: number;
}

function BodyCompositionChart({ points }: { points: Point[] }) {
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

// ─── New Body Test Dialog ─────────────────────────────────────────────────────

type Protocol = '3site' | '7site' | '9site' | 'other';

const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: '3site', label: '3-Site · Jackson-Pollock' },
  { value: '7site', label: '7-Site · Jackson-Pollock' },
  { value: '9site', label: '9-Site · Parrillo' },
  { value: 'other', label: 'Other (manual %)' },
];

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

interface NewBodyTestDialogState {
  open: boolean;
  date: string;
  protocol: Protocol;
  weight: string;
  targetWeight: string;
  targetBodyFatPct: string;
  goalsOpen: boolean;
  sites: Record<string, string>;
  bfPctInput: string;
  saving: boolean;
}

type NewBodyTestAction =
  | { type: 'SET_OPEN'; value: boolean }
  | { type: 'SET_DATE'; value: string }
  | { type: 'SET_PROTOCOL'; value: Protocol }
  | { type: 'SET_WEIGHT'; value: string }
  | { type: 'SET_TARGET_WEIGHT'; value: string }
  | { type: 'SET_TARGET_BODY_FAT_PCT'; value: string }
  | { type: 'SET_GOALS_OPEN'; value: boolean }
  | { type: 'SET_SITES'; value: Record<string, string> }
  | { type: 'SET_BF_PCT_INPUT'; value: string }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'OPEN_RESET' };

function newBodyTestReducer(state: NewBodyTestDialogState, action: NewBodyTestAction): NewBodyTestDialogState {
  switch (action.type) {
    case 'SET_OPEN': return { ...state, open: action.value };
    case 'SET_DATE': return { ...state, date: action.value };
    case 'SET_PROTOCOL': return { ...state, protocol: action.value };
    case 'SET_WEIGHT': return { ...state, weight: action.value };
    case 'SET_TARGET_WEIGHT': return { ...state, targetWeight: action.value };
    case 'SET_TARGET_BODY_FAT_PCT': return { ...state, targetBodyFatPct: action.value };
    case 'SET_GOALS_OPEN': return { ...state, goalsOpen: action.value };
    case 'SET_SITES': return { ...state, sites: action.value };
    case 'SET_BF_PCT_INPUT': return { ...state, bfPctInput: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'OPEN_RESET': return { ...state, open: true, date: new Date().toISOString().split('T')[0]!, protocol: '3site', weight: '', targetWeight: '', targetBodyFatPct: '', goalsOpen: false, sites: {}, bfPctInput: '' };
    default: return state;
  }
}

interface NewBodyTestDialogProps {
  memberId: string;
  defaultSex?: 'male' | 'female' | null;
  defaultAge?: number | null;
  previousTest?: BodyTestRecord | null;
  onSaved: (test: BodyTestRecord) => void;
}

function NewBodyTestDialog({ memberId, defaultSex, defaultAge, previousTest, onSaved }: NewBodyTestDialogProps) {
  void previousTest; // used by v1 for comparison — retain for future use
  const [state, dispatch] = useReducer(newBodyTestReducer, {
    open: false, date: '', protocol: '3site', weight: '', targetWeight: '',
    targetBodyFatPct: '', goalsOpen: false, sites: {}, bfPctInput: '', saving: false,
  });
  const { open, date, protocol, weight, targetWeight, targetBodyFatPct, goalsOpen, sites, bfPctInput, saving } = state;

  const addBodyTest = useMemberHubStore((s) => s.addBodyTest);

  const sex: 'male' | 'female' = defaultSex ?? 'male';
  const age = defaultAge ?? 0;

  const weightNum = parseFloat(weight);
  const weightValid = weight.trim() !== '' && !isNaN(weightNum);
  const reqSites = getRequiredSites(protocol, sex);
  const bfInput = buildBFInput(protocol, sex, age, sites, bfPctInput);
  const preview = bfInput !== null && weightValid ? (() => {
    const bf = calculateBodyFat(bfInput);
    const { fatMassKg, leanMassKg } = calculateComposition(weightNum, bf);
    return { bf, fatMassKg, leanMassKg };
  })() : null;

  const canSave = bfInput !== null && weightValid;

  async function handleSave() {
    if (!canSave) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const payload: Record<string, number | string | null> = {
        protocol,
        sex,
        age,
        weight: weightNum,
        date: new Date(date).toISOString(),
        targetWeight: targetWeight ? parseFloat(targetWeight) : null,
        targetBodyFatPct: targetBodyFatPct ? parseFloat(targetBodyFatPct) : null,
      };
      if (protocol === 'other') {
        payload.bodyFatPct = parseFloat(bfPctInput);
      } else {
        reqSites.forEach((s) => { payload[s] = parseFloat(sites[s] ?? '0'); });
      }
      const test = await addBodyTest(memberId, payload);
      toast.success('Body test saved');
      onSaved(test);
      dispatch({ type: 'SET_OPEN', value: false });
    } catch {
      toast.error('Failed to save');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <>
      <Button
        onClick={() => dispatch({ type: 'OPEN_RESET' })}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold"
      >
        <Plus className="size-4" />
        New Test
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) dispatch({ type: 'SET_OPEN', value: false }); }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-bold">New Body Test</DialogTitle>
              {(defaultAge != null || defaultSex != null) && (
                <span className="text-[11px] text-foreground/65 shrink-0">
                  {defaultAge != null ? `Age ${defaultAge}` : 'Age —'}
                  <span className="mx-1.5 text-foreground/30">·</span>
                  <span className="capitalize">{defaultSex ?? '—'}</span>
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="nbt-date" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Test Date</label>
                <Input id="nbt-date" type="date" value={date} onChange={(e) => dispatch({ type: 'SET_DATE', value: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="nbt-protocol" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Protocol</label>
                <select
                  id="nbt-protocol"
                  value={protocol}
                  onChange={(e) => dispatch({ type: 'SET_PROTOCOL', value: e.target.value as Protocol })}
                  className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {PROTOCOL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="nbt-weight" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Weight (kg)</label>
                <Input id="nbt-weight" type="text" inputMode="decimal" value={weight} onChange={(e) => dispatch({ type: 'SET_WEIGHT', value: e.target.value })} placeholder="kg" />
              </div>
            </div>

            <div className="border-t border-border/60 pt-3 space-y-3">
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_GOALS_OPEN', value: !goalsOpen })}
                aria-expanded={goalsOpen}
                className="flex items-center gap-1.5 text-[11px] text-foreground/40 hover:text-foreground/65 transition-colors outline-none focus-visible:text-foreground/65"
              >
                <span>{goalsOpen ? '▾' : '▸'}</span>
                Goals <span className="text-foreground/30">(optional)</span>
              </button>
              {goalsOpen && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="nbt-tw" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Target Weight (kg)</label>
                    <Input id="nbt-tw" type="text" inputMode="decimal" value={targetWeight} onChange={(e) => dispatch({ type: 'SET_TARGET_WEIGHT', value: e.target.value })} placeholder="kg" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="nbt-tbf" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Target Body Fat (%)</label>
                    <Input id="nbt-tbf" type="text" inputMode="decimal" value={targetBodyFatPct} onChange={(e) => dispatch({ type: 'SET_TARGET_BODY_FAT_PCT', value: e.target.value })} placeholder="%" />
                  </div>
                </div>
              )}
            </div>

            {protocol === 'other' ? (
              <div className="space-y-1.5 border-t border-border/60 pt-4">
                <label htmlFor="nbt-bf" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Body Fat (%)</label>
                <Input id="nbt-bf" type="text" inputMode="decimal" value={bfPctInput} onChange={(e) => dispatch({ type: 'SET_BF_PCT_INPUT', value: e.target.value })} placeholder="e.g. 14.5" aria-label="Body Fat" />
              </div>
            ) : (
              <div className="border-t border-border/60 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3">
                  {PROTO_TITLES[protocol]}
                </p>
                <div className="rounded-lg bg-muted/50 border border-border/60 p-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    {reqSites.map((s) => (
                      <div key={s} className="space-y-1">
                        <label htmlFor={`nbt-${s}`} className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/50">
                          {SITE_LABELS[s]}
                        </label>
                        <Input
                          id={`nbt-${s}`}
                          type="text"
                          inputMode="decimal"
                          value={sites[s] ?? ''}
                          onChange={(e) => dispatch({ type: 'SET_SITES', value: { ...sites, [s]: e.target.value } })}
                          placeholder="mm"
                          className="text-sm"
                          aria-label={SITE_LABELS[s]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 border border-border/60 p-3 min-h-[76px] flex flex-col justify-center">
              <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/30 mb-2">Calculated Result</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className={`text-lg font-bold leading-none ${preview ? 'text-rose-400' : 'text-foreground/20'}`}>{preview ? `${preview.bf.toFixed(1)}%` : '—'}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/30">Body Fat</div>
                </div>
                <div>
                  <div className={`text-lg font-bold leading-none ${preview ? 'text-sky-400' : 'text-foreground/20'}`}>{preview ? `${preview.leanMassKg.toFixed(1)} kg` : '—'}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/30">Lean Mass</div>
                </div>
                <div>
                  <div className={`text-lg font-bold leading-none ${preview ? 'text-amber-400' : 'text-foreground/20'}`}>{preview ? `${preview.fatMassKg.toFixed(1)} kg` : '—'}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/30">Fat Mass</div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border/60 flex justify-end gap-2 shrink-0">
            <Button variant="ghost" onClick={() => dispatch({ type: 'SET_OPEN', value: false })} className="text-foreground/65">Cancel</Button>
            <Button onClick={() => { void handleSave(); }} disabled={!canSave || saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

// ─── Body Tests Tab ───────────────────────────────────────────────────────────

export function BodyTestsTab() {
  const memberId = useMemberHubStore((s) => s.memberId);
  const storeBodyTests = useMemberHubStore((s) => s.bodyTests);
  const removeBodyTest = useMemberHubStore((s) => s.removeBodyTest);
  const shouldReduce = useReducedMotion();
  const [tests, setTests] = useState<BodyTestRecord[]>(() => sortByDateDesc(storeBodyTests));
  const [deleteTarget, setDeleteTarget] = useState<BodyTestRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync local state when store updates
  const sortedStore = sortByDateDesc(storeBodyTests);
  if (sortedStore.length !== tests.length || (sortedStore[0]?._id !== tests[0]?._id)) {
    setTests(sortedStore);
  }

  if (!memberId) return null;

  const latest = tests[0] ?? null;
  const prev = tests[1] ?? null;
  const bfChange = latest && prev ? latest.bodyFatPct - prev.bodyFatPct : null;

  const chartPoints = [...tests]
    .reverse()
    .map((t) => {
      const d = new Date(t.date);
      return {
        date: `${MONTHS[d.getMonth()] ?? ''} ${d.getDate()}`,
        weight: parseFloat(t.weight.toFixed(1)),
        bodyFatPct: parseFloat(t.bodyFatPct.toFixed(1)),
      };
    });

  const uniqueProtocols = new Set(tests.map((t) => t.protocol));
  const allSameProtocol = uniqueProtocols.size === 1;
  const sharedProtocolLabel = allSameProtocol
    ? (PROTOCOL_LABELS[tests[0]!.protocol] ?? tests[0]!.protocol)
    : null;

  function handleSaved(test: BodyTestRecord) {
    setTests((current) => sortByDateDesc([test, ...current]));
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !memberId) return;
    setDeleting(true);
    try {
      await deleteBodyTest(memberId, deleteTarget._id);
      removeBodyTest(deleteTarget._id);
      setTests((current) => current.filter((t) => t._id !== deleteTarget._id));
      toast.success('Body test deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const dialogTrigger = (
    <NewBodyTestDialog
      memberId={memberId}
      onSaved={handleSaved}
    />
  );

  return (
    <div>
      {/* Page header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/[.06] bg-background/95 backdrop-blur-sm px-4 py-4 sm:px-8 sm:py-5">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.3px]">Body Tests</h2>
          <p className="mt-0.5 text-[12px] text-foreground/65">
            {tests.length} record{tests.length !== 1 ? 's' : ''}{sharedProtocolLabel ? ` · ${sharedProtocolLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dialogTrigger}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-7 space-y-6">
        {tests.length === 0 ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-[15px] font-semibold">No body tests yet</p>
            <p className="text-[13px] text-foreground/65 mt-1">Record the first body composition test.</p>
            <div className="mt-4">{dialogTrigger}</div>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/65 mb-3">
                Body Composition Trend
              </div>
              <BodyCompositionChart points={chartPoints} />
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
                    <div className="text-sm font-semibold text-foreground">
                      {formatTestDate(test.date)}
                    </div>
                    {!allSameProtocol && (
                      <div className="mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[10px] ring-1 bg-primary/10 text-primary-light ring-primary/20">
                        {PROTOCOL_LABELS[test.protocol] ?? test.protocol}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-foreground/8 pt-3 text-center">
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
              variant="destructive"
              onClick={() => { void handleDeleteConfirm(); }}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
