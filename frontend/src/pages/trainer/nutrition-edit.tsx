import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useNutritionStore } from '@/stores/nutritionStore';
import { PageHeader } from '@/components/shared/page-header';
import { NutritionTemplateForm, type NutritionFormPayload } from '@/components/nutrition/nutrition-template-form';
import { Skeleton } from '@/components/ui/skeleton';

export function TrainerNutritionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { templates, fetchTemplates, updateTemplate, isLoading } = useNutritionStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (templates.length === 0) {
      void fetchTemplates().then(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, [templates.length, fetchTemplates]);

  const template = templates.find((t) => t._id === id);

  async function handleSubmit(data: NutritionFormPayload) {
    if (!id) return;
    await updateTemplate(id, { name: data.name, description: data.description });
    toast.success('Template updated');
    void navigate('/trainer/nutrition');
  }

  if (!loaded || isLoading) {
    return (
      <div className="px-4 sm:px-8 py-7 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="px-4 sm:px-8 py-7">
        <p className="text-sm text-foreground/65">Template not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit: ${template.name}`}
        subtitle="Modify this nutrition template"
      />
      <NutritionTemplateForm
        initialData={{ name: template.name, description: template.description }}
        onSubmit={handleSubmit}
        onCancel={() => void navigate('/trainer/nutrition')}
      />
    </div>
  );
}
