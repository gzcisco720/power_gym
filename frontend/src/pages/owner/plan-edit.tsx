import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { PlanTemplateForm, type PlanFormPayload } from '@/components/training/plan-template-form';
import { usePlansStore } from '@/stores/plansStore';
import { fetchExercises, type ExerciseOption } from '@/api/plans';
import { Skeleton } from '@/components/ui/skeleton';

export function OwnerPlanEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentPlan = usePlansStore((s) => s.currentPlan);
  const isLoading = usePlansStore((s) => s.isLoading);
  const fetchOne = usePlansStore((s) => s.fetchOne);
  const update = usePlansStore((s) => s.update);
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);

  useEffect(() => {
    if (id) void fetchOne(id);
    fetchExercises()
      .then(setExercises)
      .catch(() => {});
  }, [id, fetchOne]);

  if (isLoading || !currentPlan || currentPlan._id !== id) {
    return (
      <div>
        <div className="sticky top-0 z-10 border-b border-foreground/[.06] bg-background/95 backdrop-blur-sm px-4 py-4 sm:px-8 sm:py-5">
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const initialData = {
    name: currentPlan.name,
    description: currentPlan.description,
    days: currentPlan.days.map((d) => ({
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
    })),
  };

  async function handleSubmit(data: PlanFormPayload) {
    if (!id) return;
    try {
      await update(id, {
        name: data.name,
        description: data.description,
        days: data.days,
      });
      toast.success('Template updated');
      navigate('/owner/plans');
    } catch {
      toast.error('Failed to update template');
    }
  }

  return (
    <div>
      <PageHeader title="Edit Training Template" />
      <div className="px-4 sm:px-8 py-6">
        <PlanTemplateForm
          initialData={initialData}
          exercises={exercises}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/owner/plans')}
        />
      </div>
    </div>
  );
}
