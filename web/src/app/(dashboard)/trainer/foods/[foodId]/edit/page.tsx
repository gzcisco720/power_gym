import mongoose from 'mongoose';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { FoodsEditClient, type InitialFoodData } from './_client';

interface Params {
  foodId: string;
}

async function loadFood(foodId: string, basePath: string): Promise<InitialFoodData> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'member') redirect('/');

  if (!mongoose.isValidObjectId(foodId)) notFound();

  await connectDB();
  const repo = new MongoFoodRepository();
  const food = await repo.findById(new mongoose.Types.ObjectId(foodId));
  if (!food) notFound();

  const userId = new mongoose.Types.ObjectId(session.user.id);
  if (!food.createdBy.equals(userId)) redirect(basePath);

  return {
    _id: food._id.toString(),
    name: food.name,
    brand: food.brand,
    macrosPer100g: JSON.parse(JSON.stringify(food.macrosPer100g)) as InitialFoodData['macrosPer100g'],
    servings: JSON.parse(JSON.stringify(food.servings)) as InitialFoodData['servings'],
  };
}

export default async function TrainerEditFoodPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { foodId } = await params;
  const basePath = '/trainer/foods';
  const food = await loadFood(foodId, basePath);
  return <FoodsEditClient basePath={basePath} initialFood={food} />;
}
