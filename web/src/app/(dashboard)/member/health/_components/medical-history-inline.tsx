'use client';

import { useState, useMemo } from 'react';
import { Pencil, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SerializedMedicalHistory } from '../page';

interface MedicalHistoryInlineProps {
  memberId: string;
  initialHistory: SerializedMedicalHistory;
  onUpdated: (history: SerializedMedicalHistory) => void;
}

interface FormState {
  chronicConditions: string;
  surgeries: string;
  allergies: string;
  familyHistory: string;
  currentDoctor: string;
  emergencyContact: string;
  pregnancyStatus: string;
}

function historyToForm(h: SerializedMedicalHistory): FormState {
  return {
    chronicConditions: h ? h.chronicConditions.join(', ') : '',
    surgeries: h?.surgeries ?? '',
    allergies: h?.allergies ?? '',
    familyHistory: h?.familyHistory ?? '',
    currentDoctor: h?.currentDoctor ?? '',
    emergencyContact: h?.emergencyContact ?? '',
    pregnancyStatus: h?.pregnancyStatus ?? '',
  };
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-foreground/40 font-semibold mb-0.5">{label}</p>
      <p className={value ? 'text-sm text-foreground/80' : 'text-sm text-foreground/30'}>
        {value || '—'}
      </p>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">
        {label}
      </label>
      {children}
    </div>
  );
}

const PREGNANCY_LABELS: Record<string, string> = {
  'n/a': 'N/A',
  not_pregnant: 'Not pregnant',
  pregnant: 'Pregnant',
  postpartum: 'Postpartum',
};

export function MedicalHistoryInline({ memberId, initialHistory, onUpdated }: MedicalHistoryInlineProps) {
  const [history, setHistory] = useState(initialHistory);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => historyToForm(initialHistory));
  const [saving, setSaving] = useState(false);

  const initialSnapshot = useMemo(() => JSON.stringify(historyToForm(history)), [history]);
  const isDirty = JSON.stringify(form) !== initialSnapshot;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit() {
    setForm(historyToForm(history));
    setEditing(true);
  }

  function cancelEdit() {
    setForm(historyToForm(history));
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${memberId}/medical-history`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chronicConditions: form.chronicConditions
            ? form.chronicConditions.split(',').flatMap((s) => { const t = s.trim(); return t ? [t] : []; })
            : [],
          surgeries: form.surgeries.trim() || null,
          allergies: form.allergies.trim() || null,
          familyHistory: form.familyHistory.trim() || null,
          currentDoctor: form.currentDoctor.trim() || null,
          emergencyContact: form.emergencyContact.trim() || null,
          pregnancyStatus: form.pregnancyStatus || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save');
        return;
      }
      const updated = (await res.json()) as SerializedMedicalHistory;
      setHistory(updated);
      onUpdated(updated);
      setEditing(false);
      toast.success('Medical history saved');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
          Medical History
        </p>
        {!editing ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit medical history"
            onClick={startEdit}
            className="text-foreground/65 hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel editing"
            onClick={cancelEdit}
            className="text-foreground/65 hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <InfoRow
            label="Chronic Conditions"
            value={history?.chronicConditions.length ? history.chronicConditions.join(', ') : null}
          />
          <InfoRow label="Surgeries" value={history?.surgeries ?? null} />
          <InfoRow label="Allergies" value={history?.allergies ?? null} />
          <InfoRow label="Family History" value={history?.familyHistory ?? null} />
          <InfoRow label="Current Doctor" value={history?.currentDoctor ?? null} />
          <InfoRow label="Emergency Contact" value={history?.emergencyContact ?? null} />
          {history?.pregnancyStatus && (
            <InfoRow
              label="Pregnancy Status"
              value={PREGNANCY_LABELS[history.pregnancyStatus] ?? history.pregnancyStatus}
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <FieldRow label="Chronic Conditions">
            <Input
              value={form.chronicConditions}
              onChange={(e) => set('chronicConditions', e.target.value)}
              placeholder="Comma-separated, e.g. Hypertension, Diabetes"
            />
          </FieldRow>
          <FieldRow label="Surgeries">
            <Input
              value={form.surgeries}
              onChange={(e) => set('surgeries', e.target.value)}
              placeholder="e.g. ACL reconstruction 2019"
            />
          </FieldRow>
          <FieldRow label="Allergies">
            <Input
              value={form.allergies}
              onChange={(e) => set('allergies', e.target.value)}
              placeholder="e.g. Penicillin, peanuts"
            />
          </FieldRow>
          <FieldRow label="Family History">
            <Input
              value={form.familyHistory}
              onChange={(e) => set('familyHistory', e.target.value)}
              placeholder="e.g. Heart disease on father's side (optional)"
            />
          </FieldRow>
          <FieldRow label="Current Doctor">
            <Input
              value={form.currentDoctor}
              onChange={(e) => set('currentDoctor', e.target.value)}
              placeholder="Name and clinic (optional)"
            />
          </FieldRow>
          <FieldRow label="Emergency Contact">
            <Input
              value={form.emergencyContact}
              onChange={(e) => set('emergencyContact', e.target.value)}
              placeholder="Name and phone number"
            />
          </FieldRow>
          <FieldRow label="Pregnancy Status">
            <Select value={form.pregnancyStatus} onValueChange={(v) => set('pregnancyStatus', v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status… (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="n/a">N/A</SelectItem>
                <SelectItem value="not_pregnant">Not pregnant</SelectItem>
                <SelectItem value="pregnant">Pregnant</SelectItem>
                <SelectItem value="postpartum">Postpartum</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              className="text-foreground/65"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || !isDirty}
              onClick={handleSave}
              className="font-semibold"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
