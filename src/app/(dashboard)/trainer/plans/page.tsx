import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { PlanTemplateList } from './_components/plan-template-list';
import { revalidatePath } from 'next/cache';

export default async function TrainerPlansPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoPlanTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  const plain = JSON.parse(JSON.stringify(templates)) as typeof templates;

  async function handleDelete(id: string) {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    await connectDB();
    const r = new MongoPlanTemplateRepository();
    await r.deleteById(id, s.user.id);
    revalidatePath('/dashboard/trainer/plans');
  }

  return <PlanTemplateList templates={plain} onDelete={handleDelete} />;
}
