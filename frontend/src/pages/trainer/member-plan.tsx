import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';

export function TrainerMemberPlanPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const { plans, memberPlans, fetchPlans, fetchMemberPlan, assignPlan, startSession } = useTrainingStore();
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
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Training Plan</h1>

      {memberPlan ? (
        <div className="mb-6 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <p className="text-sm font-medium text-foreground">{memberPlan.name}</p>
          <p className="text-xs text-foreground/65">Active since {memberPlan.assignedAt.slice(0, 10)}</p>
        </div>
      ) : (
        <p className="mb-6 text-sm text-foreground/65">No active plan assigned.</p>
      )}

      <div className="flex gap-3">
        <Button onClick={() => setAssignOpen(true)} variant="outline" size="sm">
          Assign Plan
        </Button>
        {memberPlan && (
          <Button onClick={handleStartSession} disabled={isStarting} size="sm">
            {isStarting ? 'Starting…' : 'Start Session'}
          </Button>
        )}
      </div>

      {assignOpen && (
        <div className="mt-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="mb-3 text-sm font-medium text-foreground">Select a plan to assign</p>
          <select
            className="w-full rounded bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <option value="">Select a plan…</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setAssignOpen(false)} disabled={isAssigning} size="sm">Cancel</Button>
            <Button onClick={handleAssign} disabled={isAssigning || !selectedPlanId} size="sm">
              {isAssigning ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
