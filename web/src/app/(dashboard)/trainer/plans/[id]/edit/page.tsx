import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { notFound } from 'next/navigation';
import { EditPlanClient } from './_client';

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user) return null;
  await connectDB();

  const [template, exercises] = await Promise.all([
    new MongoPlanTemplateRepository().findById(id),
    new MongoExerciseRepository().findAll({ creatorId: session.user.id }),
  ]);

  if (!template) notFound();

  return (
    <EditPlanClient
      id={id}
      initialData={JSON.parse(JSON.stringify(template))}
      exercises={JSON.parse(JSON.stringify(exercises))}
      backPath="/trainer/plans"
    />
  );
}
