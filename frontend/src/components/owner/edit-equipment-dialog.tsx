import { useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEquipmentStore } from '@/stores/equipmentStore';
import type { EquipmentItem, EquipmentStatus, ConditionReport } from '@/api/equipment';
import { STATUS_COLOURS } from './equipment.types';
import gymEquipmentCatalog from '@/data/gym_equipment.json';

const CATALOG: { id: string; name: string }[] = (gymEquipmentCatalog as { equipment: { id: string; name: string }[] }).equipment;

export { STATUS_COLOURS };

interface Props {
  equipment: EquipmentItem | null;
  onClose: () => void;
  onUpdated: (item: EquipmentItem) => void;
}

function makeSnap(eq: EquipmentItem): string {
  return JSON.stringify({
    name: eq.name,
    brand: eq.brand ?? '',
    quantity: String(eq.quantity),
    note: eq.note ?? '',
    trackCondition: eq.trackCondition,
    status: eq.status,
    nextServiceDate: eq.nextServiceDate ?? '',
  });
}

interface State {
  name: string;
  brand: string;
  quantity: string;
  note: string;
  trackCondition: boolean;
  status: EquipmentStatus;
  nextServiceDate: string;
  suggestions: { id: string; name: string }[];
  saving: boolean;
  snapshot: string;
  reports: ConditionReport[];
  loadingReports: boolean;
  editingStatus: boolean;
  draftStatus: EquipmentStatus;
  savingStatus: boolean;
  showReportForm: boolean;
  reportNote: string;
  submittingReport: boolean;
  activeTab: 'details' | 'condition';
}

type Action =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_BRAND'; value: string }
  | { type: 'SET_QUANTITY'; value: string }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_TRACK_CONDITION'; value: boolean }
  | { type: 'SET_STATUS'; value: EquipmentStatus }
  | { type: 'SET_NEXT_SERVICE_DATE'; value: string }
  | { type: 'SET_SUGGESTIONS'; value: { id: string; name: string }[] }
  | { type: 'SET_SAVING'; value: boolean }
  | { type: 'SET_SNAPSHOT'; value: string }
  | { type: 'SET_REPORTS'; value: ConditionReport[] }
  | { type: 'SET_LOADING_REPORTS'; value: boolean }
  | { type: 'SET_EDITING_STATUS'; value: boolean }
  | { type: 'SET_DRAFT_STATUS'; value: EquipmentStatus }
  | { type: 'SET_SAVING_STATUS'; value: boolean }
  | { type: 'SET_SHOW_REPORT_FORM'; value: boolean }
  | { type: 'SET_REPORT_NOTE'; value: string }
  | { type: 'SET_SUBMITTING_REPORT'; value: boolean }
  | { type: 'SET_TAB'; value: 'details' | 'condition' }
  | { type: 'RESET_FOR_EQUIPMENT'; equipment: EquipmentItem };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_BRAND': return { ...state, brand: action.value };
    case 'SET_QUANTITY': return { ...state, quantity: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_TRACK_CONDITION': return { ...state, trackCondition: action.value };
    case 'SET_STATUS': return { ...state, status: action.value };
    case 'SET_NEXT_SERVICE_DATE': return { ...state, nextServiceDate: action.value };
    case 'SET_SUGGESTIONS': return { ...state, suggestions: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    case 'SET_SNAPSHOT': return { ...state, snapshot: action.value };
    case 'SET_REPORTS': return { ...state, reports: action.value };
    case 'SET_LOADING_REPORTS': return { ...state, loadingReports: action.value };
    case 'SET_EDITING_STATUS': return { ...state, editingStatus: action.value };
    case 'SET_DRAFT_STATUS': return { ...state, draftStatus: action.value };
    case 'SET_SAVING_STATUS': return { ...state, savingStatus: action.value };
    case 'SET_SHOW_REPORT_FORM': return { ...state, showReportForm: action.value };
    case 'SET_REPORT_NOTE': return { ...state, reportNote: action.value };
    case 'SET_SUBMITTING_REPORT': return { ...state, submittingReport: action.value };
    case 'SET_TAB': return { ...state, activeTab: action.value };
    case 'RESET_FOR_EQUIPMENT': {
      const eq = action.equipment;
      return {
        ...state,
        name: eq.name,
        brand: eq.brand ?? '',
        quantity: String(eq.quantity),
        note: eq.note ?? '',
        trackCondition: eq.trackCondition,
        status: eq.status,
        nextServiceDate: eq.nextServiceDate ? eq.nextServiceDate.slice(0, 10) : '',
        suggestions: [],
        snapshot: makeSnap(eq),
        reports: [],
        loadingReports: true,
        editingStatus: false,
        draftStatus: eq.status,
        showReportForm: false,
        reportNote: '',
        activeTab: 'details',
      };
    }
    default: return state;
  }
}

const initialState: State = {
  name: '', brand: '', quantity: '1', note: '', trackCondition: false,
  status: 'active', nextServiceDate: '', suggestions: [], saving: false,
  snapshot: '', reports: [], loadingReports: false, editingStatus: false,
  draftStatus: 'active', savingStatus: false, showReportForm: false,
  reportNote: '', submittingReport: false, activeTab: 'details',
};

export function EditEquipmentDialog({ equipment, onClose, onUpdated }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    name, brand, quantity, note, trackCondition, status, nextServiceDate,
    suggestions, saving, snapshot, reports, loadingReports,
    editingStatus, draftStatus, savingStatus, showReportForm, reportNote, submittingReport, activeTab,
  } = state;

  const storeUpdate = useEquipmentStore((s) => s.update);
  const storeAddReport = useEquipmentStore((s) => s.addReport);
  const storeGetReports = useEquipmentStore((s) => s.getConditionReports);

  // Reset when equipment changes
  const prevIdRef = useRef<string | null>(null);
  const currentId = equipment?._id ?? null;
  if (currentId !== prevIdRef.current) {
    prevIdRef.current = currentId;
    if (equipment) {
      dispatch({ type: 'RESET_FOR_EQUIPMENT', equipment });
    }
  }

  useEffect(() => {
    if (!equipment) return;
    let cancelled = false;
    storeGetReports(equipment._id)
      .then((data) => {
        if (!cancelled) dispatch({ type: 'SET_REPORTS', value: data });
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load reports');
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: 'SET_LOADING_REPORTS', value: false });
      });
    return () => { cancelled = true; };
  }, [equipment, storeGetReports]);

  const isDirty =
    JSON.stringify({ name, brand, quantity, note, trackCondition, status, nextServiceDate }) !== snapshot;

  function handleNameChange(value: string) {
    dispatch({ type: 'SET_NAME', value });
    if (value.trim().length < 2) { dispatch({ type: 'SET_SUGGESTIONS', value: [] }); return; }
    const lower = value.toLowerCase();
    dispatch({
      type: 'SET_SUGGESTIONS',
      value: CATALOG.filter((e) => e.name.toLowerCase().includes(lower)).slice(0, 8),
    });
  }

  async function handleSave() {
    if (!equipment || !isDirty || !name.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const updated = await storeUpdate(equipment._id, {
        name: name.trim(),
        brand: brand.trim() || null,
        quantity: parseInt(quantity) || 1,
        note: note.trim() || null,
        trackCondition,
        status: trackCondition ? status : 'active',
        nextServiceDate: trackCondition && nextServiceDate ? nextServiceDate : null,
      });
      onUpdated(updated);
      toast.success('Changes saved');
      onClose();
    } catch {
      toast.error('Failed to update equipment');
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  async function handleSaveStatus() {
    if (!equipment || draftStatus === status) {
      dispatch({ type: 'SET_EDITING_STATUS', value: false });
      return;
    }
    dispatch({ type: 'SET_SAVING_STATUS', value: true });
    try {
      const updated = await storeUpdate(equipment._id, { status: draftStatus });
      dispatch({ type: 'SET_STATUS', value: draftStatus });
      const p = JSON.parse(snapshot) as Record<string, unknown>;
      dispatch({ type: 'SET_SNAPSHOT', value: JSON.stringify({ ...p, status: draftStatus }) });
      dispatch({ type: 'SET_EDITING_STATUS', value: false });
      onUpdated(updated);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      dispatch({ type: 'SET_SAVING_STATUS', value: false });
    }
  }

  async function handleAddReport() {
    if (!equipment || !reportNote.trim()) return;
    dispatch({ type: 'SET_SUBMITTING_REPORT', value: true });
    try {
      const created = await storeAddReport(equipment._id, reportNote.trim());
      dispatch({ type: 'SET_REPORTS', value: [created, ...reports] });
      dispatch({ type: 'SET_SHOW_REPORT_FORM', value: false });
      dispatch({ type: 'SET_REPORT_NOTE', value: '' });
      toast.success('Report added');
    } catch {
      toast.error('Failed to add report');
    } finally {
      dispatch({ type: 'SET_SUBMITTING_REPORT', value: false });
    }
  }

  function handleClose() {
    dispatch({ type: 'SET_SUGGESTIONS', value: [] });
    dispatch({ type: 'SET_SHOW_REPORT_FORM', value: false });
    dispatch({ type: 'SET_REPORT_NOTE', value: '' });
    dispatch({ type: 'SET_EDITING_STATUS', value: false });
    onClose();
  }

  const TABS = [
    { value: 'details' as const, label: 'Details' },
    { value: 'condition' as const, label: 'Condition' },
  ];

  return (
    <Dialog open={equipment !== null} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-xl w-full max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-[15px] font-semibold">{equipment?.name}</DialogTitle>
        </DialogHeader>

        {/* Tab strip */}
        <div className="flex border-b border-foreground/[.06] px-6 mt-3 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => dispatch({ type: 'SET_TAB', value: tab.value })}
              className={`px-3 pb-2.5 pt-0 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-foreground/40 hover:text-foreground/65'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {activeTab === 'details' && (
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5 relative">
                <label htmlFor="edit-eq-name" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Name
                </label>
                <Input
                  id="edit-eq-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => dispatch({ type: 'SET_SUGGESTIONS', value: [] }), 150)}
                  placeholder="Search equipment type…"
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-foreground/10 rounded-lg overflow-hidden shadow-xl">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => {
                          dispatch({ type: 'SET_NAME', value: s.name });
                          dispatch({ type: 'SET_SUGGESTIONS', value: [] });
                        }}
                        className="w-full text-left px-3 py-2 text-[13px] text-foreground/65 hover:bg-muted transition-colors"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Brand + Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-eq-brand" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Brand <span className="normal-case text-foreground/40">(optional)</span>
                  </label>
                  <Input id="edit-eq-brand" value={brand} onChange={(e) => dispatch({ type: 'SET_BRAND', value: e.target.value })} placeholder="e.g. Life Fitness" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-eq-qty" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                    Quantity
                  </label>
                  <Input
                    id="edit-eq-qty"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onChange={(e) => dispatch({ type: 'SET_QUANTITY', value: e.target.value })}
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label htmlFor="edit-eq-note" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                  Note <span className="normal-case text-foreground/40">(optional)</span>
                </label>
                <Input id="edit-eq-note" value={note} onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })} placeholder="Location, condition, etc." />
              </div>

              {/* Track Condition */}
              <div className="flex items-center justify-between rounded-lg border border-foreground/10 bg-card px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Track condition status</p>
                  <p className="text-[11px] text-foreground/40 mt-0.5">Enable for machines, disable for consumables like plates</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={trackCondition}
                  aria-label="Track condition status"
                  onClick={() => dispatch({ type: 'SET_TRACK_CONDITION', value: !trackCondition })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${trackCondition ? 'bg-foreground' : 'bg-foreground/20'}`}
                >
                  <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow transition-transform ${trackCondition ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {trackCondition && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-eq-status" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                      Status
                    </label>
                    <select
                      id="edit-eq-status"
                      value={status}
                      onChange={(e) => dispatch({ type: 'SET_STATUS', value: e.target.value as EquipmentStatus })}
                      className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="edit-eq-service-date" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
                      Next Service <span className="normal-case text-foreground/40">(optional)</span>
                    </label>
                    <Input
                      id="edit-eq-service-date"
                      type="date"
                      value={nextServiceDate}
                      onChange={(e) => dispatch({ type: 'SET_NEXT_SERVICE_DATE', value: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !isDirty || !name.trim()}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button variant="ghost" onClick={handleClose} className="text-foreground/65">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Condition tab */}
        {activeTab === 'condition' && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
            {equipment?.trackCondition && (
              <div className="rounded-lg border border-foreground/10 bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Status</span>
                  {!editingStatus && (
                    <button
                      type="button"
                      onClick={() => { dispatch({ type: 'SET_DRAFT_STATUS', value: status }); dispatch({ type: 'SET_EDITING_STATUS', value: true }); }}
                      className="text-[11px] text-foreground/40 hover:text-foreground/65 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingStatus ? (
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={draftStatus}
                      onChange={(e) => dispatch({ type: 'SET_DRAFT_STATUS', value: e.target.value as EquipmentStatus })}
                      className="flex-1 rounded-md border border-foreground/10 bg-card px-3 py-1.5 text-sm text-foreground"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                    <Button onClick={handleSaveStatus} disabled={savingStatus} className="text-xs h-8 px-3">
                      {savingStatus ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="ghost" onClick={() => dispatch({ type: 'SET_EDITING_STATUS', value: false })} className="text-foreground/65 text-xs h-8 px-2">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLOURS[status]}`}>
                      {status}
                    </span>
                  </div>
                )}
              </div>
            )}

            {showReportForm ? (
              <div className="rounded-lg border border-foreground/10 bg-card p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">New Report</p>
                <Input
                  value={reportNote}
                  onChange={(e) => dispatch({ type: 'SET_REPORT_NOTE', value: e.target.value })}
                  placeholder="Describe the condition, issue, or action taken…"
                  autoFocus
                  aria-label="Report note"
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddReport} disabled={submittingReport || !reportNote.trim()} className="text-sm h-8">
                    {submittingReport ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { dispatch({ type: 'SET_SHOW_REPORT_FORM', value: false }); dispatch({ type: 'SET_REPORT_NOTE', value: '' }); }}
                    className="text-foreground/65 text-sm h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: 'SET_SHOW_REPORT_FORM', value: true })}
                className="w-full border border-dashed border-foreground/10 text-foreground/40 hover:text-foreground/65 hover:border-foreground/20 hover:bg-transparent text-sm h-9"
              >
                + Add Report
              </Button>
            )}

            {loadingReports && (
              <p className="text-[12px] text-foreground/40 text-center py-4">Loading…</p>
            )}
            {!loadingReports && reports.length === 0 && (
              <p className="text-[12px] text-foreground/40 text-center py-4">No reports yet.</p>
            )}
            {!loadingReports && reports.length > 0 && (
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r._id} className="rounded-lg border border-foreground/[.06] bg-card px-4 py-3">
                    <span className="text-[11px] text-foreground/40">
                      {new Date(r.reportedAt).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <p className="text-[13px] text-foreground/65 mt-1 leading-relaxed">{r.note}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Close image buttons that may appear on this tab */}
            {equipment?.images && equipment.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {equipment.images.map((url) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="equipment" className="size-14 object-cover rounded-md border border-foreground/10" />
                    <span className="sr-only">Equipment image</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
