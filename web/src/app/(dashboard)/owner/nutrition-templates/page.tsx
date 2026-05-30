import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { buildTemplateOverview } from '@/lib/nutrition/template-overview';
import { NutritionTemplateList } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list';
import { revalidatePath } from 'next/cache';

export default async function OwnerNutritionTemplatesPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoNutritionTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  const slim = templates.map((t) => {
    const overview = buildTemplateOverview(t.dayTypes);
    return {
      _id: String(t._id),
      name: t.name,
      description: t.description,
      dayTypeNames: overview.dayTypeNames,
      avgPerDay: overview.avgPerDay,
    };
  });

  async function handleDelete(id: string) {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    await connectDB();
    const r = new MongoNutritionTemplateRepository();
    await r.deleteById(id, s.user.id);
    revalidatePath('/owner/nutrition-templates');
  }

  return (
    <NutritionTemplateList
      templates={slim}
      onDelete={handleDelete}
      basePath="/owner/nutrition-templates"
    />
  );
}
