import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import type { ExerciseRowData } from '@/components/training/exercise-row';
import { TemplatePreview } from './_components/template-preview';

export default async function PlanTemplateViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { id } = await params;
  await connectDB();

  const template = await new MongoPlanTemplateRepository().findById(id);
  if (!template) notFound();

  const days = template.days.map((d) => ({
    dayNumber: d.dayNumber,
    name: d.name,
    exercises: d.exercises.map<ExerciseRowData>((e) => ({
      groupId: e.groupId,
      isSuperset: e.isSuperset,
      exerciseId: e.exerciseId.toString(),
      exerciseName: e.exerciseName,
      imageUrl: e.imageUrl,
      isBodyweight: e.isBodyweight,
      sets: e.sets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      restSeconds: e.restSeconds,
    })),
  }));

  return (
    <div>
      <PageHeader title={template.name} />
      <div className="px-4 sm:px-8 py-7 max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {template.description && (
              <p className="text-sm text-foreground/65">{template.description}</p>
            )}
          </div>
          <Link href={`/trainer/plans/${id}/edit`}>
            <Button type="button" variant="outline" className="shrink-0">
              Edit Plan
            </Button>
          </Link>
        </div>
        <TemplatePreview days={days} />
      </div>
    </div>
  );
}
