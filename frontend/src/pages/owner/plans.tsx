import { useEffect } from 'react';
import { toast } from 'sonner';
import { PlanTemplateList } from '@/components/training/plan-template-list';
import { usePlansStore } from '@/stores/plansStore';
import { Skeleton } from '@/components/ui/skeleton';

export function OwnerPlansPage() {
  const plans = usePlansStore((s) => s.plans);
  const isLoading = usePlansStore((s) => s.isLoading);
  const fetch = usePlansStore((s) => s.fetch);
  const remove = usePlansStore((s) => s.remove);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  if (isLoading && plans.length === 0) {
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
    <PlanTemplateList
      templates={plans}
      onDelete={handleDelete}
      basePath="/owner/plans"
    />
  );
}
