import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { notFound } from 'next/navigation';
import { OwnerEditNutritionTemplateClient } from './_client';
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

interface PlainTemplate {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}

export default async function OwnerEditNutritionTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  await connectDB();

  const [template, foods] = await Promise.all([
    new MongoNutritionTemplateRepository().findById(id),
    new MongoFoodRepository().findAll({ creatorId: session.user.id }),
  ]);

  if (!template) notFound();

  return (
    <OwnerEditNutritionTemplateClient
      id={id}
      initialData={JSON.parse(JSON.stringify(template)) as PlainTemplate}
      foods={JSON.parse(JSON.stringify(foods)) as FoodOption[]}
    />
  );
}
