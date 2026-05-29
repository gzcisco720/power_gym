import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNutritionStore } from '@/stores/nutritionStore';
import { PageHeader } from '@/components/shared/page-header';
import { NutritionTemplateForm, type NutritionFormPayload } from '@/components/nutrition/nutrition-template-form';

export function TrainerNutritionNewPage() {
  const navigate = useNavigate();
  const { createTemplate } = useNutritionStore();

  async function handleSubmit(data: NutritionFormPayload) {
    await createTemplate({ name: data.name, description: data.description ?? undefined });
    toast.success('Nutrition template created');
    void navigate('/trainer/nutrition');
  }

  return (
    <div>
      <PageHeader
        title="New Nutrition Template"
        subtitle="Create a nutrition plan template to assign to members"
      />
      <NutritionTemplateForm
        onSubmit={handleSubmit}
        onCancel={() => void navigate('/trainer/nutrition')}
      />
    </div>
  );
}
