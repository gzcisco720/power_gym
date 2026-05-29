import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTrainingStore } from '@/stores/trainingStore';
import { PageHeader } from '@/components/shared/page-header';
import { PlanTemplateForm, type PlanFormPayload, type PlanDay } from '@/components/training/plan-template-form';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanTemplate, Exercise } from '@/api/training';

function toPlanDays(template: PlanTemplate): PlanDay[] {
  return template.days.map((d) => ({
    dayNumber: d.dayNumber,
    name: d.name ?? `Day ${d.dayNumber}`,
    exercises: d.exercises.map((ex: Exercise) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.sets.length > 0 ? ex.sets.length : 3,
      repsMin: ex.sets[0]?.targetReps ?? 8,
      repsMax: ex.sets[0]?.targetReps ?? 12,
      restSeconds: null,
    })),
  }));
}

export function TrainerPlanEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plans, fetchPlans, updatePlan, isLoading } = useTrainingStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (plans.length === 0) {
      void fetchPlans().then(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, [plans.length, fetchPlans]);

  const plan = plans.find((p) => p._id === id);

  async function handleSubmit(data: PlanFormPayload) {
    if (!id) return;
    // Map form shape → backend PlanDayExerciseDto shape
    const days = data.days.map((d) => ({
      dayNumber: d.dayNumber,
      name: d.name,
      exercises: d.exercises.map((ex) => ({
        groupId: ex.exerciseId,
        isSuperset: false,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName ?? '',
        imageUrl: null,
        isBodyweight: false,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        restSeconds: ex.restSeconds,
      })),
    }));
    // PlanDayExerciseDto (sets: number) vs Exercise (sets: Array) mismatch — the API client
    // and store types reflect the GET response shape, but PATCH sends DTO format. Runtime is correct.
    // @ts-expect-error: exercises.sets is a number (DTO) not an array (response type)
    await updatePlan(id, { name: data.name, description: data.description, days });
    toast.success('Plan updated');
    void navigate('/trainer/plans');
  }

  if (!loaded || isLoading) {
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

  const initialData = {
    name: plan.name,
    description: plan.description,
    days: toPlanDays(plan),
  };

  return (
    <div>
      <PageHeader
        title={`Edit: ${plan.name}`}
        subtitle="Modify this training template"
      />
      <PlanTemplateForm
        mode="edit"
        planId={id}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => void navigate('/trainer/plans')}
      />
    </div>
  );
}
