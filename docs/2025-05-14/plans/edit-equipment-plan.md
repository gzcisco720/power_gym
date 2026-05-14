# Edit Equipment Dialog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `ConditionDialog` with a unified `EditEquipmentDialog` that has a Details tab (edit all equipment fields) and a Condition tab (migrated condition reports feature), triggered by renaming the "Condition" row button to "Edit".

**Architecture:** Create one new component `edit-equipment-dialog.tsx` containing both tabs. Update `equipment-client.tsx` to swap `ConditionDialog` for `EditEquipmentDialog` and rename the trigger button. Delete `condition-dialog.tsx`. Update unit and e2e tests in lock-step.

**Tech Stack:** Next.js App Router, React, shadcn/ui (Dialog, Tabs, Button, Input), TailwindCSS, Jest + RTL (unit), Playwright (e2e).

---

## File Map

| Action | Path |
|---|---|
| **Create** | `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx` |
| **Delete** | `src/app/(dashboard)/owner/equipment/_components/condition-dialog.tsx` |
| **Modify** | `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx` |
| **Modify** | `__tests__/app/owner/equipment-client.test.tsx` |
| **Modify** | `e2e/owner/equipment.spec.ts` |
| **Modify** | `e2e/seed.ts` |

No backend changes — `PATCH /api/owner/equipment/[id]` already accepts all `UpdateEquipmentData` fields.

---

## Task 1 — Update unit tests (write them failing first)

**Files:**
- Modify: `__tests__/app/owner/equipment-client.test.tsx`

- [ ] **Step 1: Replace the test file with the updated version**

The changes: rename "Condition button" → "Edit button"; rename the last status-update test to use the Edit button; add one new test for the condition-reports fetch. The file compiles but the "Edit" tests will fail because `EquipmentClient` still renders the old "Condition" button.

```tsx
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ refresh: jest.fn() })) }));
jest.mock('@/app/(dashboard)/owner/equipment/actions', () => ({
  getEquipmentImageSignatureAction: jest.fn(),
}));

import { EquipmentClient } from '@/app/(dashboard)/owner/equipment/_components/equipment-client';

const IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

const mockItems = [
  { _id: 'e1', name: 'Smith Machine', status: 'active' as const, brand: 'Matrix', quantity: 2, images: [IMAGE_URL], note: null, trackCondition: true },
  { _id: 'e2', name: 'Treadmill', status: 'maintenance' as const, brand: null, quantity: 5, images: [], note: 'Needs belt replacement', trackCondition: true },
  { _id: 'e3', name: 'Weight Plates', status: 'active' as const, brand: null, quantity: 50, images: [], note: null, trackCondition: false },
];

describe('EquipmentClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it('renders equipment list', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    expect(screen.getByText('Smith Machine')).toBeInTheDocument();
    expect(screen.getByText('Treadmill')).toBeInTheDocument();
    expect(screen.getByText('Weight Plates')).toBeInTheDocument();
  });

  it('shows empty state when no equipment', () => {
    render(<EquipmentClient initialItems={[]} />);
    expect(screen.getByText(/no equipment/i)).toBeInTheDocument();
  });

  it('shows status badge only for items with trackCondition enabled', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges).toHaveLength(1);
  });

  it('shows Edit button for each item', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    expect(editBtns).toHaveLength(mockItems.length);
  });

  it('opens Add Equipment dialog when Add button clicked', () => {
    render(<EquipmentClient initialItems={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add equipment/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls DELETE API when delete button clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    render(<EquipmentClient initialItems={mockItems} />);
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/equipment/e1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('shows placeholder for equipment with no images', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const placeholders = screen.getAllByLabelText('No image');
    expect(placeholders).toHaveLength(2);
  });

  it('shows thumbnail img for equipment with images', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const thumbnail = screen.getByRole('img', { name: /smith machine/i });
    expect(thumbnail).toHaveAttribute('src', IMAGE_URL);
  });

  it('opens lightbox when thumbnail clicked', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    fireEvent.click(screen.getByRole('img', { name: /smith machine/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens EditEquipmentDialog and fetches condition reports when Edit clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<EquipmentClient initialItems={mockItems} />);
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/equipment/e1/condition-reports',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run the failing tests**

```bash
pnpm test -- --testPathPattern=equipment-client --no-coverage
```

Expected: **FAIL** — `shows Edit button for each item` and `opens EditEquipmentDialog and fetches condition reports when Edit clicked` fail because the component still says "Condition".

---

## Task 2 — Create `EditEquipmentDialog`

**Files:**
- Create: `src/app/(dashboard)/owner/equipment/_components/edit-equipment-dialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState, useEffect } from 'react';
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
import type { EquipmentItem } from './equipment-client';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';
import gymEquipmentCatalog from '@/../context/data/gym_equipment.json';

const CATALOG: { id: string; name: string }[] = gymEquipmentCatalog.equipment;

interface ConditionReport {
  _id: string;
  note: string;
  reportedAt: string;
}

const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  retired: 'bg-[#333] text-[#666] border-[#222]',
};

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

interface Props {
  equipment: EquipmentItem | null;
  onClose: () => void;
  onUpdated: (item: EquipmentItem) => void;
}

export function EditEquipmentDialog({ equipment, onClose, onUpdated }: Props) {
  // ── Details tab state ──────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [trackCondition, setTrackCondition] = useState(false);
  const [status, setStatus] = useState<EquipmentStatus>('active');
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState('');

  // ── Condition tab state ────────────────────────────────────────────────────
  const [reports, setReports] = useState<ConditionReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [draftStatus, setDraftStatus] = useState<EquipmentStatus>('active');
  const [savingStatus, setSavingStatus] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // ── Reset when equipment changes ───────────────────────────────────────────
  const [prevId, setPrevId] = useState<string | null>(null);
  const currentId = equipment?._id ?? null;
  if (currentId !== prevId) {
    setPrevId(currentId);
    if (equipment) {
      setName(equipment.name);
      setBrand(equipment.brand ?? '');
      setQuantity(String(equipment.quantity));
      setNote(equipment.note ?? '');
      setImages(equipment.images ?? []);
      setTrackCondition(equipment.trackCondition);
      setStatus(equipment.status);
      setSuggestions([]);
      setSnapshot(makeSnap(equipment));
      setReports([]);
      setLoadingReports(true);
      setEditingStatus(false);
      setDraftStatus(equipment.status);
      setShowReportForm(false);
      setReportNote('');
    }
  }

  useEffect(() => {
    if (!equipment) return;
    const controller = new AbortController();
    fetch(`/api/owner/equipment/${equipment._id}/condition-reports`, { signal: controller.signal })
      .then((r) => r.json() as Promise<ConditionReport[]>)
      .then(setReports)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') toast.error('Failed to load reports');
      })
      .finally(() => setLoadingReports(false));
    return () => controller.abort();
  }, [equipment]);

  const isDirty =
    JSON.stringify({ name, brand, quantity, note, images, trackCondition, status }) !== snapshot;

  // ── Details tab handlers ───────────────────────────────────────────────────
  function handleNameChange(value: string) {
    setName(value);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    const lower = value.toLowerCase();
    setSuggestions(CATALOG.filter((e) => e.name.toLowerCase().includes(lower)).slice(0, 8));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 5) { toast.error('Maximum 5 images'); return; }
    setUploadingImages(true);
    try {
      const result = await getEquipmentImageSignatureAction();
      if (result.error) { toast.error(result.error); return; }
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file, result.config!);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleSave() {
    if (!equipment || !isDirty || !name.trim()) return;
    setSaving(true);
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
      setSaving(false);
    }
  }

  // ── Condition tab handlers ─────────────────────────────────────────────────
  async function handleSaveStatus() {
    if (!equipment || draftStatus === status) { setEditingStatus(false); return; }
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/owner/equipment/${equipment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: draftStatus }),
      });
      if (!res.ok) { toast.error('Failed to update status'); return; }
      const updated = await res.json() as EquipmentItem;
      setStatus(draftStatus);
      // keep Details form clean after Condition-tab status save
      setSnapshot((prev) => {
        const p = JSON.parse(prev) as Record<string, unknown>;
        return JSON.stringify({ ...p, status: draftStatus });
      });
      setEditingStatus(false);
      onUpdated(updated);
      toast.success('Status updated');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAddReport() {
    if (!equipment || !reportNote.trim()) return;
    setSubmittingReport(true);
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
      setReports((prev) => [created, ...prev]);
      setShowReportForm(false);
      setReportNote('');
      toast.success('Report added');
    } finally {
      setSubmittingReport(false);
    }
  }

  function handleClose() {
    setSuggestions([]);
    setShowReportForm(false);
    setReportNote('');
    setEditingStatus(false);
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
                <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Name</label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => setSuggestions([]), 150)}
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
                        onMouseDown={() => { setName(s.name); setSuggestions([]); }}
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
                  <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Brand (optional)</label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)}
                    className="bg-[#0a0a0a] border-[#1e1e1e] text-white" placeholder="e.g. Life Fitness" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Quantity</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Note (optional)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)}
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
                  onClick={() => setTrackCondition((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${trackCondition ? 'bg-white' : 'bg-[#333]'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow transition-transform ${trackCondition ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Status (only when trackCondition) */}
              {trackCondition && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
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
                <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Images (optional)</label>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {images.map((url) => (
                      <div key={url} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="equipment" className="w-14 h-14 object-cover rounded-md border border-[#222]" />
                        <button
                          type="button"
                          onClick={() => setImages((p) => p.filter((u) => u !== url))}
                          className="absolute -top-1.5 -right-1.5 bg-[#333] rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
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
                      onClick={() => { setDraftStatus(status); setEditingStatus(true); }}
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
                      onChange={(e) => setDraftStatus(e.target.value as EquipmentStatus)}
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
                    <Button variant="ghost" onClick={() => setEditingStatus(false)}
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
                  onChange={(e) => setReportNote(e.target.value)}
                  className="bg-[#080808] border-[#1e1e1e] text-white"
                  placeholder="Describe the condition, issue, or action taken…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddReport} disabled={submittingReport || !reportNote.trim()}
                    className="bg-white text-black hover:bg-white/90 font-semibold text-sm h-8 disabled:opacity-50">
                    {submittingReport ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowReportForm(false); setReportNote(''); }}
                    className="text-foreground/65 hover:text-foreground/80 text-sm h-8">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setShowReportForm(true)}
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
```

---

## Task 3 — Update `EquipmentClient`

**Files:**
- Modify: `src/app/(dashboard)/owner/equipment/_components/equipment-client.tsx`

- [ ] **Step 1: Replace the relevant parts of equipment-client.tsx**

Replace the import block, state, and render. The full updated file:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/shared/image-lightbox';
import { AddEquipmentDialog } from './add-equipment-dialog';
import { EditEquipmentDialog } from './edit-equipment-dialog';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';
import type { NewEquipmentItem } from './add-equipment-dialog';

export interface EquipmentItem {
  _id: string;
  name: string;
  status: EquipmentStatus;
  brand: string | null;
  quantity: number;
  images: string[];
  note: string | null;
  trackCondition: boolean;
}

interface Props {
  initialItems: EquipmentItem[];
}

const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  retired: 'bg-[#333] text-[#666] border-[#222]',
};

export function EquipmentClient({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<EquipmentItem[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<EquipmentItem | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  function handleCreated(item: NewEquipmentItem) {
    setItems((prev) => [...prev, item]);
    router.refresh();
  }

  function handleUpdated(updated: EquipmentItem) {
    setItems((prev) => prev.map((i) => i._id === updated._id ? updated : i));
    setEditTarget((prev) => prev?._id === updated._id ? updated : prev);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this equipment? This cannot be undone.')) return;
    const res = await fetch(`/api/owner/equipment/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to delete'); return; }
    setItems((prev) => prev.filter((i) => i._id !== id));
    toast.success('Equipment deleted');
    router.refresh();
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-white text-black hover:bg-white/90 font-semibold text-sm"
          >
            + Add Equipment
          </Button>
        </div>

        {items.length === 0 && (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
            <p className="text-[13px] text-[#777]">No equipment added yet.</p>
          </Card>
        )}

        {items.length > 0 && (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_140px_60px_110px_120px_60px] border-b border-[#141414] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]">
              <div>Name</div>
              <div>Brand</div>
              <div>Qty</div>
              <div>Status</div>
              <div></div>
              <div></div>
            </div>

            {items.map((item) => (
              <div
                key={item._id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_60px_110px_120px_60px] items-center px-5 py-3.5 border-b border-[#0f0f0f] last:border-0 gap-2"
              >
                <div className="flex items-center gap-3">
                  {item.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      onClick={() => setLightbox({ images: item.images, index: 0 })}
                      className="w-8 h-8 object-cover rounded-md border border-[#222] shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div
                      aria-label="No image"
                      className="w-8 h-8 rounded-md border border-[#1e1e1e] bg-[#111] flex items-center justify-center shrink-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#333]" />
                    </div>
                  )}
                  <div>
                    <div className="text-[13px] font-medium text-white">{item.name}</div>
                    {item.note && <div className="text-[11px] text-[#555] mt-0.5">{item.note}</div>}
                  </div>
                </div>

                <div className="hidden sm:block text-[12px] text-[#666]">{item.brand ?? '—'}</div>

                <div className="hidden sm:block text-[12px] text-[#666]">{item.quantity}</div>

                <div className="hidden sm:flex">
                  {item.trackCondition ? (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOURS[item.status]}`}>
                      {item.status}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#3a3a3a]">—</span>
                  )}
                </div>

                <div className="hidden sm:flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setEditTarget(item)}
                    className="text-[#555] hover:text-[#aaa] hover:bg-[#141414] text-xs h-7 px-3"
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(item._id)}
                    className="text-[#555] hover:text-red-400 hover:bg-[#141414] text-xs h-7 px-2"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <AddEquipmentDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />

      <EditEquipmentDialog
        equipment={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdated}
      />

      <ImageLightbox
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
```

---

## Task 4 — Delete `condition-dialog.tsx`

**Files:**
- Delete: `src/app/(dashboard)/owner/equipment/_components/condition-dialog.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm "src/app/(dashboard)/owner/equipment/_components/condition-dialog.tsx"
```

---

## Task 5 — Run unit tests and verify they pass

- [ ] **Step 1: Run unit tests**

```bash
pnpm test -- --testPathPattern=equipment --no-coverage
```

Expected: **ALL PASS** — 11 tests in `equipment-client.test.tsx` plus all other equipment tests.

- [ ] **Step 2: If any test fails, diagnose and fix**

Common failure: import resolution for `edit-equipment-dialog` if the file path is wrong. Check the import in `equipment-client.tsx` matches the actual filename.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test --no-coverage
```

Expected: all existing tests still pass (no regressions).

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```

Expected: no errors or warnings.

---

## Task 6 — Add e2e seed item for edit test

**Files:**
- Modify: `e2e/seed.ts`

- [ ] **Step 1: Add the `E2E Edit Equipment` seed item**

Find the `// ── Equipment` block in `e2e/seed.ts` and add after the existing items:

```typescript
// dedicated to edit-details test
await EquipmentModel.create({
  name: 'E2E Edit Equipment',
  status: 'active',
  brand: 'E2E Brand',
  quantity: 2,
  images: [],
  note: 'E2E original note',
  trackCondition: false,
});
```

---

## Task 7 — Update e2e tests

**Files:**
- Modify: `e2e/owner/equipment.spec.ts`

- [ ] **Step 1: Replace the e2e test file**

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/owner.json' });

test.describe('Owner: Equipment', () => {
  test('list shows seeded equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByText('E2E Barbell', { exact: true })).toBeVisible();
  });

  test('create new equipment appears in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    await page.getByRole('button', { name: '+ Add Equipment' }).click();

    await page.getByPlaceholder('Search equipment type…').fill('E2E Treadmill');
    await page.getByRole('dialog').getByRole('button', { name: 'Add Equipment' }).click();

    await expect(page.getByText('E2E Treadmill', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('delete equipment removes it from list', async ({ page }) => {
    await page.goto('/owner/equipment');

    const row = page.getByText('E2E Delete Equipment', { exact: true }).locator('..').locator('..').locator('..');
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('E2E Delete Equipment', { exact: true })).not.toBeVisible();
  });

  test('status badge shows for tracked equipment', async ({ page }) => {
    await page.goto('/owner/equipment');
    await expect(page.getByText('E2E Track Machine', { exact: true })).toBeVisible();
    await expect(page.getByText('maintenance', { exact: true })).toBeVisible();
  });

  test('edit dialog opens with Details tab active', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Details tab is active by default
    await expect(page.getByRole('tab', { name: 'Details' })).toHaveAttribute('data-state', 'active');
    // Dialog title shows equipment name
    await expect(page.getByRole('dialog').getByText('E2E Track Machine')).toBeVisible();
  });

  test('can update equipment status via Condition tab', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Switch to Condition tab
    await page.getByRole('tab', { name: 'Condition' }).click();
    await expect(page.getByRole('tab', { name: 'Condition' })).toHaveAttribute('data-state', 'active');

    // Edit status
    await page.getByRole('dialog').getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').locator('select').selectOption('active');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('dialog').getByText('active')).toBeVisible({ timeout: 5000 });
  });

  test('can add a condition report', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Track Machine', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Switch to Condition tab
    await page.getByRole('tab', { name: 'Condition' }).click();

    await page.getByRole('button', { name: '+ Add Report' }).click();
    await page.getByPlaceholder('Describe the condition, issue, or action taken…').fill('Lubricated the belt');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Lubricated the belt')).toBeVisible({ timeout: 5000 });
  });

  test('can edit equipment details and see updated note in list', async ({ page }) => {
    await page.goto('/owner/equipment');
    const row = page.getByText('E2E Edit Equipment', { exact: true }).locator('..').locator('..').locator('..');
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Change the note
    const noteInput = page.getByRole('dialog').getByPlaceholder('Location, condition, etc.');
    await noteInput.clear();
    await noteInput.fill('Updated E2E note');

    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();

    // Dialog closes after save
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    // Updated note appears in the list row
    await expect(page.getByText('Updated E2E note')).toBeVisible({ timeout: 5000 });
  });
});
```

---

## Task 8 — Run e2e tests

- [ ] **Step 1: Reset the e2e database**

```bash
pnpm seed:e2e
```

Expected: seed completes without errors.

- [ ] **Step 2: Run the equipment e2e spec**

```bash
pnpm test:e2e -- --grep "Owner: Equipment"
```

Expected: **7 tests pass**.

- [ ] **Step 3: If any test fails, check the failure output**

Most likely causes:
- `data-state` attribute selector — check if shadcn Tabs uses `data-state` or `aria-selected` for active tab detection. If `data-state` is not working, try: `await expect(page.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true');`
- Row locator `.locator('..').locator('..').locator('..')` — confirm it still selects the grid row correctly by checking the EquipmentClient grid structure (unchanged).
- Status "active" badge might match the badge in the list row rather than inside the dialog — scope to dialog: `page.getByRole('dialog').getByText('active')`.

- [ ] **Step 4: Run full e2e suite to check for regressions**

```bash
pnpm test:e2e
```

Expected: all tests pass.
