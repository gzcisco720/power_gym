'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionHeader } from '@/components/shared/section-header';
import { Trash2, Check, RotateCcw, Pencil, Loader2 } from 'lucide-react';
import { InjurySheet } from './injury-sheet';
import { EMPTY_INJURY_FORM, injuryToForm } from './injury-sheet.types';
import type { InjuryFormData } from './injury-sheet.types';
import type { SerializedInjury } from '../page';

interface Props {
  memberId: string;
  initialInjuries: SerializedInjury[];
  userRole: 'owner' | 'trainer' | 'member';
}

const INJURY_TYPE_LABELS: Record<string, string> = {
  acute: 'Acute',
  chronic: 'Chronic',
  post_surgery: 'Post-surgery',
};

const BODY_PART_LABELS: Record<string, string> = {
  knee: 'Knee',
  shoulder: 'Shoulder',
  lower_back: 'Lower Back',
  hip: 'Hip',
  ankle: 'Ankle',
  wrist: 'Wrist',
  neck: 'Neck',
  other: 'Other',
};

const BODY_SIDE_LABELS: Record<string, string> = {
  left: 'Left',
  right: 'Right',
  bilateral: 'Bilateral',
};

const REHAB_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  cleared: 'Cleared',
};

export function InjuryClient({ memberId, initialInjuries, userRole }: Props) {
  const router = useRouter();
  const [injuries, setInjuries] = useState(initialInjuries);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInjury, setEditingInjury] = useState<SerializedInjury | null>(null);
  const [sheetForm, setSheetForm] = useState<InjuryFormData>(EMPTY_INJURY_FORM);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [memberNoteDraft, setMemberNoteDraft] = useState('');

  const canEdit = userRole === 'trainer' || userRole === 'owner';
  const { active, resolved } = useMemo(
    () => ({
      active: injuries.filter((i) => i.status === 'active'),
      resolved: injuries.filter((i) => i.status === 'resolved'),
    }),
    [injuries],
  );

  function openAdd() {
    setEditingInjury(null);
    setSheetForm(EMPTY_INJURY_FORM);
    setSheetOpen(true);
  }

  function openEdit(injury: SerializedInjury) {
    setEditingInjury(injury);
    setSheetForm(injuryToForm(injury));
    setSheetOpen(true);
  }

  function handleFormChange(field: keyof InjuryFormData, value: string) {
    setSheetForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    const data = sheetForm;
    if (!data.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: data.title.trim(),
        injuryType: data.injuryType || null,
        bodyPart: data.bodyPart || null,
        bodySide: data.bodySide || null,
        affectedMovements: data.affectedMovements.trim() || null,
        doctorRestrictions: data.doctorRestrictions.trim() || null,
        rehabilitationStatus: data.rehabilitationStatus || null,
        trainerNotes: data.trainerNotes.trim() || null,
      };

      if (editingInjury) {
        const res = await fetch(`/api/members/${memberId}/injuries/${editingInjury._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          toast.error(d.error ?? 'Failed to update');
          return;
        }
        const updated = (await res.json()) as SerializedInjury;
        setInjuries((prev) => prev.map((i) => (i._id === editingInjury._id ? updated : i)));
        toast.success('Injury updated');
      } else {
        const res = await fetch(`/api/members/${memberId}/injuries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          toast.error(d.error ?? 'Failed to add');
          return;
        }
        const created = (await res.json()) as SerializedInjury;
        setInjuries((prev) => [created, ...prev]);
        toast.success('Injury record added');
      }

      setSheetOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: 'active' | 'resolved') {
    setChangingStatusId(id);
    try {
      const res = await fetch(`/api/members/${memberId}/injuries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error('Failed to update'); return; }
      const updated = (await res.json()) as SerializedInjury;
      setInjuries((prev) => prev.map((i) => (i._id === id ? updated : i)));
      toast.success(status === 'resolved' ? 'Marked as resolved' : 'Reactivated');
      router.refresh();
    } finally {
      setChangingStatusId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${memberId}/injuries/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete'); return; }
      setInjuries((prev) => prev.filter((i) => i._id !== deleteId));
      setDeleteId(null);
      toast.success('Record deleted');
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveMemberNotes(id: string) {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/members/${memberId}/injuries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberNotes: memberNoteDraft.trim() || null }),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      const updated = (await res.json()) as SerializedInjury;
      setInjuries((prev) => prev.map((i) => (i._id === id ? updated : i)));
      setEditingNotesId(null);
      toast.success('Notes saved');
    } finally {
      setSavingNotes(false);
    }
  }

  function renderInjury(injury: SerializedInjury, isResolved: boolean) {
    const isEditingNotes = editingNotesId === injury._id;
    const locationParts = [
      injury.bodyPart ? BODY_PART_LABELS[injury.bodyPart] : null,
      injury.bodySide ? BODY_SIDE_LABELS[injury.bodySide] : null,
    ].filter(Boolean);
    const hasPain = injury.painAtRest !== null || injury.painDuringExercise !== null;

    return (
      <li
        key={injury._id}
        className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{injury.title}</p>
              {isResolved ? (
                <span className="bg-muted text-foreground/40 text-[10px] rounded-full px-2 py-0.5 shrink-0">
                  Resolved{injury.resolvedAt
                    ? ` ${new Date(injury.resolvedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    : ''}
                </span>
              ) : (
                <span className="bg-red-950/60 text-red-400 text-[10px] rounded-full px-2 py-0.5 shrink-0">
                  Active
                </span>
              )}
              {injury.injuryType && (
                <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-foreground/65 shrink-0">
                  {INJURY_TYPE_LABELS[injury.injuryType]}
                </span>
              )}
              {injury.rehabilitationStatus && (
                <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-foreground/65 shrink-0">
                  Rehab: {REHAB_LABELS[injury.rehabilitationStatus]}
                </span>
              )}
            </div>

            {(locationParts.length > 0 || injury.affectedMovements) && (
              <p className="mt-0.5 text-xs text-foreground/65">
                {locationParts.length > 0 && locationParts.join(' · ')}
                {locationParts.length > 0 && injury.affectedMovements && ' · '}
                {injury.affectedMovements}
              </p>
            )}

            {hasPain && (
              <p className="mt-0.5 text-xs text-foreground/65">
                <span className="font-medium text-foreground/80">Pain: </span>
                {injury.painAtRest !== null && `${injury.painAtRest}/10 rest`}
                {injury.painAtRest !== null && injury.painDuringExercise !== null && ' · '}
                {injury.painDuringExercise !== null && `${injury.painDuringExercise}/10 exercise`}
              </p>
            )}

            {injury.trainerNotes && (
              <p className="mt-1 text-xs text-foreground/65">
                <span className="font-medium text-foreground/80">Trainer notes: </span>
                {injury.trainerNotes}
              </p>
            )}

            {userRole !== 'member' && injury.memberNotes && (
              <p className="mt-1 text-xs text-foreground/65">
                <span className="font-medium text-foreground/80">Member notes: </span>
                {injury.memberNotes}
              </p>
            )}
          </div>

          {canEdit && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit"
                onClick={() => openEdit(injury)}
                className="text-foreground/65 hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={isResolved ? 'Reactivate' : 'Mark resolved'}
                onClick={() => handleStatusChange(injury._id, isResolved ? 'active' : 'resolved')}
                disabled={changingStatusId === injury._id}
                className="text-foreground/65 hover:text-foreground"
              >
                {changingStatusId === injury._id
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : isResolved ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete"
                onClick={() => setDeleteId(injury._id)}
                className="text-foreground/65 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {userRole === 'member' && (
          <div className="mt-2">
            {isEditingNotes ? (
              <div className="flex gap-2">
                <Input
                  value={memberNoteDraft}
                  onChange={(e) => setMemberNoteDraft(e.target.value)}
                  className="text-xs h-7"
                  placeholder="Your notes…"
                />
                <Button
                  onClick={() => handleSaveMemberNotes(injury._id)}
                  disabled={savingNotes}
                  size="sm"
                  className="text-xs"
                >
                  {savingNotes ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingNotesId(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingNotesId(injury._id);
                  setMemberNoteDraft(injury.memberNotes ?? '');
                }}
                className="inline-flex items-center gap-1 text-xs text-foreground/65 hover:text-foreground transition-colors"
              >
                <Pencil className="size-3" />
                {injury.memberNotes ? `My notes: ${injury.memberNotes}` : 'Add my notes'}
              </button>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-8 py-6">
      <section className="px-4 sm:px-8">
        <div className="flex items-center justify-between">
          <SectionHeader title="Active Injuries" />
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={openAdd}
            >
              + Add
            </Button>
          )}
        </div>

        {active.length === 0 ? (
          <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <p className="text-sm text-foreground/65">No active injuries</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">{active.map((i) => renderInjury(i, false))}</ul>
        )}
      </section>

      <section className="px-4 sm:px-8">
        <SectionHeader title="Resolved" />
        {resolved.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/65">No resolved records</p>
        ) : (
          <ul className="mt-3 space-y-2">{resolved.map((i) => renderInjury(i, true))}</ul>
        )}
      </section>

      <InjurySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editingInjury}
        form={sheetForm}
        onFormChange={handleFormChange}
        onSave={handleSave}
        saving={saving}
      />

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete injury record?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="text-xs font-semibold"
            >
              {deleting ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
