'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SerializedInjury } from '../page';

interface Props {
  memberId: string;
  initialInjuries: SerializedInjury[];
  role: 'owner' | 'trainer' | 'member';
}

interface AddForm {
  title: string;
  affectedMovements: string;
  trainerNotes: string;
}

const EMPTY_FORM: AddForm = { title: '', affectedMovements: '', trainerNotes: '' };

export function InjuryClient({ memberId, initialInjuries, role }: Props) {
  const router = useRouter();
  const [injuries, setInjuries] = useState(initialInjuries);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [memberNoteDraft, setMemberNoteDraft] = useState('');

  const canEdit = role === 'trainer' || role === 'owner';
  const active = injuries.filter((i) => i.status === 'active');
  const resolved = injuries.filter((i) => i.status === 'resolved');

  async function handleAdd() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${memberId}/injuries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          affectedMovements: form.affectedMovements.trim() || null,
          trainerNotes: form.trainerNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to add');
        return;
      }
      const created = (await res.json()) as SerializedInjury;
      setInjuries((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Injury record added');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: 'active' | 'resolved') {
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
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this injury record? This cannot be undone.')) return;
    const res = await fetch(`/api/members/${memberId}/injuries/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to delete'); return; }
    setInjuries((prev) => prev.filter((i) => i._id !== id));
    toast.success('Record deleted');
    router.refresh();
  }

  async function handleSaveMemberNotes(id: string) {
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
  }

  function renderInjuryRow(injury: SerializedInjury, isResolved: boolean) {
    const isEditingNotes = editingNotesId === injury._id;
    return (
      <div key={injury._id} className="px-5 py-4 border-b border-[#0f0f0f] last:border-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[13px] font-medium text-white">{injury.title}</p>
            {injury.affectedMovements && (
              <p className="text-[11px] text-[#666] mt-0.5">{injury.affectedMovements}</p>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-1 shrink-0">
              {!isResolved ? (
                <Button
                  variant="ghost"
                  onClick={() => handleStatusChange(injury._id, 'resolved')}
                  className="text-[#555] hover:text-emerald-400 hover:bg-[#141414] text-xs h-7 px-2"
                >
                  Resolve
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => handleStatusChange(injury._id, 'active')}
                  className="text-[#555] hover:text-yellow-400 hover:bg-[#141414] text-xs h-7 px-2"
                >
                  Reactivate
                </Button>
              )}
              {!isResolved && (
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(injury._id)}
                  className="text-[#555] hover:text-red-400 hover:bg-[#141414] text-xs h-7 px-2"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
        {injury.trainerNotes && (
          <p className="text-[11px] text-[#777]">
            <span className="text-[#555]">Notes: </span>{injury.trainerNotes}
          </p>
        )}
        <div className="text-[11px] text-[#666]">
          {role === 'member' ? (
            isEditingNotes ? (
              <div className="flex gap-2 mt-1">
                <Input
                  value={memberNoteDraft}
                  onChange={(e) => setMemberNoteDraft(e.target.value)}
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white text-xs h-7"
                  placeholder="Your notes..."
                />
                <Button
                  onClick={() => handleSaveMemberNotes(injury._id)}
                  className="bg-white text-black hover:bg-white/90 text-xs h-7 px-3"
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingNotesId(null)}
                  className="text-[#666] text-xs h-7 px-2"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <span
                className="cursor-pointer hover:text-[#aaa] transition-colors"
                onClick={() => { setEditingNotesId(injury._id); setMemberNoteDraft(injury.memberNotes ?? ''); }}
              >
                {injury.memberNotes ? `My notes: ${injury.memberNotes}` : '+ Add my notes'}
              </span>
            )
          ) : (
            injury.memberNotes && <span><span className="text-[#555]">Member notes: </span>{injury.memberNotes}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555]">Active</h2>
          {canEdit && (
            <Button
              onClick={() => setShowForm((v) => !v)}
              className="bg-white text-black hover:bg-white/90 font-semibold text-xs h-7 px-3"
            >
              + Add
            </Button>
          )}
        </div>

        {canEdit && showForm && (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
                placeholder="e.g. Left knee ligament strain"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Affected Movements</label>
              <Input
                value={form.affectedMovements}
                onChange={(e) => setForm((f) => ({ ...f, affectedMovements: e.target.value }))}
                className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
                placeholder="e.g. Avoid squats, jumping"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">Notes</label>
              <Input
                value={form.trainerNotes}
                onChange={(e) => setForm((f) => ({ ...f, trainerNotes: e.target.value }))}
                className="bg-[#0a0a0a] border-[#1e1e1e] text-white"
                placeholder="Additional notes"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={saving || !form.title.trim()}
                className="bg-white text-black hover:bg-white/90 font-semibold text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="text-[#777] hover:text-[#aaa] text-sm"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {active.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-[#555]">No active injuries</p>
          ) : (
            active.map((i) => renderInjuryRow(i, false))
          )}
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555]">Resolved</h2>
        {resolved.length === 0 ? (
          <p className="text-[13px] text-[#555]">No resolved records</p>
        ) : (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
            {resolved.map((i) => renderInjuryRow(i, true))}
          </Card>
        )}
      </div>
    </div>
  );
}
