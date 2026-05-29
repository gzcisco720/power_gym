import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTrainingStore } from '@/stores/trainingStore';
import { PageHeader } from '@/components/shared/page-header';
import { PlanTemplateForm, type PlanFormPayload } from '@/components/training/plan-template-form';

export function TrainerPlanNewPage() {
  const navigate = useNavigate();
  const { createPlan } = useTrainingStore();

  async function handleSubmit(data: PlanFormPayload) {
    await createPlan({
      name: data.name,
      ...(data.description != null ? { description: data.description } : {}),
    });
    toast.success('Plan created');
    void navigate('/trainer/plans');
  }

  return (
    <div>
      <PageHeader
        title="New Training Template"
        subtitle="Create a new plan template to assign to members"
      />
      <PlanTemplateForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => void navigate('/trainer/plans')}
      />
    </div>
  );
}
