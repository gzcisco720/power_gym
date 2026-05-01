import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { ProgressContent } from '@/app/(dashboard)/member/progress/_components/progress-content';
import { ProgressSkeleton } from '@/app/(dashboard)/member/progress/_components/progress-skeleton';
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
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressContent memberId={memberId} title={`${member.name}'s Progress`} />
    </Suspense>
  );
}
