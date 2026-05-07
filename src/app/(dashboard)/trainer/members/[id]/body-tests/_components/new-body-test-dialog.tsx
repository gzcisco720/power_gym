'use client';

import { useState } from 'react';
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
  onSaved: (test: BodyTestRecord) => void;
}

const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: '3site', label: '3-Site · Jackson-Pollock' },
  { value: '7site', label: '7-Site · Jackson-Pollock' },
  { value: '9site', label: '9-Site · Parrillo' },
  { value: 'other', label: 'Other (manual %)' },
];

export function NewBodyTestDialog({ memberId, defaultSex, defaultAge, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const sex: 'male' | 'female' = defaultSex ?? 'male';
  const age = defaultAge ?? 0;

  const [date, setDate] = useState('');
  const [protocol, setProtocol] = useState<Protocol>('3site');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFatPct, setTargetBodyFatPct] = useState('');
  const [goalsOpen, setGoalsOpen] = useState(false);

  function resetAndOpen() {
    setDate(new Date().toISOString().split('T')[0]);
    setProtocol('3site');
    setWeight('');
    setTargetWeight('');
    setTargetBodyFatPct('');
    setGoalsOpen(false);
    setStep(1);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setStep(1);
  }

  const canAdvance = weight.trim() !== '' && !isNaN(parseFloat(weight));

  return (
    <>
      <Button
        onClick={resetAndOpen}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
      >
        <Plus className="h-4 w-4" />
        New Test
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#0c0c0c] border-[#1e1e1e] sm:max-w-2xl p-0 gap-0 overflow-hidden"
        >
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-[#141414]">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-bold">New Body Test</DialogTitle>
              <ProfileChip age={defaultAge ?? null} sex={defaultSex ?? null} />
            </div>
            <StepIndicator step={step} />
          </DialogHeader>

          <div className="px-5 py-4">
            {step === 1 && (
              <Step1Form
                date={date} onDate={setDate}
                protocol={protocol} onProtocol={setProtocol}
                weight={weight} onWeight={setWeight}
                targetWeight={targetWeight} onTargetWeight={setTargetWeight}
                targetBodyFatPct={targetBodyFatPct} onTargetBodyFatPct={setTargetBodyFatPct}
                goalsOpen={goalsOpen} onGoalsOpen={setGoalsOpen}
                canAdvance={canAdvance}
                onCancel={handleClose}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Step2Form
                memberId={memberId}
                protocol={protocol}
                sex={sex}
                age={age}
                weight={parseFloat(weight)}
                date={date}
                targetWeight={targetWeight ? parseFloat(targetWeight) : null}
                targetBodyFatPct={targetBodyFatPct ? parseFloat(targetBodyFatPct) : null}
                onBack={() => setStep(1)}
                onSaved={(test) => { onSaved(test); handleClose(); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mt-3">
      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${step === 1 ? 'bg-white text-black' : 'bg-[#1e1e1e] text-foreground/40'}`}>
        {step > 1 ? '✓' : '1'}
      </div>
      <span className={`text-[9px] uppercase tracking-wider ${step === 1 ? 'text-foreground/65' : 'text-foreground/30'}`}>Basic Info</span>
      <div className="flex-1 h-px bg-[#1e1e1e]" />
      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${step === 2 ? 'bg-white text-black' : 'bg-[#080808] text-foreground/30 border border-[#1e1e1e]'}`}>
        2
      </div>
      <span className={`text-[9px] uppercase tracking-wider ${step === 2 ? 'text-foreground/65' : 'text-foreground/30'}`}>Measurements</span>
    </div>
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

interface Step1Props {
  date: string; onDate: (v: string) => void;
  protocol: Protocol; onProtocol: (v: Protocol) => void;
  weight: string; onWeight: (v: string) => void;
  targetWeight: string; onTargetWeight: (v: string) => void;
  targetBodyFatPct: string; onTargetBodyFatPct: (v: string) => void;
  goalsOpen: boolean; onGoalsOpen: (v: boolean) => void;
  canAdvance: boolean;
  onCancel: () => void;
  onNext: () => void;
}

function Step1Form({
  date, onDate, protocol, onProtocol, weight, onWeight,
  targetWeight, onTargetWeight, targetBodyFatPct, onTargetBodyFatPct,
  goalsOpen, onGoalsOpen, canAdvance, onCancel, onNext,
}: Step1Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="nbt-date" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Test Date
          </label>
          <Input
            id="nbt-date"
            type="date"
            value={date}
            onChange={(e) => onDate(e.target.value)}
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
            onChange={(e) => onProtocol(e.target.value as Protocol)}
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
            onChange={(e) => onWeight(e.target.value)}
            placeholder="kg"
            className="bg-[#0a0a0a] border-[#1e1e1e]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onGoalsOpen(!goalsOpen)}
        aria-expanded={goalsOpen}
        className="flex w-full items-center gap-1.5 border-t border-[#141414] pt-3 text-[11px] text-foreground/40 hover:text-foreground/65 transition-colors outline-none focus-visible:text-foreground/65"
      >
        <span>{goalsOpen ? '▾' : '▸'}</span>
        Goals <span className="text-foreground/30">(optional)</span>
      </button>
      {goalsOpen && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="nbt-tw" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Target Weight (kg)</label>
            <Input id="nbt-tw" type="text" inputMode="decimal" value={targetWeight} onChange={(e) => onTargetWeight(e.target.value)} placeholder="kg" className="bg-[#0a0a0a] border-[#1e1e1e]" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nbt-tbf" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Target Body Fat (%)</label>
            <Input id="nbt-tbf" type="text" inputMode="decimal" value={targetBodyFatPct} onChange={(e) => onTargetBodyFatPct(e.target.value)} placeholder="%" className="bg-[#0a0a0a] border-[#1e1e1e]" />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} className="text-foreground/65 border border-[#222]">Cancel</Button>
        <Button onClick={onNext} disabled={!canAdvance} className="bg-white text-black hover:bg-white/90 disabled:opacity-40">
          Next →
        </Button>
      </div>
    </div>
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

interface Step2Props {
  memberId: string;
  protocol: Protocol;
  sex: 'male' | 'female';
  age: number;
  weight: number;
  date: string;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
  onBack: () => void;
  onSaved: (test: BodyTestRecord) => void;
}

function Step2Form({ memberId, protocol, sex, age, weight, date, targetWeight, targetBodyFatPct, onBack, onSaved }: Step2Props) {
  const [sites, setSites] = useState<Record<string, string>>({});
  const [bfPctInput, setBfPctInput] = useState('');
  const [saving, setSaving] = useState(false);

  const reqSites = getRequiredSites(protocol, sex);
  const bfInput = buildBFInput(protocol, sex, age, sites, bfPctInput);
  const preview = bfInput !== null ? (() => {
    const bf = calculateBodyFat(bfInput);
    const { fatMassKg, leanMassKg } = calculateComposition(weight, bf);
    return { bf, fatMassKg, leanMassKg };
  })() : null;

  async function handleSave() {
    if (!bfInput) return;
    setSaving(true);
    try {
      const payload: Record<string, number | string | null> = {
        protocol, sex, age, weight,
        date: new Date(date).toISOString(),
        targetWeight,
        targetBodyFatPct,
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {protocol === 'other' ? (
        <div className="space-y-1.5">
          <label htmlFor="nbt-bf" className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Body Fat (%)</label>
          <Input
            id="nbt-bf"
            type="text"
            inputMode="decimal"
            value={bfPctInput}
            onChange={(e) => setBfPctInput(e.target.value)}
            placeholder="e.g. 14.5"
            className="bg-[#0a0a0a] border-[#1e1e1e]"
            aria-label="Body Fat"
          />
        </div>
      ) : (
        <div>
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
                    onChange={(e) => setSites((prev) => ({ ...prev, [s]: e.target.value }))}
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

      <div className="flex justify-between pt-1">
        <Button variant="ghost" onClick={onBack} className="text-foreground/65 border border-[#222]">← Back</Button>
        <Button
          onClick={handleSave}
          disabled={bfInput === null || saving}
          className="bg-white text-black hover:bg-white/90 disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
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
