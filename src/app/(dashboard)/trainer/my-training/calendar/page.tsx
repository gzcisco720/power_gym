import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { SelfWorkoutCalendarClient } from '@/components/self-tracking/self-workout-calendar-client';

export default async function TrainerMyTrainingCalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Training Calendar" subtitle="Your workout history" />
      <SelfWorkoutCalendarClient basePath="/trainer/my-training" />
    </div>
  );
}
