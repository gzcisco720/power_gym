import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
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
import { Skeleton } from '@/components/ui/skeleton';

export function TrainerMemberPlanPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plans, memberPlans, isLoading, fetchPlans, fetchMemberPlan, assignPlan, startSession } = useTrainingStore();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const memberPlan = memberId ? memberPlans[memberId] : null;

  useEffect(() => {
    if (!memberId) return;
    void fetchPlans();
    if (!(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchPlans, fetchMemberPlan]);

  async function handleAssign() {
    if (!memberId || !selectedPlanId) return;
    setIsAssigning(true);
    try {
      await assignPlan(memberId, selectedPlanId);
      setAssignOpen(false);
      setSelectedPlanId('');
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleStartSession() {
    if (!memberId || !memberPlan) return;
    setIsStarting(true);
    try {
      await startSession(memberId, 1);
      // Navigate to log page after starting
      navigate(`/trainer/members/${memberId}/log/new`);
    } catch {
      // session start failed
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Training Plan"
        actions={
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
            Assign Plan
          </Button>
        }
      />

      <div className="px-4 sm:px-8 py-6">
        {isLoading && !memberPlan && !(memberId && memberId in memberPlans) ? (
          <div className="space-y-2">
            <Skeleton className="h-[60px] rounded-xl" />
          </div>
        ) : memberPlan ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 hover:ring-foreground/25 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{memberPlan.name}</span>
                <span className="text-xs text-foreground/65">
                  Active since {memberPlan.assignedAt.slice(0, 10)}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground/65">
                {memberPlan.days.length} day{memberPlan.days.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Button onClick={handleStartSession} disabled={isStarting} size="sm">
              {isStarting ? 'Starting…' : 'Start Session'}
            </Button>
          </div>
        ) : (
          <EmptyState
            heading="No plan assigned"
            description="Assign a training plan template to this member to get started."
          />
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Training Plan</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedPlanId} onValueChange={(v) => setSelectedPlanId(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a plan…" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
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
            <Button onClick={handleAssign} disabled={isAssigning || !selectedPlanId}>
              {isAssigning ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
