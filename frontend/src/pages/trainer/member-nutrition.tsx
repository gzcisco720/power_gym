import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNutritionStore } from '@/stores/nutritionStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Nutrition Plan</h1>

      {memberPlan ? (
        <div className="mb-6 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <p className="text-sm font-medium text-foreground">{memberPlan.nutritionTemplate.name}</p>
        </div>
      ) : (
        <p className="mb-6 text-sm text-foreground/65">No nutrition plan assigned.</p>
      )}

      <Button onClick={() => setAssignOpen(true)} variant="outline" size="sm">
        Assign Nutrition Plan
      </Button>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Nutrition Plan</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <select
              className="w-full rounded bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)} disabled={isAssigning}>Cancel</Button>
            <Button onClick={handleAssign} disabled={isAssigning || !selectedTemplateId}>
              {isAssigning ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
