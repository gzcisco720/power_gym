'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SerializedInjury } from '../page';

interface InjurySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  existing?: SerializedInjury;
  onSaved: (injury: SerializedInjury) => void;
}

interface FormState {
  title: string;
  injuryType: string;
  bodyPart: string;
  bodySide: string;
  painAtRest: string;
  painDuringExercise: string;
  aggravatingFactors: string;
  relievingFactors: string;
  mechanism: string;
  seenDoctor: boolean;
  memberNotes: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  injuryType: '',
  bodyPart: '',
  bodySide: '',
  painAtRest: '',
  painDuringExercise: '',
  aggravatingFactors: '',
  relievingFactors: '',
  mechanism: '',
  seenDoctor: false,
  memberNotes: '',
};

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function existingToForm(existing: SerializedInjury | undefined): FormState {
  if (!existing) return EMPTY_FORM;
  return {
    title: existing.title,
    injuryType: existing.injuryType ?? '',
    bodyPart: existing.bodyPart ?? '',
    bodySide: existing.bodySide ?? '',
    painAtRest: existing.painAtRest != null ? String(existing.painAtRest) : '',
    painDuringExercise: existing.painDuringExercise != null ? String(existing.painDuringExercise) : '',
    aggravatingFactors: existing.aggravatingFactors ?? '',
    relievingFactors: existing.relievingFactors ?? '',
    mechanism: existing.mechanism ?? '',
    seenDoctor: existing.seenDoctor,
    memberNotes: existing.memberNotes ?? '',
  };
}

export function InjurySheet({ open, onOpenChange, memberId, existing, onSaved }: InjurySheetProps) {
  const [form, setForm] = useState<FormState>(() => existingToForm(existing));
  const [saving, setSaving] = useState(false);
  const prevExistingRef = useRef(existing);
  const prevOpenRef = useRef(open);

  // Reset form when sheet opens or existing changes — synchronous setState during render
  const openChanged = open !== prevOpenRef.current;
  const existingChanged = existing !== prevExistingRef.current;
  if (openChanged || existingChanged) {
    prevOpenRef.current = open;
    prevExistingRef.current = existing;
    if (open) {
      setForm(existingToForm(existing));
    }
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload: Record<string, string | number | boolean | null> = {
      title: form.title.trim(),
      injuryType: form.injuryType || null,
      bodyPart: form.bodyPart || null,
      bodySide: form.bodyPart && form.bodySide ? form.bodySide : null,
      painAtRest: form.painAtRest !== '' ? Number(form.painAtRest) : null,
      painDuringExercise: form.painDuringExercise !== '' ? Number(form.painDuringExercise) : null,
      aggravatingFactors: form.aggravatingFactors.trim() || null,
      relievingFactors: form.relievingFactors.trim() || null,
      mechanism: form.mechanism.trim() || null,
      seenDoctor: form.seenDoctor,
      memberNotes: form.memberNotes.trim() || null,
    };

    setSaving(true);
    try {
      const url = existing
        ? `/api/members/${memberId}/injuries/${existing._id}`
        : `/api/members/${memberId}/injuries`;
      const res = await fetch(url, {
        method: existing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save');
        return;
      }
      const saved = (await res.json()) as SerializedInjury;
      toast.success(existing ? 'Injury updated' : 'Injury reported');
      onSaved(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const hasTrainerData = existing && (
    existing.trainerNotes ||
    existing.affectedMovements
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-foreground/10">
          <SheetTitle>{existing ? 'Edit Injury' : 'Report Injury'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <FieldRow label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Left knee ligament strain"
            />
          </FieldRow>

          <FieldRow label="Injury Type">
            <Select value={form.injuryType} onValueChange={(v) => set('injuryType', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acute">Acute</SelectItem>
                <SelectItem value="chronic">Chronic</SelectItem>
                <SelectItem value="post_surgery">Post-surgery</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Body Part">
            <Select value={form.bodyPart} onValueChange={(v) => { set('bodyPart', v); set('bodySide', ''); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select body part…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="knee">Knee</SelectItem>
                <SelectItem value="shoulder">Shoulder</SelectItem>
                <SelectItem value="lower_back">Lower Back</SelectItem>
                <SelectItem value="hip">Hip</SelectItem>
                <SelectItem value="ankle">Ankle</SelectItem>
                <SelectItem value="wrist">Wrist</SelectItem>
                <SelectItem value="neck">Neck</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          {form.bodyPart && (
            <FieldRow label="Side">
              <Select value={form.bodySide} onValueChange={(v) => set('bodySide', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select side…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="bilateral">Bilateral</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Pain at Rest (0–10)">
              <Input
                value={form.painAtRest}
                onChange={(e) => set('painAtRest', e.target.value)}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                placeholder="0–10"
              />
            </FieldRow>
            <FieldRow label="Pain During Exercise (0–10)">
              <Input
                value={form.painDuringExercise}
                onChange={(e) => set('painDuringExercise', e.target.value)}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                placeholder="0–10"
              />
            </FieldRow>
          </div>

          <FieldRow label="Aggravating Factors">
            <Input
              value={form.aggravatingFactors}
              onChange={(e) => set('aggravatingFactors', e.target.value)}
              placeholder="What makes it worse?"
            />
          </FieldRow>

          <FieldRow label="Relieving Factors">
            <Input
              value={form.relievingFactors}
              onChange={(e) => set('relievingFactors', e.target.value)}
              placeholder="What helps?"
            />
          </FieldRow>

          <FieldRow label="Mechanism">
            <Input
              value={form.mechanism}
              onChange={(e) => set('mechanism', e.target.value)}
              placeholder="How did this happen? (optional)"
            />
          </FieldRow>

          <div className="flex items-center gap-2.5">
            <input
              id="seen-doctor"
              type="checkbox"
              checked={form.seenDoctor}
              onChange={(e) => set('seenDoctor', e.target.checked)}
              aria-label="I have seen a doctor for this"
              className="h-4 w-4 rounded border border-input accent-primary cursor-pointer"
            />
            <label htmlFor="seen-doctor" className="text-sm text-foreground/80 cursor-pointer select-none">
              I have seen a doctor for this
            </label>
          </div>

          <FieldRow label="My Notes">
            <Textarea
              value={form.memberNotes}
              onChange={(e) => set('memberNotes', e.target.value)}
              placeholder="Any personal notes… (optional)"
              className="min-h-20"
            />
          </FieldRow>

          {hasTrainerData && (
            <>
              <div className="border-t border-foreground/10 pt-4">
                <p className="text-[11px] uppercase tracking-wider text-foreground/40 font-semibold mb-3">
                  Trainer Info (read-only)
                </p>
                {existing.affectedMovements && (
                  <div className="mb-2">
                    <p className="text-[11px] uppercase tracking-wider text-foreground/40 font-semibold mb-0.5">Affected Movements</p>
                    <p className="text-sm text-foreground/65">{existing.affectedMovements}</p>
                  </div>
                )}
                {existing.trainerNotes && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-foreground/40 font-semibold mb-0.5">Trainer Notes</p>
                    <p className="text-sm text-foreground/65">{existing.trainerNotes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 pb-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-foreground/65"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !form.title.trim()}
              className="font-semibold"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : existing ? 'Save Changes' : 'Report Injury'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
