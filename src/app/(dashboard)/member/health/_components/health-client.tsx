'use client';

import { useMemo, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Check, RotateCcw, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionHeader } from '@/components/shared/section-header';
import { InjurySheet } from './injury-sheet';
import { MedicationDialog } from './medication-dialog';
import { MedicalHistoryInline } from './medical-history-inline';
import type { SerializedInjury, SerializedMedication, SerializedMedicalHistory } from '../page';

interface Props {
  memberId: string;
  initialInjuries: SerializedInjury[];
  initialMedications: SerializedMedication[];
  initialHistory: SerializedMedicalHistory;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Injury Section ──────────────────────────────────────────────────────────

type ConfirmAction =
  | { type: 'resolve'; id: string }
  | { type: 'reopen'; id: string }
  | { type: 'delete-injury'; id: string }
  | { type: 'end-medication'; id: string }
  | { type: 'delete-medication'; id: string };

interface InjurySectionState {
  sheetOpen: boolean;
  editingInjury: SerializedInjury | undefined;
  historyOpen: boolean;
  confirm: ConfirmAction | null;
  actioning: boolean;
}

type InjurySectionAction =
  | { type: 'SET_SHEET_OPEN'; value: boolean }
  | { type: 'SET_EDITING_INJURY'; value: SerializedInjury | undefined }
  | { type: 'SET_HISTORY_OPEN'; value: boolean }
  | { type: 'SET_CONFIRM'; value: ConfirmAction | null }
  | { type: 'SET_ACTIONING'; value: boolean };

function injurySectionReducer(state: InjurySectionState, action: InjurySectionAction): InjurySectionState {
  switch (action.type) {
    case 'SET_SHEET_OPEN': return { ...state, sheetOpen: action.value };
    case 'SET_EDITING_INJURY': return { ...state, editingInjury: action.value };
    case 'SET_HISTORY_OPEN': return { ...state, historyOpen: action.value };
    case 'SET_CONFIRM': return { ...state, confirm: action.value };
    case 'SET_ACTIONING': return { ...state, actioning: action.value };
    default: return state;
  }
}

function InjurySection({
  memberId,
  injuries,
  onInjuriesChange,
}: {
  memberId: string;
  injuries: SerializedInjury[];
  onInjuriesChange: (injuries: SerializedInjury[]) => void;
}) {
  const { refresh } = useRouter();
  const [state, dispatch] = useReducer(injurySectionReducer, {
    sheetOpen: false, editingInjury: undefined, historyOpen: false, confirm: null, actioning: false,
  });
  const { sheetOpen, editingInjury, historyOpen, confirm, actioning } = state;

  const { active, resolved } = useMemo(
    () => ({
      active: injuries.filter((i) => i.status === 'active'),
      resolved: injuries.filter((i) => i.status === 'resolved'),
    }),
    [injuries],
  );

  function openAdd() {
    dispatch({ type: 'SET_EDITING_INJURY', value: undefined });
    dispatch({ type: 'SET_SHEET_OPEN', value: true });
  }

  function openEdit(injury: SerializedInjury) {
    dispatch({ type: 'SET_EDITING_INJURY', value: injury });
    dispatch({ type: 'SET_SHEET_OPEN', value: true });
  }

  function handleSaved(saved: SerializedInjury) {
    onInjuriesChange(
      editingInjury
        ? injuries.map((i) => (i._id === saved._id ? saved : i))
        : [saved, ...injuries],
    );
    refresh();
  }

  async function executeConfirm() {
    if (!confirm) return;
    dispatch({ type: 'SET_ACTIONING', value: true });
    try {
      if (confirm.type === 'resolve') {
        const res = await fetch(`/api/members/${memberId}/injuries/${confirm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'resolved' }),
        });
        if (!res.ok) { toast.error('Failed to resolve'); return; }
        const updated = (await res.json()) as SerializedInjury;
        onInjuriesChange(injuries.map((i) => (i._id === confirm.id ? updated : i)));
        toast.success('Marked as resolved');
        refresh();
      } else if (confirm.type === 'reopen') {
        const res = await fetch(`/api/members/${memberId}/injuries/${confirm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        });
        if (!res.ok) { toast.error('Failed to reopen'); return; }
        const updated = (await res.json()) as SerializedInjury;
        onInjuriesChange(injuries.map((i) => (i._id === confirm.id ? updated : i)));
        toast.success('Injury reopened');
        refresh();
      } else if (confirm.type === 'delete-injury') {
        const res = await fetch(`/api/members/${memberId}/injuries/${confirm.id}`, { method: 'DELETE' });
        if (!res.ok) { toast.error('Failed to delete'); return; }
        onInjuriesChange(injuries.filter((i) => i._id !== confirm.id));
        toast.success('Record deleted');
        refresh();
      }
    } finally {
      dispatch({ type: 'SET_ACTIONING', value: false });
      dispatch({ type: 'SET_CONFIRM', value: null });
    }
  }

  return (
    <section className="px-4 sm:px-8">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader
          title="Injuries"
          tooltip="Log pain and movement restrictions. Both you and your trainer can add entries. You can only delete records you created yourself — contact your trainer to remove theirs."
        />
        <Button variant="outline" size="sm" className="text-xs font-medium" onClick={openAdd}>
          + Report Injury
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <p className="text-sm text-foreground/65">No active injuries</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map((injury) => (
            <li key={injury._id} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-foreground">{injury.title}</span>
                    <Badge variant="destructive" className="text-[10px] px-1.5">Active</Badge>
                    {injury.injuryType && (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {INJURY_TYPE_LABELS[injury.injuryType]}
                      </Badge>
                    )}
                  </div>

                  {(injury.bodyPart || injury.affectedMovements) && (
                    <p className="text-xs text-foreground/65">
                      {[
                        injury.bodyPart && injury.bodySide
                          ? `${BODY_SIDE_LABELS[injury.bodySide]} ${BODY_PART_LABELS[injury.bodyPart]}`
                          : injury.bodyPart
                          ? BODY_PART_LABELS[injury.bodyPart]
                          : null,
                        injury.affectedMovements,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}

                  {injury.painAtRest != null && injury.painDuringExercise != null && (
                    <p className="text-xs text-foreground/65 mt-0.5">
                      Pain: {injury.painAtRest}/10 rest · {injury.painDuringExercise}/10 exercise
                    </p>
                  )}

                  {injury.memberNotes && (
                    <p className="text-xs text-foreground/65 mt-1">
                      <span className="font-medium text-foreground/80">My notes: </span>
                      {injury.memberNotes}
                    </p>
                  )}

                  {injury.trainerNotes && (
                    <p className="text-xs text-foreground/65 mt-0.5">
                      <span className="font-medium text-foreground/40">Trainer notes: </span>
                      {injury.trainerNotes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit injury"
                    onClick={() => openEdit(injury)}
                    className="text-foreground/65 hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mark as resolved"
                    onClick={() => dispatch({ type: 'SET_CONFIRM', value: { type: 'resolve', id: injury._id } })}
                    className="text-foreground/65 hover:text-foreground"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete injury"
                    onClick={() => dispatch({ type: 'SET_CONFIRM', value: { type: 'delete-injury', id: injury._id } })}
                    className="text-foreground/65 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_HISTORY_OPEN', value: !historyOpen })}
            aria-expanded={historyOpen}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-foreground/40 font-semibold hover:text-foreground/65 transition-colors"
          >
            {historyOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            History · {resolved.length} resolved
          </button>

          {historyOpen && (
            <ul className="mt-2 space-y-2">
              {resolved.map((injury) => (
                <li key={injury._id} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 opacity-60">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold text-foreground">{injury.title}</span>
                      </div>
                      {injury.resolvedAt && (
                        <p className="text-xs text-foreground/65">Resolved {formatDate(injury.resolvedAt)}</p>
                      )}
                      {injury.memberNotes && (
                        <p className="text-xs text-foreground/65 mt-0.5">
                          <span className="font-medium text-foreground/80">My notes: </span>
                          {injury.memberNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Reopen injury"
                        onClick={() => dispatch({ type: 'SET_CONFIRM', value: { type: 'reopen', id: injury._id } })}
                        className="text-foreground/65 hover:text-foreground"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete injury"
                        onClick={() => dispatch({ type: 'SET_CONFIRM', value: { type: 'delete-injury', id: injury._id } })}
                        className="text-foreground/65 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <InjurySheet
        key={editingInjury?._id ?? 'new-injury'}
        open={sheetOpen}
        onOpenChange={(v) => dispatch({ type: 'SET_SHEET_OPEN', value: v })}
        memberId={memberId}
        existing={editingInjury}
        onSaved={handleSaved}
      />

      {/* Resolve confirm */}
      <Dialog open={confirm?.type === 'resolve'} onOpenChange={(o) => !o && dispatch({ type: 'SET_CONFIRM', value: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Mark as resolved?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">
            This will move the record to History. You can reopen it anytime.
          </p>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_CONFIRM', value: null })} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={executeConfirm} disabled={actioning} className="text-xs font-semibold">
              {actioning ? <Loader2 className="size-3 animate-spin" /> : 'Mark Resolved'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reopen confirm */}
      <Dialog open={confirm?.type === 'reopen'} onOpenChange={(o) => !o && dispatch({ type: 'SET_CONFIRM', value: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Reopen this injury?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">
            Use this if the issue has returned.
          </p>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_CONFIRM', value: null })} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={executeConfirm} disabled={actioning} className="text-xs font-semibold">
              {actioning ? <Loader2 className="size-3 animate-spin" /> : 'Reopen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete injury confirm */}
      <Dialog open={confirm?.type === 'delete-injury'} onOpenChange={(o) => !o && dispatch({ type: 'SET_CONFIRM', value: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete this record?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_CONFIRM', value: null })} className="text-xs">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={executeConfirm} disabled={actioning} className="text-xs font-semibold">
              {actioning ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── Medication Section ───────────────────────────────────────────────────────

interface MedicationSectionState {
  dialogOpen: boolean;
  editingMed: SerializedMedication | undefined;
  endedOpen: boolean;
  confirm: ConfirmAction | null;
  actioning: boolean;
}

type MedicationSectionAction =
  | { type: 'SET_DIALOG_OPEN'; value: boolean }
  | { type: 'SET_EDITING_MED'; value: SerializedMedication | undefined }
  | { type: 'SET_ENDED_OPEN'; value: boolean }
  | { type: 'SET_CONFIRM'; value: ConfirmAction | null }
  | { type: 'SET_ACTIONING'; value: boolean };

function medicationSectionReducer(state: MedicationSectionState, action: MedicationSectionAction): MedicationSectionState {
  switch (action.type) {
    case 'SET_DIALOG_OPEN': return { ...state, dialogOpen: action.value };
    case 'SET_EDITING_MED': return { ...state, editingMed: action.value };
    case 'SET_ENDED_OPEN': return { ...state, endedOpen: action.value };
    case 'SET_CONFIRM': return { ...state, confirm: action.value };
    case 'SET_ACTIONING': return { ...state, actioning: action.value };
    default: return state;
  }
}

function MedicationSection({
  memberId,
  medications,
  onMedicationsChange,
}: {
  memberId: string;
  medications: SerializedMedication[];
  onMedicationsChange: (medications: SerializedMedication[]) => void;
}) {
  const { refresh } = useRouter();
  const [state, dispatch] = useReducer(medicationSectionReducer, {
    dialogOpen: false, editingMed: undefined, endedOpen: false, confirm: null, actioning: false,
  });
  const { dialogOpen, editingMed, endedOpen, confirm, actioning } = state;

  const { active, ended } = useMemo(
    () => ({
      active: medications.filter((m) => m.status === 'active'),
      ended: medications.filter((m) => m.status === 'ended'),
    }),
    [medications],
  );

  function openAdd() {
    dispatch({ type: 'SET_EDITING_MED', value: undefined });
    dispatch({ type: 'SET_DIALOG_OPEN', value: true });
  }

  function openEdit(med: SerializedMedication) {
    dispatch({ type: 'SET_EDITING_MED', value: med });
    dispatch({ type: 'SET_DIALOG_OPEN', value: true });
  }

  function handleSaved(saved: SerializedMedication) {
    onMedicationsChange(
      editingMed
        ? medications.map((m) => (m._id === saved._id ? saved : m))
        : [saved, ...medications],
    );
    refresh();
  }

  async function executeConfirm() {
    if (!confirm) return;
    dispatch({ type: 'SET_ACTIONING', value: true });
    try {
      if (confirm.type === 'end-medication') {
        const res = await fetch(`/api/members/${memberId}/medications/${confirm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ended' }),
        });
        if (!res.ok) { toast.error('Failed to end medication'); return; }
        const updated = (await res.json()) as SerializedMedication;
        onMedicationsChange(medications.map((m) => (m._id === confirm.id ? updated : m)));
        toast.success('Medication marked as ended');
        refresh();
      } else if (confirm.type === 'delete-medication') {
        const res = await fetch(`/api/members/${memberId}/medications/${confirm.id}`, { method: 'DELETE' });
        if (!res.ok) { toast.error('Failed to delete'); return; }
        onMedicationsChange(medications.filter((m) => m._id !== confirm.id));
        toast.success('Medication record deleted');
        refresh();
      }
    } finally {
      dispatch({ type: 'SET_ACTIONING', value: false });
      dispatch({ type: 'SET_CONFIRM', value: null });
    }
  }

  return (
    <section className="px-4 sm:px-8">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader
          title="Medications"
          tooltip="List all current medications, supplements, and short-term pain relief. Your trainer uses this to safely adjust exercise intensity — for example, beta blockers affect how heart rate targets are set."
        />
        <Button variant="outline" size="sm" className="text-xs font-medium" onClick={openAdd}>
          + Add Medication
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <p className="text-sm text-foreground/65">No active medications</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map((med) => (
            <li key={med._id} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-foreground">{med.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {med.duration === 'long_term' ? 'Long-term' : 'Short-term'}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/65">
                    {med.purpose} · Since {formatDate(med.startDate)}
                  </p>
                  {med.notes && (
                    <p className="text-xs text-foreground/65 mt-0.5">{med.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit medication"
                    onClick={() => openEdit(med)}
                    className="text-foreground/65 hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="End medication"
                    onClick={() => dispatch({ type: 'SET_CONFIRM', value: { type: 'end-medication', id: med._id } })}
                    className="text-foreground/65 hover:text-foreground"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete medication"
                    onClick={() => dispatch({ type: 'SET_CONFIRM', value: { type: 'delete-medication', id: med._id } })}
                    className="text-foreground/65 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {ended.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ENDED_OPEN', value: !endedOpen })}
            aria-expanded={endedOpen}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-foreground/40 font-semibold hover:text-foreground/65 transition-colors"
          >
            {endedOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Ended · {ended.length}
          </button>

          {endedOpen && (
            <ul className="mt-2 space-y-2">
              {ended.map((med) => (
                <li key={med._id} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 opacity-60">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground">{med.name}</span>
                      <p className="text-xs text-foreground/65 mt-0.5">
                        {med.purpose} · Since {formatDate(med.startDate)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete medication"
                      onClick={() => dispatch({ type: 'SET_CONFIRM', value: { type: 'delete-medication', id: med._id } })}
                      className="text-foreground/65 hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <MedicationDialog
        key={editingMed?._id ?? 'new-medication'}
        open={dialogOpen}
        onOpenChange={(v) => dispatch({ type: 'SET_DIALOG_OPEN', value: v })}
        memberId={memberId}
        existing={editingMed}
        onSaved={handleSaved}
      />

      {/* End confirm */}
      <Dialog open={confirm?.type === 'end-medication'} onOpenChange={(o) => !o && dispatch({ type: 'SET_CONFIRM', value: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Mark as ended?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">This will move it to the Ended section.</p>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_CONFIRM', value: null })} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={executeConfirm} disabled={actioning} className="text-xs font-semibold">
              {actioning ? <Loader2 className="size-3 animate-spin" /> : 'Mark Ended'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirm?.type === 'delete-medication'} onOpenChange={(o) => !o && dispatch({ type: 'SET_CONFIRM', value: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete this medication record?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_CONFIRM', value: null })} className="text-xs">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={executeConfirm} disabled={actioning} className="text-xs font-semibold">
              {actioning ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function HealthClient({ memberId, initialInjuries, initialMedications, initialHistory }: Props) {
  const [injuries, setInjuries] = useState(initialInjuries);
  const [medications, setMedications] = useState(initialMedications);
  const [history, setHistory] = useState(initialHistory);

  return (
    <div className="space-y-8 pb-10">
      <InjurySection
        memberId={memberId}
        injuries={injuries}
        onInjuriesChange={setInjuries}
      />

      <MedicationSection
        memberId={memberId}
        medications={medications}
        onMedicationsChange={setMedications}
      />

      <section className="px-4 sm:px-8">
        <div className="mb-3">
          <SectionHeader
            title="Medical Background"
            tooltip="Your one-time health profile — chronic conditions, surgeries, allergies, and emergency contact. Fill this in once and keep it updated. Your trainer uses it to programme safely and respond correctly in an emergency."
          />
        </div>
        <MedicalHistoryInline
          memberId={memberId}
          initialHistory={history}
          onUpdated={setHistory}
        />
      </section>
    </div>
  );
}
