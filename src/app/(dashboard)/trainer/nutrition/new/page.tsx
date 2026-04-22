import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { NewNutritionTemplateClient } from './_client';

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

export default async function NewNutritionTemplatePage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const foods = await new MongoFoodRepository().findAll({ creatorId: session.user.id });
  const plain = JSON.parse(JSON.stringify(foods)) as FoodOption[];

  return <NewNutritionTemplateClient foods={plain} />;
}
