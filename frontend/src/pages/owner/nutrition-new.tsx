import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { NutritionTemplateForm } from '@/components/nutrition/nutrition-template-form';
import { useNutritionTemplatesStore } from '@/stores/nutritionTemplatesStore';
import type { DayType } from '@/api/nutrition-templates';

interface FormData {
  name: string;
  description: string | null;
  dayTypes: DayType[];
}

export function OwnerNutritionNewPage() {
  const navigate = useNavigate();
  const save = useNutritionTemplatesStore((s) => s.save);

  async function handleSubmit(data: FormData) {
    try {
      await save(data);
      toast.success('Template created');
      navigate('/owner/nutrition-templates');
    } catch {
      toast.error('Failed to save template');
    }
  }

  return (
    <div>
      <PageHeader title="New Nutrition Template" />
      <div className="px-4 sm:px-8 py-6">
        <NutritionTemplateForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/owner/nutrition-templates')}
        />
      </div>
    </div>
  );
}
