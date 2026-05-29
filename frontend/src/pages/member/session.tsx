import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function MemberSessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const { activeSession, updateSet, completeSession } = useTrainingStore();
  const navigate = useNavigate();

  // If no active session in store and we have an id, nothing to show
  useEffect(() => {
    if (!activeSession && sessionId) {
      // Session may have been cleared — go back to training
      navigate('/member/my-training', { replace: true });
    }
  }, [activeSession, sessionId, navigate]);

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
      // no-op
    }
  }

  if (!activeSession) {
    return (
      <div className="p-8">
        <p className="text-sm text-foreground/65">Loading session…</p>
      </div>
    );
  }

  if (activeSession.completedAt) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Session Complete</h1>
        <p className="text-sm text-foreground/65">Great work! Your session has been logged.</p>
        <Button className="mt-4" onClick={() => navigate('/member/my-training')}>
          Back to Training
        </Button>
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
        {activeSession.sets.length === 0 && (
          <p className="text-sm text-foreground/65">No exercises in this day.</p>
        )}
      </div>
      <Button onClick={handleComplete}>Complete Session</Button>
    </div>
  );
}
