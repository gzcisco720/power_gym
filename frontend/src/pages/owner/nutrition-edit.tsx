import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { NutritionTemplateForm } from '@/components/nutrition/nutrition-template-form';
import { useNutritionTemplatesStore } from '@/stores/nutritionTemplatesStore';
import { Skeleton } from '@/components/ui/skeleton';
import type { DayType } from '@/api/nutrition-templates';

interface FormData {
  name: string;
  description: string | null;
  dayTypes: DayType[];
}

export function OwnerNutritionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentTemplate = useNutritionTemplatesStore((s) => s.currentTemplate);
  const isLoading = useNutritionTemplatesStore((s) => s.isLoading);
  const fetchOne = useNutritionTemplatesStore((s) => s.fetchOne);
  const update = useNutritionTemplatesStore((s) => s.update);

  useEffect(() => {
    if (id) void fetchOne(id);
  }, [id, fetchOne]);

  if (isLoading || !currentTemplate || currentTemplate._id !== id) {
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
    name: currentTemplate.name,
    description: currentTemplate.description,
    dayTypes: currentTemplate.dayTypes,
  };

  async function handleSubmit(data: FormData) {
    if (!id) return;
    try {
      await update(id, data);
      toast.success('Template updated');
      navigate('/owner/nutrition-templates');
    } catch {
      toast.error('Failed to update template');
    }
  }

  return (
    <div>
      <PageHeader title="Edit Nutrition Template" />
      <div className="px-4 sm:px-8 py-6">
        <NutritionTemplateForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/owner/nutrition-templates')}
        />
      </div>
    </div>
  );
}
