import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TrainerMemberBodyTestsPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const { testsByMember, isLoading, fetchTests, createTest } = useBodyTestsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    protocol: '3site',
    weight: '',
    chest: '',
    abdominal: '',
    thigh: '',
  });

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
    <div className="flex flex-col">
      <PageHeader
        title="Body Composition Tests"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            New Test
          </Button>
        }
      />

      <div className="px-4 sm:px-8 py-6">
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] rounded-xl" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            heading="No tests recorded"
            description="Add a body composition test to track this member's progress over time."
          />
        ) : (
          <div className="space-y-1.5">
            {tests.map((t) => (
              <div
                key={t._id}
                className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {t.protocol.toUpperCase()}
                  </span>
                  <span className="text-xs text-foreground/65">{t.date.slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/65">
                  Body fat: {t.bodyFatPct.toFixed(1)}% · Weight: {t.weight} kg
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Body Composition Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Protocol
              </Label>
              <Select value={form.protocol} onValueChange={(v) => handleChange('protocol', v ?? '3site')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3site">3-Site (Jackson-Pollock)</SelectItem>
                  <SelectItem value="7site">7-Site (Jackson-Pollock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="nbt-weight"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Body Weight (kg)
              </Label>
              <Input
                id="nbt-weight"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="nbt-chest"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Chest (mm)
              </Label>
              <Input
                id="nbt-chest"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.chest}
                onChange={(e) => handleChange('chest', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="nbt-abdominal"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Abdominal (mm)
              </Label>
              <Input
                id="nbt-abdominal"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.abdominal}
                onChange={(e) => handleChange('abdominal', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="nbt-thigh"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Thigh (mm)
              </Label>
              <Input
                id="nbt-thigh"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.thigh}
                onChange={(e) => handleChange('thigh', e.target.value)}
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
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
