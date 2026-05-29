import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMemberHealthStore } from '@/stores/memberHealthStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TrainerMemberHealthPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const { injuriesByMember, fetchHealth, addInjury } = useMemberHealthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ title: '', bodyPart: '', recordedAt: '' });

  const injuries = memberId ? (injuriesByMember[memberId] ?? []) : [];

  useEffect(() => {
    if (memberId) void fetchHealth(memberId);
  }, [memberId, fetchHealth]);

  async function handleSave() {
    if (!memberId || !form.title) return;
    setIsSaving(true);
    try {
      await addInjury(memberId, {
        title: form.title,
        ...(form.bodyPart ? { bodyPart: form.bodyPart } : {}),
        ...(form.recordedAt ? { recordedAt: form.recordedAt } : {}),
      });
      setDialogOpen(false);
      setForm({ title: '', bodyPart: '', recordedAt: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Member Health</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>Add Injury</Button>
      </div>

      <h2 className="mb-3 text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">Injuries</h2>
      <div className="space-y-2">
        {injuries.map((inj) => (
          <div key={inj._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm font-medium text-foreground">{inj.title}</p>
            <div className="mt-1 flex gap-3">
              <span className="text-xs text-foreground/65">{inj.recordedAt.slice(0, 10)}</span>
              {inj.bodyPart && <span className="text-xs text-foreground/65">{inj.bodyPart}</span>}
              {inj.status && <span className="text-xs text-foreground/65">{inj.status}</span>}
            </div>
          </div>
        ))}
        {injuries.length === 0 && (
          <p className="text-sm text-foreground/65">No injuries recorded.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Injury</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="injury-description">Description <span className="text-destructive">*</span></Label>
              <Input
                id="injury-description"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1"
                placeholder="e.g. Left knee sprain"
              />
            </div>
            <div>
              <Label htmlFor="injury-date">Date <span className="text-foreground/65">(optional)</span></Label>
              <Input
                id="injury-date"
                type="date"
                value={form.recordedAt}
                onChange={(e) => setForm((f) => ({ ...f, recordedAt: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="injury-body-part">Body Part <span className="text-foreground/65">(optional)</span></Label>
              <Input
                id="injury-body-part"
                value={form.bodyPart}
                onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))}
                className="mt-1"
                placeholder="e.g. knee"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.title}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
