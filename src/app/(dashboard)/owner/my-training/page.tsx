import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { StartWorkoutCard } from '@/components/self-tracking/start-workout-card';

export default async function OwnerMyTrainingPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/login');

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        actions={
          <Link
            href="/owner/my-training/calendar"
            className="text-[11px] text-foreground/65 hover:text-foreground transition-colors"
          >
            View Calendar →
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <StartWorkoutCard basePath="/owner/my-training" />
      </div>
    </div>
  );
}
