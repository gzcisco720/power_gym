'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SerializedMedication } from '../page';

interface MedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  existing?: SerializedMedication;
  onSaved: (medication: SerializedMedication) => void;
}

interface FormState {
  name: string;
  purpose: string;
  duration: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  purpose: '',
  duration: '',
  startDate: '',
  endDate: '',
  notes: '',
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

function isoDateToInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function existingToForm(existing: SerializedMedication | undefined): FormState {
  if (!existing) return EMPTY_FORM;
  return {
    name: existing.name,
    purpose: existing.purpose,
    duration: existing.duration,
    startDate: isoDateToInputValue(existing.startDate),
    endDate: isoDateToInputValue(existing.endDate),
    notes: existing.notes ?? '',
  };
}

export function MedicationDialog({ open, onOpenChange, memberId, existing, onSaved }: MedicationDialogProps) {
  const [form, setForm] = useState<FormState>(() => existingToForm(existing));
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevExisting, setPrevExisting] = useState(existing);

  if (open !== prevOpen || existing !== prevExisting) {
    setPrevOpen(open);
    setPrevExisting(existing);
    if (open) setForm(existingToForm(existing));
  }

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.purpose.trim() || !form.duration || !form.startDate) return;

    const payload: Record<string, string | null> = {
      name: form.name.trim(),
      purpose: form.purpose.trim(),
      duration: form.duration,
      startDate: form.startDate,
      endDate: form.duration === 'short_term' && form.endDate ? form.endDate : null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    try {
      const url = existing
        ? `/api/members/${memberId}/medications/${existing._id}`
        : `/api/members/${memberId}/medications`;
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
      const saved = (await res.json()) as SerializedMedication;
      toast.success(existing ? 'Medication updated' : 'Medication added');
      onSaved(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const isValid = form.name.trim() && form.purpose.trim() && form.duration && form.startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogTitle>{existing ? 'Edit Medication' : 'Add Medication'}</DialogTitle>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <FieldRow label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Metoprolol 50mg"
            />
          </FieldRow>

          <FieldRow label="Purpose" required>
            <Input
              value={form.purpose}
              onChange={(e) => set('purpose', e.target.value)}
              placeholder="e.g. High blood pressure"
            />
          </FieldRow>

          <FieldRow label="Duration" required>
            <Select value={form.duration} onValueChange={(v) => set('duration', v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long_term">Long-term</SelectItem>
                <SelectItem value="short_term">Short-term</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Start Date" required>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </FieldRow>

          {form.duration === 'short_term' && (
            <FieldRow label="End Date">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </FieldRow>
          )}

          <FieldRow label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional notes… (optional)"
              className="min-h-16"
            />
          </FieldRow>

          <div className="flex justify-end gap-2 pt-1">
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
              disabled={saving || !isValid}
              className="font-semibold"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : existing ? 'Save Changes' : 'Add Medication'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
