'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EquipmentStatus } from '@/lib/db/models/equipment.model';

interface ConditionReport {
  _id: string;
  note: string;
  reportedAt: string;
}

interface EquipmentSummary {
  _id: string;
  name: string;
  status: EquipmentStatus;
  trackCondition: boolean;
}

interface Props {
  equipment: EquipmentSummary | null;
  onClose: () => void;
  onStatusUpdated: (id: string, status: EquipmentStatus) => void;
}

const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  retired: 'bg-[#333] text-[#666] border-[#222]',
};

export function ConditionDialog({ equipment, onClose, onStatusUpdated }: Props) {
  const [reports, setReports] = useState<ConditionReport[]>([]);
  const [loading, setLoading] = useState(false);

  // status edit
  const [editingStatus, setEditingStatus] = useState(false);
  const [draftStatus, setDraftStatus] = useState<EquipmentStatus>('active');
  const [savingStatus, setSavingStatus] = useState(false);

  // add-report form
  const [showForm, setShowForm] = useState(false);
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const open = equipment !== null;
  const [prevEquipmentId, setPrevEquipmentId] = useState<string | null>(null);

  // Reset dialog state when a different equipment is selected (derived state, no effect needed)
  const currentEquipmentId = equipment?._id ?? null;
  if (currentEquipmentId !== prevEquipmentId) {
    setPrevEquipmentId(currentEquipmentId);
    if (equipment) {
      setReports([]);
      setLoading(true);
      setShowForm(false);
      setEditingStatus(false);
      setDraftStatus(equipment.status);
    } else {
      setLoading(false);
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
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [equipment]);

  async function handleSaveStatus() {
    if (!equipment || draftStatus === equipment.status) { setEditingStatus(false); return; }
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/owner/equipment/${equipment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: draftStatus }),
      });
      if (!res.ok) { toast.error('Failed to update status'); return; }
      onStatusUpdated(equipment._id, draftStatus);
      setEditingStatus(false);
      toast.success('Status updated');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAddReport() {
    if (!equipment || !formNote.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/owner/equipment/${equipment._id}/condition-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: formNote.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? 'Failed to add report');
        return;
      }
      const created = await res.json() as ConditionReport;
      setReports((prev) => [created, ...prev]);
      setShowForm(false);
      setFormNote('');
      toast.success('Report added');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setShowForm(false);
    setFormNote('');
    setEditingStatus(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-[#0c0c0c] border-[#1a1a1a] text-white max-w-lg w-full max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-white text-[15px] font-semibold">
            Condition — {equipment?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Status section — only when tracking */}
        {equipment?.trackCondition && (
          <div className="rounded-lg border border-[#1a1a1a] bg-[#080808] px-4 py-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555]">Status</span>
              {!editingStatus && (
                <button
                  type="button"
                  onClick={() => { setDraftStatus(equipment.status); setEditingStatus(true); }}
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
                <Button
                  onClick={handleSaveStatus}
                  disabled={savingStatus}
                  className="bg-white text-black hover:bg-white/90 font-semibold text-xs h-8 px-3 disabled:opacity-50"
                >
                  {savingStatus ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingStatus(false)}
                  className="text-[#666] hover:text-[#999] text-xs h-8 px-2"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="mt-1.5">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLOURS[equipment.status]}`}>
                  {equipment.status}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {/* Add report form */}
          {showForm ? (
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555]">New Report</p>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="bg-[#080808] border-[#1e1e1e] text-white"
                placeholder="Describe the condition, issue, or action taken…"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddReport}
                  disabled={submitting || !formNote.trim()}
                  className="bg-white text-black hover:bg-white/90 font-semibold text-sm h-8 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setFormNote(''); }}
                  className="text-[#777] hover:text-[#aaa] text-sm h-8">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setShowForm(true)}
              className="w-full border border-dashed border-[#222] text-[#555] hover:text-[#888] hover:border-[#333] hover:bg-transparent text-sm h-9"
            >
              + Add Report
            </Button>
          )}

          {loading && <p className="text-[12px] text-[#555] text-center py-4">Loading…</p>}

          {!loading && reports.length === 0 && (
            <p className="text-[12px] text-[#555] text-center py-4">No reports yet.</p>
          )}

          {!loading && reports.length > 0 && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
