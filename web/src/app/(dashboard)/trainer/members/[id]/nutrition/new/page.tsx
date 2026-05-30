import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MemberNutritionPlanForm } from './_components/member-nutrition-plan-form';
import type { InitialData } from './_components/member-nutrition-plan-form';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ templateId?: string }>;
}

export default async function NewMemberNutritionPlanPage({ params, searchParams }: PageProps) {
  const [session, { id: memberId }, { templateId }] = await Promise.all([auth(), params, searchParams]);
  if (!session?.user || session.user.role === 'member') redirect('/login');

  let initialData: InitialData | null = null;

  if (templateId) {
    await connectDB();
    const repo = new MongoNutritionTemplateRepository();
    const template = await repo.findById(templateId);
    if (template) {
      initialData = {
        name: template.name,
        dayTypes: template.toObject().dayTypes,
        fromTemplateId: templateId,
      };
    }
    // if template not found, fall through to null (scratch mode)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        <MemberNutritionPlanForm memberId={memberId} initialData={initialData} />
      </div>
    </div>
  );
}
