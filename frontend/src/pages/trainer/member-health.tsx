import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMemberHealthStore } from '@/stores/memberHealthStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
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
    <div className="flex flex-col">
      <PageHeader
        title="Member Health"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Add Injury
          </Button>
        }
      />

      <div className="px-4 sm:px-8 py-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          Injuries
        </p>

        {injuries.length === 0 ? (
          <EmptyState
            heading="No injuries recorded"
            description="Add an injury record to track this member's health history."
          />
        ) : (
          <div className="space-y-1.5">
            {injuries.map((inj) => (
              <div
                key={inj._id}
                className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{inj.title}</span>
                  <span className="text-xs text-foreground/65">{inj.status}</span>
                </div>
                <div className="mt-1 flex gap-3">
                  <span className="text-xs text-foreground/65">{inj.recordedAt.slice(0, 10)}</span>
                  {inj.bodyPart && (
                    <span className="text-xs text-foreground/65">{inj.bodyPart}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Injury</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="injury-description"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="injury-description"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Left knee sprain"
                aria-invalid={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="injury-date"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Date <span className="text-foreground/65">(optional)</span>
              </Label>
              <Input
                id="injury-date"
                type="date"
                value={form.recordedAt}
                onChange={(e) => setForm((f) => ({ ...f, recordedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="injury-body-part"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Body Part <span className="text-foreground/65">(optional)</span>
              </Label>
              <Input
                id="injury-body-part"
                value={form.bodyPart}
                onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))}
                placeholder="e.g. knee"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
              className="text-foreground/65"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.title}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
