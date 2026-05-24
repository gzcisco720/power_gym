'use client';

import { useMemo, useReducer } from 'react';
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

interface InjuryClientState {
  injuries: SerializedInjury[];
  sheetOpen: boolean;
  editingInjury: SerializedInjury | null;
  sheetForm: InjuryFormData;
  saving: boolean;
  changingStatusId: string | null;
  deleting: boolean;
  savingNotes: boolean;
  deleteId: string | null;
  editingNotesId: string | null;
  memberNoteDraft: string;
}

type InjuryClientAction =
  | { type: 'SET_INJURIES'; value: SerializedInjury[] }
  | { type: 'SET_SHEET_OPEN'; value: boolean }
  | { type: 'SET_EDITING_INJURY'; value: SerializedInjury | null }
  | { type: 'SET_SHEET_FORM'; value: InjuryFormData }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_CHANGING_STATUS_ID'; value: string | null }
  | { type: 'SET_DELETING'; value: boolean }
  | { type: 'SET_SAVING_NOTES'; value: boolean }
  | { type: 'SET_DELETE_ID'; value: string | null }
  | { type: 'SET_EDITING_NOTES_ID'; value: string | null }
  | { type: 'SET_MEMBER_NOTE_DRAFT'; value: string };

function injuryClientReducer(state: InjuryClientState, action: InjuryClientAction): InjuryClientState {
  switch (action.type) {
    case 'SET_INJURIES': return { ...state, injuries: action.value };
    case 'SET_SHEET_OPEN': return { ...state, sheetOpen: action.value };
    case 'SET_EDITING_INJURY': return { ...state, editingInjury: action.value };
    case 'SET_SHEET_FORM': return { ...state, sheetForm: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_CHANGING_STATUS_ID': return { ...state, changingStatusId: action.value };
    case 'SET_DELETING': return { ...state, deleting: action.value };
    case 'SET_SAVING_NOTES': return { ...state, savingNotes: action.value };
    case 'SET_DELETE_ID': return { ...state, deleteId: action.value };
    case 'SET_EDITING_NOTES_ID': return { ...state, editingNotesId: action.value };
    case 'SET_MEMBER_NOTE_DRAFT': return { ...state, memberNoteDraft: action.value };
    default: return state;
  }
}

export function InjuryClient({ memberId, initialInjuries, userRole }: Props) {
  const { refresh } = useRouter();
  const [state, dispatch] = useReducer(injuryClientReducer, {
    injuries: initialInjuries,
    sheetOpen: false,
    editingInjury: null,
    sheetForm: EMPTY_INJURY_FORM,
    saving: false,
    changingStatusId: null,
    deleting: false,
    savingNotes: false,
    deleteId: null,
    editingNotesId: null,
    memberNoteDraft: '',
  });
  const { injuries, sheetOpen, editingInjury, sheetForm, saving, changingStatusId, deleting, savingNotes, deleteId, editingNotesId, memberNoteDraft } = state;

  const canEdit = userRole === 'trainer' || userRole === 'owner';
  const { active, resolved } = useMemo(
    () => ({
      active: injuries.filter((i) => i.status === 'active'),
      resolved: injuries.filter((i) => i.status === 'resolved'),
    }),
    [injuries],
  );

  function openAdd() {
    dispatch({ type: 'SET_EDITING_INJURY', value: null });
    dispatch({ type: 'SET_SHEET_FORM', value: EMPTY_INJURY_FORM });
    dispatch({ type: 'SET_SHEET_OPEN', value: true });
  }

  function openEdit(injury: SerializedInjury) {
    dispatch({ type: 'SET_EDITING_INJURY', value: injury });
    dispatch({ type: 'SET_SHEET_FORM', value: injuryToForm(injury) });
    dispatch({ type: 'SET_SHEET_OPEN', value: true });
  }

  function handleFormChange(field: keyof InjuryFormData, value: string) {
    dispatch({ type: 'SET_SHEET_FORM', value: { ...sheetForm, [field]: value } });
  }

  async function handleSave() {
    const data = sheetForm;
    if (!data.title.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
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
        dispatch({ type: 'SET_INJURIES', value: injuries.map((i) => (i._id === editingInjury._id ? updated : i)) });
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
        dispatch({ type: 'SET_INJURIES', value: [created, ...injuries] });
        toast.success('Injury record added');
      }

      dispatch({ type: 'SET_SHEET_OPEN', value: false });
      refresh();
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  async function handleStatusChange(id: string, status: 'active' | 'resolved') {
    dispatch({ type: 'SET_CHANGING_STATUS_ID', value: id });
    try {
      const res = await fetch(`/api/members/${memberId}/injuries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error('Failed to update'); return; }
      const updated = (await res.json()) as SerializedInjury;
      dispatch({ type: 'SET_INJURIES', value: injuries.map((i) => (i._id === id ? updated : i)) });
      toast.success(status === 'resolved' ? 'Marked as resolved' : 'Reactivated');
      refresh();
    } finally {
      dispatch({ type: 'SET_CHANGING_STATUS_ID', value: null });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    dispatch({ type: 'SET_DELETING', value: true });
    try {
      const res = await fetch(`/api/members/${memberId}/injuries/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete'); return; }
      dispatch({ type: 'SET_INJURIES', value: injuries.filter((i) => i._id !== deleteId) });
      dispatch({ type: 'SET_DELETE_ID', value: null });
      toast.success('Record deleted');
      refresh();
    } finally {
      dispatch({ type: 'SET_DELETING', value: false });
    }
  }

  async function handleSaveMemberNotes(id: string) {
    dispatch({ type: 'SET_SAVING_NOTES', value: true });
    try {
      const res = await fetch(`/api/members/${memberId}/injuries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberNotes: memberNoteDraft.trim() || null }),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      const updated = (await res.json()) as SerializedInjury;
      dispatch({ type: 'SET_INJURIES', value: injuries.map((i) => (i._id === id ? updated : i)) });
      dispatch({ type: 'SET_EDITING_NOTES_ID', value: null });
      toast.success('Notes saved');
    } finally {
      dispatch({ type: 'SET_SAVING_NOTES', value: false });
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
                onClick={() => dispatch({ type: 'SET_DELETE_ID', value: injury._id })}
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
                  onChange={(e) => dispatch({ type: 'SET_MEMBER_NOTE_DRAFT', value: e.target.value })}
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
                  onClick={() => dispatch({ type: 'SET_EDITING_NOTES_ID', value: null })}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_EDITING_NOTES_ID', value: injury._id });
                  dispatch({ type: 'SET_MEMBER_NOTE_DRAFT', value: injury.memberNotes ?? '' });
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
        onOpenChange={(v) => dispatch({ type: 'SET_SHEET_OPEN', value: v })}
        editing={editingInjury}
        form={sheetForm}
        onFormChange={handleFormChange}
        onSave={handleSave}
        saving={saving}
      />

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && dispatch({ type: 'SET_DELETE_ID', value: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete injury record?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'SET_DELETE_ID', value: null })}
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
