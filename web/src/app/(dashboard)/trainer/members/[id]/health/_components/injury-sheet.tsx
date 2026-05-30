'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { SerializedInjury } from '../page';
import type { InjuryFormData } from './injury-sheet.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SerializedInjury | null;
  form: InjuryFormData;
  onFormChange: (field: keyof InjuryFormData, value: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

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
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

export function InjurySheet({ open, onOpenChange, editing, form, onFormChange, onSave, saving }: Props) {
  const hasMemberData = editing && (
    editing.painAtRest !== null ||
    editing.painDuringExercise !== null ||
    editing.mechanism ||
    editing.aggravatingFactors ||
    editing.relievingFactors ||
    editing.memberNotes
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{editing ? 'Edit Injury Record' : 'New Injury Record'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <FieldRow label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => onFormChange('title', e.target.value)}
              placeholder="e.g. Left knee ligament strain"
            />
          </FieldRow>

          <FieldRow label="Injury Type">
            <Select value={form.injuryType} onValueChange={(v) => onFormChange('injuryType', v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acute">Acute</SelectItem>
                <SelectItem value="chronic">Chronic</SelectItem>
                <SelectItem value="post_surgery">Post-surgery</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Body Part">
              <Select value={form.bodyPart} onValueChange={(v) => onFormChange('bodyPart', v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select part" />
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

            <FieldRow label="Side">
              <Select value={form.bodySide} onValueChange={(v) => onFormChange('bodySide', v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="bilateral">Bilateral</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <FieldRow label="Affected Movements">
            <Input
              value={form.affectedMovements}
              onChange={(e) => onFormChange('affectedMovements', e.target.value)}
              placeholder="e.g. Avoid squats, jumping"
            />
          </FieldRow>

          <FieldRow label="Doctor Restrictions">
            <Textarea
              value={form.doctorRestrictions}
              onChange={(e) => onFormChange('doctorRestrictions', e.target.value)}
              placeholder="Any restrictions from the doctor"
              className="min-h-[72px]"
            />
          </FieldRow>

          <FieldRow label="Rehabilitation Status">
            <Select
              value={form.rehabilitationStatus}
              onValueChange={(v) => onFormChange('rehabilitationStatus', v ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not started</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Trainer Notes">
            <Textarea
              value={form.trainerNotes}
              onChange={(e) => onFormChange('trainerNotes', e.target.value)}
              placeholder="Internal notes for training adjustments"
              className="min-h-[72px]"
            />
          </FieldRow>

          {hasMemberData && (
            <div className="rounded-lg bg-muted/50 ring-1 ring-foreground/8 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
                Member-reported
              </p>
              {(editing.painAtRest !== null || editing.painDuringExercise !== null) && (
                <p className="text-xs text-foreground/65">
                  <span className="font-medium text-foreground/80">Pain: </span>
                  {editing.painAtRest !== null && `${editing.painAtRest}/10 at rest`}
                  {editing.painAtRest !== null && editing.painDuringExercise !== null && ' · '}
                  {editing.painDuringExercise !== null && `${editing.painDuringExercise}/10 during exercise`}
                </p>
              )}
              {editing.mechanism && (
                <p className="text-xs text-foreground/65">
                  <span className="font-medium text-foreground/80">Mechanism: </span>
                  {editing.mechanism}
                </p>
              )}
              {editing.aggravatingFactors && (
                <p className="text-xs text-foreground/65">
                  <span className="font-medium text-foreground/80">Aggravating: </span>
                  {editing.aggravatingFactors}
                </p>
              )}
              {editing.relievingFactors && (
                <p className="text-xs text-foreground/65">
                  <span className="font-medium text-foreground/80">Relieving: </span>
                  {editing.relievingFactors}
                </p>
              )}
              {editing.memberNotes && (
                <p className="text-xs text-foreground/65">
                  <span className="font-medium text-foreground/80">Member notes: </span>
                  {editing.memberNotes}
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="px-6 pb-6 pt-3 border-t border-border/60 flex flex-row gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-foreground/65"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="text-xs font-semibold"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
