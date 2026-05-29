import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TrainerMemberLogNewPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const { activeSession, memberPlans, fetchMemberPlan, startSession, updateSet, completeSession } = useTrainingStore();

  const memberPlan = memberId ? memberPlans[memberId] : null;

  useEffect(() => {
    if (memberId && !(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchMemberPlan]);

  async function handleStart() {
    if (!memberId || !memberPlan) return;
    try {
      await startSession(memberId, 1);
    } catch {
      // session start failed (e.g. no exercises in plan); page stays on start button
    }
  }

  async function handleUpdateSet(setIndex: number, field: 'weight' | 'reps', value: string) {
    if (!activeSession) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;
    await updateSet(activeSession._id, setIndex, { [field]: num });
  }

  async function handleComplete() {
    if (!activeSession) return;
    try {
      await completeSession(activeSession._id);
    } catch {
      // session complete failed (e.g. already completed); ignore
    }
  }

  if (!activeSession) {
    return (
      <div className="p-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">New Session</h1>
        {memberPlan ? (
          <Button onClick={handleStart}>Start Session (Day 1)</Button>
        ) : (
          <p className="text-sm text-foreground/65">No active plan. Assign a plan first.</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Session — Day {activeSession.dayNumber}</h1>
      <div className="space-y-3 mb-6">
        {activeSession.sets.map((set, i) => (
          <div key={set.setIndex} className="flex items-center gap-4 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <span className="text-xs text-foreground/65 w-8">Set {i + 1}</span>
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Weight (kg)"
              defaultValue={set.weight ?? ''}
              onBlur={(e) => void handleUpdateSet(set.setIndex, 'weight', e.target.value)}
              className="w-28"
            />
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Reps"
              defaultValue={set.reps ?? ''}
              onBlur={(e) => void handleUpdateSet(set.setIndex, 'reps', e.target.value)}
              className="w-20"
            />
          </div>
        ))}
      </div>
      {activeSession.completedAt ? (
        <p className="text-sm text-foreground/65">Session completed.</p>
      ) : (
        <Button onClick={handleComplete}>Complete Session</Button>
      )}
    </div>
  );
}
