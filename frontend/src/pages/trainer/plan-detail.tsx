import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function TrainerPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { plans, fetchPlans, isLoading } = useTrainingStore();

  useEffect(() => {
    if (plans.length === 0) {
      void fetchPlans();
    }
  }, [plans.length, fetchPlans]);

  const plan = plans.find((p) => p._id === id);

  if (isLoading && !plan) {
    return (
      <div className="px-4 sm:px-8 py-7 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="px-4 sm:px-8 py-7">
        <p className="text-sm text-foreground/65">Plan not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={plan.name}
        subtitle={`${plan.days.length} day${plan.days.length !== 1 ? 's' : ''}`}
        actions={
          <Link to={`/trainer/plans/${plan._id}/edit`}>
            <Button size="sm">Edit Template</Button>
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-7 space-y-3 max-w-3xl">
        {plan.description && (
          <p className="text-sm text-foreground/65">{plan.description}</p>
        )}
        {plan.days.map((day, i) => (
          <div key={i} className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{day.name ?? `Day ${day.dayNumber}`}</p>
            <p className="text-xs text-foreground/65 mt-0.5">
              {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
        {plan.days.length === 0 && (
          <p className="text-sm text-foreground/65 italic">No days in this template.</p>
        )}
      </div>
    </div>
  );
}
