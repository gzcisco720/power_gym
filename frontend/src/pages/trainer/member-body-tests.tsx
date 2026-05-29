import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function TrainerMemberBodyTestsPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const { testsByMember, fetchTests, createTest } = useBodyTestsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ protocol: '3site', weight: '', chest: '', abdominal: '', thigh: '' });

  const tests = memberId ? (testsByMember[memberId] ?? []) : [];

  useEffect(() => {
    if (memberId) void fetchTests(memberId);
  }, [memberId, fetchTests]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!memberId) return;
    setIsSaving(true);
    try {
      await createTest(memberId, {
        protocol: form.protocol,
        weight: parseFloat(form.weight),
        chest: parseFloat(form.chest),
        abdominal: parseFloat(form.abdominal),
        thigh: parseFloat(form.thigh),
      });
      setDialogOpen(false);
      setForm({ protocol: '3site', weight: '', chest: '', abdominal: '', thigh: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Body Composition Tests</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>New Test</Button>
      </div>

      <div className="space-y-2">
        {tests.map((t) => (
          <div key={t._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{t.protocol.toUpperCase()}</p>
              <p className="text-xs text-foreground/65">{t.date.slice(0, 10)}</p>
            </div>
            <p className="mt-1 text-xs text-foreground/65">Body fat: {t.bodyFatPct.toFixed(1)}%</p>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="text-sm text-foreground/65">No tests recorded yet.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Body Composition Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="nbt-protocol">Protocol</Label>
              <select
                id="nbt-protocol"
                className="mt-1 w-full rounded bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
                value={form.protocol}
                onChange={(e) => handleChange('protocol', e.target.value)}
              >
                <option value="3site">3-Site (Jackson-Pollock)</option>
                <option value="7site">7-Site (Jackson-Pollock)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="nbt-weight">Body Weight (kg)</Label>
              <Input
                id="nbt-weight"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="nbt-chest">Chest (mm)</Label>
              <Input
                id="nbt-chest"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.chest}
                onChange={(e) => handleChange('chest', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="nbt-abdominal">Abdominal (mm)</Label>
              <Input
                id="nbt-abdominal"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.abdominal}
                onChange={(e) => handleChange('abdominal', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="nbt-thigh">Thigh (mm)</Label>
              <Input
                id="nbt-thigh"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.thigh}
                onChange={(e) => handleChange('thigh', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
