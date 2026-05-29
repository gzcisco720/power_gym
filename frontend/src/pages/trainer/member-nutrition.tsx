import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNutritionStore } from '@/stores/nutritionStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TrainerMemberNutritionPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const { templates, memberPlans, fetchTemplates, fetchMemberPlan, assignPlan } = useNutritionStore();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const memberPlan = memberId ? memberPlans[memberId] : null;

  useEffect(() => {
    if (!memberId) return;
    void fetchTemplates();
    void fetchMemberPlan(memberId);
  }, [memberId, fetchTemplates, fetchMemberPlan]);

  async function handleAssign() {
    if (!memberId || !selectedTemplateId) return;
    setIsAssigning(true);
    try {
      await assignPlan(memberId, selectedTemplateId);
      setAssignOpen(false);
      setSelectedTemplateId('');
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Nutrition Plan"
        actions={
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
            Assign Plan
          </Button>
        }
      />

      <div className="px-4 sm:px-8 py-6">
        {memberPlan ? (
          <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {memberPlan.nutritionTemplate.name}
              </span>
              <span className="text-xs text-foreground/65">Active</span>
            </div>
          </div>
        ) : (
          <EmptyState
            heading="No nutrition plan assigned"
            description="Assign a nutrition plan template to this member."
            action={
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                Assign Nutrition Plan
              </Button>
            }
          />
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Nutrition Plan</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedTemplateId} onValueChange={(v) => setSelectedTemplateId(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a template…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAssignOpen(false)}
              disabled={isAssigning}
              className="text-foreground/65"
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning || !selectedTemplateId}>
              {isAssigning ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
