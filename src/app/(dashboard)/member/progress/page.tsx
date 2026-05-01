import { Suspense } from 'react';
import { auth } from '@/lib/auth/auth';
import { ProgressContent } from './_components/progress-content';
import { ProgressSkeleton } from './_components/progress-skeleton';

export default async function MemberProgressPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressContent memberId={session.user.id} />
    </Suspense>
  );
}
