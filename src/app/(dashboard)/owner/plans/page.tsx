import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { PlanTemplateList } from '@/app/(dashboard)/trainer/plans/_components/plan-template-list';
import { revalidatePath } from 'next/cache';

export default async function OwnerPlansPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoPlanTemplateRepository();
  const templates = await repo.findByCreator(session.user.id);
  const plain = JSON.parse(JSON.stringify(templates)) as {
    _id: string;
    name: string;
    description: string | null;
    days: unknown[];
  }[];

  async function handleDelete(id: string) {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    await connectDB();
    const r = new MongoPlanTemplateRepository();
    await r.deleteById(id, s.user.id);
    revalidatePath('/owner/plans');
  }

  return <PlanTemplateList templates={plain} onDelete={handleDelete} basePath="/owner/plans" />;
}
