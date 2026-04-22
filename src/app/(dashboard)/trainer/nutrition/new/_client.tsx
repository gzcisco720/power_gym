'use client';

import { useRouter } from 'next/navigation';
import { NutritionTemplateForm } from '../_components/nutrition-template-form';
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

export function NewNutritionTemplateClient({ foods }: { foods: FoodOption[] }) {
  const router = useRouter();

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
    if (res.ok) router.push('/dashboard/trainer/nutrition');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新建营养计划</h1>
      <NutritionTemplateForm onSubmit={handleSubmit} foods={foods} />
    </div>
  );
}
