import { useMemo, useReducer } from 'react';
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
import { SectionHeader } from '@/components/shared/section-header';
import { Trash2, Check, RotateCcw, Pencil, Loader2 } from 'lucide-react';
import { useMemberHubStore } from '@/stores/memberHubStore';
import type { SerializedInjury, SerializedMedication, SerializedMedicalHistory } from '@/api/member-hub';
import { getDrugWarning } from '@/lib/health/drug-warnings';

// ─── Injury form types ────────────────────────────────────────────────────────

interface InjuryFormData {
  title: string;
  injuryType: string;
  bodyPart: string;
  bodySide: string;
  affectedMovements: string;
  doctorRestrictions: string;
  rehabilitationStatus: string;
  trainerNotes: string;
}

const EMPTY_INJURY_FORM: InjuryFormData = {
  title: '',
  injuryType: '',
  bodyPart: '',
  bodySide: '',
  affectedMovements: '',
  doctorRestrictions: '',
  rehabilitationStatus: '',
  trainerNotes: '',
};

function injuryToForm(injury: SerializedInjury): InjuryFormData {
  return {
    title: injury.title,
    injuryType: injury.injuryType ?? '',
    bodyPart: injury.bodyPart ?? '',
    bodySide: injury.bodySide ?? '',
    affectedMovements: injury.affectedMovements ?? '',
    doctorRestrictions: injury.doctorRestrictions ?? '',
    rehabilitationStatus: injury.rehabilitationStatus ?? '',
    trainerNotes: injury.trainerNotes ?? '',
  };
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const INJURY_TYPE_LABELS: Record<string, string> = {
  acute: 'Acute',
  chronic: 'Chronic',
  post_surgery: 'Post-surgery',
};

const BODY_PART_LABELS: Record<string, string> = {
  knee: 'Knee', shoulder: 'Shoulder', lower_back: 'Lower Back',
  hip: 'Hip', ankle: 'Ankle', wrist: 'Wrist', neck: 'Neck', other: 'Other',
};

const BODY_SIDE_LABELS: Record<string, string> = {
  left: 'Left', right: 'Right', bilateral: 'Bilateral',
};

const REHAB_LABELS: Record<string, string> = {
  not_started: 'Not started', in_progress: 'In progress', cleared: 'Cleared',
};

const PREGNANCY_LABELS: Record<string, string> = {
  'n/a': 'N/A', not_pregnant: 'Not pregnant', pregnant: 'Pregnant', postpartum: 'Postpartum',
};

// ─── Injury client state ──────────────────────────────────────────────────────

interface InjuryClientState {
  sheetOpen: boolean;
  editingInjury: SerializedInjury | null;
  sheetForm: InjuryFormData;
  saving: boolean;
  changingStatusId: string | null;
  deleting: boolean;
  deleteId: string | null;
}

type InjuryClientAction =
  | { type: 'SET_SHEET_OPEN'; value: boolean }
  | { type: 'SET_EDITING_INJURY'; value: SerializedInjury | null }
  | { type: 'SET_SHEET_FORM'; value: InjuryFormData }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_CHANGING_STATUS_ID'; value: string | null }
  | { type: 'SET_DELETING'; value: boolean }
  | { type: 'SET_DELETE_ID'; value: string | null };

function injuryClientReducer(state: InjuryClientState, action: InjuryClientAction): InjuryClientState {
  switch (action.type) {
    case 'SET_SHEET_OPEN': return { ...state, sheetOpen: action.value };
    case 'SET_EDITING_INJURY': return { ...state, editingInjury: action.value };
    case 'SET_SHEET_FORM': return { ...state, sheetForm: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_CHANGING_STATUS_ID': return { ...state, changingStatusId: action.value };
    case 'SET_DELETING': return { ...state, deleting: action.value };
    case 'SET_DELETE_ID': return { ...state, deleteId: action.value };
    default: return state;
  }
}

// ─── Injury Section ───────────────────────────────────────────────────────────

interface InjurySectionProps {
  memberId: string;
  injuries: SerializedInjury[];
}

function InjurySection({ memberId, injuries }: InjurySectionProps) {
  const addInjury = useMemberHubStore((s) => s.addInjury);
  const updateInjuryRecord = useMemberHubStore((s) => s.updateInjuryRecord);
  const deleteInjuryRecord = useMemberHubStore((s) => s.deleteInjuryRecord);

  const [state, dispatch] = useReducer(injuryClientReducer, {
    sheetOpen: false,
    editingInjury: null,
    sheetForm: EMPTY_INJURY_FORM,
    saving: false,
    changingStatusId: null,
    deleting: false,
    deleteId: null,
  });
  const { sheetOpen, editingInjury, sheetForm, saving, changingStatusId, deleting, deleteId } = state;

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
        await updateInjuryRecord(memberId, editingInjury._id, payload);
        toast.success('Injury updated');
      } else {
        await addInjury(memberId, payload);
        toast.success('Injury record added');
      }
      dispatch({ type: 'SET_SHEET_OPEN', value: false });
    } catch {
      toast.error('Failed to save injury');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  async function handleStatusChange(id: string, status: 'active' | 'resolved') {
    dispatch({ type: 'SET_CHANGING_STATUS_ID', value: id });
    try {
      await updateInjuryRecord(memberId, id, { status });
      toast.success(status === 'resolved' ? 'Marked as resolved' : 'Reactivated');
    } catch {
      toast.error('Failed to update');
    } finally {
      dispatch({ type: 'SET_CHANGING_STATUS_ID', value: null });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    dispatch({ type: 'SET_DELETING', value: true });
    try {
      await deleteInjuryRecord(memberId, deleteId);
      dispatch({ type: 'SET_DELETE_ID', value: null });
      toast.success('Record deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      dispatch({ type: 'SET_DELETING', value: false });
    }
  }

  function renderInjury(injury: SerializedInjury, isResolved: boolean) {
    const locationParts = [
      injury.bodyPart ? BODY_PART_LABELS[injury.bodyPart] : null,
      injury.bodySide ? BODY_SIDE_LABELS[injury.bodySide] : null,
    ].filter(Boolean);
    const hasPain = injury.painAtRest !== null || injury.painDuringExercise !== null;

    return (
      <li key={injury._id} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
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
                <span className="bg-red-950/60 text-red-400 text-[10px] rounded-full px-2 py-0.5 shrink-0">Active</span>
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
                {locationParts.join(' · ')}
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
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => openEdit(injury)} className="text-foreground/65 hover:text-foreground">
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isResolved ? 'Reactivate' : 'Mark resolved'}
              onClick={() => { void handleStatusChange(injury._id, isResolved ? 'active' : 'resolved'); }}
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
        </div>
      </li>
    );
  }

  return (
    <>
      <div className="space-y-8 py-6">
        <section className="px-4 sm:px-8">
          <div className="flex items-center justify-between">
            <SectionHeader title="Active Injuries" />
            <Button variant="outline" size="sm" className="text-xs font-medium" onClick={openAdd}>
              + Add
            </Button>
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
      </div>

      {/* Injury Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(v) => dispatch({ type: 'SET_SHEET_OPEN', value: v })}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-0">
            <SheetTitle>{editingInjury ? 'Edit Injury Record' : 'New Injury Record'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">
                Title <span className="ml-1 text-destructive">*</span>
              </label>
              <Input value={sheetForm.title} onChange={(e) => handleFormChange('title', e.target.value)} placeholder="e.g. Left knee ligament strain" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">Injury Type</label>
              <Select value={sheetForm.injuryType} onValueChange={(v) => handleFormChange('injuryType', v ?? '')}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acute">Acute</SelectItem>
                  <SelectItem value="chronic">Chronic</SelectItem>
                  <SelectItem value="post_surgery">Post-surgery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">Body Part</label>
                <Select value={sheetForm.bodyPart} onValueChange={(v) => handleFormChange('bodyPart', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select part" /></SelectTrigger>
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
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">Side</label>
                <Select value={sheetForm.bodySide} onValueChange={(v) => handleFormChange('bodySide', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select side" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="bilateral">Bilateral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">Affected Movements</label>
              <Input value={sheetForm.affectedMovements} onChange={(e) => handleFormChange('affectedMovements', e.target.value)} placeholder="e.g. Avoid squats, jumping" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">Doctor Restrictions</label>
              <Textarea value={sheetForm.doctorRestrictions} onChange={(e) => handleFormChange('doctorRestrictions', e.target.value)} placeholder="Any restrictions from the doctor" className="min-h-[72px]" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">Rehabilitation Status</label>
              <Select value={sheetForm.rehabilitationStatus} onValueChange={(v) => handleFormChange('rehabilitationStatus', v ?? '')}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">Trainer Notes</label>
              <Textarea value={sheetForm.trainerNotes} onChange={(e) => handleFormChange('trainerNotes', e.target.value)} placeholder="Internal notes for training adjustments" className="min-h-[72px]" />
            </div>

            {editingInjury && (
              editingInjury.painAtRest !== null ||
              editingInjury.painDuringExercise !== null ||
              editingInjury.mechanism ||
              editingInjury.aggravatingFactors ||
              editingInjury.relievingFactors ||
              editingInjury.memberNotes
            ) && (
              <div className="rounded-lg bg-muted/50 ring-1 ring-foreground/8 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Member-reported</p>
                {(editingInjury.painAtRest !== null || editingInjury.painDuringExercise !== null) && (
                  <p className="text-xs text-foreground/65">
                    <span className="font-medium text-foreground/80">Pain: </span>
                    {editingInjury.painAtRest !== null && `${editingInjury.painAtRest}/10 at rest`}
                    {editingInjury.painAtRest !== null && editingInjury.painDuringExercise !== null && ' · '}
                    {editingInjury.painDuringExercise !== null && `${editingInjury.painDuringExercise}/10 during exercise`}
                  </p>
                )}
                {editingInjury.memberNotes && (
                  <p className="text-xs text-foreground/65">
                    <span className="font-medium text-foreground/80">Member notes: </span>
                    {editingInjury.memberNotes}
                  </p>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="px-6 pb-6 pt-3 border-t border-border/60 flex flex-row gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_SHEET_OPEN', value: false })} className="text-xs text-foreground/65">
              Cancel
            </Button>
            <Button size="sm" onClick={() => { void handleSave(); }} disabled={saving || !sheetForm.title.trim()} className="text-xs font-semibold">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && dispatch({ type: 'SET_DELETE_ID', value: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete injury record?</DialogTitle>
          <p className="text-xs text-foreground/65 -mt-1">This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_DELETE_ID', value: null })} className="text-xs">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => { void handleConfirmDelete(); }} disabled={deleting} className="text-xs font-semibold">
              {deleting ? <Loader2 className="size-3 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Medications Section ──────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function MedicationsSection({ medications }: { medications: SerializedMedication[] }) {
  return (
    <section className="px-4 sm:px-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Medications</h2>
        <span className="text-[10px] text-foreground/40 bg-muted rounded px-1.5 py-0.5">Member-managed</span>
      </div>

      {medications.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <p className="text-sm text-foreground/65">No medications recorded. The member can add these from their health profile.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {medications.map((med) => {
            const warning = getDrugWarning(med.name);
            return (
              <li key={med._id} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{med.name}</span>
                    {med.status === 'active' ? (
                      <span className="bg-blue-950/50 text-blue-300 text-[10px] rounded-full px-2 py-0.5 shrink-0">
                        {med.duration === 'long_term' ? 'Long-term' : 'Short-term'}
                      </span>
                    ) : (
                      <span className="bg-muted text-foreground/40 text-[10px] rounded-full px-2 py-0.5 shrink-0">Ended</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/65">
                    {med.purpose}
                    {' · Since '}
                    {formatDate(med.startDate)}
                    {med.endDate && ` · Ended ${formatDate(med.endDate)}`}
                  </p>
                  {med.notes && <p className="mt-1 text-xs text-foreground/65">{med.notes}</p>}
                  {warning && (
                    <p className="bg-amber-950/40 text-amber-400 text-[11px] rounded-md px-2 py-1 mt-1.5">{warning}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Medical History Section ──────────────────────────────────────────────────

function GridField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-0.5">{label}</p>
      {value ? (
        <p className="text-sm text-foreground">{value}</p>
      ) : (
        <p className="text-sm text-foreground/40">–</p>
      )}
    </div>
  );
}

function MedicalHistorySection({ history }: { history: SerializedMedicalHistory | null }) {
  return (
    <section className="px-4 sm:px-8 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Medical History</h2>
        <span className="text-[10px] text-foreground/40 bg-muted rounded px-1.5 py-0.5">Member-managed</span>
      </div>

      {!history ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <p className="text-sm text-foreground/65">No medical history recorded.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-4">
          <GridField label="Chronic Conditions" value={history.chronicConditions.length > 0 ? history.chronicConditions.join(', ') : null} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GridField label="Surgeries" value={history.surgeries} />
            <GridField label="Allergies" value={history.allergies} />
            <GridField label="Family History" value={history.familyHistory} />
            <GridField label="Doctor" value={history.currentDoctor} />
            <GridField label="Emergency Contact" value={history.emergencyContact} />
            <GridField label="Pregnancy Status" value={history.pregnancyStatus ? (PREGNANCY_LABELS[history.pregnancyStatus] ?? history.pregnancyStatus) : null} />
          </div>
          <p className="text-[11px] text-foreground/40">
            Last updated{' '}
            {new Date(history.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Health Tab ───────────────────────────────────────────────────────────────

export function HealthTab() {
  const memberId = useMemberHubStore((s) => s.memberId);
  const injuries = useMemberHubStore((s) => s.injuries);
  const medications = useMemberHubStore((s) => s.medications);
  const medicalHistory = useMemberHubStore((s) => s.medicalHistory);

  if (!memberId) return null;

  return (
    <div className="space-y-10">
      <InjurySection memberId={memberId} injuries={injuries} />
      <MedicationsSection medications={medications} />
      <MedicalHistorySection history={medicalHistory} />
    </div>
  );
}
