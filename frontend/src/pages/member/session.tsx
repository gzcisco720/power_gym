import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useTrainingStore } from '@/stores/trainingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { variants } from '@/lib/animations/variants';

export function MemberSessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const { activeSession, updateSet, completeSession } = useTrainingStore();
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);
  const reducedMotion = useReducedMotion();

  // Redirect if no active session in store
  useEffect(() => {
    if (!activeSession && sessionId) {
      navigate('/member/my-training', { replace: true });
    }
  }, [activeSession, sessionId, navigate]);

  // After successful completion, redirect back to my-training
  useEffect(() => {
    if (activeSession?.completedAt) {
      // Show completed state for a moment before redirecting on revisit
    }
  }, [activeSession]);

  async function handleUpdateSet(setIndex: number, field: 'weight' | 'reps', value: string) {
    if (!activeSession) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;
    await updateSet(activeSession._id, setIndex, { [field]: num });
  }

  async function handleComplete() {
    if (!activeSession) return;

    const hasAnyData = activeSession.sets.some(
      (s) => s.weight !== null || s.reps !== null,
    );

    if (activeSession.sets.length > 0 && !hasAnyData) {
      toast.error('Fill in at least one set before completing.');
      return;
    }

    setIsCompleting(true);
    try {
      await completeSession(activeSession._id);
      toast.success('Workout complete!');
    } catch {
      toast.error('Failed to complete session');
    } finally {
      setIsCompleting(false);
    }
  }

  const containerVariant = reducedMotion ? {} : variants.staggerContainer;
  const itemVariant = reducedMotion ? {} : variants.staggerItem;

  if (!activeSession) {
    return (
      <div className="px-4 sm:px-8 py-6 space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-xl" />
        ))}
      </div>
    );
  }

  const isCompleted = activeSession.completedAt !== null;

  if (isCompleted) {
    return (
      <LazyMotion features={domAnimation}>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-8 py-12 text-center">
          <m.div
            variants={variants.scaleIn}
            initial="hidden"
            animate="visible"
            className="rounded-2xl bg-card ring-1 ring-foreground/10 p-8 max-w-sm w-full"
          >
            <div className="mb-4 text-[18px] font-semibold text-foreground">Session Complete</div>
            <p className="text-[13px] text-foreground/65 mb-6">
              Great work! Your session has been logged.
            </p>
            <Button className="w-full" onClick={() => navigate('/member/my-training')}>
              Back to Training
            </Button>
          </m.div>
        </div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/10 bg-background/95 backdrop-blur-sm px-4 sm:px-8 py-4">
          <div>
            <button
              type="button"
              onClick={() => navigate('/member/my-training')}
              className="mb-1 block text-xs text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
            >
              ← Back
            </button>
            <div className="text-base font-bold text-foreground">
              Session — Day {activeSession.dayNumber}
            </div>
          </div>
        </div>

        {/* Set rows */}
        <div className="flex-1 px-4 sm:px-8 py-5">
          <m.div
            className="space-y-1.5"
            variants={containerVariant}
            initial="hidden"
            animate="visible"
          >
            {activeSession.sets.map((set, i) => (
              <m.div
                key={set.setIndex}
                variants={itemVariant}
                className="flex items-center gap-4 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
              >
                <span className="w-10 shrink-0 text-xs text-foreground/65">Set {i + 1}</span>
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
              </m.div>
            ))}
          </m.div>

          {activeSession.sets.length === 0 && (
            <p className="py-4 text-sm text-foreground/65">No exercises in this session.</p>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 border-t border-foreground/10 backdrop-blur-md bg-background/50 px-4 sm:px-8 py-3">
          <Button
            onClick={() => void handleComplete()}
            disabled={isCompleting}
            className="w-full text-sm font-bold py-3 h-auto rounded-xl"
          >
            {isCompleting ? 'Saving…' : 'Complete Session'}
          </Button>
        </div>
      </div>
    </LazyMotion>
  );
}
