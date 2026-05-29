import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';

export function TrainerMemberLogNewPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { memberPlans, fetchMemberPlan, startSession } = useTrainingStore();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberPlan = memberId ? memberPlans[memberId] : null;

  useEffect(() => {
    if (memberId && !(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchMemberPlan]);

  async function handleStart() {
    if (!memberId || !memberPlan) return;
    setIsStarting(true);
    setError(null);
    try {
      await startSession(memberId, 1);
      // After starting, navigate to log session — activeSession will be set in store
      // Use the store's activeSession id after the call
      const activeSession = useTrainingStore.getState().activeSession;
      if (activeSession) {
        navigate(`/trainer/members/${memberId}/log/${activeSession._id}`);
      }
    } catch {
      setError('Failed to start session. Please try again.');
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="New Session" />

      <div className="px-4 sm:px-8 py-6">
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}

        {memberPlan ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
              <p className="text-sm font-medium text-foreground">{memberPlan.name}</p>
              <p className="mt-1 text-xs text-foreground/65">
                {memberPlan.days.length} day{memberPlan.days.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={handleStart} disabled={isStarting}>
              {isStarting ? 'Starting…' : 'Start Session (Day 1)'}
            </Button>
          </div>
        ) : (
          <EmptyState
            heading="No active plan"
            description="Assign a training plan to this member before logging a session."
          />
        )}
      </div>
    </div>
  );
}
