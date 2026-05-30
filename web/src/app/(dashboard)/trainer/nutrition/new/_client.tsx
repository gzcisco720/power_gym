'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { NutritionTemplateForm } from '../_components/nutrition-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export function NewNutritionTemplateClient({ backPath = '/trainer/nutrition' }: { backPath?: string }) {
  const { push } = useRouter();

  async function handleSubmit(data: {
    name: string;
    description: string | null;
    dayTypes: IDayType[];
  }) {
    const res = await fetch('/api/nutrition-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save nutrition plan');
      return;
    }
    toast.success('Nutrition plan saved');
    push(backPath);
  }

  return (
    <div>
      <PageHeader title="New Nutrition Plan" />
      <div className="px-4 sm:px-8 py-7">
        <NutritionTemplateForm onSubmit={handleSubmit} onCancel={() => push(backPath)} />
      </div>
    </div>
  );
}
