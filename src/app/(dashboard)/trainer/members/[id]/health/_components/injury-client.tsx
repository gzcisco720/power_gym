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
  DialogTrigger,
} from '@/components/ui/dialog';
import { SectionHeader } from '@/components/shared/section-header';
import { Trash2, Check, RotateCcw, Pencil, Loader2 } from 'lucide-react';
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
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [memberNoteDraft, setMemberNoteDraft] = useState('');

  const canEdit = role === 'trainer' || role === 'owner';
  const { active, resolved } = useMemo(
    () => ({
      active: injuries.filter((i) => i.status === 'active'),
      resolved: injuries.filter((i) => i.status === 'resolved'),
    }),
    [injuries],
  );

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
      setAddOpen(false);
      toast.success('Injury record added');
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
    return (
      <li
        key={injury._id}
        className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{injury.title}</p>
            {injury.affectedMovements && (
              <p className="mt-0.5 text-xs text-foreground/65">{injury.affectedMovements}</p>
            )}
            {injury.trainerNotes && (
              <p className="mt-1.5 text-xs text-foreground/65">
                <span className="font-medium text-foreground/80">Notes: </span>
                {injury.trainerNotes}
              </p>
            )}
          </div>
          {canEdit && (
            <div className="flex shrink-0 items-center gap-1">
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

        {role === 'member' && (
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
                  {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
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
        {role !== 'member' && injury.memberNotes && (
          <p className="mt-1.5 text-xs text-foreground/65">
            <span className="font-medium text-foreground/80">Member notes: </span>
            {injury.memberNotes}
          </p>
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
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" className="text-xs font-medium">
                    + Add
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogTitle>New Injury Record</DialogTitle>
                <div className="space-y-3 mt-2">
                  <FieldRow label="Title" required>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Left knee ligament strain"
                    />
                  </FieldRow>
                  <FieldRow label="Affected Movements">
                    <Input
                      value={form.affectedMovements}
                      onChange={(e) => setForm((f) => ({ ...f, affectedMovements: e.target.value }))}
                      placeholder="e.g. Avoid squats, jumping"
                    />
                  </FieldRow>
                  <FieldRow label="Notes">
                    <Input
                      value={form.trainerNotes}
                      onChange={(e) => setForm((f) => ({ ...f, trainerNotes: e.target.value }))}
                      placeholder="Additional notes"
                    />
                  </FieldRow>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setAddOpen(false); setForm(EMPTY_FORM); }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAdd}
                      disabled={saving || !form.title.trim()}
                      size="sm"
                      className="text-xs font-semibold"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {active.length === 0 ? (
          <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4">
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
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
