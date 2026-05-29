import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function MemberMyTrainingPage() {
  const user = useAuthStore((s) => s.user);
  const { memberPlans, fetchMemberPlan, startSession, activeSession } = useTrainingStore();
  const navigate = useNavigate();

  const memberId = user?.id ?? '';
  const memberPlan = memberPlans[memberId] ?? null;

  useEffect(() => {
    if (memberId && !(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchMemberPlan]);

  async function handleStart() {
    if (!memberPlan) return;
    try {
      await startSession(memberId, 1);
    } catch {
      toast.error('Failed to start session. Please try again.');
    }
  }

  // If session was just started, navigate to it
  useEffect(() => {
    if (activeSession) {
      navigate(`/member/my-training/session/${activeSession._id}`);
    }
  }, [activeSession, navigate]);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">My Training</h1>

      {memberPlan === undefined ? (
        <p className="text-sm text-foreground/65">Loading…</p>
      ) : memberPlan ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm font-medium text-foreground">{memberPlan.name}</p>
            <p className="text-xs text-foreground/65 mt-1">
              Active since {memberPlan.assignedAt.slice(0, 10)}
            </p>
          </div>
          <Button onClick={handleStart}>Start Session</Button>
        </div>
      ) : (
        <p className="text-sm text-foreground/65">No active plan assigned. Ask your trainer.</p>
      )}
    </div>
  );
}
