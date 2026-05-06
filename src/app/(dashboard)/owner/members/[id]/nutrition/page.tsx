import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

type RouteContext = { params: Promise<{ id: string }> };

export default async function Page({ params }: RouteContext): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');
  const { id } = await params;

  await connectDB();
  const templates = await new MongoNutritionTemplateRepository().findByCreator(session.user.id);

  return (
    <div className="container py-6 max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Member Nutrition</h1>
      <TrainerMemberNutritionClient
        memberId={id}
        templates={templates.map((t) => ({ _id: String(t._id), name: t.name }))}
        basePathPrefix="owner"
      />
    </div>
  );
}
