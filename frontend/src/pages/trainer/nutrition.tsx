import { useEffect, useState } from 'react';
import { useNutritionStore } from '@/stores/nutritionStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TrainerNutritionPage() {
  const { templates, fetchTemplates, createTemplate, isLoading } = useNutritionStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  async function handleCreate() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await createTemplate({ name: name.trim() });
      setDialogOpen(false);
      setName('');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && templates.length === 0) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Nutrition Templates</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>+ New Template</Button>
      </div>

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm font-medium text-foreground">{t.name}</p>
            {t.description && <p className="text-xs text-foreground/65">{t.description}</p>}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-foreground/65">No nutrition templates yet.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Nutrition Template</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="template-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="template-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="e.g. Bulk Phase"
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
