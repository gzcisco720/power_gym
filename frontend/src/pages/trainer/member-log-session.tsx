import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import * as trainingApi from '@/api/training';
import { toast } from 'sonner';

export function TrainerMemberLogSessionPage() {
  const { id: memberId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const { activeSession, updateSet, completeSession } = useTrainingStore();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Load the session if not already in store
  useEffect(() => {
    if (!sessionId) return;
    // If the active session already matches, skip fetch
    if (activeSession && activeSession._id === sessionId) return;
    setIsLoadingSession(true);
    trainingApi
      .getSession(sessionId)
      .then((session) => {
        useTrainingStore.setState({ activeSession: session });
      })
      .catch(() => setSessionError('Failed to load session'))
      .finally(() => setIsLoadingSession(false));
  }, [sessionId, activeSession]);

  async function handleUpdateSet(setIndex: number, field: 'weight' | 'reps', value: string) {
    if (!activeSession) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;
    await updateSet(activeSession._id, setIndex, { [field]: num });
  }

  async function handleComplete() {
    if (!activeSession) return;

    const allSets = activeSession.sets;
    const hasAnyData = allSets.some(
      (set) => set.weight !== null || set.reps !== null,
    );

    if (allSets.length > 0 && !hasAnyData) {
      toast.error('Fill in at least one set before completing.');
      return;
    }

    setIsCompleting(true);
    try {
      await completeSession(activeSession._id);
      toast.success('Workout complete!');
      navigate(`/trainer/members/${memberId ?? ''}/plan`);
    } catch {
      toast.error('Failed to complete session');
    } finally {
      setIsCompleting(false);
    }
  }

  if (sessionError) {
    return <div className="px-4 sm:px-8 py-8 text-sm text-destructive">{sessionError}</div>;
  }

  if (isLoadingSession || !activeSession) {
    return (
      <div className="px-4 sm:px-8 py-6 space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-xl" />
        ))}
      </div>
    );
  }

  const isCompleted = activeSession.completedAt !== null;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/10 bg-background/95 backdrop-blur-sm px-4 sm:px-8 py-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/trainer/members/${memberId ?? ''}/plan`)}
            className="mb-1 block text-xs text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <div className="text-base font-bold text-foreground">
            Session — Day {activeSession.dayNumber}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-8 py-5 space-y-1.5">
        {activeSession.sets.map((set, i) => (
          <div
            key={set.setIndex}
            className="flex items-center gap-4 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
          >
            <span className="w-10 text-xs text-foreground/65">Set {i + 1}</span>
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Weight (kg)"
              defaultValue={set.weight ?? ''}
              onBlur={(e) => void handleUpdateSet(set.setIndex, 'weight', e.target.value)}
              disabled={isCompleted}
              className="w-28"
            />
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Reps"
              defaultValue={set.reps ?? ''}
              onBlur={(e) => void handleUpdateSet(set.setIndex, 'reps', e.target.value)}
              disabled={isCompleted}
              className="w-20"
            />
          </div>
        ))}

        {activeSession.sets.length === 0 && !isCompleted && (
          <p className="py-4 text-sm text-foreground/65">No exercises in this session.</p>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-foreground/10 backdrop-blur-md bg-background/50 px-4 sm:px-8 py-3">
        {isCompleted ? (
          <p className="py-1 text-center text-xs text-foreground/65 tabular-nums">
            Session completed · {activeSession.sets.length} sets
          </p>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full text-sm font-bold py-3 h-auto rounded-xl"
          >
            {isCompleting ? 'Saving…' : 'Complete Session'}
          </Button>
        )}
      </div>
    </div>
  );
}
