'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlanTemplateForm } from '../_components/plan-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { ExerciseOption } from '@/components/training/exercise-search-sheet';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';
import type { PresetPlan } from '@/lib/training/preset-plans';

interface Props {
  exercises: ExerciseOption[];
  backPath: string;
  presetPlan?: PresetPlan | null;
}

export function NewPlanClient({ exercises, backPath, presetPlan }: Props) {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch('/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save plan');
      return;
    }
    toast.success('Plan saved');
    router.push(backPath);
  }

  const initialData = presetPlan
    ? {
        name: presetPlan.name,
        description: null,
        days: presetPlan.days.map((d, i) => ({
          dayNumber: i + 1,
          name: d.name,
          exercises: [],
        })) as IPlanDay[],
      }
    : undefined;

  return (
    <div>
      <PageHeader title="New Plan" />
      <div className="px-4 sm:px-8 py-7">
        <PlanTemplateForm
          initialData={initialData}
          exercises={exercises}
          onSubmit={handleSubmit}
          onCancel={() => router.push(backPath)}
        />
      </div>
    </div>
  );
}
