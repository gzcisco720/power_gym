'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { NutritionTemplateForm } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

interface FoodOption {
  _id: string;
  name: string;
  per100g: { kcal: number; protein: number; carbs: number; fat: number } | null;
  perServing: {
    servingLabel: string;
    grams: number;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
}

interface Props {
  id: string;
  initialData: { name: string; description: string | null; dayTypes: IDayType[] };
  foods: FoodOption[];
}

export function OwnerEditNutritionTemplateClient({ id, initialData, foods }: Props) {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; dayTypes: IDayType[] }) {
    const res = await fetch(`/api/nutrition-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save nutrition plan');
      return;
    }
    toast.success('Nutrition plan saved');
    router.push('/owner/nutrition-templates');
  }

  return (
    <div>
      <PageHeader title="编辑营养计划" />
      <div className="px-4 sm:px-8 py-7">
        <NutritionTemplateForm initialData={initialData} onSubmit={handleSubmit} foods={foods} />
      </div>
    </div>
  );
}
