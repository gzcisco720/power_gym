import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as trainingApi from '@/api/training';

export function TrainerMemberLogSessionPage() {
  const { sessionId } = useParams<{ id: string; sessionId: string }>();
  const { activeSession, updateSet, completeSession } = useTrainingStore();
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    // Load an existing session into activeSession by fetching it
    trainingApi.getSession(sessionId).then((session) => {
      useTrainingStore.setState({ activeSession: session });
    }).catch(() => setSessionError('Failed to load session'));
  }, [sessionId]);

  async function handleUpdateSet(setIndex: number, field: 'weight' | 'reps', value: string) {
    if (!activeSession) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;
    await updateSet(activeSession._id, setIndex, { [field]: num });
  }

  async function handleComplete() {
    if (!activeSession) return;
    await completeSession(activeSession._id);
  }

  if (sessionError) return <div className="p-8 text-destructive">{sessionError}</div>;

  if (!activeSession) {
    return <div className="p-8 text-foreground/65">Loading session…</div>;
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
