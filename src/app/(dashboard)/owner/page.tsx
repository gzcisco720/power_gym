import Link from 'next/link';
import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardStats } from './_components/dashboard-stats';
import { DashboardStatsSkeleton } from './_components/dashboard-stats-skeleton';
import { TrainerBreakdownSection } from './_components/trainer-breakdown-section';
import { TrainerBreakdownSkeleton } from './_components/trainer-breakdown-skeleton';

export default async function OwnerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Gym overview"
        actions={
          <Link
            href="/owner/invites"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
          >
            + Invite Trainer
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-7 space-y-8">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats />
        </Suspense>
        <Suspense fallback={<TrainerBreakdownSkeleton />}>
          <TrainerBreakdownSection />
        </Suspense>
      </div>
    </div>
  );
}
