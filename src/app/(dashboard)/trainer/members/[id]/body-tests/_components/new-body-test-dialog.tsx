'use client';

import { useReducer } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculateBodyFat, calculateComposition } from '@/lib/body-test/formulas';
import type { BodyFatInput } from '@/lib/body-test/formulas';
import type { BodyTestRecord } from './types';

type Protocol = '3site' | '7site' | '9site' | 'other';

interface Props {
  memberId: string;
  defaultSex?: 'male' | 'female' | null;
  defaultAge?: number | null;
  previousTest?: BodyTestRecord | null;
  onSaved: (test: BodyTestRecord) => void;
}

const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: '3site', label: '3-Site · Jackson-Pollock' },
  { value: '7site', label: '7-Site · Jackson-Pollock' },
  { value: '9site', label: '9-Site · Parrillo' },
  { value: 'other', label: 'Other (manual %)' },
];

interface NewBodyTestState {
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

function newBodyTestReducer(state: NewBodyTestState, action: NewBodyTestAction): NewBodyTestState {
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
    case 'OPEN_RESET': return { ...state, open: true, date: new Date().toISOString().split('T')[0], protocol: '3site', weight: '', targetWeight: '', targetBodyFatPct: '', goalsOpen: false, sites: {}, bfPctInput: '' };
    default: return state;
  }
}

export function NewBodyTestDialog({ memberId, defaultSex, defaultAge, previousTest, onSaved }: Props) {
  const [state, dispatch] = useReducer(newBodyTestReducer, {
    open: false, date: '', protocol: '3site', weight: '', targetWeight: '',
    targetBodyFatPct: '', goalsOpen: false, sites: {}, bfPctInput: '', saving: false,
  });
  const { open, date, protocol, weight, targetWeight, targetBodyFatPct, goalsOpen, sites, bfPctInput, saving } = state;

  const sex: 'male' | 'female' = defaultSex ?? 'male';
  const age = defaultAge ?? 0;

  function resetAndOpen() {
    dispatch({ type: 'OPEN_RESET' });
  }

  function handleClose() {
    dispatch({ type: 'SET_OPEN', value: false });
  }

  const weightNum = parseFloat(weight);
  const weightValid = weight.trim() !== '' && !isNaN(weightNum);
  const reqSites = getRequiredSites(protocol, sex);
  const bfInput = buildBFInput(protocol, sex, age, sites, bfPctInput);
  const preview = bfInput !== null && weightValid ? (() => {
    const bf = calculateBodyFat(bfInput);
    const { fatMassKg, leanMassKg } = calculateComposition(weightNum, bf);
    return { bf, fatMassKg, leanMassKg };
  })() : null;
  const comparison = computeComparison(preview, weightNum, date, protocol, previousTest ?? null);

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
      const res = await fetch(`/api/members/${memberId}/body-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save');
        return;
      }
      const created = (await res.json()) as BodyTestRecord;
      toast.success('Body test saved');
      onSaved(created);
      handleClose();
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  return (
    <>
      <Button
        onClick={resetAndOpen}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
      >
        <Plus className="size-4" />
        New Test
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#0c0c0c] border-[#1e1e1e] sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-[#141414] shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-bold">New Body Test</DialogTitle>
              <ProfileChip age={defaultAge ?? null} sex={defaultSex ?? null} />
            </div>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="nbt-date" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Test Date
                </label>
                <Input
                  id="nbt-date"
                  type="date"
                  value={date}
                  onChange={(e) => dispatch({ type: 'SET_DATE', value: e.target.value })}
                  className="bg-[#0a0a0a] border-[#1e1e1e]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="nbt-protocol" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Protocol
                </label>
                <select
                  id="nbt-protocol"
                  value={protocol}
                  onChange={(e) => dispatch({ type: 'SET_PROTOCOL', value: e.target.value as Protocol })}
                  className="w-full rounded-md border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                >
                  {PROTOCOL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="nbt-weight" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Weight (kg)</label>
                <Input
                  id="nbt-weight"
                  type="text"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => dispatch({ type: 'SET_WEIGHT', value: e.target.value })}
                  placeholder="kg"
                  className="bg-[#0a0a0a] border-[#1e1e1e]"
                />
              </div>
            </div>

            <div className="border-t border-[#141414] pt-3 space-y-3">
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
                    <Input id="nbt-tw" type="text" inputMode="decimal" value={targetWeight} onChange={(e) => dispatch({ type: 'SET_TARGET_WEIGHT', value: e.target.value })} placeholder="kg" className="bg-[#0a0a0a] border-[#1e1e1e]" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="nbt-tbf" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Target Body Fat (%)</label>
                    <Input id="nbt-tbf" type="text" inputMode="decimal" value={targetBodyFatPct} onChange={(e) => dispatch({ type: 'SET_TARGET_BODY_FAT_PCT', value: e.target.value })} placeholder="%" className="bg-[#0a0a0a] border-[#1e1e1e]" />
                  </div>
                </div>
              )}
            </div>

            {protocol === 'other' ? (
              <div className="space-y-1.5 border-t border-[#141414] pt-4">
                <label htmlFor="nbt-bf" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Body Fat (%)</label>
                <Input
                  id="nbt-bf"
                  type="text"
                  inputMode="decimal"
                  value={bfPctInput}
                  onChange={(e) => dispatch({ type: 'SET_BF_PCT_INPUT', value: e.target.value })}
                  placeholder="e.g. 14.5"
                  className="bg-[#0a0a0a] border-[#1e1e1e]"
                  aria-label="Body Fat"
                />
              </div>
            ) : (
              <div className="border-t border-[#141414] pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3">
                  {PROTO_TITLES[protocol]}
                </p>
                <div className="rounded-lg bg-[#080808] border border-[#141414] p-3">
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
                          className="bg-[#0a0a0a] border-[#1e1e1e] text-sm"
                          aria-label={SITE_LABELS[s]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-[#080808] border border-[#141414] p-3 min-h-[76px] flex flex-col justify-center">
              <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/30 mb-2">Calculated Result</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <ResultCell label="Body Fat"  value={preview ? `${preview.bf.toFixed(1)}%`             : null} color="text-rose-400" />
                <ResultCell label="Lean Mass" value={preview ? `${preview.leanMassKg.toFixed(1)} kg`   : null} color="text-sky-400" />
                <ResultCell label="Fat Mass"  value={preview ? `${preview.fatMassKg.toFixed(1)} kg`    : null} color="text-amber-400" />
              </div>
            </div>

            <ComparisonBlock comparison={comparison} />
          </div>

          <div className="px-5 py-3 border-t border-[#141414] flex justify-end gap-2 shrink-0">
            <Button variant="ghost" onClick={handleClose} className="text-foreground/65 border border-[#222]">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="bg-white text-black hover:bg-white/90 disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileChip({ age, sex }: { age: number | null; sex: 'male' | 'female' | null }) {
  if (age == null && sex == null) return null;
  return (
    <span className="text-[11px] text-foreground/65 shrink-0">
      {age != null ? `Age ${age}` : 'Age —'}
      <span className="mx-1.5 text-foreground/30">·</span>
      <span className="capitalize">{sex ?? '—'}</span>
    </span>
  );
}

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

function ResultCell({ label, value, color }: { label: string; value: string | null; color: string }) {
  return (
    <div>
      <div className={`text-lg font-bold leading-none ${value ? color : 'text-[#2a2a2a]'}`}>
        {value ?? '—'}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/30">{label}</div>
    </div>
  );
}

type VerdictTone = 'emerald' | 'sky' | 'amber' | 'rose' | 'neutral';
interface Verdict {
  label: string;
  tone: VerdictTone;
}
interface Comparison {
  prevDate: string | null;
  daysBetween: number | null;
  protocolWarning: string | null;
  deltaFat: number | null;
  deltaLean: number | null;
  deltaBfPct: number | null;
  deltaWeight: number | null;
  verdict: Verdict | null;
}

const PROTOCOL_SHORT: Record<Protocol, string> = {
  '3site': '3-site',
  '7site': '7-site',
  '9site': '9-site',
  other: 'manual',
};

const EMPTY_COMPARISON: Comparison = {
  prevDate: null,
  daysBetween: null,
  protocolWarning: null,
  deltaFat: null,
  deltaLean: null,
  deltaBfPct: null,
  deltaWeight: null,
  verdict: null,
};

// 0.3 kg = typical day-to-day water/glycogen noise floor for lean mass
function computeVerdict(deltaFat: number, deltaLean: number): Verdict {
  const T = 0.3;
  const fatDown = deltaFat < -T;
  const fatUp = deltaFat > T;
  const leanUp = deltaLean > T;
  const leanDown = deltaLean < -T;

  if (fatDown && leanUp) return { label: 'Recomp', tone: 'emerald' };
  if (fatDown) return { label: 'Cut', tone: 'sky' };
  if (leanUp) return { label: 'Bulk', tone: 'amber' };
  if (fatUp || leanDown) return { label: 'Regression', tone: 'rose' };
  return { label: 'Maintain', tone: 'neutral' };
}

function computeComparison(
  preview: { bf: number; fatMassKg: number; leanMassKg: number } | null,
  weight: number,
  date: string,
  protocol: Protocol,
  prev: BodyTestRecord | null,
): Comparison {
  if (!prev) return EMPTY_COMPARISON;

  const days = Math.round(
    (new Date(date).getTime() - new Date(prev.date).getTime()) / 86400000,
  );
  const protocolWarning =
    prev.protocol !== protocol
      ? `Method changed: prev ${PROTOCOL_SHORT[prev.protocol]}, now ${PROTOCOL_SHORT[protocol]} — deltas may reflect formula differences`
      : null;
  const deltaWeight = Number.isFinite(weight) ? weight - prev.weight : null;

  if (!preview) {
    return {
      prevDate: prev.date,
      daysBetween: days,
      protocolWarning,
      deltaFat: null,
      deltaLean: null,
      deltaBfPct: null,
      deltaWeight,
      verdict: null,
    };
  }

  const deltaFat = preview.fatMassKg - prev.fatMassKg;
  const deltaLean = preview.leanMassKg - prev.leanMassKg;
  return {
    prevDate: prev.date,
    daysBetween: days,
    protocolWarning,
    deltaFat,
    deltaLean,
    deltaBfPct: preview.bf - prev.bodyFatPct,
    deltaWeight,
    verdict: computeVerdict(deltaFat, deltaLean),
  };
}

function ComparisonBlock({ comparison }: { comparison: Comparison }) {
  const c = comparison;
  const dateStr = c.prevDate
    ? new Date(c.prevDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const daysText =
    c.daysBetween === null ? null : c.daysBetween === 0 ? 'same day' : `${Math.abs(c.daysBetween)}d apart`;

  return (
    <div className="rounded-lg bg-[#080808] border border-[#141414] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/30">
            Vs Last Test
          </p>
          <p className="mt-0.5 text-[10px] text-foreground/65">
            {dateStr ? (
              <>
                {dateStr} <span className="text-foreground/40">· {daysText}</span>
              </>
            ) : (
              <span className="text-[#2a2a2a]">–</span>
            )}
          </p>
        </div>
        {c.verdict && <VerdictBadge verdict={c.verdict} />}
      </div>
      {c.protocolWarning && (
        <p className="text-[10px] leading-snug text-amber-400/80">⚠ {c.protocolWarning}</p>
      )}
      <div className="grid grid-cols-4 gap-2 text-center">
        <DeltaCell label="Fat Δ"    value={c.deltaFat}    unit="kg" goodIs="negative" />
        <DeltaCell label="Lean Δ"   value={c.deltaLean}   unit="kg" goodIs="positive" />
        <DeltaCell label="BF Δ"     value={c.deltaBfPct}  unit="pp" goodIs="negative" />
        <DeltaCell label="Weight Δ" value={c.deltaWeight} unit="kg" goodIs="neutral" />
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const tones: Record<VerdictTone, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
    sky: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
    neutral: 'bg-[#1a1a1a] text-foreground/65 ring-[#222]',
  };
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${tones[verdict.tone]}`}>
      {verdict.label}{verdict.tone === 'emerald' ? ' ⭐' : ''}
    </span>
  );
}

function DeltaCell({
  label,
  value,
  unit,
  goodIs,
}: {
  label: string;
  value: number | null;
  unit: string;
  goodIs: 'negative' | 'positive' | 'neutral';
}) {
  if (value === null) {
    return (
      <div>
        <div className="text-sm font-bold leading-none text-[#2a2a2a]">–</div>
        <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/30">{label}</div>
      </div>
    );
  }

  const isFlat = Math.abs(value) < 0.05;
  const sign = value > 0 ? '+' : '';
  const formatted = `${sign}${value.toFixed(1)}`;

  let color = 'text-foreground/65';
  if (!isFlat && goodIs !== 'neutral') {
    const isGood = (goodIs === 'negative' && value < 0) || (goodIs === 'positive' && value > 0);
    color = isGood ? 'text-emerald-400' : 'text-rose-400';
  }

  return (
    <div>
      <div className={`text-sm font-bold leading-none ${color}`}>
        {formatted}
        <span className="ml-0.5 text-[9px] opacity-60">{unit}</span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-wider text-foreground/30">{label}</div>
    </div>
  );
}
