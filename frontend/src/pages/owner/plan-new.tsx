import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { PlanTemplateForm, type PlanFormPayload } from '@/components/training/plan-template-form';
import { usePlansStore } from '@/stores/plansStore';
import { fetchExercises, type ExerciseOption } from '@/api/plans';

export function OwnerPlanNewPage() {
  const navigate = useNavigate();
  const save = usePlansStore((s) => s.save);
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);

  useEffect(() => {
    fetchExercises()
      .then(setExercises)
      .catch(() => {});
  }, []);

  async function handleSubmit(data: PlanFormPayload) {
    try {
      await save({
        name: data.name,
        description: data.description,
        days: data.days,
      });
      toast.success('Template created');
      navigate('/owner/plans');
    } catch {
      toast.error('Failed to save template');
    }
  }

  return (
    <div>
      <PageHeader title="New Training Template" />
      <div className="px-4 sm:px-8 py-6">
        <PlanTemplateForm
          exercises={exercises}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/owner/plans')}
        />
      </div>
    </div>
  );
}
