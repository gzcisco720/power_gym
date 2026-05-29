import { useEffect, useState } from 'react';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TrainerPlansPage() {
  const { plans, fetchPlans, createPlan, isLoading } = useTrainingStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  async function handleCreate() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await createPlan({ name: name.trim() });
      setDialogOpen(false);
      setName('');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && plans.length === 0) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Training Templates</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>+ New Plan</Button>
      </div>

      <div className="space-y-2">
        {plans.map((p) => (
          <div key={p._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm font-medium text-foreground">{p.name}</p>
            {p.description && <p className="text-xs text-foreground/65">{p.description}</p>}
          </div>
        ))}
        {plans.length === 0 && (
          <p className="text-sm text-foreground/65">No training templates yet.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Training Template</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="plan-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="plan-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="e.g. 5-Day Strength Program"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
