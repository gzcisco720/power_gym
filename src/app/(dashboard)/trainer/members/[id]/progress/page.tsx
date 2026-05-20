import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { Skeleton } from '@/components/ui/skeleton';
import { StatStripSection } from '../_components/stat-strip-section';
import { BodyCompositionSection } from '../_components/body-composition-section';
import { ProgressContent } from '@/app/(dashboard)/member/progress/_components/progress-content';
import type { UserRole } from '@/types/auth';

export default async function TrainerMemberProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) return null;
  const role = session.user.role as UserRole;
  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) return null;

  return (
    <div className="px-4 sm:px-8 py-7 space-y-6">
      {/* Key stats */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[80px] rounded-xl" />
            ))}
          </div>
        }
      >
        <StatStripSection memberId={memberId} />
      </Suspense>

      {/* Body composition trend */}
      <Suspense fallback={<Skeleton className="h-[200px] rounded-xl" />}>
        <BodyCompositionSection memberId={memberId} />
      </Suspense>

      {/* Training frequency + strength progress */}
      <Suspense fallback={<Skeleton className="h-[400px] rounded-xl" />}>
        <ProgressContent memberId={memberId} />
      </Suspense>
    </div>
  );
}
