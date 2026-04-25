import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { NutritionTemplateList } from './_components/nutrition-template-list';
import { revalidatePath } from 'next/cache';

export default async function TrainerNutritionPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoNutritionTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  const plain = JSON.parse(JSON.stringify(templates)) as {
    _id: string;
    name: string;
    description: string | null;
    dayTypes: { name: string }[];
  }[];

  async function handleDelete(id: string) {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    await connectDB();
    const r = new MongoNutritionTemplateRepository();
    await r.deleteById(id, s.user.id);
    revalidatePath('/trainer/nutrition');
  }

  return <NutritionTemplateList templates={plain} onDelete={handleDelete} />;
}
