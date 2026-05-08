import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { StartWorkoutCard } from '@/components/self-tracking/start-workout-card';
import { WorkoutCalendarHeaderTrigger } from '@/components/self-tracking/workout-calendar-header-trigger';

export default async function TrainerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        actions={<WorkoutCalendarHeaderTrigger basePath="/trainer/my-training" />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <StartWorkoutCard basePath="/trainer/my-training" />
      </div>
    </div>
  );
}
