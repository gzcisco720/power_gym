import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTrainingStore } from '@/stores/trainingStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const ACCENT_BORDERS = [
  'border-t-blue-400/50',
  'border-t-violet-400/50',
  'border-t-cyan-400/50',
  'border-t-indigo-400/50',
  'border-t-purple-400/50',
];

const CHIP_COLORS = [
  'bg-blue-500/10 text-blue-300 ring-blue-500/20',
  'bg-violet-500/10 text-violet-300 ring-violet-500/20',
  'bg-cyan-500/10 text-cyan-300 ring-cyan-500/20',
  'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

export function TrainerPlansPage() {
  const { plans, fetchPlans, deletePlan, isLoading } = useTrainingStore();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  async function handleDelete(id: string) {
    try {
      await deletePlan(id);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader
          title="Training Templates"
          subtitle={isLoading ? undefined : `${plans.length} template${plans.length !== 1 ? 's' : ''}`}
          actions={
            <Link
              to="/trainer/plans/new"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              New Template
            </Link>
          }
        />

        <div className="px-4 sm:px-8 py-7">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <EmptyState
              heading="No templates yet"
              description="Create your first training plan template to assign to members."
              action={
                <Link
                  to="/trainer/plans/new"
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  New Template
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {plans.map((plan, i) => {
                const accent = ACCENT_BORDERS[hashIndex(plan._id, ACCENT_BORDERS.length)];
                const totalExercises = plan.days.reduce((sum, d) => sum + d.exercises.length, 0);
                return (
                  <m.div
                    key={plan._id}
                    initial={{ opacity: 0, y: shouldReduce ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: shouldReduce ? 0 : i * 0.04 }}
                    className="relative"
                  >
                    <Link
                      to={`/trainer/plans/${plan._id}/edit`}
                      aria-label={`Edit ${plan.name}`}
                      className={`block h-full rounded-xl bg-white/[.02] ring-1 ring-white/[.06] border-t-2 ${accent} p-4 pr-11 transition-all hover:ring-white/[.14]`}
                    >
                      <div className="line-clamp-1 text-[14px] font-semibold text-foreground">
                        {plan.name}
                      </div>
                      {plan.description ? (
                        <p className="mt-1 line-clamp-2 min-h-[2.4em] text-[12px] text-foreground/45">
                          {plan.description}
                        </p>
                      ) : (
                        <p className="mt-1 min-h-[2.4em] text-[12px] italic text-foreground/20">
                          No description
                        </p>
                      )}

                      {plan.days.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {plan.days.map((day, idx) => (
                            <span
                              key={`${day.name ?? ''}-${idx}`}
                              className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}
                            >
                              {day.name ?? `Day ${idx + 1}`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-[10px] italic text-foreground/20">No days yet</div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-foreground/[.06] pt-3 text-center">
                        <div>
                          <div className="text-[14px] font-semibold leading-none text-blue-300">{plan.days.length}</div>
                          <div className="mt-1 text-[9px] uppercase tracking-wider text-blue-300 opacity-50">days</div>
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold leading-none text-violet-300">{totalExercises}</div>
                          <div className="mt-1 text-[9px] uppercase tracking-wider text-violet-300 opacity-50">exercises</div>
                        </div>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(plan._id)}
                      className="absolute right-2 top-2 size-8 text-foreground/25 hover:bg-white/[.05] hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </m.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </LazyMotion>
  );
}
