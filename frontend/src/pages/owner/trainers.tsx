import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { variants } from '@/lib/animations/variants';
import { initials } from '@/lib/utils';
import type { Trainer } from '@/api/users';

export function OwnerTrainersPage() {
  const { trainers, members, fetchTrainers, fetchOwnerMembers, isLoading } = useUsersStore();
  const shouldReduceMotion = useReducedMotion();
  const [removeTarget, setRemoveTarget] = useState<Trainer | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    void fetchTrainers();
    void fetchOwnerMembers();
  }, [fetchTrainers, fetchOwnerMembers]);

  const animProps = shouldReduceMotion
    ? {}
    : { variants: variants.staggerItem, initial: 'hidden', animate: 'visible' };

  // Compute member counts per trainer
  const memberCounts = new Map<string, number>();
  for (const m of members) {
    if (m.trainerId) {
      memberCounts.set(m.trainerId, (memberCounts.get(m.trainerId) ?? 0) + 1);
    }
  }

  const avgMembersPerTrainer =
    trainers.length > 0 ? Math.round(members.length / trainers.length) : 0;

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    const targetId = removeTarget._id;
    setRemoveTarget(null);
    setRemoving(targetId);
    try {
      toast.success('Trainer removed');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemoving(null);
    }
  }

  const subtitle = `${trainers.length} trainer${trainers.length !== 1 ? 's' : ''}`;

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader title="Trainers" subtitle={subtitle} />
        <div className="px-4 sm:px-8 py-6 space-y-6">
          {isLoading ? (
            <StatCardsSkeleton count={3} className="sm:grid-cols-3" />
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Total Trainers"
                  value={String(trainers.length)}
                  accentColor="primary"
                />
                {/* NOTE: sessionsThisMonth not available from v2 usersStore — omitted */}
                <StatCard label="Sessions / Month" value="—" />
                <StatCard
                  label="Avg Members / Trainer"
                  value={String(avgMembersPerTrainer)}
                />
              </div>

              {/* Section label */}
              <div className="text-[9px] uppercase tracking-[2px] text-foreground/35 font-semibold">
                All Trainers ({trainers.length})
              </div>

              {/* Trainer list */}
              {trainers.length === 0 ? (
                <EmptyState
                  heading="No trainers yet"
                  description="Invite a trainer to get started."
                />
              ) : (
                <m.div
                  className="space-y-1.5"
                  variants={variants.staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {trainers.map((trainer) => {
                    const count = memberCounts.get(trainer._id) ?? 0;
                    return (
                      <m.div
                        key={trainer._id}
                        className="flex items-center gap-3 px-3 py-2 bg-card ring-1 ring-foreground/10 rounded-xl hover:ring-foreground/25 transition-all"
                        {...animProps}
                      >
                        {/* Avatar */}
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-[11px] font-bold text-primary-foreground shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                          {initials(trainer.name)}
                        </div>

                        {/* Name + email */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground/85 truncate">
                            {trainer.name}
                          </div>
                          <div className="text-[11px] text-foreground/35 mt-0.5 truncate">
                            {trainer.email}
                          </div>
                        </div>

                        {/* Member count */}
                        <div className="hidden sm:flex flex-col items-center shrink-0">
                          <div className="text-base font-bold text-foreground/85 leading-none">
                            {count}
                          </div>
                          <div className="text-[9px] uppercase tracking-[1.5px] text-foreground/30 mt-0.5">
                            members
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/owner/trainers/${trainer._id}`}
                            className="inline-flex h-8 items-center rounded-lg bg-primary/15 px-3 text-xs font-semibold text-primary-light hover:bg-primary/25 transition-colors"
                          >
                            View Hub →
                          </Link>
                          <button
                            type="button"
                            disabled={removing === trainer._id}
                            onClick={() => setRemoveTarget(trainer)}
                            className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                          >
                            {removing === trainer._id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              'Remove'
                            )}
                          </button>
                        </div>
                      </m.div>
                    );
                  })}
                </m.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Remove confirm dialog */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trainer</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              <span className="font-semibold text-foreground/80">{removeTarget?.name}</span>?
              Their members will be unassigned. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRemoveConfirm()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Trainer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LazyMotion>
  );
}
