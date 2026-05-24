'use client';

import { useRef, useReducer, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getEquipmentImageSignatureAction } from '../actions';
import { uploadFile } from '@/lib/storage/upload-file';
import { STATUS_COLOURS } from './equipment.types';
import type { EquipmentItem } from './equipment.types';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';
import gymEquipmentCatalog from '@/../context/data/gym_equipment.json';

const CATALOG: { id: string; name: string }[] = gymEquipmentCatalog.equipment;

interface ConditionReport {
  _id: string;
  note: string;
  reportedAt: string;
}

function makeSnap(eq: EquipmentItem): string {
  return JSON.stringify({
    name: eq.name,
    brand: eq.brand ?? '',
    quantity: String(eq.quantity),
    note: eq.note ?? '',
    images: eq.images ?? [],
    trackCondition: eq.trackCondition,
    status: eq.status,
  });
}

interface EditEquipmentState {
  name: string;
  brand: string;
  quantity: string;
  note: string;
  images: string[];
  trackCondition: boolean;
  status: EquipmentStatus;
  suggestions: { id: string; name: string }[];
  uploadingImages: boolean;
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
}

type EditEquipmentAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_BRAND'; value: string }
  | { type: 'SET_QUANTITY'; value: string }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_IMAGES'; value: string[] }
  | { type: 'SET_TRACK_CONDITION'; value: boolean }
  | { type: 'SET_STATUS'; value: EquipmentStatus }
  | { type: 'SET_SUGGESTIONS'; value: { id: string; name: string }[] }
  | { type: 'SET_UPLOADING_IMAGES'; value: boolean }
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
  | { type: 'RESET_FOR_EQUIPMENT'; equipment: EquipmentItem };

function editEquipmentReducer(state: EditEquipmentState, action: EditEquipmentAction): EditEquipmentState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_BRAND': return { ...state, brand: action.value };
    case 'SET_QUANTITY': return { ...state, quantity: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_IMAGES': return { ...state, images: action.value };
    case 'SET_TRACK_CONDITION': return { ...state, trackCondition: action.value };
    case 'SET_STATUS': return { ...state, status: action.value };
    case 'SET_SUGGESTIONS': return { ...state, suggestions: action.value };
    case 'SET_UPLOADING_IMAGES': return { ...state, uploadingImages: action.value };
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
    case 'RESET_FOR_EQUIPMENT': {
      const eq = action.equipment;
      return {
        ...state,
        name: eq.name,
        brand: eq.brand ?? '',
        quantity: String(eq.quantity),
        note: eq.note ?? '',
        images: eq.images ?? [],
        trackCondition: eq.trackCondition,
        status: eq.status,
        suggestions: [],
        snapshot: makeSnap(eq),
        reports: [],
        loadingReports: true,
        editingStatus: false,
        draftStatus: eq.status,
        showReportForm: false,
        reportNote: '',
      };
    }
    default: return state;
  }
}

interface Props {
  equipment: EquipmentItem | null;
  onClose: () => void;
  onUpdated: (item: EquipmentItem) => void;
}

export function EditEquipmentDialog({ equipment, onClose, onUpdated }: Props) {
  const [state, dispatch] = useReducer(editEquipmentReducer, {
    name: '',
    brand: '',
    quantity: '1',
    note: '',
    images: [],
    trackCondition: false,
    status: 'active',
    suggestions: [],
    uploadingImages: false,
    saving: false,
    snapshot: '',
    reports: [],
    loadingReports: false,
    editingStatus: false,
    draftStatus: 'active',
    savingStatus: false,
    showReportForm: false,
    reportNote: '',
    submittingReport: false,
  });
  const {
    name, brand, quantity, note, images, trackCondition, status,
    suggestions, uploadingImages, saving, snapshot, reports, loadingReports,
    editingStatus, draftStatus, savingStatus, showReportForm, reportNote, submittingReport,
  } = state;

  // ── Reset when equipment changes ───────────────────────────────────────────
  const prevIdRef = useRef<string | null>(null);
  const currentId = equipment?._id ?? null;
  if (currentId !== prevIdRef.current) {
    prevIdRef.current = currentId;
    if (equipment) {
      dispatch({ type: 'RESET_FOR_EQUIPMENT', equipment });
    }
  }

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    if (!equipment) return;
    const controller = new AbortController();
    fetch(`/api/owner/equipment/${equipment._id}/condition-reports`, { signal: controller.signal })
      .then((r) => r.json() as Promise<ConditionReport[]>)
      .then((data) => dispatch({ type: 'SET_REPORTS', value: data }))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') toast.error('Failed to load reports');
      })
      .finally(() => dispatch({ type: 'SET_LOADING_REPORTS', value: false }));
    return () => controller.abort();
  }, [equipment]);

  const isDirty =
    JSON.stringify({ name, brand, quantity, note, images, trackCondition, status }) !== snapshot;

  // ── Details tab handlers ───────────────────────────────────────────────────
  function handleNameChange(value: string) {
    dispatch({ type: 'SET_NAME', value });
    if (value.trim().length < 2) { dispatch({ type: 'SET_SUGGESTIONS', value: [] }); return; }
    const lower = value.toLowerCase();
    dispatch({ type: 'SET_SUGGESTIONS', value: CATALOG.filter((e) => e.name.toLowerCase().includes(lower)).slice(0, 8) });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 5) { toast.error('Maximum 5 images'); return; }
    dispatch({ type: 'SET_UPLOADING_IMAGES', value: true });
    try {
      const result = await getEquipmentImageSignatureAction();
      if (result.error) { toast.error(result.error); return; }
      const urls = await Promise.all(files.map((file) => uploadFile(file, result.config!)));
      dispatch({ type: 'SET_IMAGES', value: [...images, ...urls] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      dispatch({ type: 'SET_UPLOADING_IMAGES', value: false });
    }
  }

  async function handleSave() {
    if (!equipment || !isDirty || !name.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const res = await fetch(`/api/owner/equipment/${equipment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || null,
          quantity: parseInt(quantity) || 1,
          note: note.trim() || null,
          images,
          trackCondition,
          status: trackCondition ? status : 'active',
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? 'Failed to update equipment');
        return;
      }
      const updated = await res.json() as EquipmentItem;
      onUpdated(updated);
      toast.success('Changes saved');
      onClose();
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  // ── Condition tab handlers ─────────────────────────────────────────────────
  async function handleSaveStatus() {
    if (!equipment || draftStatus === status) { dispatch({ type: 'SET_EDITING_STATUS', value: false }); return; }
    dispatch({ type: 'SET_SAVING_STATUS', value: true });
    try {
      const res = await fetch(`/api/owner/equipment/${equipment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: draftStatus }),
      });
      if (!res.ok) { toast.error('Failed to update status'); return; }
      const updated = await res.json() as EquipmentItem;
      dispatch({ type: 'SET_STATUS', value: draftStatus });
      const p = JSON.parse(snapshot) as Record<string, unknown>;
      dispatch({ type: 'SET_SNAPSHOT', value: JSON.stringify({ ...p, status: draftStatus }) });
      dispatch({ type: 'SET_EDITING_STATUS', value: false });
      onUpdated(updated);
      toast.success('Status updated');
    } finally {
      dispatch({ type: 'SET_SAVING_STATUS', value: false });
    }
  }

  async function handleAddReport() {
    if (!equipment || !reportNote.trim()) return;
    dispatch({ type: 'SET_SUBMITTING_REPORT', value: true });
    try {
      const res = await fetch(`/api/owner/equipment/${equipment._id}/condition-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reportNote.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? 'Failed to add report');
        return;
      }
      const created = await res.json() as ConditionReport;
      dispatch({ type: 'SET_REPORTS', value: [created, ...reports] });
      dispatch({ type: 'SET_SHOW_REPORT_FORM', value: false });
      dispatch({ type: 'SET_REPORT_NOTE', value: '' });
      toast.success('Report added');
    } finally {
      dispatch({ type: 'SET_SUBMITTING_REPORT', value: false });
    }
  }

  function handleClose() {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    dispatch({ type: 'SET_SUGGESTIONS', value: [] });
    dispatch({ type: 'SET_SHOW_REPORT_FORM', value: false });
    dispatch({ type: 'SET_REPORT_NOTE', value: '' });
    dispatch({ type: 'SET_EDITING_STATUS', value: false });
    onClose();
  }

  return (
    <Dialog open={equipment !== null} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-[#0c0c0c] border-[#1a1a1a] text-white max-w-xl w-full max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-white text-[15px] font-semibold">
            {equipment?.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0 mt-3">
          <TabsList className="w-full justify-start rounded-none border-b border-[#1a1a1a] bg-transparent h-auto p-0 px-6 shrink-0">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-[#555] px-3 pb-2.5 pt-0 text-sm font-medium shadow-none"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="condition"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-[#555] px-3 pb-2.5 pt-0 text-sm font-medium shadow-none"
            >
              Condition
            </TabsTrigger>
          </TabsList>

          {/* ── Details Tab ────────────────────────────────────────────── */}
          <TabsContent value="details" className="flex-1 overflow-y-auto mt-0 px-6 py-4 min-h-0">
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5 relative">
                <label htmlFor="edit-eq-name" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Name</label>
                <Input
                  id="edit-eq-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => dispatch({ type: 'SET_SUGGESTIONS', value: [] }), 150)}
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
                  placeholder="Search equipment type…"
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#111] border border-[#222] rounded-lg overflow-hidden shadow-xl">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => { dispatch({ type: 'SET_NAME', value: s.name }); dispatch({ type: 'SET_SUGGESTIONS', value: [] }); }}
                        className="w-full text-left px-3 py-2 text-[13px] text-[#ccc] hover:bg-[#1a1a1a] transition-colors"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Brand + Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-eq-brand" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Brand (optional)</label>
                  <Input id="edit-eq-brand" value={brand} onChange={(e) => dispatch({ type: 'SET_BRAND', value: e.target.value })}
                    className="bg-[#0a0a0a] border-[#1e1e1e] text-white" placeholder="e.g. Life Fitness" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-eq-qty" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Quantity</label>
                  <Input
                    id="edit-eq-qty"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onChange={(e) => dispatch({ type: 'SET_QUANTITY', value: e.target.value })}
                    className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label htmlFor="edit-eq-note" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Note (optional)</label>
                <Input id="edit-eq-note" value={note} onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })}
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white" placeholder="Location, condition, etc." />
              </div>

              {/* Track Condition */}
              <div className="flex items-center justify-between rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-white">Track condition status</p>
                  <p className="text-[11px] text-[#555] mt-0.5">Enable for machines, disable for consumables like plates</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={trackCondition}
                  aria-label="Track condition status"
                  onClick={() => dispatch({ type: 'SET_TRACK_CONDITION', value: !trackCondition })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${trackCondition ? 'bg-white' : 'bg-[#333]'}`}
                >
                  <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-black shadow transition-transform ${trackCondition ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Status (only when trackCondition) */}
              {trackCondition && (
                <div className="space-y-1.5">
                  <label htmlFor="edit-eq-status" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Status</label>
                  <select
                    id="edit-eq-status"
                    value={status}
                    onChange={(e) => dispatch({ type: 'SET_STATUS', value: e.target.value as EquipmentStatus })}
                    className="w-full rounded-md border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              )}

              {/* Images */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Images (optional)</p>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {images.map((url) => (
                      <div key={url} className="relative group">
                        <Image src={url} alt="equipment" width={56} height={56} className="object-cover rounded-md border border-[#222]" />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => dispatch({ type: 'SET_IMAGES', value: images.filter((u) => u !== url) })}
                          className="absolute -top-1.5 -right-1.5 bg-[#333] rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className={`flex items-center gap-2 cursor-pointer text-[12px] text-[#555] hover:text-[#888] transition-colors ${uploadingImages ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    aria-label="Upload equipment images"
                    className="hidden"
                    disabled={uploadingImages || images.length >= 5}
                  />
                  {uploadingImages ? 'Uploading…' : '+ Add images'}
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || !isDirty || !name.trim() || uploadingImages}
                  className="bg-white text-black hover:bg-white/90 font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button variant="ghost" onClick={handleClose}
                  className="text-foreground/65 hover:text-foreground/80 text-sm">
                  Cancel
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Condition Tab ───────────────────────────────────────────── */}
          <TabsContent value="condition" className="flex-1 overflow-y-auto mt-0 px-6 py-4 space-y-3 min-h-0">
            {equipment?.trackCondition && (
              <div className="rounded-lg border border-[#1a1a1a] bg-[#080808] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555]">Status</span>
                  {!editingStatus && (
                    <button
                      type="button"
                      onClick={() => { dispatch({ type: 'SET_DRAFT_STATUS', value: status }); dispatch({ type: 'SET_EDITING_STATUS', value: true }); }}
                      className="text-[11px] text-[#444] hover:text-[#888] transition-colors"
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
                      className="flex-1 rounded-md border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                    <Button onClick={handleSaveStatus} disabled={savingStatus}
                      className="bg-white text-black hover:bg-white/90 font-semibold text-xs h-8 px-3 disabled:opacity-50">
                      {savingStatus ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="ghost" onClick={() => dispatch({ type: 'SET_EDITING_STATUS', value: false })}
                      className="text-foreground/65 hover:text-foreground/80 text-xs h-8 px-2">
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
              <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555]">New Report</p>
                <Input
                  value={reportNote}
                  onChange={(e) => dispatch({ type: 'SET_REPORT_NOTE', value: e.target.value })}
                  className="bg-[#080808] border-[#1e1e1e] text-white"
                  placeholder="Describe the condition, issue, or action taken…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddReport} disabled={submittingReport || !reportNote.trim()}
                    className="bg-white text-black hover:bg-white/90 font-semibold text-sm h-8 disabled:opacity-50">
                    {submittingReport ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => { dispatch({ type: 'SET_SHOW_REPORT_FORM', value: false }); dispatch({ type: 'SET_REPORT_NOTE', value: '' }); }}
                    className="text-foreground/65 hover:text-foreground/80 text-sm h-8">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: 'SET_SHOW_REPORT_FORM', value: true })}
                className="w-full border border-dashed border-[#222] text-[#555] hover:text-[#888] hover:border-[#333] hover:bg-transparent text-sm h-9"
              >
                + Add Report
              </Button>
            )}

            {loadingReports && <p className="text-[12px] text-[#555] text-center py-4">Loading…</p>}
            {!loadingReports && reports.length === 0 && (
              <p className="text-[12px] text-[#555] text-center py-4">No reports yet.</p>
            )}
            {!loadingReports && reports.length > 0 && (
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r._id} className="rounded-lg border border-[#141414] bg-[#080808] px-4 py-3">
                    <span className="text-[11px] text-[#444]">
                      {new Date(r.reportedAt).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <p className="text-[13px] text-[#aaa] mt-1 leading-relaxed">{r.note}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
