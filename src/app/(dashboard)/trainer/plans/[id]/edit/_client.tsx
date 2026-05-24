'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlanTemplateForm } from '../../_components/plan-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { ExerciseOption } from '@/components/training/exercise-search-sheet';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

interface Props {
  id: string;
  initialData: { name: string; description: string | null; days: IPlanDay[] };
  exercises: ExerciseOption[];
  backPath: string;
}

export function EditPlanClient({ id, initialData, exercises, backPath }: Props) {
  const { push } = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch(`/api/plan-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save plan');
      return;
    }
    toast.success('Plan saved');
    push(backPath);
  }

  return (
    <div>
      <PageHeader title="Edit Plan" />
      <div className="px-4 sm:px-8 py-7">
        <PlanTemplateForm initialData={initialData} exercises={exercises} onSubmit={handleSubmit} onCancel={() => push(backPath)} />
      </div>
    </div>
  );
}
