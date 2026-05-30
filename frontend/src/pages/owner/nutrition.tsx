import { useEffect } from 'react';
import { toast } from 'sonner';
import { NutritionTemplateList } from '@/components/nutrition/nutrition-template-list';
import { useNutritionTemplatesStore } from '@/stores/nutritionTemplatesStore';
import { Skeleton } from '@/components/ui/skeleton';

export function OwnerNutritionTemplatesPage() {
  const templates = useNutritionTemplatesStore((s) => s.templates);
  const isLoading = useNutritionTemplatesStore((s) => s.isLoading);
  const fetch = useNutritionTemplatesStore((s) => s.fetch);
  const remove = useNutritionTemplatesStore((s) => s.remove);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  if (isLoading && templates.length === 0) {
    return (
      <div className="px-4 sm:px-8 py-7">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  }

  return (
    <NutritionTemplateList
      templates={templates}
      onDelete={handleDelete}
      basePath="/owner/nutrition-templates"
    />
  );
}
