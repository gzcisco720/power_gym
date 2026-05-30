import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplatePreview } from '@/components/training/template-preview';
import { usePlansStore } from '@/stores/plansStore';

export function OwnerPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentPlan = usePlansStore((s) => s.currentPlan);
  const isLoading = usePlansStore((s) => s.isLoading);
  const fetchOne = usePlansStore((s) => s.fetchOne);

  useEffect(() => {
    if (id) void fetchOne(id);
  }, [id, fetchOne]);

  if (isLoading || !currentPlan) {
    return (
      <div>
        <div className="sticky top-0 z-10 border-b border-foreground/[.06] bg-background/95 backdrop-blur-sm px-4 py-4 sm:px-8 sm:py-5">
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="px-4 sm:px-8 py-7 max-w-3xl mx-auto space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const days = currentPlan.days.map((d) => ({
    dayNumber: d.dayNumber,
    name: d.name,
    exercises: d.exercises.map((e) => ({
      groupId: e.groupId,
      isSuperset: e.isSuperset,
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      imageUrl: e.imageUrl,
      isBodyweight: e.isBodyweight,
      sets: e.sets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      restSeconds: e.restSeconds,
    })),
  }));

  return (
    <div>
      <PageHeader title={currentPlan.name} />
      <div className="px-4 sm:px-8 py-7 max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {currentPlan.description && (
              <p className="text-sm text-foreground/65">{currentPlan.description}</p>
            )}
          </div>
          <Link to={`/owner/plans/${id}/edit`}>
            <Button type="button" variant="outline" className="shrink-0">
              Edit Plan
            </Button>
          </Link>
        </div>
        <TemplatePreview days={days} />
      </div>
    </div>
  );
}
